"""
元征 · 合伙人赋能平台 - 投票 Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.voting import VoteStatus
from app.models.project import VisibilityScopeType


class VoteOptionCreate(BaseModel):
    """创建投票选项"""
    text: str = Field(..., min_length=1, max_length=500)
    order_no: int = 0


class VoteOptionRead(BaseModel):
    """投票选项读取"""
    id: int
    text: str
    order_no: int
    vote_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class VoteCreate(BaseModel):
    """发起投票表单"""
    title: str = Field(..., min_length=1, max_length=200, description="投票标题")
    reason: str = Field(..., min_length=1, description="投票事由")
    description: Optional[str] = Field(None, description="补充说明")
    end_time: datetime = Field(..., description="截止时间")
    is_anonymous: bool = Field(False, description="是否匿名")
    pass_rule: str = Field(..., description="通过标准: 1/3, 1/2, 2/3, 全票, 自定义")
    allow_abstain: bool = Field(False, description="是否开设弃票选项")
    options: List[VoteOptionCreate] = Field(..., min_length=2, description="投票选项")
    visibility_scope_type: VisibilityScopeType = VisibilityScopeType.ALL
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None


class VoteUpdate(BaseModel):
    """更新投票"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    end_time: Optional[datetime] = None


class VoteRead(BaseModel):
    """投票读取"""
    id: int
    title: str
    reason: str
    description: Optional[str]
    created_by: int
    creator_name: Optional[str] = None
    status: VoteStatus
    end_time: datetime
    is_anonymous: bool
    pass_rule: str
    allow_abstain: bool
    visibility_scope_type: VisibilityScopeType
    visibility_min_role_level: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    options: List[VoteOptionRead] = []
    total_votes: int = 0
    has_voted: bool = False  # 当前用户是否已投票
    my_vote_option_id: Optional[int] = None  # 当前用户投的选项
    
    model_config = ConfigDict(from_attributes=True)


class VoteList(BaseModel):
    """投票列表响应"""
    items: List[VoteRead]
    total: int
    page: int
    page_size: int


class CastVote(BaseModel):
    """投票"""
    option_id: int = Field(..., description="选择的选项ID")


class VoteRecordRead(BaseModel):
    """投票记录读取（非匿名投票时可见）"""
    user_id: int
    user_name: Optional[str] = None
    option_id: int
    option_text: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class VoteResultRead(BaseModel):
    """投票结果读取"""
    vote_id: int
    title: str
    status: VoteStatus
    total_votes: int
    options: List[VoteOptionRead]
    pass_rule: str
    is_passed: Optional[bool] = None  # 是否通过（由 pass_rule 判断）
    records: Optional[List[VoteRecordRead]] = None  # 非匿名投票时返回

