"""
元征 · 合伙人赋能平台 - 访问控制测试
Phase 4: 权限与可见性验证
"""
import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException

from app.services.access_control import AccessControlService


class TestRoleLevelCheck:
    """测试角色等级检查"""
    
    def test_admin_always_passes(self):
        """管理员始终通过角色检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        admin_user = MagicMock()
        admin_user.is_admin = True
        admin_user.highest_role_level = 0
        
        # 管理员应该通过任何等级检查
        assert service.require_role_level(admin_user, 3) == True
        assert service.require_role_level(admin_user, 2) == True
        assert service.require_role_level(admin_user, 1) == True
    
    def test_founding_can_access_level_3(self):
        """联合创始人可以访问等级3"""
        db = MagicMock()
        service = AccessControlService(db)
        
        founding_user = MagicMock()
        founding_user.is_admin = False
        founding_user.highest_role_level = 3
        
        assert service.require_role_level(founding_user, 3) == True
        assert service.require_role_level(founding_user, 2) == True
        assert service.require_role_level(founding_user, 1) == True
    
    def test_core_cannot_access_level_3(self):
        """核心合伙人不能访问等级3"""
        db = MagicMock()
        service = AccessControlService(db)
        
        core_user = MagicMock()
        core_user.is_admin = False
        core_user.highest_role_level = 2
        
        with pytest.raises(HTTPException) as exc_info:
            service.require_role_level(core_user, 3)
        assert exc_info.value.status_code == 403
    
    def test_normal_cannot_access_level_2(self):
        """普通合伙人不能访问等级2"""
        db = MagicMock()
        service = AccessControlService(db)
        
        normal_user = MagicMock()
        normal_user.is_admin = False
        normal_user.highest_role_level = 1
        
        with pytest.raises(HTTPException) as exc_info:
            service.require_role_level(normal_user, 2)
        assert exc_info.value.status_code == 403


class TestVisibilityCheck:
    """测试可见性检查"""
    
    def test_admin_always_visible(self):
        """管理员始终可见"""
        db = MagicMock()
        service = AccessControlService(db)
        
        admin_user = MagicMock()
        admin_user.id = 1
        admin_user.is_admin = True
        admin_user.highest_role_level = 0
        
        # 即使所有可见性都关闭，管理员也应该可见
        assert service.check_visibility(
            admin_user,
            visibility_all=False,
            visibility_founding=False,
            visibility_core=False,
            visibility_normal=False
        ) == True
    
    def test_owner_always_visible(self):
        """创建者始终可见"""
        db = MagicMock()
        service = AccessControlService(db)
        
        normal_user = MagicMock()
        normal_user.id = 5
        normal_user.is_admin = False
        normal_user.highest_role_level = 1
        
        # 即使所有可见性都关闭，创建者也应该可见
        assert service.check_visibility(
            normal_user,
            visibility_all=False,
            visibility_founding=False,
            visibility_core=False,
            visibility_normal=False,
            owner_id=5
        ) == True
    
    def test_visibility_all(self):
        """visibility_all=True 时所有人可见"""
        db = MagicMock()
        service = AccessControlService(db)
        
        normal_user = MagicMock()
        normal_user.id = 5
        normal_user.is_admin = False
        normal_user.highest_role_level = 1
        
        assert service.check_visibility(
            normal_user,
            visibility_all=True
        ) == True
    
    def test_founding_visibility(self):
        """联合创始人可见性检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        founding_user = MagicMock()
        founding_user.id = 3
        founding_user.is_admin = False
        founding_user.highest_role_level = 3
        
        # visibility_founding=True 时联合创始人可见
        assert service.check_visibility(
            founding_user,
            visibility_all=False,
            visibility_founding=True,
            visibility_core=False,
            visibility_normal=False
        ) == True
        
        # visibility_founding=False 时联合创始人不可见
        assert service.check_visibility(
            founding_user,
            visibility_all=False,
            visibility_founding=False,
            visibility_core=False,
            visibility_normal=False
        ) == False
    
    def test_core_visibility(self):
        """核心合伙人可见性检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        core_user = MagicMock()
        core_user.id = 2
        core_user.is_admin = False
        core_user.highest_role_level = 2
        
        # visibility_core=True 时核心可见
        assert service.check_visibility(
            core_user,
            visibility_all=False,
            visibility_founding=False,
            visibility_core=True,
            visibility_normal=False
        ) == True
        
        # visibility_core=False 且 visibility_normal=True 时核心不可见
        assert service.check_visibility(
            core_user,
            visibility_all=False,
            visibility_founding=False,
            visibility_core=False,
            visibility_normal=True
        ) == False
    
    def test_normal_visibility(self):
        """普通合伙人可见性检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        normal_user = MagicMock()
        normal_user.id = 1
        normal_user.is_admin = False
        normal_user.highest_role_level = 1
        
        # visibility_normal=True 时普通可见
        assert service.check_visibility(
            normal_user,
            visibility_all=False,
            visibility_founding=False,
            visibility_core=False,
            visibility_normal=True
        ) == True
        
        # 所有可见性都关闭时不可见
        assert service.check_visibility(
            normal_user,
            visibility_all=False,
            visibility_founding=False,
            visibility_core=False,
            visibility_normal=False
        ) == False


