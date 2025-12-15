"""
元征 · 合伙人赋能平台 - 项目相关 Schemas
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any
from pydantic import BaseModel, Field, ConfigDict

from app.models.project import (
    ProjectReviewStatus, ProjectBusinessStatus,
    VisibilityScopeType, ProjectMemberRole,
    JoinRequestStatus, ShareOwnerType, ProjectEventType
)


# ============ 项目成员 Schemas ============

class ProjectMemberCreate(BaseModel):
    """添加项目成员"""
    user_id: int
    role_in_project: ProjectMemberRole = ProjectMemberRole.MEMBER
    duty_description: Optional[str] = None


class ProjectMemberRead(BaseModel):
    """项目成员读取"""
    user_id: int
    user_name: str
    role_in_project: ProjectMemberRole
    duty_description: Optional[str]
    join_time: datetime
    leave_time: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


# ============ 项目股权 Schemas ============

class ProjectShareCreate(BaseModel):
    """创建股权记录"""
    owner_type: ShareOwnerType
    owner_id: int
    percentage: Decimal = Field(..., ge=0, le=100)
    note: Optional[str] = None


class ProjectShareRead(BaseModel):
    """股权记录读取"""
    id: int
    owner_type: ShareOwnerType
    owner_id: int
    owner_name: Optional[str] = None  # 用户名或"元征"
    percentage: Decimal
    effective_from: datetime
    note: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)


# ============ 项目 Schemas ============

class ProjectBase(BaseModel):
    """项目基础字段"""
    name: str = Field(..., min_length=1, max_length=200, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    business_type: str = Field(
        ..., 
        description="业务类型: 协议转让/并购重组/产业赋能/债权业务/其他"
    )
    industry: Optional[str] = Field(None, max_length=100, description="行业")
    region: Optional[str] = Field(None, max_length=100, description="地区")


class ProjectCreate(ProjectBase):
    """新建项目表单"""
    # 负责人与成员
    owner_ids: List[int] = Field(..., min_length=1, description="负责人用户ID列表")
    member_ids: Optional[List[int]] = Field(None, description="普通成员用户ID列表")
    
    # 股权结构（49%分配给合伙人，51%固定为元征）
    shares: List[ProjectShareCreate] = Field(..., description="股权分配")
    
    # 初始业务状态
    business_status: ProjectBusinessStatus = ProjectBusinessStatus.ONGOING
    
    # 可见范围
    visibility_scope_type: VisibilityScopeType = VisibilityScopeType.ALL
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None
    
    # 关联项目
    related_project_ids: Optional[List[int]] = Field(None, description="关联项目ID列表")
    
    # 首个需求（可选）
    initial_demand_title: Optional[str] = Field(None, description="初始需求名称")
    initial_demand_description: Optional[str] = Field(None, description="初始需求内容")
    initial_demand_reward: Optional[dict] = Field(None, description="初始需求激励形式")


class ProjectUpdate(BaseModel):
    """项目更新"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    region: Optional[str] = None
    business_status: Optional[ProjectBusinessStatus] = None
    visibility_scope_type: Optional[VisibilityScopeType] = None
    visibility_min_role_level: Optional[int] = None
    visibility_user_ids: Optional[List[int]] = None


class ProjectRead(ProjectBase):
    """项目读取"""
    id: int
    review_status: ProjectReviewStatus
    business_status: ProjectBusinessStatus
    created_by: int
    creator_name: Optional[str] = None
    visibility_scope_type: VisibilityScopeType
    visibility_min_role_level: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    # 关联信息
    members: List[ProjectMemberRead] = []
    shares: List[ProjectShareRead] = []
    
    model_config = ConfigDict(from_attributes=True)


class ProjectList(BaseModel):
    """项目列表响应"""
    items: List[ProjectRead]
    total: int
    page: int
    page_size: int


class ProjectReview(BaseModel):
    """项目审核"""
    approved: bool
    comment: Optional[str] = None


# ============ 加入项目申请 Schemas ============

class ProjectJoinRequestCreate(BaseModel):
    """加入项目表单"""
    desired_role: ProjectMemberRole = Field(..., description="申请身份")
    duty_description: str = Field(..., min_length=1, description="加入后职责")
    intended_share_pct: Optional[Decimal] = Field(None, ge=0, le=100, description="意向股份%")
    note: Optional[str] = None


