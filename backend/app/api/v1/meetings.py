"""
元征 · 合伙人赋能平台 - 座谈会 API
时间表、会议、纪要管理
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user, get_current_admin_user, get_founding_or_admin_user
from app.models.user import User
from app.models.project import Project, VisibilityScopeType, ProjectEvent, ProjectEventType
from app.models.meeting import (
    Meeting, MeetingParticipant, ExternalGuest, MeetingMinutes,
    UserAvailability, MeetingLevel, MeetingStatus,
    ParticipantRole, AttendanceStatus
)
from app.models.notification import InboxItem, InboxCategory
from app.schemas.meeting import (
    UserAvailabilityCreate, UserAvailabilityRead,
    MeetingCreate, MeetingUpdate, MeetingRead, MeetingList,
    MeetingParticipantCreate, MeetingParticipantRead,
    ExternalGuestCreate, ExternalGuestRead,
    MeetingMinutesCreate, MeetingMinutesRead,
    AttendanceUpdate
)

router = APIRouter(prefix="/meetings", tags=["座谈会"])


def check_meeting_visibility(meeting: Meeting, user: User) -> bool:
    """检查用户是否可以查看会议"""
    if user.is_admin:
        return True
    if meeting.created_by_user_id == user.id:
        return True
    
    # 检查是否是参与者
    for p in meeting.participants:
        if p.user_id == user.id:
            return True
    
    if meeting.visibility_scope_type == VisibilityScopeType.ALL:
        return True
    elif meeting.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL:
        return user.highest_role_level >= (meeting.visibility_min_role_level or 0)
    elif meeting.visibility_scope_type == VisibilityScopeType.CUSTOM:
        return user.id in (meeting.visibility_user_ids or [])
    
    return False


def meeting_to_read(meeting: Meeting, db: Session) -> MeetingRead:
    """将 Meeting 模型转换为 MeetingRead"""
    participants = []
    for p in meeting.participants:
        participants.append(MeetingParticipantRead(
            user_id=p.user_id,
            user_name=p.user.name if p.user else None,
            role=p.role,
            attendance_status=p.attendance_status
        ))
    
    external_guests = []
    for g in meeting.external_guests:
        if not g.is_deleted:
            # 获取邀请人名称列表
            inviter_names = []
            if g.invited_by_user_ids:
                inviters = db.query(User).filter(User.id.in_(g.invited_by_user_ids)).all()
                inviter_names = [u.name for u in inviters]
            elif g.invited_by:
                inviter_names = [g.invited_by.name]
            
            external_guests.append(ExternalGuestRead(
                id=g.id,
                meeting_id=g.meeting_id,
                name=g.name,
                organization=g.organization,
                title=g.title,
                contact=g.contact,
                notes=g.notes,
                invited_by_user_id=g.invited_by_user_id,
                invited_by_user_ids=g.invited_by_user_ids,
                invited_by_name=inviter_names[0] if inviter_names else None,
                invited_by_names=inviter_names if inviter_names else None,
                created_at=g.created_at
            ))
    
    return MeetingRead(
        id=meeting.id,
        title=meeting.title,
        description=meeting.description,
        meeting_level=meeting.meeting_level,
        confidentiality_level=meeting.confidentiality_level,
        related_project_id=meeting.related_project_id,
        related_project_name=meeting.related_project.name if meeting.related_project else None,
        start_time=meeting.start_time,
        end_time=meeting.end_time,
        location=meeting.location,
        created_by_user_id=meeting.created_by_user_id,
        created_by_name=meeting.created_by.name if meeting.created_by else None,
        status=meeting.status,
        visibility_scope_type=meeting.visibility_scope_type,
        visibility_min_role_level=meeting.visibility_min_role_level,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        participants=participants,
        external_guests=external_guests,
        has_minutes=meeting.minutes is not None
    )


# ============ 用户可用时间 ============

@router.get("/availability/me", response_model=List[UserAvailabilityRead])
def get_my_availability(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None)
):
    """获取我的可用时间"""
    query = db.query(UserAvailability).filter(
        UserAvailability.user_id == current_user.id,
        UserAvailability.is_deleted == False
    )
    
    if start_date:
        query = query.filter(UserAvailability.end_time >= start_date)
    if end_date:
        query = query.filter(UserAvailability.start_time <= end_date)
    
    availabilities = query.order_by(UserAvailability.start_time).all()
    
    return [
        UserAvailabilityRead(
            id=a.id,
            user_id=a.user_id,
            user_name=current_user.name,
            start_time=a.start_time,
            end_time=a.end_time,
            note=a.note,
            visibility_scope_type=a.visibility_scope_type,
            visibility_min_role_level=a.visibility_min_role_level,
            created_at=a.created_at
        )
        for a in availabilities
    ]


@router.post("/availability", response_model=UserAvailabilityRead)
def create_availability(
    availability_in: UserAvailabilityCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建可用时间"""
    if availability_in.end_time <= availability_in.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="结束时间必须晚于开始时间"
        )
    
    availability = UserAvailability(
        user_id=current_user.id,
        start_time=availability_in.start_time,
        end_time=availability_in.end_time,
        note=availability_in.note,
        visibility_scope_type=availability_in.visibility_scope_type,
        visibility_min_role_level=availability_in.visibility_min_role_level,
        visibility_user_ids=availability_in.visibility_user_ids,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(availability)
    db.commit()
    db.refresh(availability)
    
    return UserAvailabilityRead(
        id=availability.id,
        user_id=availability.user_id,
        user_name=current_user.name,
        start_time=availability.start_time,
        end_time=availability.end_time,
        note=availability.note,
        visibility_scope_type=availability.visibility_scope_type,
        visibility_min_role_level=availability.visibility_min_role_level,
        created_at=availability.created_at
    )


@router.delete("/availability/{availability_id}")
def delete_availability(
    availability_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除可用时间"""
    availability = db.query(UserAvailability).filter(
        UserAvailability.id == availability_id,
        UserAvailability.user_id == current_user.id,
        UserAvailability.is_deleted == False
    ).first()
    
    if not availability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="可用时间不存在"
        )
    
    availability.is_deleted = True
    availability.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "可用时间已删除"}


@router.get("/availability/all", response_model=List[UserAvailabilityRead])
def get_all_availability(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    user_id: Optional[int] = Query(None)
):
    """获取所有用户可用时间（管理员）"""
    query = db.query(UserAvailability).filter(
        UserAvailability.is_deleted == False
    )
    
    if user_id:
        query = query.filter(UserAvailability.user_id == user_id)
    if start_date:
        query = query.filter(UserAvailability.end_time >= start_date)
    if end_date:
        query = query.filter(UserAvailability.start_time <= end_date)
    
    availabilities = query.order_by(
        UserAvailability.user_id,
        UserAvailability.start_time
    ).all()
    
    return [
        UserAvailabilityRead(
            id=a.id,
            user_id=a.user_id,
            user_name=a.user.name if a.user else None,
            start_time=a.start_time,
            end_time=a.end_time,
            note=a.note,
            visibility_scope_type=a.visibility_scope_type,
            visibility_min_role_level=a.visibility_min_role_level,
            created_at=a.created_at
        )
        for a in availabilities
    ]


@router.get("/availability/visible", response_model=List[UserAvailabilityRead])
def get_visible_availability(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None)
):
    """获取当前用户可见的其他用户的可用时间（根据可见权限过滤）"""
    # 获取当前用户的角色级别
    user_role_level = current_user.highest_role_level or 0
    is_admin = current_user.is_admin
    
    query = db.query(UserAvailability).filter(
        UserAvailability.is_deleted == False,
        UserAvailability.user_id != current_user.id  # 排除自己的
    )
    
    if start_date:
        query = query.filter(UserAvailability.end_time >= start_date)
    if end_date:
        query = query.filter(UserAvailability.start_time <= end_date)
    
    availabilities = query.order_by(
        UserAvailability.user_id,
        UserAvailability.start_time
    ).all()
    
    # 根据可见权限过滤
    visible_availabilities = []
    for a in availabilities:
        # 管理员可以看到所有（包括仅管理员可见的，level 999）
        if is_admin:
            visible_availabilities.append(a)
            continue
        
        # 检查可见权限
        scope_type = a.visibility_scope_type or 'ROLE_MIN_LEVEL'
        min_level = a.visibility_min_role_level or 1
        
        if scope_type == 'ALL':
            # 所有人可见
            visible_availabilities.append(a)
        elif scope_type == 'ROLE_MIN_LEVEL':
            # 检查角色级别（999是仅管理员，普通用户看不到）
            if min_level < 999 and user_role_level >= min_level:
                visible_availabilities.append(a)
        elif scope_type == 'CUSTOM':
            # 自定义可见范围
            visible_ids = a.visibility_user_ids or []
            if current_user.id in visible_ids:
                visible_availabilities.append(a)
    
    return [
        UserAvailabilityRead(
            id=a.id,
            user_id=a.user_id,
            user_name=a.user.name if a.user else None,
            start_time=a.start_time,
            end_time=a.end_time,
            note=a.note,
            visibility_scope_type=a.visibility_scope_type,
            visibility_min_role_level=a.visibility_min_role_level,
            created_at=a.created_at
        )
        for a in visible_availabilities
    ]


# ============ 座谈会 ============

@router.get("", response_model=MeetingList)
def list_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project_id: Optional[int] = Query(None),
    status_filter: Optional[MeetingStatus] = Query(None, alias="status"),
    upcoming: bool = Query(False, description="只看即将开始的会议"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取座谈会列表"""
    query = db.query(Meeting).filter(Meeting.is_deleted == False)
    
    if project_id:
        query = query.filter(Meeting.related_project_id == project_id)
    
    if status_filter:
        query = query.filter(Meeting.status == status_filter)
    
    if upcoming:
        query = query.filter(
            Meeting.start_time >= datetime.utcnow(),
            Meeting.status.in_([MeetingStatus.PLANNING, MeetingStatus.CONFIRMED])
        )
    
    # 应用可见性过滤
    if not current_user.is_admin:
        query = query.filter(
            (Meeting.created_by_user_id == current_user.id) |
            (Meeting.visibility_scope_type == VisibilityScopeType.ALL) |
            (
                (Meeting.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL) &
                (Meeting.visibility_min_role_level <= current_user.highest_role_level)
            )
        )
    
    total = query.count()
    meetings = query.order_by(
        Meeting.start_time.desc()
    ).offset(skip).limit(limit).all()
    
    items = [meeting_to_read(m, db) for m in meetings]
    
    return MeetingList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("", response_model=MeetingRead)
def create_meeting(
    meeting_in: MeetingCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """创建座谈会（仅管理员）"""
    if meeting_in.end_time <= meeting_in.start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="结束时间必须晚于开始时间"
        )
    
    meeting = Meeting(
        title=meeting_in.title,
        description=meeting_in.description,
        meeting_level=meeting_in.meeting_level,
        confidentiality_level=meeting_in.confidentiality_level,
        related_project_id=meeting_in.related_project_id,
        start_time=meeting_in.start_time,
        end_time=meeting_in.end_time,
        location=meeting_in.location,
        created_by_user_id=current_user.id,
        status=MeetingStatus.PLANNING,
        visibility_scope_type=meeting_in.visibility_scope_type,
        visibility_min_role_level=meeting_in.visibility_min_role_level,
        visibility_user_ids=meeting_in.visibility_user_ids,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(meeting)
    db.flush()
    
    # 添加创建者作为主持人
    host = MeetingParticipant(
        meeting_id=meeting.id,
        user_id=current_user.id,
        role=ParticipantRole.HOST,
        attendance_status=AttendanceStatus.ATTENDING
    )
    db.add(host)
    
    # 添加其他参与者
    if meeting_in.participant_ids:
        for user_id in meeting_in.participant_ids:
            if user_id != current_user.id:
                participant = MeetingParticipant(
                    meeting_id=meeting.id,
                    user_id=user_id,
                    role=ParticipantRole.ATTENDEE,
                    attendance_status=AttendanceStatus.INVITED
                )
                db.add(participant)
    
    # 如果关联项目，创建项目事件
    if meeting_in.related_project_id:
        event = ProjectEvent(
            project_id=meeting_in.related_project_id,
            event_type=ProjectEventType.MEETING_HELD,
            title=f"座谈会：{meeting.title}",
            description=f"时间：{meeting.start_time}",
            created_by_user_id=current_user.id,
            related_meeting_id=meeting.id,
            created_at=datetime.utcnow()
        )
        db.add(event)
    
    db.commit()
    db.refresh(meeting)
    
    return meeting_to_read(meeting, db)


@router.get("/{meeting_id}", response_model=MeetingRead)
def get_meeting(
    meeting_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取座谈会详情"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.is_deleted == False
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="座谈会不存在"
        )
    
    if not check_meeting_visibility(meeting, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此座谈会"
        )
    
    return meeting_to_read(meeting, db)


@router.put("/{meeting_id}", response_model=MeetingRead)
def update_meeting(
    meeting_id: int,
    meeting_in: MeetingUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """更新座谈会（仅管理员）"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.is_deleted == False
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="座谈会不存在"
        )
    
    update_data = meeting_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meeting, field, value)
    
    meeting.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(meeting)
    
    return meeting_to_read(meeting, db)


@router.delete("/{meeting_id}")
def delete_meeting(
    meeting_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """删除座谈会（仅管理员）"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.is_deleted == False
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="座谈会不存在"
        )
    
    meeting.is_deleted = True
    meeting.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "座谈会已删除"}


# ============ 参与者管理 ============

@router.post("/{meeting_id}/participants")
def add_participant(
    meeting_id: int,
    participant_in: MeetingParticipantCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """添加参与者（仅管理员）"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.is_deleted == False
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="座谈会不存在"
        )
    
    existing = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == meeting_id,
        MeetingParticipant.user_id == participant_in.user_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户已是参与者"
        )
    
    participant = MeetingParticipant(
        meeting_id=meeting_id,
        user_id=participant_in.user_id,
        role=participant_in.role,
        attendance_status=AttendanceStatus.INVITED
    )
    db.add(participant)
    
    # 发送信箱通知给被邀请的用户
    role_name = "参与者" if participant_in.role == ParticipantRole.ATTENDEE else "可选参与者"
    inbox_item = InboxItem(
        user_id=participant_in.user_id,
        category=InboxCategory.SYSTEM,
        title=f"座谈会邀请：{meeting.title}",
        content=f"{current_user.name} 邀请您作为{role_name}参加座谈会「{meeting.title}」，时间：{meeting.start_time.strftime('%Y年%m月%d日 %H:%M')}",
        related_object_type="MEETING",
        related_object_id=meeting_id,
        is_read=False
    )
    db.add(inbox_item)
    
    db.commit()
    
    return {"message": "参与者已添加"}


@router.put("/{meeting_id}/participants/{user_id}/attendance")
def update_attendance(
    meeting_id: int,
    user_id: int,
    attendance_in: AttendanceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新出席状态"""
    participant = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == meeting_id,
        MeetingParticipant.user_id == user_id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="参与者不存在"
        )
    
    # 只有本人或管理员可以更新
    if user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能更新自己的出席状态"
        )
    
    participant.attendance_status = attendance_in.attendance_status
    db.commit()
    
    return {"message": "出席状态已更新"}


# ============ 外部嘉宾 ============

@router.post("/{meeting_id}/guests", response_model=ExternalGuestRead)
def add_guest(
    meeting_id: int,
    guest_in: ExternalGuestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """添加外部嘉宾"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.is_deleted == False
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="座谈会不存在"
        )
    
    if not check_meeting_visibility(meeting, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权操作此座谈会"
        )
    
    # 处理邀请人列表（可选，支持多选）
    inviter_ids = guest_in.invited_by_user_ids or []
    inviter_names = []
    primary_inviter_id = None
    
    if inviter_ids:
        # 查询所有邀请人
        inviters = db.query(User).filter(User.id.in_(inviter_ids)).all()
        inviter_names = [u.name for u in inviters]
        if inviters:
            primary_inviter_id = inviters[0].id  # 第一个作为主要邀请人（向后兼容）
    
    guest = ExternalGuest(
        meeting_id=meeting_id,
        name=guest_in.name,
        organization=guest_in.organization,
        title=guest_in.title,
        contact=guest_in.contact,
        notes=guest_in.notes,
        invited_by_user_id=primary_inviter_id,
        invited_by_user_ids=inviter_ids if inviter_ids else None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(guest)
    db.commit()
    db.refresh(guest)
    
    return ExternalGuestRead(
        id=guest.id,
        meeting_id=guest.meeting_id,
        name=guest.name,
        organization=guest.organization,
        title=guest.title,
        contact=guest.contact,
        notes=guest.notes,
        invited_by_user_id=guest.invited_by_user_id,
        invited_by_user_ids=guest.invited_by_user_ids,
        invited_by_name=inviter_names[0] if inviter_names else None,
        invited_by_names=inviter_names if inviter_names else None,
        created_at=guest.created_at
    )


@router.delete("/{meeting_id}/guests/{guest_id}")
def delete_guest(
    meeting_id: int,
    guest_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除外部嘉宾（邀请人或管理员/联创可删除）"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.is_deleted == False
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="座谈会不存在"
        )
    
    guest = db.query(ExternalGuest).filter(
        ExternalGuest.id == guest_id,
        ExternalGuest.meeting_id == meeting_id,
        ExternalGuest.is_deleted == False
    ).first()
    
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="嘉宾不存在"
        )
    
    # 只有邀请人、管理员或联合创始人可以删除
    is_inviter = (
        guest.invited_by_user_id == current_user.id or
        (guest.invited_by_user_ids and current_user.id in guest.invited_by_user_ids)
    )
    can_delete = (
        is_inviter or
        current_user.is_admin or
        (current_user.highest_role_level and current_user.highest_role_level >= 3)
    )
    
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权删除此嘉宾"
        )
    
    guest.is_deleted = True
    guest.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "嘉宾已删除"}


@router.delete("/{meeting_id}/participants/{user_id}")
def remove_participant(
    meeting_id: int,
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """移除参会人员（仅管理员）"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.is_deleted == False
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="座谈会不存在"
        )
    
    participant = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == meeting_id,
        MeetingParticipant.user_id == user_id
    ).first()
    
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="参会人员不存在"
        )
    
    # 不能移除主持人
    if participant.role == ParticipantRole.HOST:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能移除会议主持人"
        )
    
    db.delete(participant)
    db.commit()
    
    return {"message": "参会人员已移除"}


