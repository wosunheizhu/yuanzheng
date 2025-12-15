"""
元征 · 合伙人赋能平台 - Token 账户相关 Schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

from app.models.token import TokenTransactionDirection, TokenTransactionStatus


# ============ Token 账户 Schemas ============

class TokenAccountRead(BaseModel):
    """Token 账户读取"""
    user_id: int
    balance: Decimal
    initial_balance: Decimal
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============ Token 交易 Schemas ============

class TokenTransactionCreate(BaseModel):
    """Token 转账申请表单"""
    to_user_id: int = Field(..., description="接收方用户ID")
    amount: Decimal = Field(..., gt=0, description="转账金额")
    related_project_id: Optional[int] = Field(None, description="关联项目ID")
    reason: str = Field(..., min_length=1, description="转账理由")
    note: Optional[str] = Field(None, description="备注")


class TokenTransactionRead(BaseModel):
    """Token 交易读取"""
    id: int
    from_user_id: Optional[int]
    to_user_id: Optional[int]
    amount: Decimal
    direction: TokenTransactionDirection
    related_project_id: Optional[int]
    related_demand_id: Optional[int]
    status: TokenTransactionStatus
    reason: Optional[str]
    admin_comment: Optional[str]
    created_by_user_id: int
    created_at: datetime
    updated_at: datetime
    
    # 关联信息（可选）
    from_user_name: Optional[str] = None
    to_user_name: Optional[str] = None
    project_name: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class TokenTransactionList(BaseModel):
    """Token 交易列表响应"""
    items: List[TokenTransactionRead]
    total: int
    page: int
    page_size: int


class TokenTransactionApprove(BaseModel):
    """管理员审核通过"""
    comment: Optional[str] = Field(None, description="审批意见")


class TokenTransactionReject(BaseModel):
    """管理员审核拒绝"""
    comment: str = Field(..., min_length=1, description="拒绝原因")


class TokenTransactionConfirm(BaseModel):
    """收款方确认/拒绝"""
    accept: bool = Field(..., description="是否接受")
    comment: Optional[str] = Field(None, description="说明")


# ============ 管理员操作 Schemas ============

class AdminTokenGrant(BaseModel):
    """管理员赠与 Token"""
    user_id: int = Field(..., description="目标用户ID")
    amount: Decimal = Field(..., gt=0, description="赠与金额")
    reason: str = Field(..., min_length=1, description="赠与原因")
    related_project_id: Optional[int] = Field(None, description="关联项目ID")


class AdminTokenDeduct(BaseModel):
    """管理员扣除 Token"""
    user_id: int = Field(..., description="目标用户ID")
    amount: Decimal = Field(..., gt=0, description="扣除金额")
    reason: str = Field(..., min_length=1, description="扣除原因")
    related_project_id: Optional[int] = Field(None, description="关联项目ID")


class DividendRecipient(BaseModel):
    """分红接收人"""
    user_id: int
    amount: Decimal = Field(..., gt=0)
    note: Optional[str] = None


class ProjectDividend(BaseModel):
    """项目分红"""
    project_id: int = Field(..., description="关联项目ID")
    recipients: List[DividendRecipient] = Field(..., min_length=1)
    description: str = Field(..., min_length=1, description="分红说明")

