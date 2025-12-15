"""
元征 · 合伙人赋能平台 - 需求与响应模型
对应 Schema V2: 4. 需求 & 响应域
"""
from sqlalchemy import (
    Column, BigInteger, String, Text, Integer,
    ForeignKey, Enum as SQLEnum, DateTime, Boolean
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin
from app.models.project import VisibilityScopeType


class DemandStatus(str, enum.Enum):
    """需求状态"""
    OPEN = "OPEN"           # 开放中
    FULFILLED = "FULFILLED" # 已完成（有响应被标记为已使用）
    CLOSED = "CLOSED"       # 已关闭
    CANCELLED = "CANCELLED" # 已取消


class DemandResponseStatus(str, enum.Enum):
    """响应状态"""
    SUBMITTED = "SUBMITTED"                         # 已提交
    ACCEPTED_PENDING_USAGE = "ACCEPTED_PENDING_USAGE"  # 已接受，待资源使用
    USED = "USED"                                   # 已使用/完成
    REJECTED = "REJECTED"                           # 被拒绝
    ABANDONED = "ABANDONED"                         # 已废弃


class ChangeRequestStatus(str, enum.Enum):
    """响应修改/废弃申请状态"""
    PENDING_PROVIDER = "PENDING_PROVIDER"   # 待资源方确认
    PENDING_ADMIN = "PENDING_ADMIN"         # 待管理员裁决
    APPROVED = "APPROVED"                   # 已通过
    REJECTED = "REJECTED"                   # 被拒绝


class ChangeRequestType(str, enum.Enum):
    """修改/废弃类型"""
    MODIFY = "MODIFY"       # 修改
    ABANDON = "ABANDON"     # 废弃


class Demand(Base, TimestampMixin, SoftDeleteMixin):
    """需求表"""
    __tablename__ = "demands"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # 所属项目
    project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        comment="所属项目"
    )
    
    # 同源需求分组（多项目需求共享同一模板）
    group_id = Column(
        BigInteger,
        ForeignKey("demands.id", ondelete="SET NULL"),
        nullable=True,
        comment="同源需求主ID"
    )
    
    # 基本信息
    title = Column(String(200), nullable=False, comment="需求名称")
    description = Column(Text, nullable=False, comment="需求内容描述")
    business_type = Column(
        String(50),
        nullable=False,
        comment="业务类型"
    )
    industry = Column(String(100), nullable=True, comment="需求行业")
    
    # 状态
    status = Column(
        SQLEnum(DemandStatus, name="demand_status"),
        nullable=False,
        default=DemandStatus.OPEN
    )
    
    # 激励形式（结构化JSON）
    # 例如: {"equity": "5%", "token": 1000, "other": "..."}
    expected_reward = Column(JSONB, nullable=True, comment="期望激励形式")
    
    # 需求管理人
    owner_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        comment="需求owner"
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
    project = relationship("Project", back_populates="demands")
    owner = relationship("User", foreign_keys=[owner_user_id], lazy="selectin")
    participants = relationship("DemandParticipant", back_populates="demand", lazy="selectin")
    responses = relationship("DemandResponse", back_populates="demand", lazy="dynamic")
    
    def __repr__(self):
        return f"<Demand(id={self.id}, title='{self.title}')>"


class DemandParticipant(Base):
    """需求参与人表"""
    __tablename__ = "demand_participants"
    
    demand_id = Column(
        BigInteger,
        ForeignKey("demands.id", ondelete="CASCADE"),
        primary_key=True
    )
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    is_owner = Column(
        Boolean,
        default=False,
        comment="是否为owner"
    )
    
    # 关联关系
    demand = relationship("Demand", back_populates="participants")
    user = relationship("User", lazy="selectin")


class DemandResponse(Base, TimestampMixin, SoftDeleteMixin):
    """需求响应表"""
    __tablename__ = "demand_responses"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    demand_id = Column(
        BigInteger,
        ForeignKey("demands.id", ondelete="CASCADE"),
        nullable=False
    )
    responder_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="响应人"
    )
    
    # 响应内容
    proposal = Column(Text, nullable=False, comment="响应方案描述")
    
    # 激励条款
    expected_reward = Column(JSONB, nullable=True, comment="响应者意向激励")
    final_reward = Column(JSONB, nullable=True, comment="最终确认的激励条款")
    
    # 状态
    status = Column(
        SQLEnum(DemandResponseStatus, name="demand_response_status"),
        nullable=False,
        default=DemandResponseStatus.SUBMITTED
    )
    
    # 关联关系
    demand = relationship("Demand", back_populates="responses")
    responder = relationship("User", foreign_keys=[responder_id], lazy="selectin")
    change_requests = relationship("DemandResponseChangeRequest", back_populates="response", lazy="dynamic")
    
    def __repr__(self):
        return f"<DemandResponse(id={self.id}, status={self.status})>"


class DemandResponseChangeRequest(Base, TimestampMixin, SoftDeleteMixin):
    """响应交易修改/废弃申请表"""
    __tablename__ = "demand_response_change_requests"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    demand_id = Column(
        BigInteger,
        ForeignKey("demands.id", ondelete="CASCADE"),
        nullable=False
    )
    response_id = Column(
        BigInteger,
        ForeignKey("demand_responses.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # 变更类型
    change_type = Column(
        SQLEnum(ChangeRequestType, name="change_request_type"),
        nullable=False,
        comment="修改/废弃"
    )
    reason = Column(Text, nullable=False, comment="修改/废弃原因")
    
    # 新激励条款（修改时使用）
    new_reward = Column(JSONB, nullable=True, comment="新激励条款")
    note = Column(Text, nullable=True, comment="备注")
    
    # 发起人
    requested_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        comment="需求owner发起"
    )
    requested_at = Column(DateTime(timezone=True), nullable=False)
    
    # 状态
    status = Column(
        SQLEnum(ChangeRequestStatus, name="change_request_status"),
        nullable=False,
        default=ChangeRequestStatus.PENDING_PROVIDER
    )
    
    # 资源方决策
    provider_decision = Column(String(20), nullable=True, comment="ACCEPT/REJECT")
    provider_decided_at = Column(DateTime(timezone=True), nullable=True)
    
    # 管理员裁决
    admin_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    admin_decision = Column(String(20), nullable=True, comment="APPROVE/REJECT")
    admin_decided_at = Column(DateTime(timezone=True), nullable=True)
    
    # 关联关系
    demand = relationship("Demand")
    response = relationship("DemandResponse", back_populates="change_requests")
    requested_by = relationship("User", foreign_keys=[requested_by_user_id], lazy="selectin")
    admin = relationship("User", foreign_keys=[admin_user_id], lazy="selectin")
    
    def __repr__(self):
        return f"<DemandResponseChangeRequest(id={self.id}, type={self.change_type}, status={self.status})>"

