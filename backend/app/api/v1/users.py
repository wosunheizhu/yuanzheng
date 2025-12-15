"""
元征 · 合伙人赋能平台 - 用户 API
用户列表、详情、更新、本地标签与备注
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user, get_current_admin_user
from app.models.user import User, UserPersonalTag, UserPersonalNote
from app.schemas.user import (
    UserRead, UserUpdate, UserListItem, UserReadPublic,
    PersonalTagCreate, PersonalTagRead,
    PersonalNoteCreate, PersonalNoteUpdate, PersonalNoteRead
)

router = APIRouter(prefix="/users", tags=["用户"])


@router.get("", response_model=List[UserListItem])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    role_level: Optional[int] = Query(None, description="按角色等级筛选"),
    search: Optional[str] = Query(None, description="搜索姓名/组织"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """
    获取合伙人列表
    
    支持按角色等级筛选和搜索
    """
    query = db.query(User).filter(
        User.is_deleted == False,
        User.is_active == True
    )
    
    if role_level is not None:
        # 需要通过关联查询角色
        from app.models.user import UserRole, Role
        query = query.join(UserRole).join(Role).filter(
            Role.role_level == role_level
        )
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_pattern)) |
            (User.organization.ilike(search_pattern)) |
            (User.expertise.ilike(search_pattern))
        )
    
    users = query.offset(skip).limit(limit).all()
    
    result = []
    for user in users:
        item = UserListItem(
            id=user.id,
            name=user.name,
            avatar_url=user.avatar_url,
            organization=user.organization if user.organization_public else None,
            title=user.title,
            expertise=user.expertise,
            tags=user.tags,
            roles=[],
            highest_role_level=user.highest_role_level
        )
        result.append(item)
    
    return result


@router.get("/me", response_model=UserRead)
def get_my_profile(
    current_user: User = Depends(get_current_active_user)
):
    """获取当前用户完整信息"""
    user_read = UserRead.model_validate(current_user)
    user_read.highest_role_level = current_user.highest_role_level
    return user_read


@router.put("/me", response_model=UserRead)
def update_my_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新当前用户信息（个人信息表单）"""
    update_data = user_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    
    user_read = UserRead.model_validate(current_user)
    user_read.highest_role_level = current_user.highest_role_level
    return user_read


@router.get("/{user_id}", response_model=UserReadPublic)
def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取他人主页
    
    根据用户的公开设置决定显示哪些字段
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False,
        User.is_active == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    return UserReadPublic(
        id=user.id,
        name=user.name,
        avatar_url=user.avatar_url,
        organization=user.organization if user.organization_public else None,
        title=user.title,
        intro=user.intro,
        expertise=user.expertise,
        contact=user.contact if user.contact_public else None,
        tags=user.tags,
        signature=user.signature,
        roles=[],
        highest_role_level=user.highest_role_level
    )


# ============ 本地标签 API ============

@router.get("/me/tags", response_model=List[PersonalTagRead])
def list_my_tags(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    target_user_id: Optional[int] = Query(None, description="筛选特定用户的标签")
):
    """获取我创建的所有本地标签"""
    query = db.query(UserPersonalTag).filter(
        UserPersonalTag.owner_user_id == current_user.id
    )
    
    if target_user_id:
        query = query.filter(UserPersonalTag.target_user_id == target_user_id)
    
    tags = query.all()
    return [PersonalTagRead.model_validate(t) for t in tags]


@router.post("/me/tags", response_model=PersonalTagRead)
def create_personal_tag(
    tag_in: PersonalTagCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建本地标签"""
    # 检查目标用户是否存在
    target = db.query(User).filter(
        User.id == tag_in.target_user_id,
        User.is_deleted == False
    ).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="目标用户不存在"
        )
    
    # 检查是否已存在相同标签
    existing = db.query(UserPersonalTag).filter(
        UserPersonalTag.owner_user_id == current_user.id,
        UserPersonalTag.target_user_id == tag_in.target_user_id,
        UserPersonalTag.tag == tag_in.tag
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该标签已存在"
        )
    
    tag = UserPersonalTag(
        owner_user_id=current_user.id,
        target_user_id=tag_in.target_user_id,
        tag=tag_in.tag,
        created_at=datetime.utcnow()
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    
    return PersonalTagRead.model_validate(tag)


@router.delete("/me/tags/{target_user_id}/{tag}")
def delete_personal_tag(
    target_user_id: int,
    tag: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除本地标签"""
    existing = db.query(UserPersonalTag).filter(
        UserPersonalTag.owner_user_id == current_user.id,
        UserPersonalTag.target_user_id == target_user_id,
        UserPersonalTag.tag == tag
    ).first()
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="标签不存在"
        )
    
    db.delete(existing)
    db.commit()
    
    return {"message": "标签已删除"}


