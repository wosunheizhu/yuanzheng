"""
元征 · 合伙人赋能平台 - 资源 Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.resource import ResourceStatus
from app.models.project import VisibilityScopeType


class ResourceTagRead(BaseModel):
    """资源标签读取"""
    id: int
    name: str
    
    model_config = ConfigDict(from_attributes=True)


class ResourceCreate(BaseModel):
    """资源发布表单"""
    org_name: str = Field(..., min_length=1, max_length=200, description="所属机构")
    description: str = Field(..., min_length=1, description="资源描述")
    relationship_strength: int = Field(..., ge=1, le=5, description="关系强度 1-5")
    industry: Optional[str] = Field(None, max_length=100, description="行业")
    region: Optional[str] = Field(None, max_length=100, description="地区")
    note: Optional[str] = Field(None, description="备注")
    tag_names: Optional[List[str]] = Field(None, description="标签名称列表")
    visibility_scope_type: VisibilityScopeType = VisibilityScopeType.ROLE_MIN_LEVEL
    visibility_min_role_level: int = Field(2, description="默认核心合伙人及以上可见")
    visibility_user_ids: Optional[List[int]] = None


class ResourceUpdate(BaseModel):
    """资源更新"""
    org_name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    relationship_strength: Optional[int] = Field(None, ge=1, le=5)
    industry: Optional[str] = None
    region: Optional[str] = None
    note: Optional[str] = None
    status: Optional[ResourceStatus] = None
    tag_names: Optional[List[str]] = None
    visibility_scope_type: Optional[VisibilityScopeType] = None
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None


class ResourceRead(BaseModel):
    """资源读取"""
    id: int
    owner_user_id: int
    owner_name: Optional[str] = None
    org_name: str
    description: str
    relationship_strength: int
    industry: Optional[str]
    region: Optional[str]
    note: Optional[str]
    status: ResourceStatus
    visibility_scope_type: VisibilityScopeType
    visibility_min_role_level: Optional[int]
    created_at: datetime
    updated_at: datetime
    tags: List[ResourceTagRead] = []
    
    model_config = ConfigDict(from_attributes=True)


class ResourceList(BaseModel):
    """资源列表响应"""
    items: List[ResourceRead]
    total: int
    page: int
    page_size: int


class ResourceSearchRequest(BaseModel):
    """资源检索请求"""
    query: str = Field(..., min_length=1, description="需求描述")
    industry: Optional[str] = None
    region: Optional[str] = None
    min_strength: Optional[int] = Field(None, ge=1, le=5)


class ResourceSearchResult(BaseModel):
    """资源检索结果"""
    resource: ResourceRead
    match_reason: str = ""
    usage_suggestion: str = ""

