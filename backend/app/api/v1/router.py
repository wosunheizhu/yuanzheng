"""
元征 · 合伙人赋能平台 - API v1 路由聚合
"""
from fastapi import APIRouter

from app.api.v1 import (
    health, auth, users, token, projects, demands,
    resources, news, meetings, community, votes, notifications, admin, uploads
)

api_router = APIRouter()

# 健康检查
api_router.include_router(health.router, tags=["健康检查"])

# 认证
api_router.include_router(auth.router)

# 用户
api_router.include_router(users.router)

# Token
api_router.include_router(token.router)

# 项目
api_router.include_router(projects.router)

# 需求
api_router.include_router(demands.router)

# 资源
api_router.include_router(resources.router)

# 新闻
api_router.include_router(news.router)

# 座谈会
api_router.include_router(meetings.router)

# 社群（动态/评论/反馈/私信）
api_router.include_router(community.router)

# 投票
api_router.include_router(votes.router)

# 通知与公告
api_router.include_router(notifications.router)

# 管理员控制台
api_router.include_router(admin.router)

# 文件上传
api_router.include_router(uploads.router)
