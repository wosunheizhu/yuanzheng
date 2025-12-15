"""
元征 · 合伙人赋能平台 - 资源模型
对应 Schema V2: 6. 资源域
"""
from sqlalchemy import (
    Column, BigInteger, String, Text, Integer,
    ForeignKey, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import enum

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin
from app.models.project import VisibilityScopeType


class ResourceStatus(str, enum.Enum):
    """资源状态"""
    ACTIVE = "ACTIVE"       # 有效
    PAUSED = "PAUSED"       # 暂停
    EXPIRED = "EXPIRED"     # 过期


class Resource(Base, TimestampMixin, SoftDeleteMixin):
    """资源表"""
    __tablename__ = "resources"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # 发布者
    owner_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="发布者"
    )
    
    # 基本信息
    org_name = Column(String(200), nullable=False, comment="所属机构")
    description = Column(Text, nullable=False, comment="资源描述")
    relationship_strength = Column(
        Integer,
        nullable=False,
        comment="关系强度 1-5"
    )
    industry = Column(String(100), nullable=True, comment="行业")
    region = Column(String(100), nullable=True, comment="地区")
    note = Column(Text, nullable=True, comment="备注")
    
    # 状态
    status = Column(
        SQLEnum(ResourceStatus, name="resource_status"),
        nullable=False,
        default=ResourceStatus.ACTIVE
    )
    
    # 可见范围
    visibility_scope_type = Column(
        SQLEnum(VisibilityScopeType, name="visibility_scope_type"),
        nullable=False,
        default=VisibilityScopeType.ROLE_MIN_LEVEL
    )
    visibility_min_role_level = Column(
        Integer,
        nullable=True,
        default=2,  # 默认核心合伙人及以上可见
        comment="最低可见角色等级"
    )
    visibility_user_ids = Column(JSONB, nullable=True)
    
    # 关联关系
    owner = relationship("User", lazy="selectin")
    tags = relationship(
        "ResourceTag",
        secondary="resource_tag_links",
        back_populates="resources",
        lazy="selectin"
    )
    
    def __repr__(self):
        return f"<Resource(id={self.id}, org='{self.org_name}')>"


class ResourceTag(Base):
    """资源标签表"""
    __tablename__ = "resource_tags"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, comment="标签名")
    
    # 关联关系
    resources = relationship(
        "Resource",
        secondary="resource_tag_links",
        back_populates="tags"
    )


class ResourceTagLink(Base):
    """资源标签关联表"""
    __tablename__ = "resource_tag_links"
    
    resource_id = Column(
        BigInteger,
        ForeignKey("resources.id", ondelete="CASCADE"),
        primary_key=True
    )
    tag_id = Column(
        Integer,
        ForeignKey("resource_tags.id", ondelete="CASCADE"),
        primary_key=True
    )

