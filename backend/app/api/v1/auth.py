"""
元征 · 合伙人赋能平台 - 认证 API
登录、注册、获取当前用户
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_active_user, get_current_admin_user
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User, Role, UserRole
from app.models.token import TokenAccount
from app.schemas.user import (
    UserCreate, UserRead, UserLogin, Token,
    PasswordChange, RoleRead, SelfRegister
)

router = APIRouter(prefix="/auth", tags=["认证"])


def get_initial_balance(role_code: str) -> int:
    """根据角色获取初始 Token 额度"""
    if role_code == "FOUNDING":
        return settings.TOKEN_INITIAL_FOUNDING
    elif role_code == "CORE":
        return settings.TOKEN_INITIAL_CORE
    else:
        return settings.TOKEN_INITIAL_NORMAL


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    认证用户
    支持：用户名（手机/邮箱）+ 密码
    """
    # 尝试通过邮箱查找
    user = db.query(User).filter(
        User.email == username,
        User.is_deleted == False
    ).first()
    
    # 尝试通过手机号查找
    if not user:
        user = db.query(User).filter(
            User.phone == username,
            User.is_deleted == False
        ).first()
    
    # 尝试通过姓名查找（可选，可能有重名）
    if not user:
        user = db.query(User).filter(
            User.name == username,
            User.is_deleted == False
        ).first()
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    用户登录
    
    支持通过邮箱、手机号或姓名登录
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )
    
    # 生成 Token
    access_token = create_access_token(
        subject=user.id,
        is_admin=user.is_admin,
        role_level=user.highest_role_level
    )
    
    # 构建用户响应
    user_read = UserRead.model_validate(user)
    user_read.highest_role_level = user.highest_role_level
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_read
    )


@router.post("/login/json", response_model=Token)
def login_json(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    用户登录（JSON 格式）
    
    支持通过邮箱、手机号或姓名登录
    """
    user = authenticate_user(db, login_data.username, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="用户已被禁用"
        )
    
    access_token = create_access_token(
        subject=user.id,
        is_admin=user.is_admin,
        role_level=user.highest_role_level
    )
    
    user_read = UserRead.model_validate(user)
    user_read.highest_role_level = user.highest_role_level
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_read
    )


@router.get("/me", response_model=UserRead)
def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """获取当前登录用户信息"""
    user_read = UserRead.model_validate(current_user)
    user_read.highest_role_level = current_user.highest_role_level
    return user_read


@router.post("/change-password")
def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """修改密码"""
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误"
        )
    
    current_user.hashed_password = get_password_hash(data.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "密码修改成功"}


@router.post("/register", response_model=UserRead)
def register_user(
    user_in: UserCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    管理员创建用户（人员注册表单）
    
    创建用户后自动：
    1. 分配角色
    2. 创建 Token 账户（初始额度按角色确定）
    """
    # 检查邮箱是否已存在
    if user_in.email:
        existing = db.query(User).filter(
            User.email == user_in.email,
            User.is_deleted == False
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被使用"
            )
    
    # 检查手机号是否已存在
    if user_in.phone:
        existing = db.query(User).filter(
            User.phone == user_in.phone,
            User.is_deleted == False
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="手机号已被使用"
            )
    
    # 获取角色
    role = db.query(Role).filter(Role.code == user_in.role_code).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的角色代码: {user_in.role_code}"
        )
    
    # 创建用户
    password = user_in.password or "changeme123"  # 默认密码
    user = User(
        name=user_in.name,
        email=user_in.email,
        phone=user_in.phone,
        hashed_password=get_password_hash(password),
        is_active=True,
        is_admin=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(user)
    db.flush()  # 获取 user.id
    
    # 分配角色
    user_role = UserRole(user_id=user.id, role_id=role.id)
    db.add(user_role)
    
    # 创建 Token 账户
    initial_balance = get_initial_balance(user_in.role_code)
    token_account = TokenAccount(
        user_id=user.id,
        balance=initial_balance,
        initial_balance=initial_balance,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(token_account)
    
    db.commit()
    db.refresh(user)
    
    user_read = UserRead.model_validate(user)
    user_read.highest_role_level = user.highest_role_level
    return user_read


@router.post("/self-register", response_model=UserRead)
def self_register(
    user_in: SelfRegister,
    db: Session = Depends(get_db)
):
    """
    用户自助注册（公开接口，需要邀请码）
    
    正确邀请码：20251216
    """
    # 验证邀请码
    VALID_INVITATION_CODE = "20251216"
    if user_in.invitation_code != VALID_INVITATION_CODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邀请码无效"
        )
    
    # 检查邮箱是否已存在
    existing = db.query(User).filter(
        User.email == user_in.email,
        User.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被使用"
        )
    
    # 检查手机号是否已存在
    existing = db.query(User).filter(
        User.phone == user_in.phone,
        User.is_deleted == False
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="手机号已被使用"
        )
    
    # 获取角色（根据申请的角色类型，默认为普通合伙人）
    role_code = user_in.role_type or "NORMAL"
    role = db.query(Role).filter(Role.code == role_code).first()
    if not role:
        # 如果申请的角色不存在，默认使用普通合伙人
        role = db.query(Role).filter(Role.code == "NORMAL").first()
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="系统角色配置错误，请联系管理员"
        )
    
    # 创建用户
    user = User(
        name=user_in.name,
        email=user_in.email,
        phone=user_in.phone,
        organization=user_in.organization,
        hashed_password=get_password_hash(user_in.password),
        is_active=True,
        is_admin=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(user)
    db.flush()  # 获取 user.id
    
    # 分配角色
    user_role = UserRole(user_id=user.id, role_id=role.id)
    db.add(user_role)
    
    # 创建 Token 账户
    initial_balance = get_initial_balance(role_code)
    token_account = TokenAccount(
        user_id=user.id,
        balance=initial_balance,
        initial_balance=initial_balance,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(token_account)
    
    db.commit()
    db.refresh(user)
    
    user_read = UserRead.model_validate(user)
    user_read.highest_role_level = user.highest_role_level
    return user_read


@router.get("/roles", response_model=list[RoleRead])
def list_roles(db: Session = Depends(get_db)):
    """获取所有角色列表"""
    roles = db.query(Role).order_by(Role.role_level.desc()).all()
    return [RoleRead.model_validate(r) for r in roles]

