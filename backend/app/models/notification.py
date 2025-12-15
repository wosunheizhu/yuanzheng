"""
元征 · 合伙人赋能平台 - 通知与公告模型
对应 Schema V2: 11. 信箱 & 公告
"""
from sqlalchemy import (
    Column, BigInteger, String, Text, Integer, Boolean,
    ForeignKey, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin
from app.models.project import VisibilityScopeType


class InboxCategory(str, enum.Enum):
    """信箱消息类别"""
    ANNOUNCEMENT = "ANNOUNCEMENT"   # 公告
    SYSTEM = "SYSTEM"               # 系统通知
    VOTE = "VOTE"                   # 投票
    DM = "DM"                       # 私信
    MENTION = "MENTION"             # @消息
    DEMAND = "DEMAND"               # 需求相关
    PROJECT = "PROJECT"             # 项目相关


class Announcement(Base, TimestampMixin, SoftDeleteMixin):
    """公告表"""
    __tablename__ = "announcements"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    title = Column(String(200), nullable=False, comment="公告名称")
    content = Column(Text, nullable=False, comment="公告内容")
    attachments = Column(JSONB, nullable=True, comment="附件列表")
    
    created_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    
    # 可见范围
    visibility_scope_type = Column(
        SQLEnum(VisibilityScopeType, name="visibility_scope_type"),
        nullable=False,
        default=VisibilityScopeType.ALL
    )
    visibility_min_role_level = Column(Integer, nullable=True)
    visibility_user_ids = Column(JSONB, nullable=True)
    
    # 关联关系
    created_by = relationship("User", lazy="selectin")
    
    def __repr__(self):
        return f"<Announcement(id={self.id}, title='{self.title}')>"


class InboxItem(Base, TimestampMixin, SoftDeleteMixin):
    """信箱消息表"""
    __tablename__ = "inbox_items"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    category = Column(
        SQLEnum(InboxCategory, name="inbox_category"),
        nullable=False
    )
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=True, comment="消息内容摘要/全文")
    
    # 关联对象
    related_object_type = Column(
        String(50),
        nullable=True,
        comment="PROJECT/DEMAND/TRANSACTION/VOTE/MEETING/POST/COMMENT/ANNOUNCEMENT/DM_THREAD"
    )
    related_object_id = Column(BigInteger, nullable=True)
    
    is_read = Column(Boolean, default=False, index=True)
    
    # 关联关系
    user = relationship("User", lazy="selectin")
    
    def __repr__(self):
        return f"<InboxItem(id={self.id}, category={self.category}, read={self.is_read})>"

