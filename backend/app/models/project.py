"""
元征 · 合伙人赋能平台 - 项目模型
对应 Schema V2: 3. 项目域（Projects）
"""
from sqlalchemy import (
    Column, BigInteger, String, Text, Numeric, Integer,
    ForeignKey, Enum as SQLEnum, DateTime
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin


# ============ 枚举定义 ============

class ProjectReviewStatus(str, enum.Enum):
    """项目审核状态"""
    PENDING_REVIEW = "PENDING_REVIEW"  # 待审核
    APPROVED = "APPROVED"               # 已通过
    REJECTED = "REJECTED"               # 已驳回


class ProjectBusinessStatus(str, enum.Enum):
    """项目业务状态"""
    ONGOING = "ONGOING"         # 进行中
    PAUSED = "PAUSED"           # 暂停
    COMPLETED = "COMPLETED"     # 已完成
    ABANDONED = "ABANDONED"     # 废弃


class VisibilityScopeType(str, enum.Enum):
    """可见范围类型"""
    ALL = "ALL"                         # 所有合伙人可见
    ROLE_MIN_LEVEL = "ROLE_MIN_LEVEL"   # 最低角色等级可见
    CUSTOM = "CUSTOM"                   # 自定义用户集合


class ProjectMemberRole(str, enum.Enum):
    """项目成员角色"""
    OWNER = "OWNER"         # 负责人
    MEMBER = "MEMBER"       # 普通成员
    RECORDER = "RECORDER"   # 记录员


class JoinRequestStatus(str, enum.Enum):
    """加入申请状态"""
    PENDING = "PENDING"     # 待审核
    APPROVED = "APPROVED"   # 已通过
    REJECTED = "REJECTED"   # 已拒绝


class InvitationStatus(str, enum.Enum):
    """邀请状态"""
    PENDING = "PENDING"     # 待接受
    ACCEPTED = "ACCEPTED"   # 已接受
    DECLINED = "DECLINED"   # 已拒绝
    EXPIRED = "EXPIRED"     # 已过期


class ShareOwnerType(str, enum.Enum):
    """股份持有者类型"""
    ORG = "ORG"     # 组织（元征）
    USER = "USER"   # 用户


# ============ 项目模型 ============

class Project(Base, TimestampMixin, SoftDeleteMixin):
    """项目表"""
    __tablename__ = "projects"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # 基本信息
    name = Column(String(200), nullable=False, comment="项目名称")
    description = Column(Text, nullable=True, comment="项目描述")
    business_type = Column(
        String(50),
        nullable=False,
        comment="业务类型: 协议转让/并购重组/产业赋能/债权业务/其他"
    )
    industry = Column(String(100), nullable=True, comment="行业")
    region = Column(String(100), nullable=True, comment="地区")
    
    # 状态
    review_status = Column(
        SQLEnum(ProjectReviewStatus, name="project_review_status"),
        nullable=False,
        default=ProjectReviewStatus.PENDING_REVIEW,
        comment="审核状态"
    )
    business_status = Column(
        SQLEnum(ProjectBusinessStatus, name="project_business_status"),
        nullable=False,
        default=ProjectBusinessStatus.ONGOING,
        comment="业务状态"
    )
    
    # 发起人
    created_by = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        comment="发起人（联合创始人）"
    )
    
    # 可见范围
    visibility_scope_type = Column(
        SQLEnum(VisibilityScopeType, name="visibility_scope_type"),
        nullable=False,
        default=VisibilityScopeType.ALL,
        comment="可见范围类型"
    )
    visibility_min_role_level = Column(
        Integer,
        nullable=True,
        comment="最低可见角色等级"
    )
    visibility_user_ids = Column(
        JSONB,
        nullable=True,
        comment="可见用户ID列表"
    )
    
    # 关联关系
    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")
    members = relationship("ProjectMember", back_populates="project", lazy="selectin")
    shares = relationship("ProjectShare", back_populates="project", lazy="dynamic")
    demands = relationship("Demand", back_populates="project", lazy="dynamic")
    events = relationship("ProjectEvent", back_populates="project", lazy="dynamic")
    join_requests = relationship("ProjectJoinRequest", back_populates="project", lazy="dynamic")
    
    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.name}')>"


class ProjectRelation(Base, TimestampMixin):
    """项目间关联关系"""
    __tablename__ = "project_relations"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        comment="当前项目"
    )
    related_project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联项目"
    )
    relation_desc = Column(Text, nullable=True, comment="关系说明")
    created_by = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    
    # 关联关系
    project = relationship("Project", foreign_keys=[project_id])
    related_project = relationship("Project", foreign_keys=[related_project_id])


