"""
元征 · 合伙人赋能平台 - 用户模型
对应 Schema V2: 1.1 users
"""
from datetime import date
from sqlalchemy import (
    Column, BigInteger, String, Text, Date, Boolean, 
    ForeignKey, DateTime, Integer
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin


class User(Base, TimestampMixin, SoftDeleteMixin):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # 基本信息
    name = Column(String(100), nullable=False, comment="姓名")
    phone = Column(String(20), unique=True, nullable=True, comment="手机号")
    email = Column(String(255), unique=True, nullable=True, comment="邮箱")
    avatar_url = Column(String(500), nullable=True, comment="头像URL")
    
    # 组织与职务
    organization = Column(String(255), nullable=True, comment="所属组织")
    organization_public = Column(Boolean, default=True, comment="组织是否公开")
    title = Column(String(100), nullable=True, comment="职务头衔")
    
    # 个人信息
    gender = Column(String(10), nullable=True, comment="性别: MALE/FEMALE/OTHER")
    birth_date = Column(Date, nullable=True, comment="出生日期")
    intro = Column(Text, nullable=True, comment="自我描述")
    expertise = Column(Text, nullable=True, comment="擅长领域")
    
    # 联系方式
    contact = Column(String(255), nullable=True, comment="联系方式")
    contact_public = Column(Boolean, default=True, comment="联系方式是否公开")
    
    # 地址
    address = Column(String(500), nullable=True, comment="地址")
    address_public = Column(Boolean, default=False, comment="地址是否公开")
    
    # 其他信息
    education = Column(Text, nullable=True, comment="教育经历")
    tags = Column(JSONB, nullable=True, comment="公开标签数组")
    hobbies = Column(Text, nullable=True, comment="爱好")
    signature = Column(Text, nullable=True, comment="个性签名")
    
    # 认证信息
    hashed_password = Column(String(255), nullable=False, comment="加密密码")
    
    # 状态
    is_active = Column(Boolean, default=True, comment="是否有效")
    is_admin = Column(Boolean, default=False, comment="是否管理员")
    
    # 关联关系
    roles = relationship(
        "Role",
        secondary="user_roles",
        back_populates="users",
        lazy="selectin"
    )
    
    # Token 账户（一对一）
    token_account = relationship(
        "TokenAccount",
        back_populates="user",
        uselist=False
    )
    
    # 我给别人打的标签
    personal_tags_given = relationship(
        "UserPersonalTag",
        foreign_keys="UserPersonalTag.owner_user_id",
        back_populates="owner",
        lazy="dynamic"
    )
    
    # 别人给我打的标签
    personal_tags_received = relationship(
        "UserPersonalTag",
        foreign_keys="UserPersonalTag.target_user_id",
        back_populates="target",
        lazy="dynamic"
    )
    
    # 我写的备注
    personal_notes_given = relationship(
        "UserPersonalNote",
        foreign_keys="UserPersonalNote.owner_user_id",
        back_populates="owner",
        lazy="dynamic"
    )
    
    @property
    def highest_role_level(self) -> int:
        """获取最高角色等级"""
        if not self.roles:
            return 0
        return max(role.role_level for role in self.roles)
    
    @property
    def role_codes(self) -> list[str]:
        """获取所有角色代码列表"""
        return [role.code for role in self.roles]
    
    def can_see_role_level(self, min_level: int) -> bool:
        """检查是否满足最低角色等级要求"""
        return self.is_admin or self.highest_role_level >= min_level
    
    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', email='{self.email}')>"


class Role(Base):
    """角色表"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, comment="角色名称")
    code = Column(String(20), unique=True, nullable=False, comment="角色代码: FOUNDING/CORE/NORMAL")
    role_level = Column(Integer, nullable=False, comment="角色层级: 3=联合创始人, 2=核心, 1=普通")
    is_system = Column(Boolean, default=True, comment="是否系统角色")
    
    # 关联关系
    users = relationship(
        "User",
        secondary="user_roles",
        back_populates="roles",
        lazy="selectin"
    )
    
    def __repr__(self):
        return f"<Role(id={self.id}, code='{self.code}', level={self.role_level})>"


class UserRole(Base):
    """用户角色关联表"""
    __tablename__ = "user_roles"
    
    user_id = Column(
        BigInteger, 
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    role_id = Column(
        Integer,
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True
    )


class UserPersonalTag(Base, TimestampMixin):
    """用户个人标签（仅本人可见）"""
    __tablename__ = "user_personal_tags"
    
    # 复合主键
    owner_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        comment="标签创建者"
    )
    target_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        comment="被标签的人"
    )
    tag = Column(String(100), primary_key=True, comment="标签内容")
    
    # 关联关系
    owner = relationship(
        "User",
        foreign_keys=[owner_user_id],
        back_populates="personal_tags_given"
    )
    target = relationship(
        "User",
        foreign_keys=[target_user_id],
        back_populates="personal_tags_received"
    )
    
    def __repr__(self):
        return f"<UserPersonalTag(owner={self.owner_user_id}, target={self.target_user_id}, tag='{self.tag}')>"


class UserPersonalNote(Base, TimestampMixin, SoftDeleteMixin):
    """用户个人备注（仅本人可见）"""
    __tablename__ = "user_personal_notes"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    owner_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="备注所有者"
    )
    target_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="被备注的人"
    )
    content = Column(Text, nullable=False, comment="备注内容")
    
    # 关联关系
    owner = relationship(
        "User",
        foreign_keys=[owner_user_id],
        back_populates="personal_notes_given"
    )
    target = relationship(
        "User",
        foreign_keys=[target_user_id]
    )
    
    def __repr__(self):
        return f"<UserPersonalNote(id={self.id}, owner={self.owner_user_id}, target={self.target_user_id})>"

