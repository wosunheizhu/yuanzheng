"""
元征 · 合伙人赋能平台 - 投票 API
投票发起、参与、结果统计
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db, get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.project import VisibilityScopeType
from app.models.voting import Vote, VoteOption, VoteRecord, VoteStatus
from app.models.notification import InboxItem, InboxCategory
from app.schemas.voting import (
    VoteCreate, VoteUpdate, VoteRead, VoteList,
    VoteOptionRead, CastVote, VoteRecordRead, VoteResultRead
)

router = APIRouter(prefix="/votes", tags=["投票"])


def check_vote_visibility(vote: Vote, user: User) -> bool:
    """检查用户是否可以查看投票"""
    if user.is_admin:
        return True
    if vote.created_by == user.id:
        return True
    
    if vote.visibility_scope_type == VisibilityScopeType.ALL:
        return True
    elif vote.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL:
        return user.highest_role_level >= (vote.visibility_min_role_level or 0)
    elif vote.visibility_scope_type == VisibilityScopeType.CUSTOM:
        return user.id in (vote.visibility_user_ids or [])
    
    return False


def vote_to_read(vote: Vote, current_user_id: int, db: Session) -> VoteRead:
    """将 Vote 模型转换为 VoteRead"""
    options = []
    for opt in vote.options:
        vote_count = db.query(func.count(VoteRecord.vote_id)).filter(
            VoteRecord.option_id == opt.id
        ).scalar()
        options.append(VoteOptionRead(
            id=opt.id,
            text=opt.text,
            order_no=opt.order_no,
            vote_count=vote_count
        ))
    
    # 按 order_no 排序
    options.sort(key=lambda x: x.order_no)
    
    total_votes = db.query(func.count(VoteRecord.vote_id)).filter(
        VoteRecord.vote_id == vote.id
    ).scalar()
    
    my_vote = db.query(VoteRecord).filter(
        VoteRecord.vote_id == vote.id,
        VoteRecord.user_id == current_user_id
    ).first()
    
    return VoteRead(
        id=vote.id,
        title=vote.title,
        reason=vote.reason,
        description=vote.description,
        created_by=vote.created_by,
        creator_name=vote.creator.name if vote.creator else None,
        status=vote.status,
        end_time=vote.end_time,
        is_anonymous=vote.is_anonymous,
        pass_rule=vote.pass_rule,
        allow_abstain=vote.allow_abstain,
        visibility_scope_type=vote.visibility_scope_type,
        visibility_min_role_level=vote.visibility_min_role_level,
        created_at=vote.created_at,
        updated_at=vote.updated_at,
        options=options,
        total_votes=total_votes,
        has_voted=my_vote is not None,
        my_vote_option_id=my_vote.option_id if my_vote else None
    )


@router.get("", response_model=VoteList)
def list_votes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    status_filter: Optional[VoteStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取投票列表"""
    query = db.query(Vote).filter(Vote.is_deleted == False)
    
    if status_filter:
        query = query.filter(Vote.status == status_filter)
    
    # 应用可见性过滤
    if not current_user.is_admin:
        query = query.filter(
            (Vote.created_by == current_user.id) |
            (Vote.visibility_scope_type == VisibilityScopeType.ALL) |
            (
                (Vote.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL) &
                (Vote.visibility_min_role_level <= current_user.highest_role_level)
            )
        )
    
    total = query.count()
    votes = query.order_by(Vote.created_at.desc()).offset(skip).limit(limit).all()
    
    items = [vote_to_read(v, current_user.id, db) for v in votes]
    
    return VoteList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("", response_model=VoteRead)
