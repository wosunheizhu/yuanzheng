"""
元征 · 合伙人赋能平台 - 通知与公告 Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.notification import InboxCategory
from app.models.project import VisibilityScopeType


# ============ 公告 Schemas ============

class AnnouncementCreate(BaseModel):
    """发布公告表单"""
    title: str = Field(..., min_length=1, max_length=200, description="公告名称")
    content: str = Field(..., min_length=1, description="公告内容")
    attachments: Optional[List[dict]] = Field(None, description="附件列表 [{name, url}]")
    visibility_scope_type: VisibilityScopeType = VisibilityScopeType.ALL
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None


class AnnouncementUpdate(BaseModel):
    """更新公告"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = None
    attachments: Optional[List[dict]] = None


class AnnouncementRead(BaseModel):
    """公告读取"""
    id: int
    title: str
    content: str
    attachments: Optional[List[dict]]
    created_by_user_id: int
    created_by_name: Optional[str] = None
    visibility_scope_type: VisibilityScopeType
    visibility_min_role_level: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AnnouncementList(BaseModel):
    """公告列表响应"""
    items: List[AnnouncementRead]
    total: int
    page: int
    page_size: int


# ============ 信箱 Schemas ============

class InboxItemRead(BaseModel):
    """信箱消息读取"""
    id: int
    category: InboxCategory
    title: str
    content: Optional[str]
    related_object_type: Optional[str]
    related_object_id: Optional[int]
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class InboxList(BaseModel):
    """信箱列表响应"""
    items: List[InboxItemRead]
    total: int
    unread_count: int
    page: int
    page_size: int


class InboxStats(BaseModel):
    """信箱统计"""
    total_unread: int
    announcement_unread: int
    system_unread: int
    vote_unread: int
    dm_unread: int
    mention_unread: int

