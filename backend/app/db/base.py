"""
元征 · 合伙人赋能平台 - 数据库模型导入
Alembic 迁移需要在这里导入所有模型
"""

# 导入基类
from app.db.base_class import Base

# 导入所有模型，使 Alembic 能够检测到它们
from app.models.user import User, Role, UserRole, UserPersonalTag, UserPersonalNote
from app.models.token import TokenAccount, TokenTransaction
from app.models.project import (
    Project, ProjectRelation, ProjectMember, ProjectShare,
    ProjectJoinRequest, ProjectEvent
)
from app.models.demand import (
    Demand, DemandParticipant, DemandResponse, DemandResponseChangeRequest
)
from app.models.resource import Resource, ResourceTag, ResourceTagLink
from app.models.news import NewsSource, News, ProjectNewsLink
from app.models.meeting import (
    Meeting, MeetingParticipant, ExternalGuest, MeetingMinutes, UserAvailability
)
from app.models.community import Post, Comment, Like, Feedback, DMThread, DMMessage
from app.models.voting import Vote, VoteOption, VoteRecord
from app.models.notification import Announcement, InboxItem
from app.models.audit import ValueRecord, AuditLog
