"""
元征 · 合伙人赋能平台 - FastAPI 应用入口
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} 启动中...")
    print(f"📋 CORS Origins: {settings.CORS_ORIGINS}")
    print(f"📋 CORS Origins STR: {settings.CORS_ORIGINS_STR}")
    yield
    # 关闭时执行
    print(f"👋 {settings.APP_NAME} 关闭中...")


def create_application() -> FastAPI:
    """创建 FastAPI 应用实例"""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="元征 · 合伙人赋能平台 API",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan
    )
    
    # CORS 中间件配置
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 挂载 API 路由
    app.include_router(api_router, prefix="/api/v1")
    
    # 根路由
    @app.get("/")
    async def root():
        return {
            "message": f"欢迎使用 {settings.APP_NAME}",
            "version": settings.APP_VERSION,
            "docs": "/docs"
        }
    
    return app


# 创建应用实例
app = create_application()

