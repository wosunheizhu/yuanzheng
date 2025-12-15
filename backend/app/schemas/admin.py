"""
元征 · 合伙人赋能平台 - 管理员 Schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ============ 价值记录 Schemas ============

class ValueRecordCreate(BaseModel):
    """创建价值记录"""
    amount: Decimal = Field(..., gt=0, description="金额")
    currency: str = Field("CNY", max_length=10, description="币种")
    description: str = Field(..., min_length=1, description="描述")
    related_project_id: Optional[int] = Field(None, description="关联项目ID")
    record_time: datetime = Field(..., description="计入时间")


class ValueRecordUpdate(BaseModel):
    """更新价值记录"""
    amount: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = None
    description: Optional[str] = None
    related_project_id: Optional[int] = None
    record_time: Optional[datetime] = None


class ValueRecordRead(BaseModel):
    """价值记录读取"""
    id: int
    amount: Decimal
    currency: str
    description: str
    related_project_id: Optional[int]
    related_project_name: Optional[str] = None
    record_time: datetime
    created_by_admin_id: int
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ValueRecordList(BaseModel):
    """价值记录列表"""
    items: List[ValueRecordRead]
    total: int
    page: int
    page_size: int


class ValueSummary(BaseModel):
    """价值汇总"""
    total_value: Decimal
    currency: str
    project_count: int
    monthly_data: List[dict]  # [{month: "2024-01", value: 1000000}, ...]


# ============ 审计日志 Schemas ============

class AuditLogRead(BaseModel):
    """审计日志读取"""
    id: int
    user_id: int
    user_name: Optional[str] = None
    action: str
    object_type: str
    object_id: int
    summary: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AuditLogList(BaseModel):
    """审计日志列表"""
    items: List[AuditLogRead]
    total: int
    page: int
    page_size: int


class AuditLogFilter(BaseModel):
    """审计日志筛选"""
    user_id: Optional[int] = None
    action: Optional[str] = None
    object_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

