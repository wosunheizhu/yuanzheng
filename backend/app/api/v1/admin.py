"""
元征 · 合伙人赋能平台 - 管理员控制台 API
价值记录、审计日志、统计面板
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.core.deps import get_db, get_current_admin_user
from app.models.user import User
from app.models.project import Project, ProjectEvent, ProjectEventType
from app.models.audit import ValueRecord, AuditLog
from app.schemas.admin import (
    ValueRecordCreate, ValueRecordUpdate, ValueRecordRead, ValueRecordList,
    ValueSummary, AuditLogRead, AuditLogList, AuditLogFilter
)

router = APIRouter(prefix="/admin", tags=["管理员"])


# ============ 价值记录 API ============

@router.get("/value-records", response_model=ValueRecordList)
def list_value_records(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    project_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取价值记录列表"""
    query = db.query(ValueRecord)
    
    if project_id:
        query = query.filter(ValueRecord.related_project_id == project_id)
    
    total = query.count()
    records = query.order_by(
        ValueRecord.record_time.desc()
    ).offset(skip).limit(limit).all()
    
    items = [
        ValueRecordRead(
            id=r.id,
            amount=r.amount,
            currency=r.currency,
            description=r.description,
            related_project_id=r.related_project_id,
            related_project_name=r.related_project.name if r.related_project else None,
            record_time=r.record_time,
            created_by_admin_id=r.created_by_admin_id,
            created_by_name=r.created_by_admin.name if r.created_by_admin else None,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in records
    ]
    
    return ValueRecordList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/value-records", response_model=ValueRecordRead)
def create_value_record(
    record_in: ValueRecordCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """创建价值记录"""
    # 验证项目
    if record_in.related_project_id:
        project = db.query(Project).filter(
            Project.id == record_in.related_project_id,
            Project.is_deleted == False
        ).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="关联项目不存在"
            )
    
    record = ValueRecord(
        amount=record_in.amount,
        currency=record_in.currency,
        description=record_in.description,
        related_project_id=record_in.related_project_id,
        record_time=record_in.record_time,
        created_by_admin_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(record)
    db.flush()
    
    # 如果关联项目，创建项目事件
    if record_in.related_project_id:
        event = ProjectEvent(
            project_id=record_in.related_project_id,
            event_type=ProjectEventType.PROJECT_VALUE_RECORDED,
            title=f"项目价值记录：{record.amount} {record.currency}",
            description=record.description,
            created_by_user_id=current_user.id,
            related_value_record_id=record.id,
            created_at=datetime.utcnow()
        )
        db.add(event)
    
    # 记录审计日志
    audit_log = AuditLog(
        user_id=current_user.id,
        action="CREATE_VALUE_RECORD",
        object_type="VALUE_RECORD",
        object_id=record.id,
        summary=f"创建价值记录：{record.amount} {record.currency}，{record.description[:50]}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(record)
    
    return ValueRecordRead(
        id=record.id,
        amount=record.amount,
        currency=record.currency,
        description=record.description,
        related_project_id=record.related_project_id,
        related_project_name=record.related_project.name if record.related_project else None,
        record_time=record.record_time,
        created_by_admin_id=record.created_by_admin_id,
        created_by_name=current_user.name,
        created_at=record.created_at,
        updated_at=record.updated_at
    )


@router.put("/value-records/{record_id}", response_model=ValueRecordRead)
def update_value_record(
    record_id: int,
    record_in: ValueRecordUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """更新价值记录"""
    record = db.query(ValueRecord).filter(ValueRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="价值记录不存在"
        )
    
    update_data = record_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)
    
    record.updated_at = datetime.utcnow()
    
    # 记录审计日志
    audit_log = AuditLog(
        user_id=current_user.id,
        action="UPDATE_VALUE_RECORD",
        object_type="VALUE_RECORD",
        object_id=record.id,
        summary=f"更新价值记录：{record.amount} {record.currency}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    db.refresh(record)
    
    return ValueRecordRead(
        id=record.id,
        amount=record.amount,
        currency=record.currency,
        description=record.description,
        related_project_id=record.related_project_id,
        related_project_name=record.related_project.name if record.related_project else None,
        record_time=record.record_time,
        created_by_admin_id=record.created_by_admin_id,
        created_by_name=record.created_by_admin.name if record.created_by_admin else None,
        created_at=record.created_at,
        updated_at=record.updated_at
    )


@router.delete("/value-records/{record_id}")
def delete_value_record(
    record_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """删除价值记录"""
    record = db.query(ValueRecord).filter(ValueRecord.id == record_id).first()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="价值记录不存在"
        )
    
    # 记录审计日志
    audit_log = AuditLog(
        user_id=current_user.id,
        action="DELETE_VALUE_RECORD",
        object_type="VALUE_RECORD",
        object_id=record.id,
        summary=f"删除价值记录：{record.amount} {record.currency}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.delete(record)
    db.commit()
    
    return {"message": "价值记录已删除"}


@router.get("/value-summary", response_model=ValueSummary)
def get_value_summary(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    currency: str = Query("CNY")
):
    """获取价值汇总（用于仪表盘曲线）"""
    # 计算总价值
    total_value = db.query(func.sum(ValueRecord.amount)).filter(
        ValueRecord.currency == currency
    ).scalar() or Decimal("0")
    
    # 统计项目数
    project_count = db.query(func.count(func.distinct(ValueRecord.related_project_id))).filter(
        ValueRecord.related_project_id.isnot(None)
    ).scalar()
    
    # 按月统计
    monthly_data = []
    records = db.query(
        extract('year', ValueRecord.record_time).label('year'),
        extract('month', ValueRecord.record_time).label('month'),
        func.sum(ValueRecord.amount).label('value')
    ).filter(
        ValueRecord.currency == currency
    ).group_by(
        extract('year', ValueRecord.record_time),
        extract('month', ValueRecord.record_time)
    ).order_by(
        extract('year', ValueRecord.record_time),
        extract('month', ValueRecord.record_time)
    ).all()
    
    cumulative_value = Decimal("0")
    for r in records:
        cumulative_value += r.value or Decimal("0")
        monthly_data.append({
            "month": f"{int(r.year)}-{int(r.month):02d}",
            "value": float(r.value or 0),
            "cumulative": float(cumulative_value)
        })
    
    return ValueSummary(
        total_value=total_value,
        currency=currency,
        project_count=project_count,
        monthly_data=monthly_data
    )


# ============ 审计日志 API ============

@router.get("/audit-logs", response_model=AuditLogList)
def list_audit_logs(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    object_type: Optional[str] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    """获取审计日志列表"""
    query = db.query(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    if object_type:
        query = query.filter(AuditLog.object_type == object_type)
    
    if start_time:
        query = query.filter(AuditLog.created_at >= start_time)
    
    if end_time:
        query = query.filter(AuditLog.created_at <= end_time)
    
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    
    items = [
        AuditLogRead(
            id=log.id,
            user_id=log.user_id,
            user_name=log.user.name if log.user else None,
            action=log.action,
            object_type=log.object_type,
            object_id=log.object_id,
            summary=log.summary,
            created_at=log.created_at
        )
        for log in logs
    ]
    
    return AuditLogList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.get("/audit-logs/actions")
def get_audit_actions(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取所有审计动作类型"""
    actions = db.query(func.distinct(AuditLog.action)).all()
    return {"actions": [a[0] for a in actions]}


@router.get("/audit-logs/object-types")
def get_audit_object_types(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取所有审计对象类型"""
    object_types = db.query(func.distinct(AuditLog.object_type)).all()
    return {"object_types": [t[0] for t in object_types]}


# ============ 统计面板 API ============

@router.get("/dashboard/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取管理员仪表盘统计"""
    from app.models.token import TokenAccount, TokenTransaction
    from app.models.resource import Resource
    
    # 用户统计
    total_users = db.query(func.count(User.id)).filter(
        User.is_deleted == False,
        User.is_active == True
    ).scalar()
    
    # 项目统计
    total_projects = db.query(func.count(Project.id)).filter(
        Project.is_deleted == False
    ).scalar()
    
    pending_projects = db.query(func.count(Project.id)).filter(
        Project.is_deleted == False,
        Project.review_status == "PENDING_REVIEW"
    ).scalar()
    
    # Token 统计
    total_token_balance = db.query(func.sum(TokenAccount.balance)).scalar() or 0
    
    pending_transactions = db.query(func.count(TokenTransaction.id)).filter(
        TokenTransaction.status == "PENDING_ADMIN_APPROVAL"
    ).scalar()
    
    # 资源统计
    total_resources = db.query(func.count(Resource.id)).filter(
        Resource.is_deleted == False
    ).scalar()
    
    # 价值统计
    total_value = db.query(func.sum(ValueRecord.amount)).filter(
        ValueRecord.currency == "CNY"
    ).scalar() or 0
    
    # 反馈统计
    from app.models.community import Feedback, FeedbackStatus
    pending_feedback = db.query(func.count(Feedback.id)).filter(
        Feedback.is_deleted == False,
        Feedback.status == FeedbackStatus.OPEN
    ).scalar()
    
    return {
        "users": {
            "total": total_users
        },
        "projects": {
            "total": total_projects,
            "pending_review": pending_projects
        },
        "tokens": {
            "total_balance": float(total_token_balance),
            "pending_transactions": pending_transactions
        },
        "resources": {
            "total": total_resources
        },
        "value": {
            "total": float(total_value),
            "currency": "CNY"
        },
        "feedback": {
            "pending": pending_feedback
        }
    }

