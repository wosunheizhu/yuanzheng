"""
元征 · 合伙人赋能平台 - 访问控制服务
Phase 4: 权限与可见性验证
"""
from enum import Enum
from typing import Optional, Any, Union
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.project import Project
from app.models.resource import Resource


class VisibilityLevel(str, Enum):
    """可见性等级"""
    ALL = "ALL"  # 所有人可见
    INTERNAL = "INTERNAL"  # 仅内部人员
    TEAM = "TEAM"  # 仅团队成员
    OWNER = "OWNER"  # 仅创建者


class AccessControlService:
    """
    访问控制服务
    
    提供统一的权限验证和可见性检查功能
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ===========================================
    # 角色等级检查
    # ===========================================
    
    def require_role_level(
        self,
        user: User,
        min_level: int,
        message: str = None
    ) -> bool:
        """
        检查用户是否满足最低角色等级要求
        
        Args:
            user: 当前用户
            min_level: 最低角色等级 (1=普通合伙人, 2=核心合伙人, 3=联合创始人)
            message: 自定义错误信息
        
        Returns:
            bool: 如果满足要求返回 True
        
        Raises:
            HTTPException: 如果不满足要求
        """
        if user.is_admin:
            return True
        
        if user.highest_role_level < min_level:
            level_names = {1: "普通合伙人", 2: "核心合伙人", 3: "联合创始人"}
            level_name = level_names.get(min_level, f"等级{min_level}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=message or f"需要 {level_name} 及以上权限"
            )
        
        return True
    
    def require_admin(self, user: User) -> bool:
        """
        检查用户是否是管理员
        
        Args:
            user: 当前用户
        
        Returns:
            bool: 如果是管理员返回 True
        
        Raises:
            HTTPException: 如果不是管理员
        """
        if not user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要管理员权限"
            )
        return True
    
    def require_founding_or_admin(self, user: User) -> bool:
        """
        检查用户是否是联合创始人或管理员
        
        Args:
            user: 当前用户
        
        Returns:
            bool: 如果满足要求返回 True
        
        Raises:
            HTTPException: 如果不满足要求
        """
        if not user.is_admin and user.highest_role_level < 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="需要联合创始人或管理员权限"
            )
        return True
    
    # ===========================================
    # 可见性检查
    # ===========================================
    
    def check_visibility(
        self,
        user: User,
        visibility_all: bool = True,
        visibility_founding: bool = True,
        visibility_core: bool = True,
        visibility_normal: bool = True,
        owner_id: Optional[int] = None
    ) -> bool:
        """
        检查用户是否可以看到某个对象
        
        根据 Schema V2 的可见性规则：
        - visibility_all: 所有人（包括未登录）
        - visibility_founding: 联合创始人可见
        - visibility_core: 核心合伙人可见
        - visibility_normal: 普通合伙人可见
        
        高层级的人不应被低层级排除（例如 founding 设为 False 但 normal 为 True 是无效的）
        
        Args:
            user: 当前用户
            visibility_all: 是否所有人可见
            visibility_founding: 联合创始人是否可见
            visibility_core: 核心合伙人是否可见
            visibility_normal: 普通合伙人是否可见
            owner_id: 资源创建者ID（创建者始终可见）
        
        Returns:
            bool: 是否可见
        """
        # 管理员始终可见
        if user.is_admin:
            return True
        
        # 创建者始终可见
        if owner_id and user.id == owner_id:
            return True
        
        # 如果所有人可见
        if visibility_all:
            return True
        
        user_level = user.highest_role_level
        
        # 联合创始人 (level 3)
        if user_level >= 3 and visibility_founding:
            return True
        
        # 核心合伙人 (level 2)
        if user_level >= 2 and visibility_core:
            return True
        
        # 普通合伙人 (level 1)
        if user_level >= 1 and visibility_normal:
            return True
        
        return False
    
    def require_visibility(
        self,
        user: User,
        obj: Any,
        visibility_fields: dict = None
    ) -> bool:
        """
        检查用户是否可以访问某个对象，不满足则抛出异常
        
        Args:
            user: 当前用户
            obj: 要检查的对象（需要有 visibility_* 字段）
            visibility_fields: 自定义可见性字段映射
        
        Returns:
            bool: 如果可见返回 True
        
        Raises:
            HTTPException: 如果不可见
        """
        if visibility_fields is None:
            # 尝试从对象获取可见性字段
            visibility_all = getattr(obj, 'visibility_all', True)
            visibility_founding = getattr(obj, 'visibility_founding', True)
            visibility_core = getattr(obj, 'visibility_core', True)
            visibility_normal = getattr(obj, 'visibility_normal', True)
            owner_id = getattr(obj, 'created_by_id', None) or getattr(obj, 'owner_id', None)
        else:
            visibility_all = visibility_fields.get('visibility_all', True)
            visibility_founding = visibility_fields.get('visibility_founding', True)
            visibility_core = visibility_fields.get('visibility_core', True)
            visibility_normal = visibility_fields.get('visibility_normal', True)
            owner_id = visibility_fields.get('owner_id')
        
        if not self.check_visibility(
            user=user,
            visibility_all=visibility_all,
            visibility_founding=visibility_founding,
            visibility_core=visibility_core,
            visibility_normal=visibility_normal,
            owner_id=owner_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="您没有权限访问此资源"
            )
        
        return True
    
    # ===========================================
    # 项目访问控制
    # ===========================================
    
    def can_access_project(
        self,
        user: User,
        project: Project,
        require_member: bool = False
    ) -> bool:
        """
        检查用户是否可以访问项目
        
        Args:
            user: 当前用户
            project: 项目对象
            require_member: 是否要求是项目成员
        
        Returns:
            bool: 是否可以访问
        """
        # 管理员始终可访问
        if user.is_admin:
            return True
        
        # 检查可见性
        if not self.check_visibility(
            user=user,
            visibility_all=project.visibility_all,
            visibility_founding=project.visibility_founding,
            visibility_core=project.visibility_core,
            visibility_normal=project.visibility_normal,
            owner_id=project.created_by_id
        ):
            return False
        
        # 如果需要是项目成员
        if require_member:
            member_ids = [m.user_id for m in project.members]
            if user.id not in member_ids:
                return False
        
        return True
    
    def require_project_access(
        self,
        user: User,
        project: Project,
        require_member: bool = False,
        require_owner: bool = False
    ) -> bool:
        """
        检查用户是否可以访问项目，不满足则抛出异常
        
        Args:
            user: 当前用户
            project: 项目对象
            require_member: 是否要求是项目成员
            require_owner: 是否要求是项目负责人
        
        Returns:
            bool: 如果可以访问返回 True
        
        Raises:
            HTTPException: 如果不能访问
        """
        # 管理员始终可访问
        if user.is_admin:
            return True
        
        if not self.can_access_project(user, project, require_member):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="您没有权限访问此项目"
            )
        
        if require_owner:
            # 检查是否是项目负责人
            owner_member = next(
                (m for m in project.members if m.project_role == "OWNER"),
                None
            )
            if not owner_member or owner_member.user_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="此操作需要项目负责人权限"
                )
        
        return True
    
    # ===========================================
    # 资源访问控制
    # ===========================================
    
    def can_access_resource(
        self,
        user: User,
        resource: Resource
    ) -> bool:
        """
        检查用户是否可以访问资源
        
        Args:
            user: 当前用户
            resource: 资源对象
        
        Returns:
            bool: 是否可以访问
        """
        # 管理员始终可访问
        if user.is_admin:
            return True
        
        # 创建者始终可访问
        if resource.owner_id == user.id:
            return True
        
        return self.check_visibility(
            user=user,
            visibility_all=resource.visibility_all,
            visibility_founding=resource.visibility_founding,
            visibility_core=resource.visibility_core,
            visibility_normal=resource.visibility_normal,
            owner_id=resource.owner_id
        )
    
    def require_resource_access(
        self,
        user: User,
        resource: Resource,
        require_owner: bool = False
    ) -> bool:
        """
        检查用户是否可以访问资源，不满足则抛出异常
        
        Args:
            user: 当前用户
            resource: 资源对象
            require_owner: 是否要求是资源所有者
        
        Returns:
            bool: 如果可以访问返回 True
        
        Raises:
            HTTPException: 如果不能访问
        """
        if require_owner:
            if not user.is_admin and resource.owner_id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="此操作需要资源所有者权限"
                )
            return True
        
        if not self.can_access_resource(user, resource):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="您没有权限访问此资源"
            )
        
        return True
    
    # ===========================================
    # 通用权限检查
    # ===========================================
    
    def can_edit_object(
        self,
        user: User,
        obj: Any,
        owner_field: str = "created_by_id"
    ) -> bool:
        """
        检查用户是否可以编辑对象
        
        默认规则：管理员可编辑，或者是创建者可编辑
        
        Args:
            user: 当前用户
            obj: 要检查的对象
            owner_field: 创建者字段名
        
        Returns:
            bool: 是否可以编辑
        """
        if user.is_admin:
            return True
        
        owner_id = getattr(obj, owner_field, None)
        return owner_id == user.id
    
    def require_edit_permission(
        self,
        user: User,
        obj: Any,
        owner_field: str = "created_by_id",
        message: str = None
    ) -> bool:
        """
        检查用户是否可以编辑对象，不满足则抛出异常
        
        Args:
            user: 当前用户
            obj: 要检查的对象
            owner_field: 创建者字段名
            message: 自定义错误信息
        
        Returns:
            bool: 如果可以编辑返回 True
        
        Raises:
            HTTPException: 如果不能编辑
        """
        if not self.can_edit_object(user, obj, owner_field):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=message or "您没有权限编辑此内容"
            )
        return True
    
    def can_delete_object(
        self,
        user: User,
        obj: Any,
        owner_field: str = "created_by_id",
        admin_only: bool = False
    ) -> bool:
        """
        检查用户是否可以删除对象
        
        Args:
            user: 当前用户
            obj: 要检查的对象
            owner_field: 创建者字段名
            admin_only: 是否仅管理员可删除
        
        Returns:
            bool: 是否可以删除
        """
        if user.is_admin:
            return True
        
        if admin_only:
            return False
        
        owner_id = getattr(obj, owner_field, None)
        return owner_id == user.id
    
    def require_delete_permission(
        self,
        user: User,
        obj: Any,
        owner_field: str = "created_by_id",
        admin_only: bool = False,
        message: str = None
    ) -> bool:
        """
        检查用户是否可以删除对象，不满足则抛出异常
        
        Args:
            user: 当前用户
            obj: 要检查的对象
            owner_field: 创建者字段名
            admin_only: 是否仅管理员可删除
            message: 自定义错误信息
        
        Returns:
            bool: 如果可以删除返回 True
        
        Raises:
            HTTPException: 如果不能删除
        """
        if not self.can_delete_object(user, obj, owner_field, admin_only):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=message or "您没有权限删除此内容"
            )
        return True


def get_access_control_service(db: Session) -> AccessControlService:
    """获取访问控制服务实例"""
    return AccessControlService(db)