@router.get("/guests/my-stats")
def get_my_guest_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取我邀请的外部嘉宾统计"""
    from sqlalchemy import or_
    
    # 统计用户邀请的外部嘉宾数量
    total_invited = db.query(ExternalGuest).filter(
        ExternalGuest.is_deleted == False,
        or_(
            ExternalGuest.invited_by_user_id == current_user.id,
            ExternalGuest.invited_by_user_ids.contains([current_user.id])
        )
    ).count()
    
    return {
        "total_invited_guests": total_invited
    }


@router.get("/guests/my-invitations", response_model=List[ExternalGuestRead])
def get_my_invitations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取我邀请的所有外部嘉宾"""
    from sqlalchemy import or_, text
    
    # 查询：invited_by_user_id 等于当前用户 或 invited_by_user_ids 包含当前用户ID
    guests = db.query(ExternalGuest).filter(
        ExternalGuest.is_deleted == False,
        or_(
        ExternalGuest.invited_by_user_id == current_user.id,
            ExternalGuest.invited_by_user_ids.contains([current_user.id])
        )
    ).order_by(ExternalGuest.created_at.desc()).all()
    
    result = []
    for g in guests:
        # 获取邀请人名称列表
        inviter_names = []
        if g.invited_by_user_ids:
            inviters = db.query(User).filter(User.id.in_(g.invited_by_user_ids)).all()
            inviter_names = [u.name for u in inviters]
        elif g.invited_by:
            inviter_names = [g.invited_by.name]
        
        result.append(ExternalGuestRead(
            id=g.id,
            meeting_id=g.meeting_id,
            name=g.name,
            organization=g.organization,
            title=g.title,
            contact=g.contact,
            notes=g.notes,
            invited_by_user_id=g.invited_by_user_id,
            invited_by_user_ids=g.invited_by_user_ids,
            invited_by_name=inviter_names[0] if inviter_names else None,
            invited_by_names=inviter_names if inviter_names else None,
            created_at=g.created_at
        ))
    
    return result