class ProjectMember(Base):
    """项目成员表"""
    __tablename__ = "project_members"
    
    project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True
    )
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    role_in_project = Column(
        SQLEnum(ProjectMemberRole, name="project_member_role"),
        nullable=False,
        default=ProjectMemberRole.MEMBER,
        comment="项目中角色"
    )
    duty_description = Column(Text, nullable=True, comment="职责说明")
    join_time = Column(DateTime(timezone=True), nullable=False)
    leave_time = Column(DateTime(timezone=True), nullable=True)
    
    # 关联关系
    project = relationship("Project", back_populates="members")
    user = relationship("User", lazy="selectin")


class ProjectShare(Base, TimestampMixin):
    """项目股权结构表"""
    __tablename__ = "project_shares"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    owner_type = Column(
        SQLEnum(ShareOwnerType, name="share_owner_type"),
        nullable=False,
        comment="持有者类型"
    )
    owner_id = Column(
        BigInteger,
        nullable=False,
        comment="持有者ID（ORG时为固定常量0，USER时为用户ID）"
    )
    percentage = Column(
        Numeric(10, 4),
        nullable=False,
        comment="股份比例"
    )
    effective_from = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="生效时间"
    )
    note = Column(Text, nullable=True, comment="备注")
    
    # 关联关系
    project = relationship("Project", back_populates="shares")


class ProjectJoinRequest(Base, TimestampMixin, SoftDeleteMixin):
    """项目加入申请表"""
    __tablename__ = "project_join_requests"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    applicant_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="申请人"
    )
    desired_role = Column(
        SQLEnum(ProjectMemberRole, name="project_member_role"),
        nullable=False,
        comment="申请身份"
    )
    duty_description = Column(Text, nullable=False, comment="加入后职责")
    intended_share_pct = Column(
        Numeric(10, 4),
        nullable=True,
        comment="意向获得股份（百分比）"
    )
    note = Column(Text, nullable=True, comment="备注")
    
    # 审核信息
    status = Column(
        SQLEnum(JoinRequestStatus, name="join_request_status"),
        nullable=False,
        default=JoinRequestStatus.PENDING
    )
    reviewed_by = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="审批人"
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_comment = Column(Text, nullable=True, comment="审批意见")
    
    # 关联关系
    project = relationship("Project", back_populates="join_requests")
    applicant = relationship("User", foreign_keys=[applicant_id], lazy="selectin")
    reviewer = relationship("User", foreign_keys=[reviewed_by], lazy="selectin")


class ProjectEventType(str, enum.Enum):
    """项目事件类型"""
    # 项目基础类
    PROJECT_CREATED = "PROJECT_CREATED"
    PROJECT_APPROVED = "PROJECT_APPROVED"
    PROJECT_REJECTED = "PROJECT_REJECTED"
    PROJECT_STATUS_CHANGED = "PROJECT_STATUS_CHANGED"
    
    # 成员/股权类
    PROJECT_MEMBER_JOINED = "PROJECT_MEMBER_JOINED"
    PROJECT_MEMBER_LEFT = "PROJECT_MEMBER_LEFT"
    PROJECT_JOIN_REJECTED = "PROJECT_JOIN_REJECTED"
    SHARE_STRUCTURE_CHANGED = "SHARE_STRUCTURE_CHANGED"
    
    # 需求/响应类
    DEMAND_PUBLISHED = "DEMAND_PUBLISHED"
    DEMAND_UPDATED = "DEMAND_UPDATED"
    DEMAND_CLOSED = "DEMAND_CLOSED"
    DEMAND_CANCELLED = "DEMAND_CANCELLED"
    DEMAND_RESPONDED = "DEMAND_RESPONDED"
    DEMAND_RESPONSE_REJECTED = "DEMAND_RESPONSE_REJECTED"
    DEMAND_ACCEPTED = "DEMAND_ACCEPTED"
    DEMAND_RESPONSE_ABANDONED = "DEMAND_RESPONSE_ABANDONED"
    DEMAND_RESPONSE_MODIFIED = "DEMAND_RESPONSE_MODIFIED"
    
    # 资源与 Token 类
    RESOURCE_USED = "RESOURCE_USED"
    TOKEN_TRANSFER_COMPLETED = "TOKEN_TRANSFER_COMPLETED"
    TOKEN_DIVIDEND_DISTRIBUTED = "TOKEN_DIVIDEND_DISTRIBUTED"
    
    # 会议/新闻类
    MEETING_HELD = "MEETING_HELD"
    MEETING_MINUTES_ADDED = "MEETING_MINUTES_ADDED"
    NEWS_LINKED = "NEWS_LINKED"
    
    # 价值/结案类
    PROJECT_VALUE_RECORDED = "PROJECT_VALUE_RECORDED"
    PROJECT_CLOSED = "PROJECT_CLOSED"
    
    # 备注/更正类
    MILESTONE_ADDED = "MILESTONE_ADDED"
    NOTE = "NOTE"
    EVENT_CORRECTED = "EVENT_CORRECTED"


