"""
元征 · 合伙人赋能平台 - 座谈会模型
对应 Schema V2: 8. 日常座谈会 & 时间表
"""
from sqlalchemy import (
    Column, BigInteger, String, Text, Integer,
    ForeignKey, Enum as SQLEnum, DateTime
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin
from app.models.project import VisibilityScopeType


class MeetingLevel(str, enum.Enum):
    """会议级别"""
    INTERNAL = "INTERNAL"   # 内部
    EXTERNAL = "EXTERNAL"   # 对外


class ConfidentialityLevel(str, enum.Enum):
    """保密等级"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class MeetingStatus(str, enum.Enum):
    """会议状态"""
    PLANNING = "PLANNING"       # 策划中
    CONFIRMED = "CONFIRMED"     # 已确认
    CANCELLED = "CANCELLED"     # 已取消
    FINISHED = "FINISHED"       # 已结束


class ParticipantRole(str, enum.Enum):
    """参与角色"""
    HOST = "HOST"           # 主持人
    ATTENDEE = "ATTENDEE"   # 参与者
    OPTIONAL = "OPTIONAL"   # 可选参与


class AttendanceStatus(str, enum.Enum):
    """出席状态"""
    INVITED = "INVITED"     # 已邀请
    ATTENDING = "ATTENDING" # 将出席
    DECLINED = "DECLINED"   # 已拒绝
    NO_SHOW = "NO_SHOW"     # 未出席


class Meeting(Base, TimestampMixin, SoftDeleteMixin):
    """座谈会表"""
    __tablename__ = "meetings"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # 基本信息
    title = Column(String(200), nullable=False, comment="会议主题")
    description = Column(Text, nullable=True, comment="简介/议题")
    meeting_level = Column(
        SQLEnum(MeetingLevel, name="meeting_level"),
        nullable=False,
        default=MeetingLevel.INTERNAL
    )
    confidentiality_level = Column(
        SQLEnum(ConfidentialityLevel, name="confidentiality_level"),
        nullable=False,
        default=ConfidentialityLevel.LOW
    )
    
    # 关联项目
    related_project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # 时间地点
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(500), nullable=True, comment="地点/线上链接")
    
    # 创建人与状态
    created_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    status = Column(
        SQLEnum(MeetingStatus, name="meeting_status"),
        nullable=False,
        default=MeetingStatus.PLANNING
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
    created_by = relationship("User", foreign_keys=[created_by_user_id], lazy="selectin")
    related_project = relationship("Project", lazy="selectin")
    participants = relationship("MeetingParticipant", back_populates="meeting", lazy="selectin")
    external_guests = relationship("ExternalGuest", back_populates="meeting", lazy="selectin")
    minutes = relationship("MeetingMinutes", back_populates="meeting", uselist=False)
    
    def __repr__(self):
        return f"<Meeting(id={self.id}, title='{self.title}')>"


class MeetingParticipant(Base):
    """会议参与者表"""
    __tablename__ = "meeting_participants"
    
    meeting_id = Column(
        BigInteger,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        primary_key=True
    )
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    role = Column(
        SQLEnum(ParticipantRole, name="participant_role"),
        nullable=False,
        default=ParticipantRole.ATTENDEE
    )
    attendance_status = Column(
        SQLEnum(AttendanceStatus, name="attendance_status"),
        nullable=False,
        default=AttendanceStatus.INVITED
    )
    
    # 关联关系
    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User", lazy="selectin")


class ExternalGuest(Base, TimestampMixin, SoftDeleteMixin):
    """外部嘉宾表"""
    __tablename__ = "external_guests"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    meeting_id = Column(
        BigInteger,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # 嘉宾信息
    name = Column(String(100), nullable=False)
    organization = Column(String(200), nullable=True)
    title = Column(String(100), nullable=True)
    contact = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    
    # 邀请人（支持多个）
    invited_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="主要邀请人（向后兼容）"
    )
    invited_by_user_ids = Column(
        JSONB,
        nullable=True,
        comment="邀请人用户ID列表"
    )
    
    # 关联关系
    meeting = relationship("Meeting", back_populates="external_guests")
    invited_by = relationship("User", lazy="selectin")
    
    def __repr__(self):
        return f"<ExternalGuest(id={self.id}, name='{self.name}')>"


class MeetingMinutes(Base, TimestampMixin):
    """会议纪要表"""
    __tablename__ = "meeting_minutes"
    
    meeting_id = Column(
        BigInteger,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        primary_key=True
    )
    content = Column(Text, nullable=False, comment="纪要内容")
    attachments = Column(JSONB, nullable=True, comment="附件列表")
    
    created_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    
    # 关联关系
    meeting = relationship("Meeting", back_populates="minutes")
    created_by = relationship("User", lazy="selectin")


class UserAvailability(Base, TimestampMixin, SoftDeleteMixin):
    """用户可用时间表"""
    __tablename__ = "user_availability"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    note = Column(Text, nullable=True, comment="备注")
    
    # 可见范围
    visibility_scope_type = Column(
        SQLEnum(VisibilityScopeType, name="visibility_scope_type"),
        nullable=False,
        default=VisibilityScopeType.ROLE_MIN_LEVEL
    )
    visibility_min_role_level = Column(
        Integer,
        nullable=True,
        default=3,  # 默认仅管理员/联合创始人可见
        comment="最低可见角色等级"
    )
    visibility_user_ids = Column(JSONB, nullable=True)
    
    # 关联关系
    user = relationship("User", lazy="selectin")
    
    def __repr__(self):
        return f"<UserAvailability(id={self.id}, user_id={self.user_id})>"

