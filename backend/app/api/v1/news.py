"""
元征 · 合伙人赋能平台 - 新闻 API
新闻查看、添加、管理
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.news import NewsSource, News, ProjectNewsLink
from app.models.project import Project
from app.schemas.news import (
    NewsSourceCreate, NewsSourceRead,
    NewsCreate, NewsUpdate, NewsRead, NewsList,
    ProjectNewsLinkCreate
)

router = APIRouter(prefix="/news", tags=["新闻"])


def news_to_read(news: News) -> NewsRead:
    """将 News 模型转换为 NewsRead"""
    return NewsRead(
        id=news.id,
        title=news.title,
        summary=news.summary,
        source_name=news.source_name,
        original_url=news.original_url,
        publish_time=news.publish_time,
        fetched_at=news.fetched_at,
        tags=news.tags,
        added_by_user_id=news.added_by_user_id,
        added_by_name=news.added_by.name if news.added_by else None,
        created_at=news.created_at
    )


@router.get("", response_model=NewsList)
def list_news(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project_id: Optional[int] = Query(None, description="按关联项目筛选"),
    tag: Optional[str] = Query(None, description="按标签筛选"),
    search: Optional[str] = Query(None, description="搜索标题"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取新闻列表"""
    query = db.query(News).filter(News.is_deleted == False)
    
    if project_id:
        linked_news_ids = db.query(ProjectNewsLink.news_id).filter(
            ProjectNewsLink.project_id == project_id
        ).subquery()
        query = query.filter(News.id.in_(linked_news_ids))
    
    if tag:
        query = query.filter(News.tags.contains([tag]))
    
    if search:
        query = query.filter(News.title.ilike(f"%{search}%"))
    
    total = query.count()
    news_list = query.order_by(
        News.publish_time.desc().nullsfirst(),
        News.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    items = [news_to_read(n) for n in news_list]
    
    return NewsList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("", response_model=NewsRead)
def create_news(
    news_in: NewsCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """添加新闻"""
    # 检查 URL 是否已存在
    existing = db.query(News).filter(
        News.original_url == news_in.original_url,
        News.is_deleted == False
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该新闻 URL 已存在"
        )
    
    # TODO: 如果 title/summary 为空，尝试抓取网页或调用 AI 生成
    title = news_in.title or "待抓取标题"
    summary = news_in.summary
    
    news = News(
        title=title,
        summary=summary,
        original_url=news_in.original_url,
        tags=news_in.tags,
        added_by_user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(news)
    db.flush()
    
    # 关联项目
    if news_in.related_project_ids:
        for project_id in news_in.related_project_ids:
            project = db.query(Project).filter(
                Project.id == project_id,
                Project.is_deleted == False
            ).first()
            if project:
                link = ProjectNewsLink(
                    project_id=project_id,
                    news_id=news.id,
                    linked_by_user_id=current_user.id,
                    linked_at=datetime.utcnow()
                )
                db.add(link)
    
    db.commit()
    db.refresh(news)
    
    return news_to_read(news)


@router.get("/{news_id}", response_model=NewsRead)
def get_news(
    news_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取新闻详情"""
    news = db.query(News).filter(
        News.id == news_id,
        News.is_deleted == False
    ).first()
    
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="新闻不存在"
        )
    
    return news_to_read(news)


@router.put("/{news_id}", response_model=NewsRead)
def update_news(
    news_id: int,
    news_in: NewsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新新闻"""
    news = db.query(News).filter(
        News.id == news_id,
        News.is_deleted == False
    ).first()
    
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="新闻不存在"
        )
    
    # 只有添加者或管理员可以编辑
    if news.added_by_user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权编辑此新闻"
        )
    
    update_data = news_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(news, field, value)
    
    news.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(news)
    
    return news_to_read(news)


@router.delete("/{news_id}")
def delete_news(
    news_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """删除新闻（管理员）"""
    news = db.query(News).filter(
        News.id == news_id,
        News.is_deleted == False
    ).first()
    
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="新闻不存在"
        )
    
    news.is_deleted = True
    news.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "新闻已删除"}


@router.post("/{news_id}/link-project")
def link_news_to_project(
    news_id: int,
    project_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """关联新闻到项目"""
    news = db.query(News).filter(
        News.id == news_id,
        News.is_deleted == False
    ).first()
    
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="新闻不存在"
        )
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.is_deleted == False
    ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 检查是否已关联
    existing = db.query(ProjectNewsLink).filter(
        ProjectNewsLink.project_id == project_id,
        ProjectNewsLink.news_id == news_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="新闻已关联到该项目"
        )
    
    link = ProjectNewsLink(
        project_id=project_id,
        news_id=news_id,
        linked_by_user_id=current_user.id,
        linked_at=datetime.utcnow()
    )
    db.add(link)
    db.commit()
    
    return {"message": "新闻已关联到项目"}


# ============ 管理员：新闻源配置 ============

@router.get("/sources/all", response_model=List[NewsSourceRead])
def list_news_sources(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """获取所有新闻源配置（管理员）"""
    sources = db.query(NewsSource).order_by(NewsSource.created_at.desc()).all()
    return [NewsSourceRead.model_validate(s) for s in sources]


@router.post("/sources", response_model=NewsSourceRead)
def create_news_source(
    source_in: NewsSourceCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """创建新闻源配置（管理员）"""
    source = NewsSource(
        name=source_in.name,
        type=source_in.type,
        base_url=source_in.base_url,
        fetch_frequency_minutes=source_in.fetch_frequency_minutes,
        parse_rule=source_in.parse_rule,
        default_tags=source_in.default_tags,
        is_active=source_in.is_active,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    
    return NewsSourceRead.model_validate(source)


@router.delete("/sources/{source_id}")
def delete_news_source(
    source_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """删除新闻源配置（管理员）"""
    source = db.query(NewsSource).filter(NewsSource.id == source_id).first()
    
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="新闻源不存在"
        )
    
    db.delete(source)
    db.commit()
    
    return {"message": "新闻源已删除"}

