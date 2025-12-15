"""
元征 · 合伙人赋能平台 - 新闻模型
对应 Schema V2: 7. 新闻域
"""
from sqlalchemy import (
    Column, BigInteger, String, Text, Integer, Boolean,
    ForeignKey, DateTime
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base_class import Base, TimestampMixin, SoftDeleteMixin


class NewsSource(Base, TimestampMixin):
    """新闻源配置表"""
    __tablename__ = "news_sources"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    name = Column(String(100), nullable=False, comment="源名称")
    type = Column(String(20), nullable=False, comment="类型: RSS/HTML/API")
    base_url = Column(String(500), nullable=False, comment="基础URL")
    fetch_frequency_minutes = Column(
        Integer,
        nullable=False,
        default=60,
        comment="抓取频率（分钟）"
    )
    parse_rule = Column(JSONB, nullable=True, comment="解析规则配置")
    default_tags = Column(JSONB, nullable=True, comment="默认标签数组")
    is_active = Column(Boolean, default=True, comment="是否启用")
    
    def __repr__(self):
        return f"<NewsSource(id={self.id}, name='{self.name}')>"


class News(Base, TimestampMixin, SoftDeleteMixin):
    """新闻表"""
    __tablename__ = "news"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    title = Column(String(500), nullable=False, comment="新闻标题")
    summary = Column(Text, nullable=True, comment="摘要")
    source_name = Column(String(100), nullable=True, comment="来源名称")
    original_url = Column(String(1000), unique=True, nullable=False, comment="原文URL")
    publish_time = Column(DateTime(timezone=True), nullable=True, comment="发布时间")
    fetched_at = Column(DateTime(timezone=True), nullable=True, comment="抓取时间")
    tags = Column(JSONB, nullable=True, comment="标签数组")
    
    # 手动添加人（爬虫导入为NULL）
    added_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # 关联关系
    added_by = relationship("User", lazy="selectin")
    project_links = relationship("ProjectNewsLink", back_populates="news", lazy="dynamic")
    
    def __repr__(self):
        return f"<News(id={self.id}, title='{self.title[:30]}...')>"


class ProjectNewsLink(Base, TimestampMixin):
    """项目与新闻关联表"""
    __tablename__ = "project_news_links"
    
    project_id = Column(
        BigInteger,
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True
    )
    news_id = Column(
        BigInteger,
        ForeignKey("news.id", ondelete="CASCADE"),
        primary_key=True
    )
    linked_by_user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False
    )
    linked_at = Column(DateTime(timezone=True), nullable=False)
    
    # 关联关系
    project = relationship("Project")
    news = relationship("News", back_populates="project_links")
    linked_by = relationship("User", lazy="selectin")

