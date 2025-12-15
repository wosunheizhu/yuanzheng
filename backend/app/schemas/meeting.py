"""
元征 · 合伙人赋能平台 - 座谈会 Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.meeting import (
    MeetingLevel, ConfidentialityLevel, MeetingStatus,
    ParticipantRole, AttendanceStatus
)
from app.models.project import VisibilityScopeType


# ============ 用户可用时间 ============

class UserAvailabilityCreate(BaseModel):
    """创建可用时间"""
    start_time: datetime
    end_time: datetime
    note: Optional[str] = None
    visibility_scope_type: VisibilityScopeType = VisibilityScopeType.ROLE_MIN_LEVEL
    visibility_min_role_level: int = Field(3, description="默认仅联合创始人/管理员可见")
    visibility_user_ids: Optional[List[int]] = None


class UserAvailabilityRead(BaseModel):
    """可用时间读取"""
    id: int
    user_id: int
    user_name: Optional[str] = None
    start_time: datetime
    end_time: datetime
    note: Optional[str]
    visibility_scope_type: VisibilityScopeType
    visibility_min_role_level: Optional[int]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============ 会议参与者 ============

class MeetingParticipantCreate(BaseModel):
    """添加会议参与者"""
    user_id: int
    role: ParticipantRole = ParticipantRole.ATTENDEE


class MeetingParticipantRead(BaseModel):
    """会议参与者读取"""
    user_id: int
    user_name: Optional[str] = None
    role: ParticipantRole
    attendance_status: AttendanceStatus
    
    model_config = ConfigDict(from_attributes=True)


# ============ 外部嘉宾 ============

class ExternalGuestCreate(BaseModel):
    """添加外部嘉宾"""
    name: str = Field(..., min_length=1, max_length=100)
    organization: Optional[str] = Field(None, max_length=200)
    title: Optional[str] = Field(None, max_length=100)
    contact: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = None
    invited_by_user_ids: Optional[List[int]] = Field(None, description="邀请人用户ID列表，可选，可多选")


class ExternalGuestRead(BaseModel):
    """外部嘉宾读取"""
    id: int
    meeting_id: int
    name: str
    organization: Optional[str]
    title: Optional[str]
    contact: Optional[str]
    notes: Optional[str]
    invited_by_user_id: Optional[int] = None  # 向后兼容
    invited_by_user_ids: Optional[List[int]] = None  # 邀请人ID列表
    invited_by_name: Optional[str] = None  # 向后兼容
    invited_by_names: Optional[List[str]] = None  # 邀请人姓名列表
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============ 会议纪要 ============

class MeetingMinutesCreate(BaseModel):
    """创建/更新会议纪要"""
    content: str = Field(..., min_length=1, description="纪要内容")
    attachments: Optional[List[dict]] = Field(None, description="附件列表 [{name, url}]")


class MeetingMinutesRead(BaseModel):
    """会议纪要读取"""
    meeting_id: int
    content: str
    attachments: Optional[List[dict]]
    created_by_user_id: int
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============ 座谈会 ============

class MeetingCreate(BaseModel):
    """创建座谈会"""
    title: str = Field(..., min_length=1, max_length=200, description="会议主题")
    description: Optional[str] = Field(None, description="简介/议题")
    meeting_level: MeetingLevel = MeetingLevel.INTERNAL
    confidentiality_level: ConfidentialityLevel = ConfidentialityLevel.LOW
    related_project_id: Optional[int] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = Field(None, max_length=500, description="地点/线上链接")
    participant_ids: Optional[List[int]] = Field(None, description="参与者用户ID列表")
    visibility_scope_type: VisibilityScopeType = VisibilityScopeType.ALL
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None


class MeetingUpdate(BaseModel):
    """更新座谈会"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    meeting_level: Optional[MeetingLevel] = None
    confidentiality_level: Optional[ConfidentialityLevel] = None
    related_project_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    location: Optional[str] = None
    status: Optional[MeetingStatus] = None
    visibility_scope_type: Optional[VisibilityScopeType] = None
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None


class MeetingRead(BaseModel):
    """座谈会读取"""
    id: int
    title: str
    description: Optional[str]
    meeting_level: MeetingLevel
    confidentiality_level: ConfidentialityLevel
    related_project_id: Optional[int]
    related_project_name: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str]
    created_by_user_id: int
    created_by_name: Optional[str] = None
    status: MeetingStatus
    visibility_scope_type: VisibilityScopeType
    visibility_min_role_level: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    participants: List[MeetingParticipantRead] = []
    external_guests: List[ExternalGuestRead] = []
    has_minutes: bool = False
    
    model_config = ConfigDict(from_attributes=True)


class MeetingList(BaseModel):
    """座谈会列表响应"""
    items: List[MeetingRead]
    total: int
    page: int
    page_size: int


class AttendanceUpdate(BaseModel):
    """更新出席状态"""
    attendance_status: AttendanceStatus

