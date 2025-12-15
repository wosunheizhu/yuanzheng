"""
元征 · 合伙人赋能平台 - 通知与公告 API
信箱、公告管理
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db, get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.project import VisibilityScopeType
from app.models.notification import Announcement, InboxItem, InboxCategory
from app.schemas.notification import (
    AnnouncementCreate, AnnouncementUpdate, AnnouncementRead, AnnouncementList,
    InboxItemRead, InboxList, InboxStats
)

router = APIRouter(prefix="/notifications", tags=["通知"])


def check_announcement_visibility(announcement: Announcement, user: User) -> bool:
    """检查用户是否可以查看公告"""
    if user.is_admin:
        return True
    
    if announcement.visibility_scope_type == VisibilityScopeType.ALL:
        return True
    elif announcement.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL:
        return user.highest_role_level >= (announcement.visibility_min_role_level or 0)
    elif announcement.visibility_scope_type == VisibilityScopeType.CUSTOM:
        return user.id in (announcement.visibility_user_ids or [])
    
    return False


# ============ 信箱 API ============

@router.get("/inbox", response_model=InboxList)
def list_inbox(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    category: Optional[InboxCategory] = Query(None),
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取信箱消息列表"""
    query = db.query(InboxItem).filter(
        InboxItem.user_id == current_user.id,
        InboxItem.is_deleted == False
    )
    
    if category:
        query = query.filter(InboxItem.category == category)
    
    if unread_only:
        query = query.filter(InboxItem.is_read == False)
    
    total = query.count()
    unread_count = db.query(func.count(InboxItem.id)).filter(
        InboxItem.user_id == current_user.id,
        InboxItem.is_deleted == False,
        InboxItem.is_read == False
    ).scalar()
    
    items = query.order_by(InboxItem.created_at.desc()).offset(skip).limit(limit).all()
    
    return InboxList(
        items=[InboxItemRead.model_validate(i) for i in items],
        total=total,
        unread_count=unread_count,
        page=skip // limit + 1,
        page_size=limit
    )


@router.get("/inbox/stats", response_model=InboxStats)
def get_inbox_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取信箱统计"""
    base_query = db.query(InboxItem).filter(
        InboxItem.user_id == current_user.id,
        InboxItem.is_deleted == False,
        InboxItem.is_read == False
    )
    
    total_unread = base_query.count()
    
    announcement_unread = base_query.filter(
        InboxItem.category == InboxCategory.ANNOUNCEMENT
    ).count()
    
    system_unread = base_query.filter(
        InboxItem.category == InboxCategory.SYSTEM
    ).count()
    
    vote_unread = base_query.filter(
        InboxItem.category == InboxCategory.VOTE
    ).count()
    
    dm_unread = base_query.filter(
        InboxItem.category == InboxCategory.DM
    ).count()
    
    mention_unread = base_query.filter(
        InboxItem.category == InboxCategory.MENTION
    ).count()
    
    return InboxStats(
        total_unread=total_unread,
        announcement_unread=announcement_unread,
        system_unread=system_unread,
        vote_unread=vote_unread,
        dm_unread=dm_unread,
        mention_unread=mention_unread
    )


@router.post("/inbox/{item_id}/read")
def mark_as_read(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """标记消息为已读"""
    item = db.query(InboxItem).filter(
        InboxItem.id == item_id,
        InboxItem.user_id == current_user.id,
        InboxItem.is_deleted == False
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="消息不存在"
        )
    
    item.is_read = True
    db.commit()
    
    return {"message": "已标记为已读"}


@router.post("/inbox/read-all")
def mark_all_as_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    category: Optional[InboxCategory] = Query(None)
):
    """标记所有消息为已读"""
    query = db.query(InboxItem).filter(
        InboxItem.user_id == current_user.id,
        InboxItem.is_deleted == False,
        InboxItem.is_read == False
    )
    
    if category:
        query = query.filter(InboxItem.category == category)
    
    query.update({"is_read": True})
    db.commit()
    
    return {"message": "已标记所有消息为已读"}


@router.delete("/inbox/{item_id}")
def delete_inbox_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除信箱消息"""
    item = db.query(InboxItem).filter(
        InboxItem.id == item_id,
        InboxItem.user_id == current_user.id,
        InboxItem.is_deleted == False
    ).first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="消息不存在"
        )
    
    item.is_deleted = True
    db.commit()
    
    return {"message": "消息已删除"}


# ============ 公告 API ============

