"""
元征 · 合伙人赋能平台 - 审计日志 Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AuditLogBase(BaseModel):
    """审计日志基础模型"""
    action: str
    object_type: str
    object_id: int
    summary: str


class AuditLogRead(AuditLogBase):
    """审计日志读取模型"""
    id: int
    user_id: int
    user_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogList(BaseModel):
    """审计日志列表响应"""
    items: List[AuditLogRead]
    total: int
    skip: int
    limit: int


class AuditLogQuery(BaseModel):
    """审计日志查询参数"""
    user_id: Optional[int] = None
    action: Optional[str] = None
    object_type: Optional[str] = None
    object_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    skip: int = 0
    limit: int = 50


class ValueRecordBase(BaseModel):
    """价值记录基础模型"""
    amount: float
    currency: str = "CNY"
    description: str
    related_project_id: Optional[int] = None
    record_time: datetime


class ValueRecordCreate(ValueRecordBase):
    """价值记录创建模型"""
    pass


class ValueRecordRead(ValueRecordBase):
    """价值记录读取模型"""
    id: int
    created_by_admin_id: int
    created_by_name: Optional[str] = None
    related_project_name: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ValueRecordList(BaseModel):
    """价值记录列表响应"""
    items: List[ValueRecordRead]
    total: int
    total_amount: float


class ValueSummary(BaseModel):
    """价值统计摘要"""
    total_amount: float
    currency: str
    record_count: int
    this_month_amount: float
    this_year_amount: float

