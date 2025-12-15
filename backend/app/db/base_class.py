"""
元征 · 合伙人赋能平台 - 模型基类
所有 SQLAlchemy 模型的基类
"""
from datetime import datetime
from sqlalchemy import Column, DateTime, Boolean
from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    """SQLAlchemy 声明式基类"""
    
    @declared_attr.directive
    def __tablename__(cls) -> str:
        """自动生成表名（类名转小写+下划线）"""
        import re
        name = cls.__name__
        # CamelCase -> snake_case
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


class TimestampMixin:
    """时间戳混入类"""
    created_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class SoftDeleteMixin:
    """软删除混入类"""
    is_deleted = Column(Boolean, default=False, nullable=False)