class ProjectJoinRequestRead(BaseModel):
    """加入申请读取"""
    id: int
    project_id: int
    project_name: Optional[str] = None
    applicant_id: int
    applicant_name: Optional[str] = None
    desired_role: ProjectMemberRole
    duty_description: str
    intended_share_pct: Optional[Decimal]
    note: Optional[str]
    status: JoinRequestStatus
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    review_comment: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ShareDeduction(BaseModel):
    """股份扣除项"""
    share_id: int = Field(..., description="股权记录ID")
    amount: Decimal = Field(..., ge=0, le=100, description="扣除比例%")


class ProjectJoinRequestReview(BaseModel):
    """审核加入申请"""
    approved: bool
    actual_share_pct: Optional[Decimal] = Field(None, ge=0, le=100, description="实际分配股份%")
    deductions: Optional[List[ShareDeduction]] = Field(None, description="从多个股权方扣除")
    comment: Optional[str] = None


# ============ 项目邀请 Schemas ============

class ProjectInvitationCreate(BaseModel):
    """创建邀请"""
    invitee_id: int = Field(..., description="被邀请人ID")
    proposed_role: ProjectMemberRole = Field(ProjectMemberRole.MEMBER, description="建议角色")
    proposed_duty: Optional[str] = Field(None, description="建议职责")
    proposed_share_pct: Optional[Decimal] = Field(None, ge=0, le=100, description="建议股份%")
    message: Optional[str] = Field(None, description="邀请留言")


class ProjectInvitationRead(BaseModel):
    """邀请详情"""
    id: int
    project_id: int
    project_name: Optional[str] = None
    inviter_id: int
    inviter_name: Optional[str] = None
    invitee_id: int
    invitee_name: Optional[str] = None
    proposed_role: ProjectMemberRole
    proposed_duty: Optional[str] = None
    proposed_share_pct: Optional[Decimal] = None
    message: Optional[str] = None
    status: str
    responded_at: Optional[datetime] = None
    response_note: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ProjectInvitationResponse(BaseModel):
    """响应邀请"""
    accepted: bool
    note: Optional[str] = None


# ============ 项目事件 Schemas ============

class ProjectEventCreate(BaseModel):
    """新建项目事件"""
    event_type: ProjectEventType = Field(ProjectEventType.NOTE, description="事件类型")
    title: str = Field(..., min_length=1, max_length=500, description="事件标题")
    description: Optional[str] = Field(None, description="详细描述")
    
    # 关联对象
    related_demand_id: Optional[int] = None
    related_response_id: Optional[int] = None
    related_transaction_id: Optional[int] = None
    related_meeting_id: Optional[int] = None
    related_news_id: Optional[int] = None
    
    # 扩展数据
    payload: Optional[dict] = None


class ProjectEventRead(BaseModel):
    """项目事件读取"""
    id: int
    project_id: int
    event_type: ProjectEventType
    title: str
    description: Optional[str]
    created_by_user_id: int
    created_by_name: Optional[str] = None
    created_at: datetime
    
    # 关联对象
    related_demand_id: Optional[int]
    related_response_id: Optional[int]
    related_transaction_id: Optional[int]
    related_meeting_id: Optional[int]
    related_news_id: Optional[int]
    related_value_record_id: Optional[int]
    
    # 状态变更
    old_status: Optional[str]
    new_status: Optional[str]
    share_change_snapshot: Optional[Any]
    payload: Optional[Any]
    
    model_config = ConfigDict(from_attributes=True)


class ProjectEventCorrection(BaseModel):
    """事件更正"""
    original_event_id: int = Field(..., description="被更正事件ID")
    correction_note: str = Field(..., min_length=1, description="更正说明")


# ============ 股权调整 Schemas ============

class ShareAdjustmentItem(BaseModel):
    """单个股权调整项"""
    owner_type: ShareOwnerType
    owner_id: int = Field(..., description="ORG时为0，USER时为用户ID")
    percentage: Decimal = Field(..., ge=0, le=100, description="股份比例")
    note: Optional[str] = None


class ShareAdjustment(BaseModel):
    """股权调整表单"""
    shares: List[ShareAdjustmentItem] = Field(..., min_length=1, description="新股权结构")
    reason: str = Field(..., min_length=1, description="调整原因")

