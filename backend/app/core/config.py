"""
元征 · 合伙人赋能平台 - 配置管理
从环境变量读取配置
"""
from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用基础配置
    APP_NAME: str = "元征 · 合伙人赋能平台"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # 数据库配置
    DATABASE_URL: str = "postgresql://yuanzheng:yuanzheng@localhost:5432/yuanzheng"
    
    # JWT 配置
    JWT_SECRET_KEY: str = "your-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24小时
    
    # Redis 配置（可选，用于缓存）
    REDIS_URL: Optional[str] = None
    
    # CORS 配置
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3847"]
    
    # Token 初始额度配置（按角色层级）
    TOKEN_INITIAL_FOUNDING: int = 100000  # 联合创始人
    TOKEN_INITIAL_CORE: int = 30000       # 核心合伙人
    TOKEN_INITIAL_NORMAL: int = 10000     # 普通合伙人
    
    # 自助注册开关
    ALLOW_SELF_REGISTRATION: bool = False
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()