# ============ 会议纪要 ============

@router.get("/{meeting_id}/minutes", response_model=MeetingMinutesRead)
def get_minutes(
    meeting_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取会议纪要"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.is_deleted == False
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="座谈会不存在"
        )
    
    if not check_meeting_visibility(meeting, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此座谈会"
        )
    
    if not meeting.minutes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会议纪要不存在"
        )
    
    return MeetingMinutesRead(
        meeting_id=meeting.minutes.meeting_id,
        content=meeting.minutes.content,
        attachments=meeting.minutes.attachments,
        created_by_user_id=meeting.minutes.created_by_user_id,
        created_by_name=meeting.minutes.created_by.name if meeting.minutes.created_by else None,
        created_at=meeting.minutes.created_at,
        updated_at=meeting.minutes.updated_at
    )


@router.post("/{meeting_id}/minutes", response_model=MeetingMinutesRead)
def create_or_update_minutes(
    meeting_id: int,
    minutes_in: MeetingMinutesCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建/更新会议纪要"""
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id,
        Meeting.is_deleted == False
    ).first()
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="座谈会不存在"
        )
    
    # 检查编辑权限：仅管理员可以编辑会议纪要
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="仅管理员可以编辑会议纪要"
        )
    
    if meeting.minutes:
        meeting.minutes.content = minutes_in.content
        meeting.minutes.attachments = minutes_in.attachments
        meeting.minutes.updated_at = datetime.utcnow()
    else:
        minutes = MeetingMinutes(
            meeting_id=meeting_id,
            content=minutes_in.content,
            attachments=minutes_in.attachments,
            created_by_user_id=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(minutes)
    
    # 创建项目事件
    if meeting.related_project_id:
        event = ProjectEvent(
            project_id=meeting.related_project_id,
            event_type=ProjectEventType.MEETING_MINUTES_ADDED,
            title=f"会议纪要更新：{meeting.title}",
            description=minutes_in.content[:200],
            created_by_user_id=current_user.id,
            related_meeting_id=meeting_id,
            created_at=datetime.utcnow()
        )
        db.add(event)
    
    db.commit()
    db.refresh(meeting)
    
    return MeetingMinutesRead(
        meeting_id=meeting.minutes.meeting_id,
        content=meeting.minutes.content,
        attachments=meeting.minutes.attachments,
        created_by_user_id=meeting.minutes.created_by_user_id,
        created_by_name=meeting.minutes.created_by.name if meeting.minutes.created_by else None,
        created_at=meeting.minutes.created_at,
        updated_at=meeting.minutes.updated_at
    )