class ProjectEvent(Base, TimestampMixin):
    """项目事件/时间线表"""
    __tablename__ = "project_events"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    event_type = Column(
        SQLEnum(ProjectEventType, name="project_event_type"),
        nullable=False,
        comment="事件类型"
    )
    title = Column(String(500), nullable=False, comment="事件标题")
    description = Column(Text, nullable=True, comment="详细描述")
    
    created_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    
    # 关联业务对象（可选）
    related_demand_id = Column(
        BigInteger,
        ForeignKey("demands.id", ondelete="SET NULL"),
        nullable=True
    )
    related_response_id = Column(
        BigInteger,
        ForeignKey("demand_responses.id", ondelete="SET NULL"),
        nullable=True
    )
    related_transaction_id = Column(
        BigInteger,
        ForeignKey("token_transactions.id", ondelete="SET NULL"),
        nullable=True
    )
    related_meeting_id = Column(
        BigInteger,
        ForeignKey("meetings.id", ondelete="SET NULL"),
        nullable=True
    )
    related_news_id = Column(
        BigInteger,
        ForeignKey("news.id", ondelete="SET NULL"),
        nullable=True
    )
    related_value_record_id = Column(
        BigInteger,
        ForeignKey("value_records.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # 状态变更信息
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    
    # 股权结构快照
    share_change_snapshot = Column(JSONB, nullable=True)
    
    # 扩展字段
    payload = Column(JSONB, nullable=True, comment="通用扩展数据")
    
    # 关联关系
    project = relationship("Project", back_populates="events")
    created_by = relationship("User", foreign_keys=[created_by_user_id], lazy="selectin")
    
    def __repr__(self):
        return f"<ProjectEvent(id={self.id}, type={self.event_type}, title='{self.title}')>"


class ProjectInvitation(Base, TimestampMixin, SoftDeleteMixin):
    """项目邀请表"""
    __tablename__ = "project_invitations"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False
    )
    inviter_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="邀请人"
    )
    invitee_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="被邀请人"
    )
    proposed_role = Column(
        SQLEnum(ProjectMemberRole, name="project_member_role", create_type=False),
        nullable=False,
        default=ProjectMemberRole.MEMBER,
        comment="建议角色"
    )
    proposed_duty = Column(Text, nullable=True, comment="建议职责")
    proposed_share_pct = Column(
        Numeric(10, 4),
        nullable=True,
        comment="建议股份（百分比）"
    )
    message = Column(Text, nullable=True, comment="邀请留言")
    
    # 状态
    status = Column(
        SQLEnum(InvitationStatus, name="invitation_status"),
        nullable=False,
        default=InvitationStatus.PENDING
    )
    responded_at = Column(DateTime(timezone=True), nullable=True, comment="响应时间")
    response_note = Column(Text, nullable=True, comment="响应备注")
    
    # 关联关系
    project = relationship("Project", backref="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id], lazy="selectin")
    invitee = relationship("User", foreign_keys=[invitee_id], lazy="selectin")
    
    def __repr__(self):
        return f"<ProjectInvitation(id={self.id}, project={self.project_id}, invitee={self.invitee_id})>"


class ProjectEventEditHistory(Base, TimestampMixin):
    """项目事件编辑历史表"""
    __tablename__ = "project_event_edit_history"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    event_id = Column(
        BigInteger,
        ForeignKey("project_events.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # 编辑人
    edited_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    
    # 编辑前内容
    old_title = Column(String(500), nullable=True)
    old_description = Column(Text, nullable=True)
    old_payload = Column(JSONB, nullable=True)
    
    # 编辑后内容
    new_title = Column(String(500), nullable=True)
    new_description = Column(Text, nullable=True)
    new_payload = Column(JSONB, nullable=True)
    
    # 编辑原因
    edit_reason = Column(Text, nullable=True, comment="编辑原因")
    
    # 关联关系
    event = relationship("ProjectEvent", backref="edit_history")
    edited_by = relationship("User", foreign_keys=[edited_by_user_id], lazy="selectin")
    
    def __repr__(self):
        return f"<ProjectEventEditHistory(id={self.id}, event={self.event_id})>"

