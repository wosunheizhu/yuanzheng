"""
元征 · 合伙人赋能平台 - 审计日志服务
Phase 4: 审计日志打点
"""
from datetime import datetime
from typing import Optional, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.audit import AuditLog
from app.models.user import User


class AuditAction:
    """审计操作类型枚举"""
    
    # 用户相关
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    USER_REGISTER = "USER_REGISTER"
    USER_UPDATE = "USER_UPDATE"
    USER_DELETE = "USER_DELETE"
    USER_DEACTIVATE = "USER_DEACTIVATE"
    USER_REACTIVATE = "USER_REACTIVATE"
    
    # 项目相关
    PROJECT_CREATE = "PROJECT_CREATE"
    PROJECT_UPDATE = "PROJECT_UPDATE"
    PROJECT_DELETE = "PROJECT_DELETE"
    PROJECT_SUBMIT_REVIEW = "PROJECT_SUBMIT_REVIEW"
    PROJECT_APPROVE = "PROJECT_APPROVE"
    PROJECT_REJECT = "PROJECT_REJECT"
    PROJECT_PAUSE = "PROJECT_PAUSE"
    PROJECT_RESUME = "PROJECT_RESUME"
    PROJECT_COMPLETE = "PROJECT_COMPLETE"
    PROJECT_ABANDON = "PROJECT_ABANDON"
    
    # 股权相关
    SHARE_ADJUST = "SHARE_ADJUST"
    
    # 成员相关
    MEMBER_ADD = "MEMBER_ADD"
    MEMBER_REMOVE = "MEMBER_REMOVE"
    MEMBER_ROLE_CHANGE = "MEMBER_ROLE_CHANGE"
    JOIN_REQUEST_CREATE = "JOIN_REQUEST_CREATE"
    JOIN_REQUEST_APPROVE = "JOIN_REQUEST_APPROVE"
    JOIN_REQUEST_REJECT = "JOIN_REQUEST_REJECT"
    
    # 资源相关
    RESOURCE_CREATE = "RESOURCE_CREATE"
    RESOURCE_UPDATE = "RESOURCE_UPDATE"
    RESOURCE_DELETE = "RESOURCE_DELETE"
    
    # Token 相关
    TOKEN_TRANSFER_REQUEST = "TOKEN_TRANSFER_REQUEST"
    TOKEN_TRANSFER_APPROVE = "TOKEN_TRANSFER_APPROVE"
    TOKEN_TRANSFER_REJECT = "TOKEN_TRANSFER_REJECT"
    TOKEN_TRANSFER_CONFIRM = "TOKEN_TRANSFER_CONFIRM"
    TOKEN_GRANT = "TOKEN_GRANT"
    TOKEN_DEDUCT = "TOKEN_DEDUCT"
    TOKEN_DIVIDEND = "TOKEN_DIVIDEND"
    
    # 需求相关
    DEMAND_CREATE = "DEMAND_CREATE"
    DEMAND_UPDATE = "DEMAND_UPDATE"
    DEMAND_DELETE = "DEMAND_DELETE"
    DEMAND_CLOSE = "DEMAND_CLOSE"
    RESPONSE_CREATE = "RESPONSE_CREATE"
    RESPONSE_ACCEPT = "RESPONSE_ACCEPT"
    RESPONSE_REJECT = "RESPONSE_REJECT"
    RESPONSE_MARK_USED = "RESPONSE_MARK_USED"
    RESPONSE_MODIFY = "RESPONSE_MODIFY"
    RESPONSE_ABANDON = "RESPONSE_ABANDON"
    CHANGE_REQUEST_CREATE = "CHANGE_REQUEST_CREATE"
    CHANGE_REQUEST_APPROVE = "CHANGE_REQUEST_APPROVE"
    CHANGE_REQUEST_REJECT = "CHANGE_REQUEST_REJECT"
    CHANGE_REQUEST_ADMIN_APPROVE = "CHANGE_REQUEST_ADMIN_APPROVE"
    CHANGE_REQUEST_ADMIN_REJECT = "CHANGE_REQUEST_ADMIN_REJECT"
    
    # 新闻相关
    NEWS_CREATE = "NEWS_CREATE"
    NEWS_UPDATE = "NEWS_UPDATE"
    NEWS_DELETE = "NEWS_DELETE"
    NEWS_SOURCE_CREATE = "NEWS_SOURCE_CREATE"
    NEWS_SOURCE_DELETE = "NEWS_SOURCE_DELETE"
    
    # 会议相关
    MEETING_CREATE = "MEETING_CREATE"
    MEETING_UPDATE = "MEETING_UPDATE"
    MEETING_DELETE = "MEETING_DELETE"
    MEETING_CANCEL = "MEETING_CANCEL"
    MEETING_COMPLETE = "MEETING_COMPLETE"
    MINUTES_CREATE = "MINUTES_CREATE"
    MINUTES_UPDATE = "MINUTES_UPDATE"
    
    # 社群相关
    POST_CREATE = "POST_CREATE"
    POST_UPDATE = "POST_UPDATE"
    POST_DELETE = "POST_DELETE"
    COMMENT_CREATE = "COMMENT_CREATE"
    COMMENT_DELETE = "COMMENT_DELETE"
    FEEDBACK_CREATE = "FEEDBACK_CREATE"
    FEEDBACK_RESOLVE = "FEEDBACK_RESOLVE"
    
    # 投票相关
    VOTE_CREATE = "VOTE_CREATE"
    VOTE_UPDATE = "VOTE_UPDATE"
    VOTE_DELETE = "VOTE_DELETE"
    VOTE_CLOSE = "VOTE_CLOSE"
    VOTE_CAST = "VOTE_CAST"
    
    # 公告相关
    ANNOUNCEMENT_CREATE = "ANNOUNCEMENT_CREATE"
    ANNOUNCEMENT_UPDATE = "ANNOUNCEMENT_UPDATE"
    ANNOUNCEMENT_DELETE = "ANNOUNCEMENT_DELETE"
    
    # 价值记录相关
    VALUE_RECORD_CREATE = "VALUE_RECORD_CREATE"
    VALUE_RECORD_UPDATE = "VALUE_RECORD_UPDATE"
    VALUE_RECORD_DELETE = "VALUE_RECORD_DELETE"
    
    # 管理员操作
    ADMIN_GRANT_ROLE = "ADMIN_GRANT_ROLE"
    ADMIN_REVOKE_ROLE = "ADMIN_REVOKE_ROLE"
    ADMIN_SET_ADMIN = "ADMIN_SET_ADMIN"
    ADMIN_REMOVE_ADMIN = "ADMIN_REMOVE_ADMIN"