# ============ 本地备注 API ============

@router.get("/me/notes", response_model=List[PersonalNoteRead])
def list_my_notes(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    target_user_id: Optional[int] = Query(None, description="筛选特定用户的备注")
):
    """获取我创建的所有本地备注"""
    query = db.query(UserPersonalNote).filter(
        UserPersonalNote.owner_user_id == current_user.id,
        UserPersonalNote.is_deleted == False
    )
    
    if target_user_id:
        query = query.filter(UserPersonalNote.target_user_id == target_user_id)
    
    notes = query.all()
    return [PersonalNoteRead.model_validate(n) for n in notes]


@router.post("/me/notes", response_model=PersonalNoteRead)
def create_personal_note(
    note_in: PersonalNoteCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建本地备注"""
    # 检查目标用户是否存在
    target = db.query(User).filter(
        User.id == note_in.target_user_id,
        User.is_deleted == False
    ).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="目标用户不存在"
        )
    
    note = UserPersonalNote(
        owner_user_id=current_user.id,
        target_user_id=note_in.target_user_id,
        content=note_in.content,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return PersonalNoteRead.model_validate(note)


@router.put("/me/notes/{note_id}", response_model=PersonalNoteRead)
def update_personal_note(
    note_id: int,
    note_in: PersonalNoteUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新本地备注"""
    note = db.query(UserPersonalNote).filter(
        UserPersonalNote.id == note_id,
        UserPersonalNote.owner_user_id == current_user.id,
        UserPersonalNote.is_deleted == False
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="备注不存在"
        )
    
    note.content = note_in.content
    note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(note)
    
    return PersonalNoteRead.model_validate(note)


@router.delete("/me/notes/{note_id}")
def delete_personal_note(
    note_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除本地备注（软删）"""
    note = db.query(UserPersonalNote).filter(
        UserPersonalNote.id == note_id,
        UserPersonalNote.owner_user_id == current_user.id,
        UserPersonalNote.is_deleted == False
    ).first()
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="备注不存在"
        )
    
    note.is_deleted = True
    note.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "备注已删除"}


# ============ 管理员操作 ============

@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员删除用户（软删）"""
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除自己"
        )
    
    user.is_deleted = True
    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "用户已删除"}


@router.post("/{user_id}/toggle-admin")
def toggle_admin(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员切换用户的管理员状态"""
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能修改自己的管理员状态"
        )
    
    user.is_admin = not user.is_admin
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": f"用户管理员状态已{'开启' if user.is_admin else '关闭'}"}


@router.put("/{user_id}/role")
def update_user_role(
    user_id: int,
    role_code: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员更改用户角色等级"""
    from app.models.user import Role, UserRole
    
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 获取新角色
    new_role = db.query(Role).filter(Role.code == role_code).first()
    if not new_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的角色代码: {role_code}"
        )
    
    # 删除现有角色关联
    db.query(UserRole).filter(UserRole.user_id == user_id).delete()
    
    # 创建新角色关联
    user_role = UserRole(user_id=user_id, role_id=new_role.id)
    db.add(user_role)
    
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "message": f"用户角色已更新为 {new_role.name}",
        "role": {
            "code": new_role.code,
            "name": new_role.name,
            "level": new_role.role_level
        }
    }


@router.get("/admin/all")
def list_all_users_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
    search: Optional[str] = Query(None, description="搜索姓名/邮箱/手机"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    """
    管理员获取所有用户列表（包含更多信息）
    """
    query = db.query(User).filter(User.is_deleted == False)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern)) |
            (User.phone.ilike(search_pattern)) |
            (User.organization.ilike(search_pattern))
        )
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "name": user.name,
            "avatar_url": user.avatar_url,
            "organization": user.organization,
            "title": user.title,
            "expertise": user.expertise,
            "tags": user.tags,
            "highest_role_level": user.highest_role_level,
            "is_admin": user.is_admin,
            "email": user.email,
            "phone": user.phone,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        })
    
    return result

