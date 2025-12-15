"""
元征 · 合伙人赋能平台 - 社群模型
对应 Schema V2: 9. 社群 & 反馈 & 私信
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


class PostType(str, enum.Enum):
    """动态类型"""
    GENERAL = "GENERAL"                 # 一般动态
    PROJECT = "PROJECT"                 # 项目动态
    RESOURCE = "RESOURCE"               # 资源相关
    VOTE = "VOTE"                       # 投票相关
    ANNOUNCEMENT_REF = "ANNOUNCEMENT_REF"  # 公告引用


class FeedbackStatus(str, enum.Enum):
    """反馈状态"""
    OPEN = "OPEN"           # 待处理
    RESOLVED = "RESOLVED"   # 已解决
    REJECTED = "REJECTED"   # 已拒绝


class Post(Base, TimestampMixin, SoftDeleteMixin):
    """社群动态表"""
    __tablename__ = "posts"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    author_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    post_type = Column(
        SQLEnum(PostType, name="post_type"),
        nullable=False,
        default=PostType.GENERAL
    )
    content = Column(Text, nullable=False, comment="文本内容")
    attachments = Column(JSONB, nullable=True, comment="附件列表 [{name, url, type, size}]")
    
    # 关联对象
    related_project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True
    )
    related_resource_id = Column(
        BigInteger,
        ForeignKey("resources.id", ondelete="SET NULL"),
        nullable=True
    )
    related_vote_id = Column(
        BigInteger,
        ForeignKey("votes.id", ondelete="SET NULL"),
        nullable=True
    )
    related_announcement_id = Column(
        BigInteger,
        ForeignKey("announcements.id", ondelete="SET NULL"),
        nullable=True
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
    author = relationship("User", lazy="selectin")
    related_project = relationship("Project", foreign_keys=[related_project_id], lazy="selectin")
    related_resource = relationship("Resource", foreign_keys=[related_resource_id], lazy="selectin")
    comments = relationship("Comment", back_populates="post", lazy="dynamic")
    likes = relationship("Like", back_populates="post", lazy="dynamic")
    
    @property
    def like_count(self) -> int:
        return self.likes.count()
    
    @property
    def comment_count(self) -> int:
        return self.comments.filter_by(is_deleted=False).count()
    
    def __repr__(self):
        return f"<Post(id={self.id}, type={self.post_type})>"


class Comment(Base, TimestampMixin, SoftDeleteMixin):
    """评论表"""
    __tablename__ = "comments"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    post_id = Column(
        BigInteger,
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    content = Column(Text, nullable=False)
    mentions = Column(JSONB, nullable=True, comment="被@用户ID列表")
    
    # 关联关系
    post = relationship("Post", back_populates="comments")
    user = relationship("User", lazy="selectin")
    
    def __repr__(self):
        return f"<Comment(id={self.id}, post_id={self.post_id})>"


class Like(Base, TimestampMixin):
    """点赞表"""
    __tablename__ = "likes"
    
    post_id = Column(
        BigInteger,
        ForeignKey("posts.id", ondelete="CASCADE"),
        primary_key=True
    )
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    
    # 关联关系
    post = relationship("Post", back_populates="likes")
    user = relationship("User", lazy="selectin")


class Feedback(Base, TimestampMixin, SoftDeleteMixin):
    """意见反馈表"""
    __tablename__ = "feedbacks"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="反馈人"
    )
    category = Column(
        String(50),
        nullable=False,
        comment="类别: PRODUCT/BUG/POLICY/OTHER"
    )
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    contact = Column(String(200), nullable=True, comment="联系方式")
    allow_contact = Column(Boolean, default=True)
    
    # 状态与处理
    status = Column(
        SQLEnum(FeedbackStatus, name="feedback_status"),
        nullable=False,
        default=FeedbackStatus.OPEN
    )
    admin_reply = Column(Text, nullable=True, comment="管理员回复")
    admin_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    admin_replied_at = Column(DateTime(timezone=True), nullable=True)
    
    # 关联关系
    user = relationship("User", foreign_keys=[user_id], lazy="selectin")
    admin = relationship("User", foreign_keys=[admin_user_id], lazy="selectin")
    
    def __repr__(self):
        return f"<Feedback(id={self.id}, title='{self.title}')>"


class DMThread(Base, TimestampMixin):
    """私信会话表"""
    __tablename__ = "dm_threads"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    user_a_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    user_b_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # 关联关系
    user_a = relationship("User", foreign_keys=[user_a_id], lazy="selectin")
    user_b = relationship("User", foreign_keys=[user_b_id], lazy="selectin")
    messages = relationship("DMMessage", back_populates="thread", lazy="dynamic")
    
    def __repr__(self):
        return f"<DMThread(id={self.id}, users=[{self.user_a_id}, {self.user_b_id}])>"


class DMMessage(Base, TimestampMixin, SoftDeleteMixin):
    """私信消息表"""
    __tablename__ = "dm_messages"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    thread_id = Column(
        BigInteger,
        ForeignKey("dm_threads.id", ondelete="CASCADE"),
        nullable=False
    )
    sender_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    receiver_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    content = Column(Text, nullable=True)  # 允许空，因为可能只发附件
    is_read = Column(Boolean, default=False)
    
    # 附件列表 [{name, url, type, size}]
    attachments = Column(JSONB, nullable=True, comment="附件列表")
    
    # 引用项目/资源
    reference_type = Column(String(20), nullable=True, comment="引用类型: project/resource")
    reference_id = Column(BigInteger, nullable=True, comment="引用的项目/资源ID")
    reference_name = Column(String(255), nullable=True, comment="引用的项目/资源名称")
    
    # 关联关系
    thread = relationship("DMThread", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], lazy="selectin")
    receiver = relationship("User", foreign_keys=[receiver_id], lazy="selectin")
    
    def __repr__(self):
        return f"<DMMessage(id={self.id}, thread_id={self.thread_id})>"