@router.get("/announcements", response_model=AnnouncementList)
def list_announcements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取公告列表"""
    query = db.query(Announcement).filter(Announcement.is_deleted == False)
    
    # 应用可见性过滤
    if not current_user.is_admin:
        query = query.filter(
            (Announcement.visibility_scope_type == VisibilityScopeType.ALL) |
            (
                (Announcement.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL) &
                (Announcement.visibility_min_role_level <= current_user.highest_role_level)
            )
        )
    
    total = query.count()
    announcements = query.order_by(
        Announcement.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    items = [
        AnnouncementRead(
            id=a.id,
            title=a.title,
            content=a.content,
            attachments=a.attachments,
            created_by_user_id=a.created_by_user_id,
            created_by_name=a.created_by.name if a.created_by else None,
            visibility_scope_type=a.visibility_scope_type,
            visibility_min_role_level=a.visibility_min_role_level,
            created_at=a.created_at,
            updated_at=a.updated_at
        )
        for a in announcements
    ]
    
    return AnnouncementList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/announcements", response_model=AnnouncementRead)
def create_announcement(
    announcement_in: AnnouncementCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """发布公告（管理员）"""
    announcement = Announcement(
        title=announcement_in.title,
        content=announcement_in.content,
        attachments=announcement_in.attachments,
        created_by_user_id=current_user.id,
        visibility_scope_type=announcement_in.visibility_scope_type,
        visibility_min_role_level=announcement_in.visibility_min_role_level,
        visibility_user_ids=announcement_in.visibility_user_ids,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(announcement)
    db.flush()
    
    # 发送通知给可见用户（包括发布者自己）
    all_users = db.query(User).filter(
        User.is_deleted == False,
        User.is_active == True
    ).all()
    
    for user in all_users:
        if check_announcement_visibility(announcement, user):
            inbox_item = InboxItem(
                user_id=user.id,
                category=InboxCategory.ANNOUNCEMENT,
                title=announcement.title,
                content=announcement.content[:200],
                related_object_type="ANNOUNCEMENT",
                related_object_id=announcement.id,
                is_read=(user.id == current_user.id),  # 发布者自己标记为已读
                created_at=datetime.utcnow()
            )
            db.add(inbox_item)
    
    # 记录审计日志
    from app.models.audit import AuditLog
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE_ANNOUNCEMENT",
        object_type="ANNOUNCEMENT",
        object_id=announcement.id,
        summary=f"发布公告「{announcement.title}」",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(announcement)
    
    return AnnouncementRead(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        attachments=announcement.attachments,
        created_by_user_id=announcement.created_by_user_id,
        created_by_name=current_user.name,
        visibility_scope_type=announcement.visibility_scope_type,
        visibility_min_role_level=announcement.visibility_min_role_level,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at
    )


@router.get("/announcements/{announcement_id}", response_model=AnnouncementRead)
def get_announcement(
    announcement_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取公告详情"""
    announcement = db.query(Announcement).filter(
        Announcement.id == announcement_id,
        Announcement.is_deleted == False
    ).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="公告不存在"
        )
    
    if not check_announcement_visibility(announcement, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此公告"
        )
    
    return AnnouncementRead(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        attachments=announcement.attachments,
        created_by_user_id=announcement.created_by_user_id,
        created_by_name=announcement.created_by.name if announcement.created_by else None,
        visibility_scope_type=announcement.visibility_scope_type,
        visibility_min_role_level=announcement.visibility_min_role_level,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at
    )


@router.put("/announcements/{announcement_id}", response_model=AnnouncementRead)
def update_announcement(
    announcement_id: int,
    announcement_in: AnnouncementUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """更新公告（管理员）"""
    announcement = db.query(Announcement).filter(
        Announcement.id == announcement_id,
        Announcement.is_deleted == False
    ).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="公告不存在"
        )
    
    update_data = announcement_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(announcement, field, value)
    
    announcement.updated_at = datetime.utcnow()
    
    # 记录审计日志
    from app.models.audit import AuditLog
    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE_ANNOUNCEMENT",
        object_type="ANNOUNCEMENT",
        object_id=announcement.id,
        summary=f"更新公告「{announcement.title}」",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(announcement)
    
    return AnnouncementRead(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        attachments=announcement.attachments,
        created_by_user_id=announcement.created_by_user_id,
        created_by_name=announcement.created_by.name if announcement.created_by else None,
        visibility_scope_type=announcement.visibility_scope_type,
        visibility_min_role_level=announcement.visibility_min_role_level,
        created_at=announcement.created_at,
        updated_at=announcement.updated_at
    )


@router.delete("/announcements/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """删除公告（管理员）"""
    announcement = db.query(Announcement).filter(
        Announcement.id == announcement_id,
        Announcement.is_deleted == False
    ).first()
    
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="公告不存在"
        )
    
    # 记录审计日志（在删除前记录）
    from app.models.audit import AuditLog
    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE_ANNOUNCEMENT",
        object_type="ANNOUNCEMENT",
        object_id=announcement.id,
        summary=f"删除公告「{announcement.title}」",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    announcement.is_deleted = True
    announcement.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "公告已删除"}

