"""
元征 · 合伙人赋能平台 - 投票模型
对应 Schema V2: 10. 投票域
"""
from sqlalchemy import (
    Column, BigInteger, String, Text, Integer, Boolean,
    ForeignKey, Enum as SQLEnum, DateTime
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin
from app.models.project import VisibilityScopeType


class VoteStatus(str, enum.Enum):
    """投票状态"""
    OPEN = "OPEN"       # 进行中
    CLOSED = "CLOSED"   # 已结束


class Vote(Base, TimestampMixin, SoftDeleteMixin):
    """投票表"""
    __tablename__ = "votes"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    title = Column(String(200), nullable=False, comment="投票标题")
    reason = Column(Text, nullable=False, comment="投票事由")
    description = Column(Text, nullable=True, comment="补充说明")
    
    created_by = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    
    # 投票设置
    status = Column(
        SQLEnum(VoteStatus, name="vote_status"),
        nullable=False,
        default=VoteStatus.OPEN
    )
    end_time = Column(DateTime(timezone=True), nullable=False, comment="截止时间")
    is_anonymous = Column(Boolean, default=False, comment="是否匿名")
    pass_rule = Column(
        String(200),
        nullable=False,
        comment="通过标准: 1/3, 1/2, 2/3, 全票, 自定义"
    )
    allow_abstain = Column(Boolean, default=False, comment="是否开设弃票选项")
    
    # 可见范围
    visibility_scope_type = Column(
        SQLEnum(VisibilityScopeType, name="visibility_scope_type"),
        nullable=False,
        default=VisibilityScopeType.ALL
    )
    visibility_min_role_level = Column(Integer, nullable=True)
    visibility_user_ids = Column(JSONB, nullable=True)
    
    # 关联关系
    creator = relationship("User", lazy="selectin")
    options = relationship("VoteOption", back_populates="vote", lazy="selectin")
    records = relationship("VoteRecord", back_populates="vote", lazy="dynamic")
    
    def __repr__(self):
        return f"<Vote(id={self.id}, title='{self.title}')>"


class VoteOption(Base):
    """投票选项表"""
    __tablename__ = "vote_options"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    vote_id = Column(
        BigInteger,
        ForeignKey("votes.id", ondelete="CASCADE"),
        nullable=False
    )
    text = Column(String(500), nullable=False)
    order_no = Column(Integer, nullable=False, default=0)
    
    # 关联关系
    vote = relationship("Vote", back_populates="options")
    records = relationship("VoteRecord", back_populates="option", lazy="dynamic")
    
    @property
    def vote_count(self) -> int:
        return self.records.count()
    
    def __repr__(self):
        return f"<VoteOption(id={self.id}, text='{self.text}')>"


class VoteRecord(Base, TimestampMixin):
    """投票记录表"""
    __tablename__ = "vote_records"
    
    vote_id = Column(
        BigInteger,
        ForeignKey("votes.id", ondelete="CASCADE"),
        primary_key=True
    )
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    option_id = Column(
        BigInteger,
        ForeignKey("vote_options.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # 关联关系
    vote = relationship("Vote", back_populates="records")
    user = relationship("User", lazy="selectin")
    option = relationship("VoteOption", back_populates="records")

