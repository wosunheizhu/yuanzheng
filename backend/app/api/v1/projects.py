"""
元征 · 合伙人赋能平台 - 项目 API
项目 CRUD、加入申请、事件时间线
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import (
    get_db, get_current_active_user, 
    get_current_admin_user, get_founding_or_admin_user
)
from app.models.user import User
from app.models.project import (
    Project, ProjectMember, ProjectShare, ProjectJoinRequest, ProjectEvent,
    ProjectRelation,
    ProjectReviewStatus, ProjectBusinessStatus,
    VisibilityScopeType, ProjectMemberRole,
    JoinRequestStatus, ShareOwnerType, ProjectEventType
)
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectRead, ProjectList,
    ProjectMemberRead, ProjectShareRead,
    ProjectJoinRequestCreate, ProjectJoinRequestRead, ProjectJoinRequestReview,
    ProjectEventCreate, ProjectEventRead,
    ProjectReview, ShareAdjustment
)

router = APIRouter(prefix="/projects", tags=["项目"])


def check_project_visibility(project: Project, user: User) -> bool:
    """检查用户是否可以查看项目"""
    if user.is_admin:
        return True
    
    if project.visibility_scope_type == VisibilityScopeType.ALL:
        return True
    elif project.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL:
        return user.highest_role_level >= (project.visibility_min_role_level or 0)
    elif project.visibility_scope_type == VisibilityScopeType.CUSTOM:
        return user.id in (project.visibility_user_ids or [])
    
    return False


def is_project_member(db: Session, project_id: int, user_id: int) -> bool:
    """检查用户是否是项目成员"""
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
        ProjectMember.leave_time.is_(None)
    ).first()
    return member is not None


def is_project_owner(db: Session, project_id: int, user_id: int) -> bool:
    """检查用户是否是项目负责人"""
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
        ProjectMember.role_in_project == ProjectMemberRole.OWNER,
        ProjectMember.leave_time.is_(None)
    ).first()
    return member is not None


def project_to_read(project: Project, db: Session) -> ProjectRead:
    """将 Project 模型转换为 ProjectRead"""
    members = []
    for m in project.members:
        if m.leave_time is None:
            members.append(ProjectMemberRead(
                user_id=m.user_id,
                user_name=m.user.name if m.user else "",
                role_in_project=m.role_in_project,
                duty_description=m.duty_description,
                join_time=m.join_time,
                leave_time=m.leave_time
            ))
    
    shares = []
    for s in project.shares.all():
        owner_name = "元征" if s.owner_type == ShareOwnerType.ORG else None
        if s.owner_type == ShareOwnerType.USER:
            user = db.query(User).filter(User.id == s.owner_id).first()
            owner_name = user.name if user else f"用户{s.owner_id}"
        shares.append(ProjectShareRead(
            id=s.id,
            owner_type=s.owner_type,
            owner_id=s.owner_id,
            owner_name=owner_name,
            percentage=s.percentage,
            effective_from=s.effective_from,
            note=s.note
        ))
    
    return ProjectRead(
        id=project.id,
        name=project.name,
        description=project.description,
        business_type=project.business_type,
        industry=project.industry,
        region=project.region,
        review_status=project.review_status,
        business_status=project.business_status,
        created_by=project.created_by,
        creator_name=project.creator.name if project.creator else None,
        visibility_scope_type=project.visibility_scope_type,
        visibility_min_role_level=project.visibility_min_role_level,
        created_at=project.created_at,
        updated_at=project.updated_at,
        members=members,
        shares=shares
    )


@router.get("", response_model=ProjectList)
def list_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    status_filter: Optional[ProjectBusinessStatus] = Query(None, alias="status"),
    review_status: Optional[ProjectReviewStatus] = Query(None),
    my_projects: bool = Query(False, description="只看我参与的项目"),
    search: Optional[str] = Query(None, description="搜索项目名称/描述"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取项目列表"""
    query = db.query(Project).filter(Project.is_deleted == False)
    
    # 搜索过滤
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Project.name.ilike(search_pattern)) |
            (Project.description.ilike(search_pattern)) |
            (Project.business_type.ilike(search_pattern)) |
            (Project.industry.ilike(search_pattern))
        )
    
    if status_filter:
        query = query.filter(Project.business_status == status_filter)
    
    if review_status:
        query = query.filter(Project.review_status == review_status)
    
    if my_projects:
        my_project_ids = db.query(ProjectMember.project_id).filter(
            ProjectMember.user_id == current_user.id,
            ProjectMember.leave_time.is_(None)
        ).subquery()
        query = query.filter(Project.id.in_(my_project_ids))
    
    # 应用可见性过滤（管理员可见全部）
    if not current_user.is_admin:
        # 简化处理：只过滤 ROLE_MIN_LEVEL 的情况
        query = query.filter(
            (Project.visibility_scope_type == VisibilityScopeType.ALL) |
            (
                (Project.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL) &
                (Project.visibility_min_role_level <= current_user.highest_role_level)
            )
        )
    
    total = query.count()
    projects = query.order_by(
        Project.updated_at.desc()
    ).offset(skip).limit(limit).all()
    
    items = [project_to_read(p, db) for p in projects]
    
    return ProjectList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("", response_model=ProjectRead)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_founding_or_admin_user),
    db: Session = Depends(get_db)
):
    """
    创建新项目
    
    只有联合创始人和管理员可以创建项目
    """
    # 创建项目
    project = Project(
        name=project_in.name,
        description=project_in.description,
        business_type=project_in.business_type,
        industry=project_in.industry,
        region=project_in.region,
        review_status=ProjectReviewStatus.PENDING_REVIEW,
        business_status=project_in.business_status,
        created_by=current_user.id,
        visibility_scope_type=project_in.visibility_scope_type,
        visibility_min_role_level=project_in.visibility_min_role_level,
        visibility_user_ids=project_in.visibility_user_ids,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(project)
    db.flush()
    
    # 添加负责人
    for owner_id in project_in.owner_ids:
        member = ProjectMember(
            project_id=project.id,
            user_id=owner_id,
            role_in_project=ProjectMemberRole.OWNER,
            join_time=datetime.utcnow()
        )
        db.add(member)
    
    # 添加普通成员
    if project_in.member_ids:
        for member_id in project_in.member_ids:
            if member_id not in project_in.owner_ids:
                member = ProjectMember(
                    project_id=project.id,
                    user_id=member_id,
                    role_in_project=ProjectMemberRole.MEMBER,
                    join_time=datetime.utcnow()
                )
                db.add(member)
    
    # 添加股权结构
    # 先添加元征 51%
    org_share = ProjectShare(
        project_id=project.id,
        owner_type=ShareOwnerType.ORG,
        owner_id=0,  # 元征固定ID
        percentage=51,
        effective_from=datetime.utcnow(),
        note="元征固定持股"
    )
    db.add(org_share)
    
    # 添加用户股权
    for share_in in project_in.shares:
        share = ProjectShare(
            project_id=project.id,
            owner_type=share_in.owner_type,
            owner_id=share_in.owner_id,
            percentage=share_in.percentage,
            effective_from=datetime.utcnow(),
            note=share_in.note
        )
        db.add(share)
    
    # 添加项目关联
    if project_in.related_project_ids:
        for related_id in project_in.related_project_ids:
            relation = ProjectRelation(
                project_id=project.id,
                related_project_id=related_id,
                created_by=current_user.id,
                created_at=datetime.utcnow()
            )
            db.add(relation)
    
    # 创建项目事件
    event = ProjectEvent(
        project_id=project.id,
        event_type=ProjectEventType.PROJECT_CREATED,
        title="项目创建",
        description=f"项目「{project.name}」已创建，等待审核",
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(event)
    
    db.commit()
    db.refresh(project)
    
    return project_to_read(project, db)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取项目详情"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    if not check_project_visibility(project, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此项目"
        )
    
    return project_to_read(project, db)


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新项目（需要是负责人或管理员）"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    if not current_user.is_admin and not is_project_owner(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要负责人或管理员权限"
        )
    
    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    
    return project_to_read(project, db)