def create_vote(
    vote_in: VoteCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """发起投票（管理员/联合创始人）"""
    if vote_in.end_time <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="截止时间必须晚于当前时间"
        )
    
    vote = Vote(
        title=vote_in.title,
        reason=vote_in.reason,
        description=vote_in.description,
        created_by=current_user.id,
        status=VoteStatus.OPEN,
        end_time=vote_in.end_time,
        is_anonymous=vote_in.is_anonymous,
        pass_rule=vote_in.pass_rule,
        allow_abstain=vote_in.allow_abstain,
        visibility_scope_type=vote_in.visibility_scope_type,
        visibility_min_role_level=vote_in.visibility_min_role_level,
        visibility_user_ids=vote_in.visibility_user_ids,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(vote)
    db.flush()
    
    # 添加选项
    for opt in vote_in.options:
        option = VoteOption(
            vote_id=vote.id,
            text=opt.text,
            order_no=opt.order_no
        )
        db.add(option)
    
    # 发送通知给可见用户
    # TODO: 根据可见范围发送通知
    all_users = db.query(User).filter(
        User.is_deleted == False,
        User.is_active == True,
        User.id != current_user.id
    ).all()
    
    for user in all_users:
        if check_vote_visibility(vote, user):
            inbox_item = InboxItem(
                user_id=user.id,
                category=InboxCategory.VOTE,
                title=f"新投票：{vote.title}",
                content=vote.reason[:200],
                related_object_type="VOTE",
                related_object_id=vote.id,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.add(inbox_item)
    
    db.commit()
    db.refresh(vote)
    
    return vote_to_read(vote, current_user.id, db)


@router.get("/{vote_id}", response_model=VoteRead)
def get_vote(
    vote_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取投票详情"""
    vote = db.query(Vote).filter(
        Vote.id == vote_id,
        Vote.is_deleted == False
    ).first()
    
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投票不存在"
        )
    
    if not check_vote_visibility(vote, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此投票"
        )
    
    # 检查是否需要自动关闭
    if vote.status == VoteStatus.OPEN and vote.end_time <= datetime.utcnow():
        vote.status = VoteStatus.CLOSED
        vote.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(vote)
    
    return vote_to_read(vote, current_user.id, db)


@router.post("/{vote_id}/cast")
def cast_vote(
    vote_id: int,
    cast_in: CastVote,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """投票"""
    vote = db.query(Vote).filter(
        Vote.id == vote_id,
        Vote.is_deleted == False
    ).first()
    
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投票不存在"
        )
    
    if not check_vote_visibility(vote, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权参与此投票"
        )
    
    # 检查投票状态
    if vote.status != VoteStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="投票已关闭"
        )
    
    if vote.end_time <= datetime.utcnow():
        vote.status = VoteStatus.CLOSED
        vote.updated_at = datetime.utcnow()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="投票已截止"
        )
    
    # 检查是否已投票
    existing = db.query(VoteRecord).filter(
        VoteRecord.vote_id == vote_id,
        VoteRecord.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="您已投过票"
        )
    
    # 验证选项
    option = db.query(VoteOption).filter(
        VoteOption.id == cast_in.option_id,
        VoteOption.vote_id == vote_id
    ).first()
    
    if not option:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的选项"
        )
    
    # 记录投票
    record = VoteRecord(
        vote_id=vote_id,
        user_id=current_user.id,
        option_id=cast_in.option_id,
        created_at=datetime.utcnow()
    )
    db.add(record)
    db.commit()
    
    return {"message": "投票成功"}


@router.get("/{vote_id}/result", response_model=VoteResultRead)
def get_vote_result(
    vote_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取投票结果"""
    vote = db.query(Vote).filter(
        Vote.id == vote_id,
        Vote.is_deleted == False
    ).first()
    
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投票不存在"
        )
    
    if not check_vote_visibility(vote, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此投票"
        )
    
    # 计算各选项票数
    options = []
    for opt in vote.options:
        vote_count = db.query(func.count(VoteRecord.vote_id)).filter(
            VoteRecord.option_id == opt.id
        ).scalar()
        options.append(VoteOptionRead(
            id=opt.id,
            text=opt.text,
            order_no=opt.order_no,
            vote_count=vote_count
        ))
    
    options.sort(key=lambda x: x.order_no)
    
    total_votes = db.query(func.count(VoteRecord.vote_id)).filter(
        VoteRecord.vote_id == vote_id
    ).scalar()
    
    # 非匿名投票返回投票记录
    records = None
    if not vote.is_anonymous:
        vote_records = db.query(VoteRecord).filter(
            VoteRecord.vote_id == vote_id
        ).all()
        records = []
        for r in vote_records:
            option = next((o for o in options if o.id == r.option_id), None)
            records.append(VoteRecordRead(
                user_id=r.user_id,
                user_name=r.user.name if r.user else None,
                option_id=r.option_id,
                option_text=option.text if option else None,
                created_at=r.created_at
            ))
    
    return VoteResultRead(
        vote_id=vote.id,
        title=vote.title,
        status=vote.status,
        total_votes=total_votes,
        options=options,
        pass_rule=vote.pass_rule,
        is_passed=None,  # 需要根据 pass_rule 判断，暂不实现自动判定
        records=records
    )


@router.post("/{vote_id}/close")
def close_vote(
    vote_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """提前关闭投票（管理员）"""
    vote = db.query(Vote).filter(
        Vote.id == vote_id,
        Vote.is_deleted == False
    ).first()
    
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投票不存在"
        )
    
    if vote.status != VoteStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="投票已关闭"
        )
    
    vote.status = VoteStatus.CLOSED
    vote.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "投票已关闭"}

