"""
元征 · 合伙人赋能平台 - 新闻 Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class NewsSourceCreate(BaseModel):
    """新闻源配置"""
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern="^(RSS|HTML|API)$", description="类型: RSS/HTML/API")
    base_url: str = Field(..., min_length=1, max_length=500)
    fetch_frequency_minutes: int = Field(60, ge=5, description="抓取频率（分钟）")
    parse_rule: Optional[dict] = None
    default_tags: Optional[List[str]] = None
    is_active: bool = True


class NewsSourceRead(BaseModel):
    """新闻源读取"""
    id: int
    name: str
    type: str
    base_url: str
    fetch_frequency_minutes: int
    parse_rule: Optional[dict]
    default_tags: Optional[List[str]]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class NewsCreate(BaseModel):
    """添加新闻"""
    original_url: str = Field(..., min_length=1, max_length=1000, description="原文URL")
    title: Optional[str] = Field(None, max_length=500, description="标题（可选，自动抓取）")
    summary: Optional[str] = Field(None, description="摘要（可选，AI 生成）")
    tags: Optional[List[str]] = None
    related_project_ids: Optional[List[int]] = Field(None, description="关联项目ID列表")


class NewsUpdate(BaseModel):
    """新闻更新"""
    title: Optional[str] = Field(None, max_length=500)
    summary: Optional[str] = None
    tags: Optional[List[str]] = None


class NewsRead(BaseModel):
    """新闻读取"""
    id: int
    title: str
    summary: Optional[str]
    source_name: Optional[str]
    original_url: str
    publish_time: Optional[datetime]
    fetched_at: Optional[datetime]
    tags: Optional[List[str]]
    added_by_user_id: Optional[int]
    added_by_name: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class NewsList(BaseModel):
    """新闻列表响应"""
    items: List[NewsRead]
    total: int
    page: int
    page_size: int


class ProjectNewsLinkCreate(BaseModel):
    """关联项目与新闻"""
    news_id: int
    project_id: int

