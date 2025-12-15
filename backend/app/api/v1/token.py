"""
元征 · 合伙人赋能平台 - Token API
Token 账户、交易、管理员操作
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.token import (
    TokenAccount, TokenTransaction,
    TokenTransactionDirection, TokenTransactionStatus
)
from app.schemas.token_account import (
    TokenAccountRead, TokenTransactionCreate,
    TokenTransactionRead, TokenTransactionList,
    TokenTransactionApprove, TokenTransactionReject,
    TokenTransactionConfirm,
    AdminTokenGrant, AdminTokenDeduct, ProjectDividend
)

router = APIRouter(prefix="/token", tags=["Token"])


def get_user_account(db: Session, user_id: int) -> TokenAccount:
    """获取用户的 Token 账户"""
    account = db.query(TokenAccount).filter(
        TokenAccount.user_id == user_id
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token 账户不存在"
        )
    return account


@router.get("/me/account", response_model=TokenAccountRead)
def get_my_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取我的 Token 账户"""
    return get_user_account(db, current_user.id)


@router.get("/me/transactions", response_model=TokenTransactionList)
def list_my_transactions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    direction: Optional[str] = Query(None, description="筛选方向: in/out"),
    status_filter: Optional[TokenTransactionStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取我的 Token 交易记录"""
    query = db.query(TokenTransaction).filter(
        (TokenTransaction.from_user_id == current_user.id) |
        (TokenTransaction.to_user_id == current_user.id)
    )
    
    if direction == "in":
        query = query.filter(TokenTransaction.to_user_id == current_user.id)
    elif direction == "out":
        query = query.filter(TokenTransaction.from_user_id == current_user.id)
    
    if status_filter:
        query = query.filter(TokenTransaction.status == status_filter)
    
    total = query.count()
    transactions = query.order_by(
        TokenTransaction.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    items = []
    for t in transactions:
        item = TokenTransactionRead(
            id=t.id,
            from_user_id=t.from_user_id,
            to_user_id=t.to_user_id,
            amount=t.amount,
            direction=t.direction,
            related_project_id=t.related_project_id,
            related_demand_id=t.related_demand_id,
            status=t.status,
            reason=t.reason,
            admin_comment=t.admin_comment,
            created_by_user_id=t.created_by_user_id,
            created_at=t.created_at,
            updated_at=t.updated_at,
            from_user_name=t.from_user.name if t.from_user else None,
            to_user_name=t.to_user.name if t.to_user else None,
            project_name=t.related_project.name if t.related_project else None
        )
        items.append(item)
    
    return TokenTransactionList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/transactions", response_model=TokenTransactionRead)
def create_transaction(
    tx_in: TokenTransactionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """发起 Token 转账申请"""
    # 验证接收方
    if tx_in.to_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能给自己转账"
        )
    
    to_user = db.query(User).filter(
        User.id == tx_in.to_user_id,
        User.is_deleted == False,
        User.is_active == True
    ).first()
    if not to_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="接收方用户不存在"
        )
    
    # 验证余额
    my_account = get_user_account(db, current_user.id)
    if my_account.balance < tx_in.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"余额不足，当前余额: {my_account.balance}"
        )
    
    # 创建交易记录
    transaction = TokenTransaction(
        from_user_id=current_user.id,
        to_user_id=tx_in.to_user_id,
        amount=tx_in.amount,
        direction=TokenTransactionDirection.TRANSFER,
        related_project_id=tx_in.related_project_id,
        status=TokenTransactionStatus.PENDING_ADMIN_APPROVAL,
        reason=tx_in.reason,
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return TokenTransactionRead(
        id=transaction.id,
        from_user_id=transaction.from_user_id,
        to_user_id=transaction.to_user_id,
        amount=transaction.amount,
        direction=transaction.direction,
        related_project_id=transaction.related_project_id,
        related_demand_id=transaction.related_demand_id,
        status=transaction.status,
        reason=transaction.reason,
        admin_comment=transaction.admin_comment,
        created_by_user_id=transaction.created_by_user_id,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
        from_user_name=current_user.name,
        to_user_name=to_user.name
    )


# ============ 管理员审核 ============

@router.get("/admin/pending", response_model=List[TokenTransactionRead])
def list_pending_transactions(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取待审核的交易列表"""
    transactions = db.query(TokenTransaction).filter(
        TokenTransaction.status == TokenTransactionStatus.PENDING_ADMIN_APPROVAL
    ).order_by(TokenTransaction.created_at.asc()).all()
    
    items = []
    for t in transactions:
        item = TokenTransactionRead(
            id=t.id,
            from_user_id=t.from_user_id,
            to_user_id=t.to_user_id,
            amount=t.amount,
            direction=t.direction,
            related_project_id=t.related_project_id,
            related_demand_id=t.related_demand_id,
            status=t.status,
            reason=t.reason,
            admin_comment=t.admin_comment,
            created_by_user_id=t.created_by_user_id,
            created_at=t.created_at,
            updated_at=t.updated_at,
            from_user_name=t.from_user.name if t.from_user else None,
            to_user_name=t.to_user.name if t.to_user else None,
            project_name=t.related_project.name if t.related_project else None
        )
        items.append(item)
    
    return items


@router.post("/admin/transactions/{tx_id}/approve")
def approve_transaction(
    tx_id: int,
    data: TokenTransactionApprove,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员审核通过交易"""
    transaction = db.query(TokenTransaction).filter(
        TokenTransaction.id == tx_id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="交易不存在"
        )
    
    if transaction.status != TokenTransactionStatus.PENDING_ADMIN_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"交易状态不正确: {transaction.status}"
        )
    
    transaction.status = TokenTransactionStatus.PENDING_RECEIVER_CONFIRM
    transaction.admin_comment = data.comment
    transaction.updated_at = datetime.utcnow()
    
    # 记录审计日志
    from app.models.audit import AuditLog
    audit_log = AuditLog(
        user_id=current_user.id,
        action="APPROVE_TOKEN_TRANSACTION",
        object_type="TOKEN_TRANSACTION",
        object_id=transaction.id,
        summary=f"审批通过Token交易 {transaction.amount} Token，备注：{data.comment or '无'}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    
    # TODO: 发送通知给收款方
    
    return {"message": "交易已通过审核，等待收款方确认"}


@router.post("/admin/transactions/{tx_id}/reject")
def reject_transaction(
    tx_id: int,
    data: TokenTransactionReject,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员拒绝交易"""
    transaction = db.query(TokenTransaction).filter(
        TokenTransaction.id == tx_id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="交易不存在"
        )
    
    if transaction.status != TokenTransactionStatus.PENDING_ADMIN_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"交易状态不正确: {transaction.status}"
        )
    
    transaction.status = TokenTransactionStatus.REJECTED
    transaction.admin_comment = data.comment
    transaction.updated_at = datetime.utcnow()
    
    # 记录审计日志
    from app.models.audit import AuditLog
    audit_log = AuditLog(
        user_id=current_user.id,
        action="REJECT_TOKEN_TRANSACTION",
        object_type="TOKEN_TRANSACTION",
        object_id=transaction.id,
        summary=f"拒绝Token交易 {transaction.amount} Token，备注：{data.comment or '无'}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    
    return {"message": "交易已拒绝"}


# ============ 收款方确认 ============

@router.post("/transactions/{tx_id}/confirm")
def confirm_transaction(
    tx_id: int,
    data: TokenTransactionConfirm,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """收款方确认/拒绝交易"""
    transaction = db.query(TokenTransaction).filter(
        TokenTransaction.id == tx_id,
        TokenTransaction.to_user_id == current_user.id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="交易不存在或您不是收款方"
        )
    
    if transaction.status != TokenTransactionStatus.PENDING_RECEIVER_CONFIRM:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"交易状态不正确: {transaction.status}"
        )
    
    if data.accept:
        # 再次验证发起方余额
        from_account = get_user_account(db, transaction.from_user_id)
        if from_account.balance < transaction.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="发起方余额不足"
            )
        
        # 执行转账
        to_account = get_user_account(db, current_user.id)
        from_account.balance -= transaction.amount
        to_account.balance += transaction.amount
        from_account.updated_at = datetime.utcnow()
        to_account.updated_at = datetime.utcnow()
        
        transaction.status = TokenTransactionStatus.COMPLETED
        transaction.updated_at = datetime.utcnow()
        db.commit()
        
        # TODO: 生成 ProjectEvent（如有关联项目）
        
        return {"message": "交易已完成"}
    else:
        transaction.status = TokenTransactionStatus.REJECTED
        transaction.updated_at = datetime.utcnow()
        db.commit()
        
        return {"message": "交易已拒绝"}


# ============ 管理员赠与/扣除 ============

@router.post("/admin/grant", response_model=TokenTransactionRead)
def admin_grant_token(
    data: AdminTokenGrant,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员赠与 Token"""
    # 验证目标用户
    target_user = db.query(User).filter(
        User.id == data.user_id,
        User.is_deleted == False
    ).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="目标用户不存在"
        )
    
    # 获取目标账户
    target_account = get_user_account(db, data.user_id)
    
    # 创建交易记录（直接完成）
    transaction = TokenTransaction(
        from_user_id=None,  # 管理员赠与，无发起方
        to_user_id=data.user_id,
        amount=data.amount,
        direction=TokenTransactionDirection.ADMIN_GRANT,
        related_project_id=data.related_project_id,
        status=TokenTransactionStatus.COMPLETED,
        reason=data.reason,
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(transaction)
    
    # 更新余额
    target_account.balance += data.amount
    target_account.updated_at = datetime.utcnow()
    
    # 记录审计日志
    from app.models.audit import AuditLog
    audit_log = AuditLog(
        user_id=current_user.id,
        action="ADMIN_GRANT_TOKEN",
        object_type="TOKEN_TRANSACTION",
        object_id=transaction.id,
        summary=f"赠与用户「{target_user.name}」{data.amount} Token，原因：{data.reason or '无'}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(transaction)
    
    return TokenTransactionRead(
        id=transaction.id,
        from_user_id=transaction.from_user_id,
        to_user_id=transaction.to_user_id,
        amount=transaction.amount,
        direction=transaction.direction,
        related_project_id=transaction.related_project_id,
        related_demand_id=transaction.related_demand_id,
        status=transaction.status,
        reason=transaction.reason,
        admin_comment=transaction.admin_comment,
        created_by_user_id=transaction.created_by_user_id,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
        to_user_name=target_user.name
    )


@router.post("/admin/deduct", response_model=TokenTransactionRead)
def admin_deduct_token(
    data: AdminTokenDeduct,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员扣除 Token"""
    # 验证目标用户
    target_user = db.query(User).filter(
        User.id == data.user_id,
        User.is_deleted == False
    ).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="目标用户不存在"
        )
    
    # 获取目标账户并验证余额
    target_account = get_user_account(db, data.user_id)
    if target_account.balance < data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"目标用户余额不足: {target_account.balance}"
        )
    
    # 创建交易记录（直接完成）
    transaction = TokenTransaction(
        from_user_id=data.user_id,
        to_user_id=None,  # 管理员扣除，无接收方
        amount=data.amount,
        direction=TokenTransactionDirection.ADMIN_DEDUCT,
        related_project_id=data.related_project_id,
        status=TokenTransactionStatus.COMPLETED,
        reason=data.reason,
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(transaction)
    
    # 更新余额
    target_account.balance -= data.amount
    target_account.updated_at = datetime.utcnow()
    
    # 记录审计日志
    from app.models.audit import AuditLog
    audit_log = AuditLog(
        user_id=current_user.id,
        action="ADMIN_DEDUCT_TOKEN",
        object_type="TOKEN_TRANSACTION",
        object_id=transaction.id,
        summary=f"扣除用户「{target_user.name}」{data.amount} Token，原因：{data.reason or '无'}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(transaction)
    
    return TokenTransactionRead(
        id=transaction.id,
        from_user_id=transaction.from_user_id,
        to_user_id=transaction.to_user_id,
        amount=transaction.amount,
        direction=transaction.direction,
        related_project_id=transaction.related_project_id,
        related_demand_id=transaction.related_demand_id,
        status=transaction.status,
        reason=transaction.reason,
        admin_comment=transaction.admin_comment,
        created_by_user_id=transaction.created_by_user_id,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
        from_user_name=target_user.name
    )


# ============ 管理员总览 ============

@router.get("/admin/accounts", response_model=List[TokenAccountRead])
def list_all_accounts(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员查看所有用户的 Token 账户"""
    accounts = db.query(TokenAccount).all()
    return [TokenAccountRead.model_validate(a) for a in accounts]


# ============ 项目分红 ============

@router.post("/admin/dividend", response_model=List[TokenTransactionRead])
def create_dividend(
    dividend_in: ProjectDividend,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    管理员发起项目分红
    
    可批量对多个用户执行分红，direction = DIVIDEND
    分红直接完成，不需要审核流程
    """
    from app.models.project import Project, ProjectEvent, ProjectEventType
    
    # 验证项目存在
    project = db.query(Project).filter(
        Project.id == dividend_in.project_id,
        Project.is_deleted == False
    ).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    results = []
    total_amount = 0
    
    for recipient in dividend_in.recipients:
        # 验证接收方
        to_user = db.query(User).filter(
            User.id == recipient.user_id,
            User.is_deleted == False
        ).first()
        if not to_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"用户 {recipient.user_id} 不存在"
            )
        
        # 创建分红交易记录
        transaction = TokenTransaction(
            from_user_id=None,  # 分红来自系统
            to_user_id=recipient.user_id,
            amount=recipient.amount,
            direction=TokenTransactionDirection.DIVIDEND,
            related_project_id=dividend_in.project_id,
            status=TokenTransactionStatus.COMPLETED,  # 分红直接完成
            reason=dividend_in.description,
            admin_comment=recipient.note,
            created_by_user_id=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(transaction)
        
        # 更新接收方余额
        to_account = db.query(TokenAccount).filter(
            TokenAccount.user_id == recipient.user_id
        ).first()
        if to_account:
            to_account.balance += recipient.amount
            to_account.updated_at = datetime.utcnow()
        
        total_amount += recipient.amount
        
        # 发送通知给接收人
        from app.models.notification import InboxItem, InboxCategory
        inbox_item = InboxItem(
            user_id=recipient.user_id,
            category=InboxCategory.SYSTEM,
            title=f"收到项目分红",
            content=f"您收到来自项目「{project.name}」的分红 {recipient.amount} Token。{dividend_in.description}",
            related_object_type="project",
            related_object_id=project.id
        )
        db.add(inbox_item)
        
        db.flush()
        
        results.append(TokenTransactionRead(
            id=transaction.id,
            from_user_id=None,
            to_user_id=recipient.user_id,
            amount=transaction.amount,
            direction=transaction.direction,
            related_project_id=transaction.related_project_id,
            related_demand_id=None,
            status=transaction.status,
            reason=transaction.reason,
            admin_comment=transaction.admin_comment,
            created_by_user_id=transaction.created_by_user_id,
            created_at=transaction.created_at,
            updated_at=transaction.updated_at,
            to_user_name=to_user.name,
            project_name=project.name
        ))
    
    # 记录项目事件
    event = ProjectEvent(
        project_id=dividend_in.project_id,
        event_type=ProjectEventType.TOKEN_DIVIDEND_DISTRIBUTED,
        title="项目分红发放",
        description=f"已向 {len(dividend_in.recipients)} 位合伙人发放分红，共计 {total_amount} Token。{dividend_in.description}",
        created_by_user_id=current_user.id,
        created_at=datetime.utcnow()
    )
    db.add(event)
    
    # 记录审计日志
    from app.models.audit import AuditLog
    recipient_names = ", ".join([r.get("user_name", f"用户{r['user_id']}") for r in [{"user_id": rec.user_id, "user_name": db.query(User).filter(User.id == rec.user_id).first().name if db.query(User).filter(User.id == rec.user_id).first() else f"用户{rec.user_id}"} for rec in dividend_in.recipients]])
    audit_log = AuditLog(
        user_id=current_user.id,
        action="PROJECT_DIVIDEND",
        object_type="PROJECT",
        object_id=dividend_in.project_id,
        summary=f"项目「{project.name}」分红，共 {total_amount} Token 发放给 {len(dividend_in.recipients)} 人",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    
    return results

