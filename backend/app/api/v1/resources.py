"""
元征 · 合伙人赋能平台 - 资源 API
资源发布、检索、管理
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.resource import Resource, ResourceTag, ResourceTagLink, ResourceStatus
from app.models.project import VisibilityScopeType
from app.schemas.resource import (
    ResourceCreate, ResourceUpdate, ResourceRead, ResourceList,
    ResourceTagRead, ResourceSearchRequest, ResourceSearchResult
)

router = APIRouter(prefix="/resources", tags=["资源"])


def check_resource_visibility(resource: Resource, user: User) -> bool:
    """检查用户是否可以查看资源"""
    if user.is_admin:
        return True
    if resource.owner_user_id == user.id:
        return True
    
    if resource.visibility_scope_type == VisibilityScopeType.ALL:
        return True
    elif resource.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL:
        return user.highest_role_level >= (resource.visibility_min_role_level or 0)
    elif resource.visibility_scope_type == VisibilityScopeType.CUSTOM:
        return user.id in (resource.visibility_user_ids or [])
    
    return False


def resource_to_read(resource: Resource) -> ResourceRead:
    """将 Resource 模型转换为 ResourceRead"""
    return ResourceRead(
        id=resource.id,
        owner_user_id=resource.owner_user_id,
        owner_name=resource.owner.name if resource.owner else None,
        org_name=resource.org_name,
        description=resource.description,
        relationship_strength=resource.relationship_strength,
        industry=resource.industry,
        region=resource.region,
        note=resource.note,
        status=resource.status,
        visibility_scope_type=resource.visibility_scope_type,
        visibility_min_role_level=resource.visibility_min_role_level,
        created_at=resource.created_at,
        updated_at=resource.updated_at,
        tags=[ResourceTagRead(id=t.id, name=t.name) for t in resource.tags]
    )


@router.get("", response_model=ResourceList)
def list_resources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    my_resources: bool = Query(False, description="只看我发布的资源"),
    search: Optional[str] = Query(None, description="搜索组织名/描述"),
    industry: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    min_strength: Optional[int] = Query(None, ge=1, le=5),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取资源列表"""
    query = db.query(Resource).filter(
        Resource.is_deleted == False,
        Resource.status == ResourceStatus.ACTIVE
    )
    
    # 搜索过滤
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Resource.org_name.ilike(search_pattern)) |
            (Resource.description.ilike(search_pattern)) |
            (Resource.industry.ilike(search_pattern)) |
            (Resource.region.ilike(search_pattern))
        )
    
    if my_resources:
        query = query.filter(Resource.owner_user_id == current_user.id)
    elif not current_user.is_admin:
        # 应用可见性过滤
        query = query.filter(
            (Resource.owner_user_id == current_user.id) |
            (Resource.visibility_scope_type == VisibilityScopeType.ALL) |
            (
                (Resource.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL) &
                (Resource.visibility_min_role_level <= current_user.highest_role_level)
            )
        )
    
    if industry:
        query = query.filter(Resource.industry.ilike(f"%{industry}%"))
    
    if region:
        query = query.filter(Resource.region.ilike(f"%{region}%"))
    
    if min_strength:
        query = query.filter(Resource.relationship_strength >= min_strength)
    
    total = query.count()
    resources = query.order_by(
        Resource.updated_at.desc()
    ).offset(skip).limit(limit).all()
    
    items = [resource_to_read(r) for r in resources]
    
    return ResourceList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("", response_model=ResourceRead)