class ObjectType:
    """对象类型枚举"""
    USER = "USER"
    PROJECT = "PROJECT"
    PROJECT_MEMBER = "PROJECT_MEMBER"
    PROJECT_SHARE = "PROJECT_SHARE"
    PROJECT_EVENT = "PROJECT_EVENT"
    RESOURCE = "RESOURCE"
    TOKEN_ACCOUNT = "TOKEN_ACCOUNT"
    TOKEN_TRANSACTION = "TOKEN_TRANSACTION"
    DEMAND = "DEMAND"
    DEMAND_RESPONSE = "DEMAND_RESPONSE"
    CHANGE_REQUEST = "CHANGE_REQUEST"
    NEWS = "NEWS"
    NEWS_SOURCE = "NEWS_SOURCE"
    MEETING = "MEETING"
    MEETING_MINUTES = "MEETING_MINUTES"
    POST = "POST"
    COMMENT = "COMMENT"
    FEEDBACK = "FEEDBACK"
    VOTE = "VOTE"
    VOTE_RECORD = "VOTE_RECORD"
    ANNOUNCEMENT = "ANNOUNCEMENT"
    VALUE_RECORD = "VALUE_RECORD"


class AuditService:
    """
    审计日志服务
    
    提供统一的审计日志记录功能
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def log(
        self,
        user_id: int,
        action: str,
        object_type: str,
        object_id: int,
        summary: str
    ) -> AuditLog:
        """
        记录审计日志
        
        Args:
            user_id: 操作用户ID
            action: 操作类型（使用 AuditAction 常量）
            object_type: 对象类型（使用 ObjectType 常量）
            object_id: 对象ID
            summary: 操作摘要
        
        Returns:
            AuditLog: 创建的审计日志对象
        """
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            object_type=object_type,
            object_id=object_id,
            summary=summary
        )
        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(audit_log)
        return audit_log
    
    def log_user_action(
        self,
        user: User,
        action: str,
        object_type: str,
        object_id: int,
        summary: str
    ) -> AuditLog:
        """
        使用 User 对象记录审计日志
        
        Args:
            user: 操作用户
            action: 操作类型
            object_type: 对象类型
            object_id: 对象ID
            summary: 操作摘要
        
        Returns:
            AuditLog: 创建的审计日志对象
        """
        return self.log(
            user_id=user.id,
            action=action,
            object_type=object_type,
            object_id=object_id,
            summary=summary
        )
    
    # ===========================================
    # 快捷方法 - 项目相关
    # ===========================================
    
    def log_project_create(self, user: User, project_id: int, project_name: str):
        """记录项目创建"""
        return self.log_user_action(
            user=user,
            action=AuditAction.PROJECT_CREATE,
            object_type=ObjectType.PROJECT,
            object_id=project_id,
            summary=f"创建项目: {project_name}"
        )
    
    def log_project_approve(self, admin: User, project_id: int, project_name: str):
        """记录项目审核通过"""
        return self.log_user_action(
            user=admin,
            action=AuditAction.PROJECT_APPROVE,
            object_type=ObjectType.PROJECT,
            object_id=project_id,
            summary=f"管理员审核通过项目: {project_name}"
        )
    
    def log_project_reject(self, admin: User, project_id: int, project_name: str, reason: str):
        """记录项目审核驳回"""
        return self.log_user_action(
            user=admin,
            action=AuditAction.PROJECT_REJECT,
            object_type=ObjectType.PROJECT,
            object_id=project_id,
            summary=f"管理员驳回项目: {project_name}，原因: {reason}"
        )
    
    def log_project_status_change(
        self,
        user: User,
        project_id: int,
        project_name: str,
        old_status: str,
        new_status: str
    ):
        """记录项目状态变更"""
        action_map = {
            "PAUSED": AuditAction.PROJECT_PAUSE,
            "ONGOING": AuditAction.PROJECT_RESUME,
            "COMPLETED": AuditAction.PROJECT_COMPLETE,
            "ABANDONED": AuditAction.PROJECT_ABANDON
        }
        action = action_map.get(new_status, AuditAction.PROJECT_UPDATE)
        return self.log_user_action(
            user=user,
            action=action,
            object_type=ObjectType.PROJECT,
            object_id=project_id,
            summary=f"项目状态变更: {project_name} ({old_status} → {new_status})"
        )
    
    def log_share_adjust(
        self,
        user: User,
        project_id: int,
        project_name: str,
        changes: str
    ):
        """记录股权调整"""
        return self.log_user_action(
            user=user,
            action=AuditAction.SHARE_ADJUST,
            object_type=ObjectType.PROJECT_SHARE,
            object_id=project_id,
            summary=f"调整项目股权: {project_name}，{changes}"
        )
    
    # ===========================================
    # 快捷方法 - Token 相关
    # ===========================================
    
    def log_token_grant(
        self,
        admin: User,
        target_user_id: int,
        target_name: str,
        amount: float,
        reason: str
    ):
        """记录 Token 发放"""
        return self.log_user_action(
            user=admin,
            action=AuditAction.TOKEN_GRANT,
            object_type=ObjectType.TOKEN_ACCOUNT,
            object_id=target_user_id,
            summary=f"管理员发放 Token: 向 {target_name} 发放 {amount} Token，原因: {reason}"
        )
    
    def log_token_deduct(
        self,
        admin: User,
        target_user_id: int,
        target_name: str,
        amount: float,
        reason: str
    ):
        """记录 Token 扣除"""
        return self.log_user_action(
            user=admin,
            action=AuditAction.TOKEN_DEDUCT,
            object_type=ObjectType.TOKEN_ACCOUNT,
            object_id=target_user_id,
            summary=f"管理员扣除 Token: 从 {target_name} 扣除 {amount} Token，原因: {reason}"
        )
    
    def log_token_transfer_approve(
        self,
        admin: User,
        transaction_id: int,
        amount: float,
        from_name: str,
        to_name: str
    ):
        """记录 Token 交易审批通过"""
        return self.log_user_action(
            user=admin,
            action=AuditAction.TOKEN_TRANSFER_APPROVE,
            object_type=ObjectType.TOKEN_TRANSACTION,
            object_id=transaction_id,
            summary=f"管理员审批通过 Token 转账: {from_name} → {to_name} ({amount} Token)"
        )
    
    def log_token_transfer_reject(
        self,
        admin: User,
        transaction_id: int,
        amount: float,
        from_name: str,
        to_name: str,
        reason: str
    ):
        """记录 Token 交易审批驳回"""
        return self.log_user_action(
            user=admin,
            action=AuditAction.TOKEN_TRANSFER_REJECT,
            object_type=ObjectType.TOKEN_TRANSACTION,
            object_id=transaction_id,
            summary=f"管理员驳回 Token 转账: {from_name} → {to_name} ({amount} Token)，原因: {reason}"
        )
    
    # ===========================================
    # 快捷方法 - 资源相关
    # ===========================================
    
    def log_resource_delete(self, user: User, resource_id: int, resource_name: str):
        """记录资源删除"""
        return self.log_user_action(
            user=user,
            action=AuditAction.RESOURCE_DELETE,
            object_type=ObjectType.RESOURCE,
            object_id=resource_id,
            summary=f"删除资源: {resource_name}"
        )
    
    # ===========================================
    # 快捷方法 - 社群相关
    # ===========================================
    
    def log_post_delete(self, user: User, post_id: int, post_preview: str):
        """记录动态删除"""
        return self.log_user_action(
            user=user,
            action=AuditAction.POST_DELETE,
            object_type=ObjectType.POST,
            object_id=post_id,
            summary=f"删除动态: {post_preview[:50]}..."
        )
    
    def log_comment_delete(self, user: User, comment_id: int, comment_preview: str):
        """记录评论删除"""
        return self.log_user_action(
            user=user,
            action=AuditAction.COMMENT_DELETE,
            object_type=ObjectType.COMMENT,
            object_id=comment_id,
            summary=f"删除评论: {comment_preview[:50]}..."
        )
    
    # ===========================================
    # 快捷方法 - 公告相关
    # ===========================================
    
    def log_announcement_create(self, admin: User, announcement_id: int, title: str):
        """记录公告发布"""
        return self.log_user_action(
            user=admin,
            action=AuditAction.ANNOUNCEMENT_CREATE,
            object_type=ObjectType.ANNOUNCEMENT,
            object_id=announcement_id,
            summary=f"发布公告: {title}"
        )
    
    def log_announcement_delete(self, admin: User, announcement_id: int, title: str):
        """记录公告删除"""
        return self.log_user_action(
            user=admin,
            action=AuditAction.ANNOUNCEMENT_DELETE,
            object_type=ObjectType.ANNOUNCEMENT,
            object_id=announcement_id,
            summary=f"删除公告: {title}"
        )
    
    # ===========================================
    # 快捷方法 - 响应修改/废弃裁决
    # ===========================================
    
    def log_change_request_admin_decision(
        self,
        admin: User,
        request_id: int,
        response_id: int,
        decision: str,
        reason: str
    ):
        """记录管理员裁决响应修改/废弃请求"""
        action = (AuditAction.CHANGE_REQUEST_ADMIN_APPROVE 
                  if decision == "APPROVED" 
                  else AuditAction.CHANGE_REQUEST_ADMIN_REJECT)
        decision_text = "批准" if decision == "APPROVED" else "驳回"
        return self.log_user_action(
            user=admin,
            action=action,
            object_type=ObjectType.CHANGE_REQUEST,
            object_id=request_id,
            summary=f"管理员{decision_text}响应变更请求 (响应ID: {response_id})，原因: {reason}"
        )
    
    # ===========================================
    # 快捷方法 - 价值记录
    # ===========================================
    
    def log_value_record_create(
        self,
        admin: User,
        record_id: int,
        amount: float,
        currency: str,
        description: str
    ):
        """记录价值记录创建"""
        return self.log_user_action(
            user=admin,
            action=AuditAction.VALUE_RECORD_CREATE,
            object_type=ObjectType.VALUE_RECORD,
            object_id=record_id,
            summary=f"录入价值记录: {amount} {currency}，描述: {description[:50]}"
        )
    
    # ===========================================
    # 查询方法
    # ===========================================
    
    def get_logs(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        object_type: Optional[str] = None,
        object_id: Optional[int] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[AuditLog]:
        """
        查询审计日志
        
        Args:
            user_id: 按操作用户过滤
            action: 按操作类型过滤
            object_type: 按对象类型过滤
            object_id: 按对象ID过滤
            start_time: 开始时间
            end_time: 结束时间
            skip: 跳过条数
            limit: 返回条数
        
        Returns:
            List[AuditLog]: 审计日志列表
        """
        query = self.db.query(AuditLog)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if object_type:
            query = query.filter(AuditLog.object_type == object_type)
        if object_id:
            query = query.filter(AuditLog.object_id == object_id)
        if start_time:
            query = query.filter(AuditLog.created_at >= start_time)
        if end_time:
            query = query.filter(AuditLog.created_at <= end_time)
        
        return query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()
    
    def count_logs(
        self,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        object_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> int:
        """
        统计审计日志数量
        
        Args:
            user_id: 按操作用户过滤
            action: 按操作类型过滤
            object_type: 按对象类型过滤
            start_time: 开始时间
            end_time: 结束时间
        
        Returns:
            int: 日志数量
        """
        query = self.db.query(AuditLog)
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if object_type:
            query = query.filter(AuditLog.object_type == object_type)
        if start_time:
            query = query.filter(AuditLog.created_at >= start_time)
        if end_time:
            query = query.filter(AuditLog.created_at <= end_time)
        
        return query.count()


def get_audit_service(db: Session) -> AuditService:
    """获取审计服务实例"""
    return AuditService(db)

