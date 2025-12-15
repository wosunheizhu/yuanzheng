"""
元征 · 合伙人赋能平台 - 用户相关 Schemas
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ============ 角色 Schemas ============

class RoleRead(BaseModel):
    """角色读取"""
    id: int
    name: str
    code: str
    role_level: int
    
    model_config = ConfigDict(from_attributes=True)


# ============ 用户 Schemas ============

class UserBase(BaseModel):
    """用户基础字段"""
    name: str = Field(..., min_length=1, max_length=100, description="姓名")
    phone: Optional[str] = Field(None, max_length=20, description="手机号")
    email: Optional[EmailStr] = Field(None, description="邮箱")
    avatar_url: Optional[str] = Field(None, max_length=500, description="头像URL")
    organization: Optional[str] = Field(None, max_length=255, description="所属组织")
    organization_public: bool = Field(True, description="组织是否公开")
    title: Optional[str] = Field(None, max_length=100, description="职务头衔")
    gender: Optional[str] = Field(None, description="性别")
    birth_date: Optional[date] = Field(None, description="出生日期")
    intro: Optional[str] = Field(None, description="自我描述")
    expertise: Optional[str] = Field(None, description="擅长领域")
    contact: Optional[str] = Field(None, max_length=255, description="联系方式")
    contact_public: bool = Field(True, description="联系方式是否公开")
    address: Optional[str] = Field(None, max_length=500, description="地址")
    address_public: bool = Field(False, description="地址是否公开")
    education: Optional[str] = Field(None, description="教育经历")
    tags: Optional[List[str]] = Field(None, description="公开标签")
    hobbies: Optional[str] = Field(None, description="爱好")
    signature: Optional[str] = Field(None, description="个性签名")


class UserCreate(BaseModel):
    """管理员创建用户（人员注册表单）"""
    name: str = Field(..., min_length=1, max_length=100, description="姓名")
    phone: Optional[str] = Field(None, max_length=20, description="手机号")
    email: Optional[EmailStr] = Field(None, description="邮箱")
    role_code: str = Field(
        ..., 
        description="角色代码: FOUNDING/CORE/NORMAL",
        pattern="^(FOUNDING|CORE|NORMAL)$"
    )
    password: Optional[str] = Field(
        None, 
        min_length=6, 
        description="初始密码（可选，不填则需首次登录设置）"
    )


class UserUpdate(BaseModel):
    """用户更新（个人信息表单）- 所有字段可选"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="姓名")
    phone: Optional[str] = Field(None, max_length=20, description="手机号")
    avatar_url: Optional[str] = Field(None, max_length=500, description="头像URL")
    organization: Optional[str] = Field(None, max_length=255, description="所属组织")
    organization_public: Optional[bool] = Field(None, description="组织是否公开")
    title: Optional[str] = Field(None, max_length=100, description="职务头衔")
    gender: Optional[str] = Field(None, description="性别")
    birth_date: Optional[date] = Field(None, description="出生日期")
    intro: Optional[str] = Field(None, description="自我描述")
    expertise: Optional[str] = Field(None, description="擅长领域")
    contact: Optional[str] = Field(None, max_length=255, description="联系方式")
    contact_public: Optional[bool] = Field(None, description="联系方式是否公开")
    address: Optional[str] = Field(None, max_length=500, description="地址")
    address_public: Optional[bool] = Field(None, description="地址是否公开")
    education: Optional[str] = Field(None, description="教育经历")
    tags: Optional[List[str]] = Field(None, description="公开标签")
    hobbies: Optional[str] = Field(None, description="爱好")
    signature: Optional[str] = Field(None, description="个性签名")


class UserRead(UserBase):
    """用户读取"""
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime
    roles: List[RoleRead] = []
    
    # 计算属性
    highest_role_level: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class UserReadPublic(BaseModel):
    """用户公开信息（查看他人主页）"""
    id: int
    name: str
    avatar_url: Optional[str]
    organization: Optional[str] = None  # 根据 organization_public 决定
    title: Optional[str]
    intro: Optional[str]
    expertise: Optional[str]
    contact: Optional[str] = None  # 根据 contact_public 决定
    tags: Optional[List[str]]
    signature: Optional[str]
    roles: List[RoleRead] = []
    highest_role_level: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class UserListItem(BaseModel):
    """用户列表项"""
    id: int
    name: str
    avatar_url: Optional[str]
    organization: Optional[str]
    title: Optional[str]
    expertise: Optional[str]
    tags: Optional[List[str]]
    roles: List[RoleRead] = []
    highest_role_level: int = 0
    
    model_config = ConfigDict(from_attributes=True)


# ============ 认证 Schemas ============

class UserLogin(BaseModel):
    """用户登录"""
    username: str = Field(..., description="用户名/邮箱/手机号")
    password: str = Field(..., min_length=1, description="密码")


class Token(BaseModel):
    """JWT Token 响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class TokenPayload(BaseModel):
    """JWT Token 载荷"""
    sub: int  # user_id
    exp: datetime
    is_admin: bool = False
    role_level: int = 0


class PasswordChange(BaseModel):
    """修改密码"""
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


class PasswordReset(BaseModel):
    """重置密码（管理员操作或找回密码）"""
    new_password: str = Field(..., min_length=6)


# ============ 本地标签与备注 Schemas ============

class PersonalTagCreate(BaseModel):
    """创建本地标签"""
    target_user_id: int
    tag: str = Field(..., min_length=1, max_length=100)


class PersonalTagRead(BaseModel):
    """本地标签读取"""
    target_user_id: int
    tag: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PersonalNoteCreate(BaseModel):
    """创建本地备注"""
    target_user_id: int
    content: str = Field(..., min_length=1)


class PersonalNoteUpdate(BaseModel):
    """更新本地备注"""
    content: str = Field(..., min_length=1)


class PersonalNoteRead(BaseModel):
    """本地备注读取"""
    id: int
    target_user_id: int
    content: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

