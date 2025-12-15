"""
元征 · 合伙人赋能平台 - 需求 API
需求发布、响应、审核、修改/废弃流程
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import (
    get_db, get_current_active_user, get_current_admin_user
)
from app.models.user import User
from app.models.project import (
    Project, ProjectMember, ProjectEvent,
    ProjectReviewStatus, VisibilityScopeType,
    ProjectMemberRole, ProjectEventType
)
from app.models.demand import (
    Demand, DemandParticipant, DemandResponse,
    DemandResponseChangeRequest,
    DemandStatus, DemandResponseStatus,
    ChangeRequestStatus, ChangeRequestType
)
from app.models.notification import InboxItem, InboxCategory
from app.schemas.demand import (
    DemandCreate, DemandUpdate, DemandRead, DemandList,
    DemandParticipantRead,
    DemandResponseCreate, DemandResponseRead, DemandResponseReview,
    MarkResourceUsed,
    ChangeRequestCreate, ChangeRequestRead,
    ProviderDecision, AdminDecision
)

router = APIRouter(prefix="/demands", tags=["需求"])


def check_demand_visibility(demand: Demand, user: User) -> bool:
    """检查用户是否可以查看需求"""
    if user.is_admin:
        return True
    
    if demand.visibility_scope_type == VisibilityScopeType.ALL:
        return True
    elif demand.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL:
        return user.highest_role_level >= (demand.visibility_min_role_level or 0)
    elif demand.visibility_scope_type == VisibilityScopeType.CUSTOM:
        return user.id in (demand.visibility_user_ids or [])
    
    return False


def is_demand_owner(demand: Demand, user_id: int) -> bool:
    """检查用户是否是需求owner"""
    return demand.owner_user_id == user_id


def demand_to_read(demand: Demand, db: Session) -> DemandRead:
    """将 Demand 模型转换为 DemandRead"""
    participants = []
    for p in demand.participants:
        participants.append(DemandParticipantRead(
            user_id=p.user_id,
            user_name=p.user.name if p.user else "",
            is_owner=p.is_owner
        ))
    
    response_count = demand.responses.filter_by(is_deleted=False).count()
    
    return DemandRead(
        id=demand.id,
        project_id=demand.project_id,
        project_name=demand.project.name if demand.project else None,
        group_id=demand.group_id,
        title=demand.title,
        description=demand.description,
        business_type=demand.business_type,
        industry=demand.industry,
        status=demand.status,
        expected_reward=demand.expected_reward,
        owner_user_id=demand.owner_user_id,
        owner_name=demand.owner.name if demand.owner else None,
        visibility_scope_type=demand.visibility_scope_type,
        visibility_min_role_level=demand.visibility_min_role_level,
        created_at=demand.created_at,
        updated_at=demand.updated_at,
        participants=participants,
        response_count=response_count
    )


@router.get("/my-responses/stats")
def get_my_responses_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的需求响应统计"""
    # 统计用户响应的需求数量
    total_responses = db.query(DemandResponse).filter(
        DemandResponse.responder_id == current_user.id,
        DemandResponse.is_deleted == False
    ).count()
    
    # 统计被接受的响应数量 (已接受待使用 + 已使用)
    accepted_responses = db.query(DemandResponse).filter(
        DemandResponse.responder_id == current_user.id,
        DemandResponse.is_deleted == False,
        DemandResponse.status.in_([
            DemandResponseStatus.ACCEPTED_PENDING_USAGE,
            DemandResponseStatus.USED
        ])
    ).count()
    
    # 统计已使用/完成的响应数量
    used_responses = db.query(DemandResponse).filter(
        DemandResponse.responder_id == current_user.id,
        DemandResponse.is_deleted == False,
        DemandResponse.status == DemandResponseStatus.USED
    ).count()
    
    return {
        "total_responses": total_responses,
        "accepted_responses": accepted_responses,
        "used_responses": used_responses
    }