def create_resource(
    resource_in: ResourceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """发布资源"""
    resource = Resource(
        owner_user_id=current_user.id,
        org_name=resource_in.org_name,
        description=resource_in.description,
        relationship_strength=resource_in.relationship_strength,
        industry=resource_in.industry,
        region=resource_in.region,
        note=resource_in.note,
        status=ResourceStatus.ACTIVE,
        visibility_scope_type=resource_in.visibility_scope_type,
        visibility_min_role_level=resource_in.visibility_min_role_level,
        visibility_user_ids=resource_in.visibility_user_ids,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(resource)
    db.flush()
    
    # 处理标签
    if resource_in.tag_names:
        for tag_name in resource_in.tag_names:
            tag = db.query(ResourceTag).filter(ResourceTag.name == tag_name).first()
            if not tag:
                tag = ResourceTag(name=tag_name)
                db.add(tag)
                db.flush()
            link = ResourceTagLink(resource_id=resource.id, tag_id=tag.id)
            db.add(link)
    
    db.commit()
    db.refresh(resource)
    
    return resource_to_read(resource)


@router.get("/me", response_model=ResourceList)
def list_my_resources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取我发布的资源"""
    query = db.query(Resource).filter(
        Resource.owner_user_id == current_user.id,
        Resource.is_deleted == False
    )
    
    total = query.count()
    resources = query.order_by(
        Resource.updated_at.desc()
    ).offset(skip).limit(limit).all()
    
    items = [resource_to_read(r) for r in resources]
    
    return ResourceList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.get("/{resource_id}", response_model=ResourceRead)
def get_resource(
    resource_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取资源详情"""
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.is_deleted == False
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在"
        )
    
    if not check_resource_visibility(resource, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此资源"
        )
    
    return resource_to_read(resource)


@router.put("/{resource_id}", response_model=ResourceRead)
def update_resource(
    resource_id: int,
    resource_in: ResourceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新资源"""
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.is_deleted == False
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在"
        )
    
    if resource.owner_user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能编辑自己的资源"
        )
    
    update_data = resource_in.model_dump(exclude_unset=True, exclude={"tag_names"})
    for field, value in update_data.items():
        setattr(resource, field, value)
    
    # 处理标签更新
    if resource_in.tag_names is not None:
        # 清除现有标签
        db.query(ResourceTagLink).filter(
            ResourceTagLink.resource_id == resource.id
        ).delete()
        
        # 添加新标签
        for tag_name in resource_in.tag_names:
            tag = db.query(ResourceTag).filter(ResourceTag.name == tag_name).first()
            if not tag:
                tag = ResourceTag(name=tag_name)
                db.add(tag)
                db.flush()
            link = ResourceTagLink(resource_id=resource.id, tag_id=tag.id)
            db.add(link)
    
    resource.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(resource)
    
    return resource_to_read(resource)


@router.delete("/{resource_id}")
def delete_resource(
    resource_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除资源（软删）"""
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.is_deleted == False
    ).first()
    
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="资源不存在"
        )
    
    if resource.owner_user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能删除自己的资源"
        )
    
    resource.is_deleted = True
    resource.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "资源已删除"}


@router.post("/search", response_model=List[ResourceSearchResult])
def search_resources(
    search_req: ResourceSearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    资源检索（AI 辅助）
    
    TODO: 接入 AI 服务进行智能匹配
    当前实现为简单关键词匹配
    """
    query = db.query(Resource).filter(
        Resource.is_deleted == False,
        Resource.status == ResourceStatus.ACTIVE
    )
    
    # 应用可见性过滤
    if not current_user.is_admin:
        query = query.filter(
            (Resource.owner_user_id == current_user.id) |
            (Resource.visibility_scope_type == VisibilityScopeType.ALL) |
            (
                (Resource.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL) &
                (Resource.visibility_min_role_level <= current_user.highest_role_level)
            )
        )
    
    # 关键词匹配
    keywords = search_req.query.split()
    for keyword in keywords:
        query = query.filter(
            (Resource.org_name.ilike(f"%{keyword}%")) |
            (Resource.description.ilike(f"%{keyword}%")) |
            (Resource.industry.ilike(f"%{keyword}%")) |
            (Resource.region.ilike(f"%{keyword}%"))
        )
    
    if search_req.industry:
        query = query.filter(Resource.industry.ilike(f"%{search_req.industry}%"))
    
    if search_req.region:
        query = query.filter(Resource.region.ilike(f"%{search_req.region}%"))
    
    if search_req.min_strength:
        query = query.filter(Resource.relationship_strength >= search_req.min_strength)
    
    resources = query.order_by(
        Resource.relationship_strength.desc()
    ).limit(20).all()
    
    results = []
    for r in resources:
        results.append(ResourceSearchResult(
            resource=resource_to_read(r),
            match_reason=f"匹配关键词: {', '.join(keywords)}",
            usage_suggestion="建议通过私聊或项目邀请联系资源方"
        ))
    
    return results


@router.get("/tags/all", response_model=List[ResourceTagRead])
def list_all_tags(db: Session = Depends(get_db)):
    """获取所有资源标签"""
    tags = db.query(ResourceTag).order_by(ResourceTag.name).all()
    return [ResourceTagRead(id=t.id, name=t.name) for t in tags]