class TestEditDeletePermissions:
    """测试编辑和删除权限"""
    
    def test_admin_can_edit_anything(self):
        """管理员可以编辑任何对象"""
        db = MagicMock()
        service = AccessControlService(db)
        
        admin_user = MagicMock()
        admin_user.id = 1
        admin_user.is_admin = True
        
        obj = MagicMock()
        obj.created_by_id = 5  # 其他人创建的
        
        assert service.can_edit_object(admin_user, obj) == True
    
    def test_owner_can_edit_own_object(self):
        """创建者可以编辑自己的对象"""
        db = MagicMock()
        service = AccessControlService(db)
        
        normal_user = MagicMock()
        normal_user.id = 5
        normal_user.is_admin = False
        
        obj = MagicMock()
        obj.created_by_id = 5
        
        assert service.can_edit_object(normal_user, obj) == True
    
    def test_non_owner_cannot_edit(self):
        """非创建者不能编辑"""
        db = MagicMock()
        service = AccessControlService(db)
        
        normal_user = MagicMock()
        normal_user.id = 5
        normal_user.is_admin = False
        
        obj = MagicMock()
        obj.created_by_id = 10  # 其他人创建的
        
        assert service.can_edit_object(normal_user, obj) == False
    
    def test_admin_only_delete(self):
        """仅管理员可删除的对象"""
        db = MagicMock()
        service = AccessControlService(db)
        
        admin_user = MagicMock()
        admin_user.id = 1
        admin_user.is_admin = True
        
        normal_user = MagicMock()
        normal_user.id = 5
        normal_user.is_admin = False
        
        obj = MagicMock()
        obj.created_by_id = 5
        
        # 管理员可以删除
        assert service.can_delete_object(admin_user, obj, admin_only=True) == True
        
        # 即使是创建者，非管理员也不能删除
        assert service.can_delete_object(normal_user, obj, admin_only=True) == False


class TestRequireAdmin:
    """测试管理员权限检查"""
    
    def test_admin_passes(self):
        """管理员通过检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        admin_user = MagicMock()
        admin_user.is_admin = True
        
        assert service.require_admin(admin_user) == True
    
    def test_non_admin_fails(self):
        """非管理员不通过检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        normal_user = MagicMock()
        normal_user.is_admin = False
        
        with pytest.raises(HTTPException) as exc_info:
            service.require_admin(normal_user)
        assert exc_info.value.status_code == 403


class TestFoundingOrAdmin:
    """测试联合创始人或管理员权限检查"""
    
    def test_admin_passes(self):
        """管理员通过检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        admin_user = MagicMock()
        admin_user.is_admin = True
        admin_user.highest_role_level = 0
        
        assert service.require_founding_or_admin(admin_user) == True
    
    def test_founding_passes(self):
        """联合创始人通过检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        founding_user = MagicMock()
        founding_user.is_admin = False
        founding_user.highest_role_level = 3
        
        assert service.require_founding_or_admin(founding_user) == True
    
    def test_core_fails(self):
        """核心合伙人不通过检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        core_user = MagicMock()
        core_user.is_admin = False
        core_user.highest_role_level = 2
        
        with pytest.raises(HTTPException) as exc_info:
            service.require_founding_or_admin(core_user)
        assert exc_info.value.status_code == 403
    
    def test_normal_fails(self):
        """普通合伙人不通过检查"""
        db = MagicMock()
        service = AccessControlService(db)
        
        normal_user = MagicMock()
        normal_user.is_admin = False
        normal_user.highest_role_level = 1
        
        with pytest.raises(HTTPException) as exc_info:
            service.require_founding_or_admin(normal_user)
        assert exc_info.value.status_code == 403