# ============ 项目审核 ============

@router.post("/{project_id}/review")
def review_project(
    project_id: int,
    review: ProjectReview,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员审核项目"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    if project.review_status != ProjectReviewStatus.PENDING_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"项目状态不正确: {project.review_status}"
        )
    
    if review.approved:
        project.review_status = ProjectReviewStatus.APPROVED
        event_type = ProjectEventType.PROJECT_APPROVED
        title = "项目审核通过"
    else:
        project.review_status = ProjectReviewStatus.REJECTED
        event_type = ProjectEventType.PROJECT_REJECTED
        title = "项目审核驳回"
    
    project.updated_at = datetime.utcnow()
    
    # 创建事件
    event = ProjectEvent(
        project_id=project.id,
        event_type=event_type,
        title=title,
        description=review.comment,
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(event)
    
    # 记录审计日志
    from app.models.audit import AuditLog
    audit_log = AuditLog(
        user_id=current_user.id,
        action="APPROVE_PROJECT" if review.approved else "REJECT_PROJECT",
        object_type="PROJECT",
        object_id=project.id,
        summary=f"{'审核通过' if review.approved else '审核驳回'}项目「{project.name}」，备注：{review.comment or '无'}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    
    return {"message": f"项目已{'通过' if review.approved else '驳回'}"}


# ============ 加入项目 ============

@router.post("/{project_id}/join-requests", response_model=ProjectJoinRequestRead)
def create_join_request(
    project_id: int,
    request_in: ProjectJoinRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """提交加入项目申请"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    if not check_project_visibility(project, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此项目"
        )
    
    # 检查是否已是成员
    if is_project_member(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="您已是项目成员"
        )
    
    # 检查是否有待处理的申请
    existing = db.query(ProjectJoinRequest).filter(
        ProjectJoinRequest.project_id == project_id,
        ProjectJoinRequest.applicant_id == current_user.id,
        ProjectJoinRequest.status == JoinRequestStatus.PENDING,
        ProjectJoinRequest.is_deleted == False
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="您已有待处理的申请"
        )
    
    request = ProjectJoinRequest(
        project_id=project_id,
        applicant_id=current_user.id,
        desired_role=request_in.desired_role,
        duty_description=request_in.duty_description,
        intended_share_pct=request_in.intended_share_pct,
        note=request_in.note,
        status=JoinRequestStatus.PENDING,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    
    return ProjectJoinRequestRead(
        id=request.id,
        project_id=request.project_id,
        project_name=project.name,
        applicant_id=request.applicant_id,
        applicant_name=current_user.name,
        desired_role=request.desired_role,
        duty_description=request.duty_description,
        intended_share_pct=request.intended_share_pct,
        note=request.note,
        status=request.status,
        reviewed_by=request.reviewed_by,
        reviewed_at=request.reviewed_at,
        review_comment=request.review_comment,
        created_at=request.created_at
    )


@router.get("/{project_id}/join-requests", response_model=List[ProjectJoinRequestRead])
def list_join_requests(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取项目的加入申请列表（需要是负责人或管理员）"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    if not current_user.is_admin and not is_project_owner(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要负责人或管理员权限"
        )
    
    requests = db.query(ProjectJoinRequest).filter(
        ProjectJoinRequest.project_id == project_id,
        ProjectJoinRequest.is_deleted == False
    ).order_by(ProjectJoinRequest.created_at.desc()).all()
    
    return [
        ProjectJoinRequestRead(
            id=r.id,
            project_id=r.project_id,
            project_name=project.name,
            applicant_id=r.applicant_id,
            applicant_name=r.applicant.name if r.applicant else None,
            desired_role=r.desired_role,
            duty_description=r.duty_description,
            intended_share_pct=r.intended_share_pct,
            note=r.note,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewed_at=r.reviewed_at,
            review_comment=r.review_comment,
            created_at=r.created_at
        )
        for r in requests
    ]


@router.post("/join-requests/{request_id}/review")
def review_join_request(
    request_id: int,
    review: ProjectJoinRequestReview,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """审核加入申请"""
    request = db.query(ProjectJoinRequest).filter(
        ProjectJoinRequest.id == request_id,
        ProjectJoinRequest.is_deleted == False
    ).first()
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="申请不存在"
        )
    
    if not current_user.is_admin and not is_project_owner(db, request.project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要负责人或管理员权限"
        )
    
    if request.status != JoinRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"申请状态不正确: {request.status}"
        )
    
    if review.approved:
        request.status = JoinRequestStatus.APPROVED
        
        # 添加为项目成员
        member = ProjectMember(
            project_id=request.project_id,
            user_id=request.applicant_id,
            role_in_project=request.desired_role,
            duty_description=request.duty_description,
            join_time=datetime.utcnow()
        )
        db.add(member)
        
        # 如果有实际股份，需要从指定股权方扣除
        actual_share = review.actual_share_pct or request.intended_share_pct
        deduct_from_names = []
        if actual_share and actual_share > 0:
            # 必须指定从哪里扣除
            if not review.deductions or len(review.deductions) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="分配股份时必须指定从哪些股权方扣除"
                )
            
            # 验证扣除总额
            total_deduction = sum(d.amount for d in review.deductions)
            if abs(total_deduction - actual_share) > Decimal('0.01'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"扣除总额 ({total_deduction}%) 必须等于分配股份 ({actual_share}%)"
                )
            
            # 处理每个扣除项
            for deduction in review.deductions:
                if deduction.amount <= 0:
                    continue
                    
                # 找到要扣除的股权记录
                deduct_share = db.query(ProjectShare).filter(
                    ProjectShare.id == deduction.share_id,
                    ProjectShare.project_id == request.project_id
                ).first()
                
                if not deduct_share:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"股权记录 {deduction.share_id} 不存在"
                    )
                
                # 检查是否有足够的股份可扣除
                if deduct_share.percentage < deduction.amount:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"股份不足：当前持有 {deduct_share.percentage}%，需要扣除 {deduction.amount}%"
                    )
                
                # 获取被扣除方的名称
                if deduct_share.owner_type == ShareOwnerType.USER:
                    deduct_user = db.query(User).filter(User.id == deduct_share.owner_id).first()
                    deduct_from_names.append(f"{deduct_user.name if deduct_user else f'用户{deduct_share.owner_id}'} {deduction.amount}%")
                else:
                    deduct_from_names.append(f"元征 {deduction.amount}%")
                
                # 扣除股份
                deduct_share.percentage = deduct_share.percentage - deduction.amount
                deduct_share.updated_at = datetime.utcnow()
            
            # 添加新成员的股权记录
            deduct_desc_note = "，".join(deduct_from_names) if deduct_from_names else ""
            new_share = ProjectShare(
                project_id=request.project_id,
                owner_type=ShareOwnerType.USER,
                owner_id=request.applicant_id,
                percentage=actual_share,
                effective_from=datetime.utcnow(),
                note=f"加入项目获得股份，从{deduct_desc_note}转让" if deduct_desc_note else "加入项目获得股份"
            )
            db.add(new_share)
        
        # 创建事件
        applicant = db.query(User).filter(User.id == request.applicant_id).first()
        share_desc = f"，股份: {actual_share}%" if actual_share and actual_share > 0 else ""
        deduct_desc = f"（从{', '.join(deduct_from_names)}转让）" if deduct_from_names else ""
        event = ProjectEvent(
            project_id=request.project_id,
            event_type=ProjectEventType.PROJECT_MEMBER_JOINED,
            title=f"{applicant.name if applicant else '用户'} 加入项目",
            description=f"职责: {request.duty_description}{share_desc}{deduct_desc}",
            created_by_user_id=current_user.id,
            created_at=datetime.utcnow()
        )
        db.add(event)
    else:
        request.status = JoinRequestStatus.REJECTED
        
        # 创建拒绝事件
        event = ProjectEvent(
            project_id=request.project_id,
            event_type=ProjectEventType.PROJECT_JOIN_REJECTED,
            title="加入申请被拒绝",
            description=review.comment,
            created_by_user_id=current_user.id,
            created_at=datetime.utcnow()
        )
        db.add(event)
    
    request.reviewed_by = current_user.id
    request.reviewed_at = datetime.utcnow()
    request.review_comment = review.comment
    request.updated_at = datetime.utcnow()
    
    # 发送通知给申请人
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if review.approved:
        inbox_item = InboxItem(
            user_id=request.applicant_id,
            category="SYSTEM",
            title=f"您已成功加入项目「{project.name if project else ''}」",
            content=f"恭喜！您的加入申请已通过审核，现在可以参与项目了。",
            related_object_type="project",
            related_object_id=request.project_id
        )
    else:
        inbox_item = InboxItem(
            user_id=request.applicant_id,
            category="SYSTEM",
            title=f"加入项目「{project.name if project else ''}」的申请未通过",
            content=f"您的加入申请未通过。{review.comment if review.comment else ''}",
            related_object_type="project",
            related_object_id=request.project_id
        )
    db.add(inbox_item)
    
    db.commit()
    
    return {"message": f"申请已{'通过' if review.approved else '拒绝'}"}


# ============ 项目事件/时间线 ============

@router.get("/{project_id}/events", response_model=List[ProjectEventRead])
def list_project_events(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    event_type: Optional[ProjectEventType] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    """获取项目事件时间线"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    if not check_project_visibility(project, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此项目"
        )
    
    query = db.query(ProjectEvent).filter(
        ProjectEvent.project_id == project_id
    )
    
    if event_type:
        query = query.filter(ProjectEvent.event_type == event_type)
    
    events = query.order_by(
        ProjectEvent.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return [
        ProjectEventRead(
            id=e.id,
            project_id=e.project_id,
            event_type=e.event_type,
            title=e.title,
            description=e.description,
            created_by_user_id=e.created_by_user_id,
            created_by_name=e.created_by.name if e.created_by else None,
            created_at=e.created_at,
            related_demand_id=e.related_demand_id,
            related_response_id=e.related_response_id,
            related_transaction_id=e.related_transaction_id,
            related_meeting_id=e.related_meeting_id,
            related_news_id=e.related_news_id,
            related_value_record_id=e.related_value_record_id,
            old_status=e.old_status,
            new_status=e.new_status,
            share_change_snapshot=e.share_change_snapshot,
            payload=e.payload
        )
        for e in events
    ]


@router.post("/{project_id}/events", response_model=ProjectEventRead)
def create_project_event(
    project_id: int,
    event_in: ProjectEventCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建项目事件（备注/里程碑等）"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 只有项目成员、负责人或管理员可以添加事件
    if not current_user.is_admin and not is_project_member(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要是项目成员才能添加事件"
        )
    
    event = ProjectEvent(
        project_id=project_id,
        event_type=event_in.event_type,
        title=event_in.title,
        description=event_in.description,
        created_by_user_id=current_user.id,
        related_demand_id=event_in.related_demand_id,
        related_response_id=event_in.related_response_id,
        related_transaction_id=event_in.related_transaction_id,
        related_meeting_id=event_in.related_meeting_id,
        related_news_id=event_in.related_news_id,
        payload=event_in.payload,
        created_at=datetime.utcnow()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # 发送通知给项目成员（除了创建者自己）
    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id != current_user.id,
        ProjectMember.leave_time == None  # 未离开的成员
    ).all()
    
    for member in members:
        inbox_item = InboxItem(
            user_id=member.user_id,
            category="SYSTEM",
            title=f"项目动态：{project.name}",
            content=f"{current_user.name} 发布了新动态：{event.title}",
            related_object_type="project",
            related_object_id=project_id
        )
        db.add(inbox_item)
    
    db.commit()
    
    return ProjectEventRead(
        id=event.id,
        project_id=event.project_id,
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        created_by_user_id=event.created_by_user_id,
        created_by_name=current_user.name,
        created_at=event.created_at,
        related_demand_id=event.related_demand_id,
        related_response_id=event.related_response_id,
        related_transaction_id=event.related_transaction_id,
        related_meeting_id=event.related_meeting_id,
        related_news_id=event.related_news_id,
        related_value_record_id=event.related_value_record_id,
        old_status=event.old_status,
        new_status=event.new_status,
        share_change_snapshot=event.share_change_snapshot,
        payload=event.payload
    )


# ============ 编辑项目事件 ============

from app.models.project import ProjectEventEditHistory

@router.put("/{project_id}/events/{event_id}", response_model=ProjectEventRead)
def update_project_event(
    project_id: int,
    event_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    edit_reason: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    编辑项目事件（时间线）
    
    权限：
    - 项目成员可以编辑自己所属项目的事件
    - 管理员可以编辑任意项目的事件
    
    所有编辑都会保留历史记录供查看
    """
    # 验证项目存在
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 获取事件
    event = db.query(ProjectEvent).filter(
        ProjectEvent.id == event_id,
        ProjectEvent.project_id == project_id
    ).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="事件不存在"
        )
    
    # 权限检查：项目成员或管理员
    if not current_user.is_admin and not is_project_member(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要是项目成员或管理员才能编辑事件"
        )
    
    # 检查是否有实际修改
    if title is None and description is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请提供要修改的内容"
        )
    
    # 保存编辑历史
    edit_history = ProjectEventEditHistory(
        event_id=event_id,
        edited_by_user_id=current_user.id,
        old_title=event.title,
        old_description=event.description,
        old_payload=event.payload,
        new_title=title if title is not None else event.title,
        new_description=description if description is not None else event.description,
        new_payload=event.payload,
        edit_reason=edit_reason
    )
    db.add(edit_history)
    
    # 更新事件
    if title is not None:
        event.title = title
    if description is not None:
        event.description = description
    
    db.commit()
    db.refresh(event)
    
    return ProjectEventRead(
        id=event.id,
        project_id=event.project_id,
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        created_by_user_id=event.created_by_user_id,
        created_by_name=event.created_by.name if event.created_by else None,
        created_at=event.created_at,
        related_demand_id=event.related_demand_id,
        related_response_id=event.related_response_id,
        related_transaction_id=event.related_transaction_id,
        related_meeting_id=event.related_meeting_id,
        related_news_id=event.related_news_id,
        related_value_record_id=event.related_value_record_id,
        old_status=event.old_status,
        new_status=event.new_status,
        share_change_snapshot=event.share_change_snapshot,
        payload=event.payload
    )


@router.get("/{project_id}/events/{event_id}/history")
def get_event_edit_history(
    project_id: int,
    event_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取项目事件的编辑历史
    
    任何人都可以查看编辑历史
    """
    # 验证项目存在
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 获取事件
    event = db.query(ProjectEvent).filter(
        ProjectEvent.id == event_id,
        ProjectEvent.project_id == project_id
    ).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="事件不存在"
        )
    
    # 获取编辑历史
    history = db.query(ProjectEventEditHistory).filter(
        ProjectEventEditHistory.event_id == event_id
    ).order_by(ProjectEventEditHistory.created_at.desc()).all()
    
    return [
        {
            "id": h.id,
            "event_id": h.event_id,
            "edited_by_user_id": h.edited_by_user_id,
            "edited_by_name": h.edited_by.name if h.edited_by else None,
            "old_title": h.old_title,
            "old_description": h.old_description,
            "new_title": h.new_title,
            "new_description": h.new_description,
            "edit_reason": h.edit_reason,
            "created_at": h.created_at
        }
        for h in history
    ]


# ============ 股权调整 API ============

@router.post("/{project_id}/shares/adjust", response_model=List[ProjectShareRead])
def adjust_shares(
    project_id: int,
    adjustment: ShareAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    调整项目股权结构
    
    只有项目负责人或管理员可以操作
    会记录到项目时间线
    """
    # 验证项目存在
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 权限检查：只有负责人或管理员可以调整
    if not current_user.is_admin and not is_project_owner(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有项目负责人或管理员可以调整股权结构"
        )
    
    # 验证股份总和（元征51% + 其他49%）
    total_percentage = sum(s.percentage for s in adjustment.shares)
    # 检查是否包含元征的51%
    org_shares = [s for s in adjustment.shares if s.owner_type == ShareOwnerType.ORG and s.owner_id == 0]
    if not org_shares:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="股权结构必须包含元征（owner_type=ORG, owner_id=0）的51%固定持股"
        )
    
    # 获取旧的股权结构快照
    old_shares = db.query(ProjectShare).filter(
        ProjectShare.project_id == project_id
    ).all()
    
    def get_owner_name(owner_type, owner_id):
        if owner_type == ShareOwnerType.ORG or str(owner_type) == 'ORG':
            return "元征"
        user = db.query(User).filter(User.id == owner_id).first()
        return user.name if user else f"用户{owner_id}"
    
    old_snapshot = [
        {
            "owner_type": s.owner_type.value if isinstance(s.owner_type, ShareOwnerType) else s.owner_type,
            "owner_id": s.owner_id,
            "owner_name": get_owner_name(s.owner_type, s.owner_id),
            "percentage": str(s.percentage),
            "note": s.note
        }
        for s in old_shares
    ]
    
    # 删除旧的股权记录
    db.query(ProjectShare).filter(
        ProjectShare.project_id == project_id
    ).delete()
    
    # 添加新的股权记录
    new_shares = []
    for share_item in adjustment.shares:
        owner_name = "元征"
        if share_item.owner_type == ShareOwnerType.USER:
            user = db.query(User).filter(User.id == share_item.owner_id).first()
            owner_name = user.name if user else f"用户{share_item.owner_id}"
        
        share = ProjectShare(
            project_id=project_id,
            owner_type=share_item.owner_type,
            owner_id=share_item.owner_id,
            percentage=share_item.percentage,
            effective_from=datetime.utcnow(),
            note=share_item.note
        )
        db.add(share)
        db.flush()
        
        new_shares.append(ProjectShareRead(
            id=share.id,
            owner_type=share.owner_type,
            owner_id=share.owner_id,
            owner_name=owner_name,
            percentage=share.percentage,
            effective_from=share.effective_from,
            note=share.note
        ))
    
    # 新的股权快照
    new_snapshot = [
        {
            "owner_type": s.owner_type.value if isinstance(s.owner_type, ShareOwnerType) else str(s.owner_type),
            "owner_id": s.owner_id,
            "owner_name": get_owner_name(s.owner_type, s.owner_id),
            "percentage": str(s.percentage),
            "note": s.note
        }
        for s in new_shares
    ]
    
    # 记录项目事件
    event = ProjectEvent(
        project_id=project_id,
        event_type=ProjectEventType.SHARE_STRUCTURE_CHANGED,
        title="股权结构调整",
        description=adjustment.reason,
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow(),
        share_change_snapshot={
            "old": old_snapshot,
            "new": new_snapshot
        }
    )
    db.add(event)
    
    db.commit()
    
    return new_shares


# ============ 项目邀请 ============

from app.models.project import ProjectInvitation, InvitationStatus
from app.schemas.project import ProjectInvitationCreate, ProjectInvitationRead, ProjectInvitationResponse
from app.models.notification import InboxItem


@router.post("/{project_id}/invitations", response_model=ProjectInvitationRead)
def create_invitation(
    project_id: int,
    invitation_in: ProjectInvitationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """邀请成员加入项目"""
    # 验证项目存在
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 只有负责人或管理员可以邀请
    if not current_user.is_admin and not is_project_owner(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要负责人或管理员权限"
        )
    
    # 验证被邀请人存在
    invitee = db.query(User).filter(User.id == invitation_in.invitee_id).first()
    if not invitee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="被邀请用户不存在"
        )
    
    # 检查是否已是成员
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == invitation_in.invitee_id
    ).first()
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该用户已是项目成员"
        )
    
    # 检查是否已有待处理的邀请
    existing_invitation = db.query(ProjectInvitation).filter(
        ProjectInvitation.project_id == project_id,
        ProjectInvitation.invitee_id == invitation_in.invitee_id,
        ProjectInvitation.status == InvitationStatus.PENDING,
        ProjectInvitation.is_deleted == False
    ).first()
    if existing_invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="已有待处理的邀请"
        )
    
    # 创建邀请
    invitation = ProjectInvitation(
        project_id=project_id,
        inviter_id=current_user.id,
        invitee_id=invitation_in.invitee_id,
        proposed_role=invitation_in.proposed_role,
        proposed_duty=invitation_in.proposed_duty,
        proposed_share_pct=invitation_in.proposed_share_pct,
        message=invitation_in.message,
        status=InvitationStatus.PENDING
    )
    db.add(invitation)
    db.flush()
    
    # 发送通知给被邀请人
    inbox_item = InboxItem(
        user_id=invitation_in.invitee_id,
        category="SYSTEM",
        title=f"项目邀请：{project.name}",
        content=f"{current_user.name} 邀请您加入项目「{project.name}」，建议角色：{invitation_in.proposed_role.value}。",
        related_object_type="project_invitation",
        related_object_id=invitation.id
    )
    db.add(inbox_item)
    
    db.commit()
    db.refresh(invitation)
    
    return ProjectInvitationRead(
        id=invitation.id,
        project_id=invitation.project_id,
        project_name=project.name,
        inviter_id=invitation.inviter_id,
        inviter_name=current_user.name,
        invitee_id=invitation.invitee_id,
        invitee_name=invitee.name,
        proposed_role=invitation.proposed_role,
        proposed_duty=invitation.proposed_duty,
        proposed_share_pct=invitation.proposed_share_pct,
        message=invitation.message,
        status=invitation.status.value,
        responded_at=invitation.responded_at,
        response_note=invitation.response_note,
        created_at=invitation.created_at
    )


@router.get("/{project_id}/invitations", response_model=List[ProjectInvitationRead])
def list_project_invitations(
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取项目的邀请列表"""
    # 验证权限
    if not current_user.is_admin and not is_project_owner(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要负责人或管理员权限"
        )
    
    invitations = db.query(ProjectInvitation).filter(
        ProjectInvitation.project_id == project_id,
        ProjectInvitation.is_deleted == False
    ).order_by(ProjectInvitation.created_at.desc()).all()
    
    project = db.query(Project).filter(Project.id == project_id).first()
    
    result = []
    for inv in invitations:
        result.append(ProjectInvitationRead(
            id=inv.id,
            project_id=inv.project_id,
            project_name=project.name if project else None,
            inviter_id=inv.inviter_id,
            inviter_name=inv.inviter.name if inv.inviter else None,
            invitee_id=inv.invitee_id,
            invitee_name=inv.invitee.name if inv.invitee else None,
            proposed_role=inv.proposed_role,
            proposed_duty=inv.proposed_duty,
            proposed_share_pct=inv.proposed_share_pct,
            message=inv.message,
            status=inv.status.value,
            responded_at=inv.responded_at,
            response_note=inv.response_note,
            created_at=inv.created_at
        ))
    
    return result


@router.get("/invitations/my", response_model=List[ProjectInvitationRead])
def list_my_invitations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取我收到的邀请列表"""
    invitations = db.query(ProjectInvitation).filter(
        ProjectInvitation.invitee_id == current_user.id,
        ProjectInvitation.is_deleted == False
    ).order_by(ProjectInvitation.created_at.desc()).all()
    
    result = []
    for inv in invitations:
        project = db.query(Project).filter(Project.id == inv.project_id).first()
        result.append(ProjectInvitationRead(
            id=inv.id,
            project_id=inv.project_id,
            project_name=project.name if project else None,
            inviter_id=inv.inviter_id,
            inviter_name=inv.inviter.name if inv.inviter else None,
            invitee_id=inv.invitee_id,
            invitee_name=inv.invitee.name if inv.invitee else None,
            proposed_role=inv.proposed_role,
            proposed_duty=inv.proposed_duty,
            proposed_share_pct=inv.proposed_share_pct,
            message=inv.message,
            status=inv.status.value,
            responded_at=inv.responded_at,
            response_note=inv.response_note,
            created_at=inv.created_at
        ))
    
    return result


@router.get("/invitations/{invitation_id}")
def get_invitation_detail(
    invitation_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取单个邀请详情（邀请人或被邀请人都可以查看）"""
    invitation = db.query(ProjectInvitation).filter(
        ProjectInvitation.id == invitation_id,
        ProjectInvitation.is_deleted == False
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邀请不存在"
        )
    
    # 检查权限：只有邀请人、被邀请人或管理员可以查看
    if invitation.inviter_id != current_user.id and invitation.invitee_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此邀请"
        )
    
    # 获取项目信息
    project = db.query(Project).filter(Project.id == invitation.project_id).first()
    inviter = db.query(User).filter(User.id == invitation.inviter_id).first()
    invitee = db.query(User).filter(User.id == invitation.invitee_id).first()
    
    return {
        "id": invitation.id,
        "project_id": invitation.project_id,
        "project_name": project.name if project else None,
        "inviter_id": invitation.inviter_id,
        "inviter_name": inviter.name if inviter else None,
        "invitee_id": invitation.invitee_id,
        "invitee_name": invitee.name if invitee else None,
        "proposed_role": invitation.proposed_role.value if invitation.proposed_role else None,
        "proposed_duty": invitation.proposed_duty,
        "proposed_share_pct": float(invitation.proposed_share_pct) if invitation.proposed_share_pct else None,
        "message": invitation.message,
        "status": invitation.status.value,
        "responded_at": invitation.responded_at,
        "response_note": invitation.response_note,
        "created_at": invitation.created_at,
        "updated_at": invitation.updated_at
    }


@router.post("/invitations/{invitation_id}/respond")
def respond_to_invitation(
    invitation_id: int,
    response: ProjectInvitationResponse,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """响应邀请（接受或拒绝）"""
    invitation = db.query(ProjectInvitation).filter(
        ProjectInvitation.id == invitation_id,
        ProjectInvitation.is_deleted == False
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="邀请不存在"
        )
    
    # 只有被邀请人可以响应
    if invitation.invitee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有被邀请人可以响应邀请"
        )
    
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"邀请状态不正确: {invitation.status}"
        )
    
    if response.accepted:
        invitation.status = InvitationStatus.ACCEPTED
        
        # 添加为项目成员
        member = ProjectMember(
            project_id=invitation.project_id,
            user_id=current_user.id,
            role_in_project=invitation.proposed_role,
            duty_description=invitation.proposed_duty or "",
            join_time=datetime.utcnow()
        )
        db.add(member)
        
        # 创建事件
        project = db.query(Project).filter(Project.id == invitation.project_id).first()
        event = ProjectEvent(
            project_id=invitation.project_id,
            event_type=ProjectEventType.PROJECT_MEMBER_JOINED,
            title=f"{current_user.name} 通过邀请加入项目",
            description=f"角色: {invitation.proposed_role.value}，职责: {invitation.proposed_duty or '无'}",
            created_by_user_id=current_user.id,
            created_at=datetime.utcnow()
        )
        db.add(event)
        
        # 通知邀请人
        inbox_item = InboxItem(
            user_id=invitation.inviter_id,
            category="SYSTEM",
            title=f"{current_user.name} 接受了您的邀请",
            content=f"{current_user.name} 已加入项目「{project.name if project else ''}」",
            related_object_type="project_invitation",
            related_object_id=invitation.id
        )
        db.add(inbox_item)
    else:
        invitation.status = InvitationStatus.DECLINED
        
        # 通知邀请人
        project = db.query(Project).filter(Project.id == invitation.project_id).first()
        inbox_item = InboxItem(
            user_id=invitation.inviter_id,
            category="SYSTEM",
            title=f"{current_user.name} 拒绝了您的邀请",
            content=f"{current_user.name} 拒绝加入项目「{project.name if project else ''}」",
            related_object_type="project_invitation",
            related_object_id=invitation.id
        )
        db.add(inbox_item)
    
    invitation.responded_at = datetime.utcnow()
    invitation.response_note = response.note
    invitation.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"邀请已{'接受' if response.accepted else '拒绝'}"}

