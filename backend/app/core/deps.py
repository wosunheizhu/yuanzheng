"""
元征 · 合伙人赋能平台 - FastAPI 依赖项
"""
from datetime import datetime
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import decode_access_token
from app.core.config import settings
from app.models.user import User

# OAuth2 密码流
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_db() -> Generator[Session, None, None]:
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class VirtualSuperAdmin:
    """虚拟超级管理员（不依赖数据库）"""
    def __init__(self):
        self.id = -1
        self.email = settings.SUPER_ADMIN_EMAIL
        self.name = settings.SUPER_ADMIN_NAME
        self.phone = None
        self.avatar_url = None
        self.intro = "系统超级管理员"
        self.is_admin = True
        self.is_active = True
        self.is_deleted = False
        self.highest_role_level = 1
        self.roles = []
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        
    def can_see_role_level(self, level: int) -> bool:
        return True  # 超级管理员可以看所有


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    获取当前登录用户
    
    从 JWT Token 中解析用户 ID，并从数据库获取用户对象
    支持虚拟超级管理员（id=-1）
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id_str: Optional[str] = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception
    
    # 检查是否是超级管理员
    if user_id == -1 and settings.SUPER_ADMIN_EMAIL:
        return VirtualSuperAdmin()
    
    user = db.query(User).filter(
        User.id == user_id,
        User.is_deleted == False,
        User.is_active == True
    ).first()
    
    if user is None:
        raise credentials_exception
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """获取当前活跃用户"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """获取当前管理员用户"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限"
        )
    return current_user


def get_founding_or_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """获取联合创始人或管理员用户"""
    if not current_user.is_admin and current_user.highest_role_level < 3:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要联合创始人或管理员权限"
        )
    return current_user


class RoleLevelChecker:
    """角色等级检查器"""
    
    def __init__(self, min_level: int):
        self.min_level = min_level
    
    def __call__(
        self,
        current_user: User = Depends(get_current_active_user)
    ) -> User:
        if not current_user.can_see_role_level(self.min_level):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"需要角色等级 {self.min_level} 及以上"
            )
        return current_user


# 常用角色等级检查依赖
require_founding = RoleLevelChecker(3)
require_core_or_above = RoleLevelChecker(2)
