"""
元征 · 合伙人赋能平台 - 需求与响应 Schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict

from app.models.demand import (
    DemandStatus, DemandResponseStatus,
    ChangeRequestStatus, ChangeRequestType
)
from app.models.project import VisibilityScopeType


# ============ 需求 Schemas ============

class DemandBase(BaseModel):
    """需求基础字段"""
    title: str = Field(..., min_length=1, max_length=200, description="需求名称")
    description: str = Field(..., min_length=1, description="需求内容描述")
    business_type: str = Field(..., description="业务类型")
    industry: Optional[str] = Field(None, max_length=100, description="需求行业")


class DemandCreate(DemandBase):
    """需求发布表单"""
    project_ids: List[int] = Field(..., min_length=1, description="所属项目ID列表（可多选）")
    participant_ids: List[int] = Field(..., min_length=1, description="需求人ID列表")
    expected_reward: Optional[dict] = Field(
        None, 
        description="激励形式: {equity: '5%', token: 1000, other: '...'}"
    )
    visibility_scope_type: VisibilityScopeType = VisibilityScopeType.ALL
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None
    note: Optional[str] = None


class DemandUpdate(BaseModel):
    """需求更新"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    expected_reward: Optional[dict] = None
    status: Optional[DemandStatus] = None
    visibility_scope_type: Optional[VisibilityScopeType] = None
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None


class DemandParticipantRead(BaseModel):
    """需求参与人读取"""
    user_id: int
    user_name: str
    is_owner: bool
    
    model_config = ConfigDict(from_attributes=True)


class DemandRead(DemandBase):
    """需求读取"""
    id: int
    project_id: int
    project_name: Optional[str] = None
    group_id: Optional[int]
    status: DemandStatus
    expected_reward: Optional[dict]
    owner_user_id: int
    owner_name: Optional[str] = None
    visibility_scope_type: VisibilityScopeType
    visibility_min_role_level: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    participants: List[DemandParticipantRead] = []
    response_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class DemandList(BaseModel):
    """需求列表响应"""
    items: List[DemandRead]
    total: int
    page: int
    page_size: int


# ============ 需求响应 Schemas ============

class DemandResponseCreate(BaseModel):
    """响应需求表单"""
    demand_id: int = Field(..., description="对应需求ID")
    proposal: str = Field(..., min_length=1, description="响应方案描述")
    expected_reward: Optional[dict] = Field(
        None,
        description="意向激励: {equity: '3%', token: 500}"
    )
    note: Optional[str] = None


class DemandResponseRead(BaseModel):
    """需求响应读取"""
    id: int
    demand_id: int
    demand_title: Optional[str] = None
    demand_project_name: Optional[str] = None
    responder_id: int
    responder_name: Optional[str] = None
    proposal: str
    expected_reward: Optional[dict]
    final_reward: Optional[dict]
    status: DemandResponseStatus
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class DemandResponseReview(BaseModel):
    """审核需求响应"""
    accepted: bool
    final_reward: Optional[dict] = Field(
        None,
        description="最终激励条款（接受时填写）"
    )
    comment: Optional[str] = None


class MarkResourceUsed(BaseModel):
    """确认资源已使用并可选发起支付"""
    note: Optional[str] = Field(None, description="备注")
    initiate_payment: bool = Field(False, description="是否同时发起Token支付")
    token_amount: Optional[float] = Field(None, description="Token支付数量（如果发起支付）")
    payment_reason: Optional[str] = Field(None, description="支付原因")


# ============ 响应修改/废弃申请 Schemas ============

class ChangeRequestCreate(BaseModel):
    """响应修改/废弃申请表单"""
    response_id: int = Field(..., description="对应响应ID")
    change_type: ChangeRequestType = Field(..., description="MODIFY/ABANDON")
    reason: str = Field(..., min_length=1, description="修改/废弃原因")
    new_reward: Optional[dict] = Field(
        None,
        description="新激励条款（修改时使用）"
    )
    note: Optional[str] = None


class ChangeRequestRead(BaseModel):
    """修改/废弃申请读取"""
    id: int
    demand_id: int
    response_id: int
    change_type: ChangeRequestType
    reason: str
    new_reward: Optional[dict]
    note: Optional[str]
    requested_by_user_id: int
    requested_by_name: Optional[str] = None
    requested_at: datetime
    status: ChangeRequestStatus
    provider_decision: Optional[str]
    provider_decided_at: Optional[datetime]
    admin_user_id: Optional[int]
    admin_decision: Optional[str]
    admin_decided_at: Optional[datetime]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ProviderDecision(BaseModel):
    """资源方决策"""
    accept: bool
    comment: Optional[str] = None


class AdminDecision(BaseModel):
    """管理员裁决"""
    decision: str = Field(..., pattern="^(APPROVE|REJECT|CONTINUE_ORIGINAL|ADOPT_NEW)$")
    new_reward: Optional[dict] = Field(None, description="管理员指定的新条款")
    comment: Optional[str] = None

