"""
元征 · 合伙人赋能平台 - 社群 Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.community import PostType, FeedbackStatus
from app.models.project import VisibilityScopeType


# ============ 动态 Schemas ============

class PostCreate(BaseModel):
    """发布动态"""
    content: str = Field(..., min_length=1, description="文本内容")
    post_type: PostType = PostType.GENERAL
    related_project_id: Optional[int] = None
    related_resource_id: Optional[int] = None
    related_vote_id: Optional[int] = None
    related_announcement_id: Optional[int] = None
    visibility_scope_type: VisibilityScopeType = VisibilityScopeType.ALL
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None
    attachments: Optional[List[dict]] = Field(None, description="附件列表 [{name, url, type, size}]")


class PostUpdate(BaseModel):
    """更新动态"""
    content: Optional[str] = Field(None, min_length=1)
    visibility_scope_type: Optional[VisibilityScopeType] = None
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None


class PostRead(BaseModel):
    """动态读取"""
    id: int
    author_user_id: int
    author_name: Optional[str] = None
    author_avatar: Optional[str] = None
    post_type: PostType
    content: str
    attachments: Optional[List[dict]] = None
    related_project_id: Optional[int]
    related_project_name: Optional[str] = None
    related_resource_id: Optional[int]
    related_resource_name: Optional[str] = None
    related_vote_id: Optional[int]
    related_announcement_id: Optional[int]
    visibility_scope_type: VisibilityScopeType
    visibility_min_role_level: Optional[int]
    created_at: datetime
    updated_at: datetime
    like_count: int = 0
    comment_count: int = 0
    is_liked: bool = False  # 当前用户是否已点赞
    
    model_config = ConfigDict(from_attributes=True)


class PostList(BaseModel):
    """动态列表响应"""
    items: List[PostRead]
    total: int
    page: int
    page_size: int


# ============ 评论 Schemas ============

class CommentCreate(BaseModel):
    """发表评论"""
    content: str = Field(..., min_length=1)
    mentions: Optional[List[int]] = Field(None, description="被@用户ID列表")


class CommentRead(BaseModel):
    """评论读取"""
    id: int
    post_id: int
    user_id: int
    user_name: Optional[str] = None
    user_avatar: Optional[str] = None
    content: str
    mentions: Optional[List[int]]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============ 反馈 Schemas ============

class FeedbackCreate(BaseModel):
    """意见反馈"""
    category: str = Field(..., pattern="^(PRODUCT|BUG|POLICY|OTHER)$")
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    contact: Optional[str] = Field(None, max_length=200)
    allow_contact: bool = True


class FeedbackRead(BaseModel):
    """反馈读取"""
    id: int
    user_id: int
    user_name: Optional[str] = None
    category: str
    title: str
    content: str
    contact: Optional[str]
    allow_contact: bool
    status: FeedbackStatus
    admin_reply: Optional[str]
    admin_user_id: Optional[int]
    admin_name: Optional[str] = None
    admin_replied_at: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class FeedbackReply(BaseModel):
    """管理员回复反馈"""
    reply: Optional[str] = Field(None)  # 回复内容可选，允许只标记状态
    status: FeedbackStatus = FeedbackStatus.RESOLVED


class FeedbackList(BaseModel):
    """反馈列表响应"""
    items: List[FeedbackRead]
    total: int
    page: int
    page_size: int


# ============ 私信 Schemas ============

class DMAttachmentSchema(BaseModel):
    """私信附件"""
    name: str
    url: str
    type: str
    size: Optional[int] = None

class DMReferenceSchema(BaseModel):
    """私信引用"""
    type: str  # project / resource
    id: int
    name: str

class DMMessageCreate(BaseModel):
    """发送私信"""
    content: Optional[str] = None
    attachments: Optional[List[DMAttachmentSchema]] = None
    reference: Optional[DMReferenceSchema] = None


class DMMessageRead(BaseModel):
    """私信读取"""
    id: int
    thread_id: int
    sender_id: int
    sender_name: Optional[str] = None
    receiver_id: int
    receiver_name: Optional[str] = None
    content: Optional[str] = None
    is_read: bool
    created_at: datetime
    attachments: Optional[List[DMAttachmentSchema]] = None
    reference: Optional[DMReferenceSchema] = None
    
    model_config = ConfigDict(from_attributes=True)


class DMThreadRead(BaseModel):
    """私信会话读取"""
    id: int
    other_user_id: int  # 对方用户ID
    other_user_name: Optional[str] = None
    other_user_avatar: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
    unread_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class DMThreadList(BaseModel):
    """私信会话列表"""
    items: List[DMThreadRead]
    total: int

