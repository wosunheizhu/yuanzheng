"""
元征 · 合伙人赋能平台 - 审计与价值记录模型
对应 Schema V2: 12. 平台价值 & 审计
"""
from sqlalchemy import (
    Column, BigInteger, String, Text, Numeric,
    ForeignKey, DateTime
)
from sqlalchemy.orm import relationship

from app.db.base_class import Base, TimestampMixin


class ValueRecord(Base, TimestampMixin):
    """元征创造的价值记录表"""
    __tablename__ = "value_records"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    amount = Column(
        Numeric(18, 2),
        nullable=False,
        comment="金额"
    )
    currency = Column(
        String(10),
        nullable=False,
        default="CNY",
        comment="币种"
    )
    description = Column(Text, nullable=False, comment="描述")
    
    # 关联项目
    related_project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True
    )
    
    record_time = Column(DateTime(timezone=True), nullable=False, comment="计入时间")
    
    created_by_admin_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        comment="录入管理员"
    )
    
    # 关联关系
    related_project = relationship("Project", lazy="selectin")
    created_by = relationship("User", lazy="selectin")
    
    def __repr__(self):
        return f"<ValueRecord(id={self.id}, amount={self.amount} {self.currency})>"


class AuditLog(Base, TimestampMixin):
    """审计日志表"""
    __tablename__ = "audit_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
        comment="操作人"
    )
    action = Column(
        String(100),
        nullable=False,
        index=True,
        comment="操作类型"
    )
    object_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="对象类型"
    )
    object_id = Column(
        BigInteger,
        nullable=False,
        comment="对象ID"
    )
    summary = Column(Text, nullable=False, comment="简要说明")
    
    # 关联关系
    user = relationship("User", lazy="selectin")
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', object={self.object_type}:{self.object_id})>"

