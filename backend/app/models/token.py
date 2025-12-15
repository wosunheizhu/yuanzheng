"""
元征 · 合伙人赋能平台 - Token 模型
对应 Schema V2: 2. Token 账户与账本
"""
from sqlalchemy import (
    Column, BigInteger, String, Text, Numeric,
    ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
import enum

from app.db.base_class import Base, TimestampMixin


class TokenTransactionDirection(str, enum.Enum):
    """Token 交易方向"""
    TRANSFER = "TRANSFER"           # 普通合伙人之间转账
    ADMIN_GRANT = "ADMIN_GRANT"     # 管理员赠与
    ADMIN_DEDUCT = "ADMIN_DEDUCT"   # 管理员扣除
    DIVIDEND = "DIVIDEND"           # 项目分红


class TokenTransactionStatus(str, enum.Enum):
    """Token 交易状态"""
    PENDING_ADMIN_APPROVAL = "PENDING_ADMIN_APPROVAL"   # 待管理员审核
    PENDING_RECEIVER_CONFIRM = "PENDING_RECEIVER_CONFIRM"  # 待收款方确认
    COMPLETED = "COMPLETED"                              # 已完成
    REJECTED = "REJECTED"                                # 被拒绝
    CANCELLED = "CANCELLED"                              # 已取消


class TokenAccount(Base, TimestampMixin):
    """Token 账户表"""
    __tablename__ = "token_accounts"
    
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        comment="用户ID"
    )
    balance = Column(
        Numeric(18, 2),
        nullable=False,
        default=0,
        comment="当前余额"
    )
    initial_balance = Column(
        Numeric(18, 2),
        nullable=False,
        comment="初始额度"
    )
    
    # 关联关系
    user = relationship("User", back_populates="token_account")
    
    def __repr__(self):
        return f"<TokenAccount(user_id={self.user_id}, balance={self.balance})>"


class TokenTransaction(Base, TimestampMixin):
    """Token 交易记录表"""
    __tablename__ = "token_transactions"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # 交易双方（管理员赠与/扣除时，其中一方可为 NULL）
    from_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="转出方用户ID"
    )
    to_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="转入方用户ID"
    )
    
    # 交易信息
    amount = Column(
        Numeric(18, 2),
        nullable=False,
        comment="交易金额（正数）"
    )
    direction = Column(
        SQLEnum(TokenTransactionDirection, name="token_transaction_direction"),
        nullable=False,
        comment="交易方向"
    )
    
    # 关联项目/需求
    related_project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        comment="关联项目"
    )
    related_demand_id = Column(
        BigInteger,
        ForeignKey("demands.id", ondelete="SET NULL"),
        nullable=True,
        comment="关联需求"
    )
    
    # 状态
    status = Column(
        SQLEnum(TokenTransactionStatus, name="token_transaction_status"),
        nullable=False,
        default=TokenTransactionStatus.PENDING_ADMIN_APPROVAL,
        comment="交易状态"
    )
    
    # 说明
    reason = Column(Text, nullable=True, comment="发起理由")
    admin_comment = Column(Text, nullable=True, comment="管理员审批意见")
    
    # 发起人
    created_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        comment="发起人"
    )
    
    # 关联关系
    from_user = relationship(
        "User",
        foreign_keys=[from_user_id],
        lazy="selectin"
    )
    to_user = relationship(
        "User",
        foreign_keys=[to_user_id],
        lazy="selectin"
    )
    created_by = relationship(
        "User",
        foreign_keys=[created_by_user_id],
        lazy="selectin"
    )
    related_project = relationship(
        "Project",
        foreign_keys=[related_project_id],
        lazy="selectin"
    )
    
    def __repr__(self):
        return f"<TokenTransaction(id={self.id}, amount={self.amount}, status={self.status})>"