@router.get("/my-responses", response_model=List[DemandResponseRead])
def get_my_responses(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """获取当前用户的所有需求响应"""
    responses = db.query(DemandResponse).filter(
        DemandResponse.responder_id == current_user.id,
        DemandResponse.is_deleted == False
    ).order_by(DemandResponse.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for r in responses:
        demand = r.demand
        result.append(DemandResponseRead(
            id=r.id,
            demand_id=r.demand_id,
            demand_title=demand.title if demand else None,
            demand_project_name=demand.project.name if demand and demand.project else None,
            responder_id=r.responder_id,
            responder_name=current_user.name,
            proposal=r.proposal,
            expected_reward=r.expected_reward,
            final_reward=r.final_reward,
            status=r.status,
            created_at=r.created_at,
            updated_at=r.updated_at
        ))
    
    return result


@router.get("", response_model=DemandList)
def list_demands(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project_id: Optional[int] = Query(None, description="按项目筛选"),
    status_filter: Optional[DemandStatus] = Query(None, alias="status"),
    my_demands: bool = Query(False, description="只看我发布的需求"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取需求列表"""
    query = db.query(Demand).filter(Demand.is_deleted == False)
    
    if project_id:
        query = query.filter(Demand.project_id == project_id)
    
    if status_filter:
        query = query.filter(Demand.status == status_filter)
    
    if my_demands:
        query = query.filter(Demand.owner_user_id == current_user.id)
    
    # 应用可见性过滤
    if not current_user.is_admin:
        query = query.filter(
            (Demand.visibility_scope_type == VisibilityScopeType.ALL) |
            (
                (Demand.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL) &
                (Demand.visibility_min_role_level <= current_user.highest_role_level)
            )
        )
    
    total = query.count()
    demands = query.order_by(
        Demand.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    items = [demand_to_read(d, db) for d in demands]
    
    return DemandList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("", response_model=List[DemandRead])
def create_demand(
    demand_in: DemandCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    发布需求
    
    支持多项目关联：会为每个项目创建一条需求记录
    """
    created_demands = []
    group_id = None
    
    for idx, project_id in enumerate(demand_in.project_ids):
        # 验证项目
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.is_deleted == False
        ).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"项目 {project_id} 不存在"
            )
        
        # 检查是否是项目负责人
        is_owner = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == current_user.id,
            ProjectMember.role_in_project == ProjectMemberRole.OWNER,
            ProjectMember.leave_time.is_(None)
        ).first()
        
        if not is_owner and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"您不是项目 {project.name} 的负责人"
            )
        
        # 创建需求
        demand = Demand(
            project_id=project_id,
            title=demand_in.title,
            description=demand_in.description,
            business_type=demand_in.business_type,
            industry=demand_in.industry,
            status=DemandStatus.OPEN,
            expected_reward=demand_in.expected_reward,
            owner_user_id=current_user.id,
            visibility_scope_type=demand_in.visibility_scope_type,
            visibility_min_role_level=demand_in.visibility_min_role_level,
            visibility_user_ids=demand_in.visibility_user_ids,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(demand)
        db.flush()
        
        # 设置 group_id（第一个需求作为主需求）
        if idx == 0:
            group_id = demand.id
        demand.group_id = group_id
        
        # 添加参与人
        for participant_id in demand_in.participant_ids:
            participant = DemandParticipant(
                demand_id=demand.id,
                user_id=participant_id,
                is_owner=(participant_id == current_user.id)
            )
            db.add(participant)
        
        # 创建项目事件
        event = ProjectEvent(
            project_id=project_id,
            event_type=ProjectEventType.DEMAND_PUBLISHED,
            title=f"需求发布：{demand.title}",
            description=f"激励形式：{demand.expected_reward}",
            created_by_user_id=current_user.id,
            related_demand_id=demand.id,
            created_at=datetime.utcnow()
        )
        db.add(event)
        
        created_demands.append(demand)
    
    db.commit()
    
    return [demand_to_read(d, db) for d in created_demands]


@router.get("/{demand_id}", response_model=DemandRead)
def get_demand(
    demand_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取需求详情"""
    demand = db.query(Demand).filter(
        Demand.id == demand_id,
        Demand.is_deleted == False
    ).first()
    
    if not demand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="需求不存在"
        )
    
    if not check_demand_visibility(demand, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此需求"
        )
    
    return demand_to_read(demand, db)


@router.put("/{demand_id}", response_model=DemandRead)
def update_demand(
    demand_id: int,
    demand_in: DemandUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新需求（需要是 owner 或管理员）"""
    demand = db.query(Demand).filter(
        Demand.id == demand_id,
        Demand.is_deleted == False
    ).first()
    
    if not demand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="需求不存在"
        )
    
    if not current_user.is_admin and not is_demand_owner(demand, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要 owner 或管理员权限"
        )
    
    update_data = demand_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(demand, field, value)
    
    demand.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(demand)
    
    return demand_to_read(demand, db)


# ============ 需求响应 API ============

@router.get("/{demand_id}/responses", response_model=List[DemandResponseRead])
def list_responses(
    demand_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取需求的所有响应"""
    demand = db.query(Demand).filter(
        Demand.id == demand_id,
        Demand.is_deleted == False
    ).first()
    
    if not demand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="需求不存在"
        )
    
    if not check_demand_visibility(demand, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此需求"
        )
    
    responses = demand.responses.filter_by(is_deleted=False).all()
    
    return [
        DemandResponseRead(
            id=r.id,
            demand_id=r.demand_id,
            demand_title=demand.title,
            responder_id=r.responder_id,
            responder_name=r.responder.name if r.responder else None,
            proposal=r.proposal,
            expected_reward=r.expected_reward,
            final_reward=r.final_reward,
            status=r.status,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in responses
    ]


@router.post("/responses", response_model=DemandResponseRead)
def create_response(
    response_in: DemandResponseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """响应需求"""
    demand = db.query(Demand).filter(
        Demand.id == response_in.demand_id,
        Demand.is_deleted == False
    ).first()
    
    if not demand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="需求不存在"
        )
    
    if not check_demand_visibility(demand, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权响应此需求"
        )
    
    if demand.status != DemandStatus.OPEN:
        if demand.status == DemandStatus.FULFILLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该需求已完成，不能再响应"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"需求状态不允许响应: {demand.status}"
        )
    
    # 创建响应
    response = DemandResponse(
        demand_id=demand.id,
        responder_id=current_user.id,
        proposal=response_in.proposal,
        expected_reward=response_in.expected_reward,
        status=DemandResponseStatus.SUBMITTED,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(response)
    db.flush()
    
    # 创建项目事件
    event = ProjectEvent(
        project_id=demand.project_id,
        event_type=ProjectEventType.DEMAND_RESPONDED,
        title=f"{current_user.name} 响应了需求「{demand.title}」",
        description=response_in.proposal[:200],
        created_by_user_id=current_user.id,
        related_demand_id=demand.id,
        related_response_id=response.id,
        created_at=datetime.utcnow()
    )
    db.add(event)
    
    # 发送信箱通知给需求 owner
    inbox_item = InboxItem(
        user_id=demand.owner_user_id,
        category=InboxCategory.SYSTEM,
        title=f"新的需求响应",
        content=f"{current_user.name} 响应了您的需求「{demand.title}」，请及时审核。",
        related_object_type="demand",
        related_object_id=demand.id
    )
    db.add(inbox_item)
    
    # 同时通知项目负责人（如果不是需求 owner）
    project = db.query(Project).filter(Project.id == demand.project_id).first()
    if project:
        project_leads = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id,
            ProjectMember.role_in_project == ProjectMemberRole.OWNER,
            ProjectMember.user_id != demand.owner_user_id
        ).all()
        for lead in project_leads:
            lead_inbox = InboxItem(
                user_id=lead.user_id,
                category=InboxCategory.SYSTEM,
                title=f"项目需求有新响应",
                content=f"{current_user.name} 响应了需求「{demand.title}」。",
                related_object_type="demand",
                related_object_id=demand.id
            )
            db.add(lead_inbox)
    
    db.commit()
    db.refresh(response)
    
    return DemandResponseRead(
        id=response.id,
        demand_id=response.demand_id,
        demand_title=demand.title,
        responder_id=response.responder_id,
        responder_name=current_user.name,
        proposal=response.proposal,
        expected_reward=response.expected_reward,
        final_reward=response.final_reward,
        status=response.status,
        created_at=response.created_at,
        updated_at=response.updated_at
    )


@router.post("/responses/{response_id}/review")
def review_response(
    response_id: int,
    review: DemandResponseReview,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """审核需求响应（需求 owner 或管理员）"""
    response = db.query(DemandResponse).filter(
        DemandResponse.id == response_id,
        DemandResponse.is_deleted == False
    ).first()
    
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="响应不存在"
        )
    
    demand = response.demand
    
    if not current_user.is_admin and not is_demand_owner(demand, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要需求 owner 或管理员权限"
        )
    
    if response.status != DemandResponseStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"响应状态不正确: {response.status}"
        )
    
    if review.accepted:
        response.status = DemandResponseStatus.ACCEPTED_PENDING_USAGE
        response.final_reward = review.final_reward or response.expected_reward
        event_type = ProjectEventType.DEMAND_ACCEPTED
        title = f"{response.responder.name if response.responder else '用户'} 的响应被接受"
    else:
        response.status = DemandResponseStatus.REJECTED
        event_type = ProjectEventType.DEMAND_RESPONSE_REJECTED
        title = f"{response.responder.name if response.responder else '用户'} 的响应被拒绝"
    
    response.updated_at = datetime.utcnow()
    
    # 创建项目事件
    event = ProjectEvent(
        project_id=demand.project_id,
        event_type=event_type,
        title=title,
        description=f"最终条款: {response.final_reward}" if review.accepted else review.comment,
        created_by_user_id=current_user.id,
        related_demand_id=demand.id,
        related_response_id=response.id,
        created_at=datetime.utcnow()
    )
    db.add(event)
    
    # 发送通知给响应者
    if review.accepted:
        inbox_item = InboxItem(
            user_id=response.responder_id,
            category="SYSTEM",
            title=f"您对「{demand.title}」的响应已被接受",
            content=f"恭喜！您的响应方案已通过审核。",
            related_object_type="demand",
            related_object_id=demand.id
        )
    else:
        inbox_item = InboxItem(
            user_id=response.responder_id,
            category="SYSTEM",
            title=f"您对「{demand.title}」的响应未通过",
            content=f"您的响应未被采纳。{review.comment if review.comment else ''}",
            related_object_type="demand",
            related_object_id=demand.id
        )
    db.add(inbox_item)
    
    db.commit()
    
    return {"message": f"响应已{'接受' if review.accepted else '拒绝'}"}


@router.post("/responses/{response_id}/mark-used")
def mark_resource_used(
    response_id: int,
    data: MarkResourceUsed,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """确认资源已使用并可选发起Token支付"""
    from app.models.token import TokenTransaction, TokenTransactionDirection, TokenTransactionStatus, TokenAccount
    
    response = db.query(DemandResponse).filter(
        DemandResponse.id == response_id,
        DemandResponse.is_deleted == False
    ).first()
    
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="响应不存在"
        )
    
    demand = response.demand
    
    if not current_user.is_admin and not is_demand_owner(demand, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要需求 owner 或管理员权限"
        )
    
    if response.status != DemandResponseStatus.ACCEPTED_PENDING_USAGE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"响应状态不正确: {response.status}"
        )
    
    # 更新响应状态为已使用
    response.status = DemandResponseStatus.USED
    response.updated_at = datetime.utcnow()
    
    # 同时将需求状态标记为已完成
    demand.status = DemandStatus.FULFILLED
    demand.updated_at = datetime.utcnow()
    
    # 构建描述
    responder_name = response.responder.name if response.responder else '用户'
    reward_desc = ""
    if response.final_reward:
        parts = []
        if response.final_reward.get("token"):
            parts.append(f"Token: {response.final_reward['token']}")
        if response.final_reward.get("equity"):
            parts.append(f"股权: {response.final_reward['equity']}%")
        if response.final_reward.get("other"):
            parts.append(f"其他: {response.final_reward['other']}")
        reward_desc = "，".join(parts)
    
    # 如果发起支付
    token_transaction = None
    if data.initiate_payment and data.token_amount and data.token_amount > 0:
        # 检查发起人余额
        sender_account = db.query(TokenAccount).filter(
            TokenAccount.user_id == current_user.id
        ).first()
        
        if not sender_account or sender_account.balance < data.token_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Token余额不足，当前余额: {sender_account.balance if sender_account else 0}"
            )
        
        # 创建 Token 交易（需要管理员审批）
        token_transaction = TokenTransaction(
            from_user_id=current_user.id,
            to_user_id=response.responder_id,
            amount=data.token_amount,
            direction=TokenTransactionDirection.TRANSFER,
            status=TokenTransactionStatus.PENDING_ADMIN_APPROVAL,
            reason=data.payment_reason or f"需求「{demand.title}」完成结算",
            related_project_id=demand.project_id,
            related_demand_id=demand.id
        )
        db.add(token_transaction)
        db.flush()
        
        reward_desc += f"（已发起Token支付 {data.token_amount}，待审批）"
    
    # 创建项目事件
    event = ProjectEvent(
        project_id=demand.project_id,
        event_type=ProjectEventType.RESOURCE_USED,
        title=f"需求已完成：{demand.title}",
        description=f"资源方: {responder_name}。{data.note or ''}{' 激励条款: ' + reward_desc if reward_desc else ''}",
        created_by_user_id=current_user.id,
        related_demand_id=demand.id,
        related_response_id=response.id,
        related_transaction_id=token_transaction.id if token_transaction else None
    )
    db.add(event)
    
    # 发送通知给资源方
    inbox_item = InboxItem(
        user_id=response.responder_id,
        category=InboxCategory.SYSTEM,
        title=f"需求「{demand.title}」已完成",
        content=f"您响应的需求已被标记为完成。{'Token支付已发起，待管理员审批。' if token_transaction else ''}",
        related_object_type="demand",
        related_object_id=demand.id
    )
    db.add(inbox_item)
    
    db.commit()
    
    result = {
        "message": "需求已标记完成",
        "response_status": response.status.value,
        "responder_id": response.responder_id,
        "responder_name": responder_name
    }
    
    if token_transaction:
        result["token_transaction"] = {
            "id": token_transaction.id,
            "amount": token_transaction.amount,
            "status": token_transaction.status.value
        }
    
    return result


# ============ 响应修改/废弃 API ============

@router.post("/responses/{response_id}/change-requests", response_model=ChangeRequestRead)
def create_change_request(
    response_id: int,
    request_in: ChangeRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """发起响应修改/废弃申请（需求 owner）"""
    response = db.query(DemandResponse).filter(
        DemandResponse.id == response_id,
        DemandResponse.is_deleted == False
    ).first()
    
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="响应不存在"
        )
    
    demand = response.demand
    
    if not current_user.is_admin and not is_demand_owner(demand, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有需求 owner 可以发起修改/废弃申请"
        )
    
    if response.status != DemandResponseStatus.ACCEPTED_PENDING_USAGE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"响应状态不正确: {response.status}"
        )
    
    # 创建申请
    change_request = DemandResponseChangeRequest(
        demand_id=demand.id,
        response_id=response.id,
        change_type=request_in.change_type,
        reason=request_in.reason,
        new_reward=request_in.new_reward,
        note=request_in.note,
        requested_by_user_id=current_user.id,
        requested_at=datetime.utcnow(),
        status=ChangeRequestStatus.PENDING_PROVIDER,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(change_request)
    db.commit()
    db.refresh(change_request)
    
    # TODO: 发送通知给资源方
    
    return ChangeRequestRead(
        id=change_request.id,
        demand_id=change_request.demand_id,
        response_id=change_request.response_id,
        change_type=change_request.change_type,
        reason=change_request.reason,
        new_reward=change_request.new_reward,
        note=change_request.note,
        requested_by_user_id=change_request.requested_by_user_id,
        requested_by_name=current_user.name,
        requested_at=change_request.requested_at,
        status=change_request.status,
        provider_decision=change_request.provider_decision,
        provider_decided_at=change_request.provider_decided_at,
        admin_user_id=change_request.admin_user_id,
        admin_decision=change_request.admin_decision,
        admin_decided_at=change_request.admin_decided_at,
        created_at=change_request.created_at
    )


@router.post("/change-requests/{request_id}/provider-decision")
def provider_decide(
    request_id: int,
    decision: ProviderDecision,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """资源方决策（接受/拒绝修改/废弃）"""
    change_request = db.query(DemandResponseChangeRequest).filter(
        DemandResponseChangeRequest.id == request_id,
        DemandResponseChangeRequest.is_deleted == False
    ).first()
    
    if not change_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="申请不存在"
        )
    
    response = change_request.response
    
    if response.responder_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有资源方可以决策"
        )
    
    if change_request.status != ChangeRequestStatus.PENDING_PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"申请状态不正确: {change_request.status}"
        )
    
    change_request.provider_decision = "ACCEPT" if decision.accept else "REJECT"
    change_request.provider_decided_at = datetime.utcnow()
    
    if decision.accept:
        change_request.status = ChangeRequestStatus.APPROVED
        
        # 更新响应状态
        if change_request.change_type == ChangeRequestType.ABANDON:
            response.status = DemandResponseStatus.ABANDONED
        else:
            response.final_reward = change_request.new_reward
        response.updated_at = datetime.utcnow()
        
        # 创建项目事件
        event_type = (
            ProjectEventType.DEMAND_RESPONSE_ABANDONED 
            if change_request.change_type == ChangeRequestType.ABANDON 
            else ProjectEventType.DEMAND_RESPONSE_MODIFIED
        )
        event = ProjectEvent(
            project_id=change_request.demand.project_id,
            event_type=event_type,
            title=f"响应{'废弃' if change_request.change_type == ChangeRequestType.ABANDON else '修改'}已生效",
            description=change_request.reason,
            created_by_user_id=current_user.id,
            related_demand_id=change_request.demand_id,
            related_response_id=change_request.response_id,
            created_at=datetime.utcnow()
        )
        db.add(event)
    else:
        # 资源方拒绝，推送给管理员裁决
        change_request.status = ChangeRequestStatus.PENDING_ADMIN
    
    change_request.updated_at = datetime.utcnow()
    db.commit()
    
    if decision.accept:
        return {"message": f"{'废弃' if change_request.change_type == ChangeRequestType.ABANDON else '修改'}已生效"}
    else:
        return {"message": "已拒绝，等待管理员裁决"}


@router.post("/change-requests/{request_id}/admin-decision")
def admin_decide(
    request_id: int,
    decision: AdminDecision,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员裁决"""
    change_request = db.query(DemandResponseChangeRequest).filter(
        DemandResponseChangeRequest.id == request_id,
        DemandResponseChangeRequest.is_deleted == False
    ).first()
    
    if not change_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="申请不存在"
        )
    
    if change_request.status != ChangeRequestStatus.PENDING_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"申请状态不正确: {change_request.status}"
        )
    
    response = change_request.response
    
    change_request.admin_user_id = current_user.id
    change_request.admin_decision = decision.decision
    change_request.admin_decided_at = datetime.utcnow()
    
    if decision.decision == "APPROVE":
        change_request.status = ChangeRequestStatus.APPROVED
        if change_request.change_type == ChangeRequestType.ABANDON:
            response.status = DemandResponseStatus.ABANDONED
        else:
            response.final_reward = change_request.new_reward
    elif decision.decision == "ADOPT_NEW":
        change_request.status = ChangeRequestStatus.APPROVED
        response.final_reward = decision.new_reward
    elif decision.decision == "CONTINUE_ORIGINAL":
        change_request.status = ChangeRequestStatus.REJECTED
    else:  # REJECT
        change_request.status = ChangeRequestStatus.REJECTED
    
    response.updated_at = datetime.utcnow()
    change_request.updated_at = datetime.utcnow()
    
    # 创建项目事件
    event = ProjectEvent(
        project_id=change_request.demand.project_id,
        event_type=ProjectEventType.DEMAND_RESPONSE_MODIFIED,
        title=f"管理员裁决：{decision.decision}",
        description=decision.comment,
        created_by_user_id=current_user.id,
        related_demand_id=change_request.demand_id,
        related_response_id=change_request.response_id,
        created_at=datetime.utcnow()
    )
    db.add(event)
    
    db.commit()
    
    return {"message": f"裁决完成: {decision.decision}"}

