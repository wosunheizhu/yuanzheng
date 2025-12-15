"""
元征 · 合伙人赋能平台 - 社群 API
动态、评论、点赞、反馈、私信
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.core.deps import get_db, get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.project import VisibilityScopeType
from app.models.community import (
    Post, Comment, Like, Feedback, DMThread, DMMessage,
    PostType, FeedbackStatus
)
from app.models.notification import InboxItem, InboxCategory
from app.schemas.community import (
    PostCreate, PostUpdate, PostRead, PostList,
    CommentCreate, CommentRead,
    FeedbackCreate, FeedbackRead, FeedbackReply, FeedbackList,
    DMMessageCreate, DMMessageRead, DMThreadRead, DMThreadList
)

router = APIRouter(prefix="/community", tags=["社群"])


def check_post_visibility(post: Post, user: User) -> bool:
    """检查用户是否可以查看动态"""
    if user.is_admin:
        return True
    if post.author_user_id == user.id:
        return True
    
    if post.visibility_scope_type == VisibilityScopeType.ALL:
        return True
    elif post.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL:
        return user.highest_role_level >= (post.visibility_min_role_level or 0)
    elif post.visibility_scope_type == VisibilityScopeType.CUSTOM:
        return user.id in (post.visibility_user_ids or [])
    
    return False


def post_to_read(post: Post, current_user_id: int, db: Session) -> PostRead:
    """将 Post 模型转换为 PostRead"""
    like_count = db.query(func.count(Like.post_id)).filter(
        Like.post_id == post.id
    ).scalar()
    
    comment_count = db.query(func.count(Comment.id)).filter(
        Comment.post_id == post.id,
        Comment.is_deleted == False
    ).scalar()
    
    is_liked = db.query(Like).filter(
        Like.post_id == post.id,
        Like.user_id == current_user_id
    ).first() is not None
    
    # 获取关联资源名称
    related_resource_name = None
    if post.related_resource:
        related_resource_name = post.related_resource.org_name
    
    return PostRead(
        id=post.id,
        author_user_id=post.author_user_id,
        author_name=post.author.name if post.author else None,
        author_avatar=post.author.avatar_url if post.author else None,
        post_type=post.post_type,
        content=post.content,
        attachments=post.attachments,
        related_project_id=post.related_project_id,
        related_project_name=post.related_project.name if post.related_project else None,
        related_resource_id=post.related_resource_id,
        related_resource_name=related_resource_name,
        related_vote_id=post.related_vote_id,
        related_announcement_id=post.related_announcement_id,
        visibility_scope_type=post.visibility_scope_type,
        visibility_min_role_level=post.visibility_min_role_level,
        created_at=post.created_at,
        updated_at=post.updated_at,
        like_count=like_count,
        comment_count=comment_count,
        is_liked=is_liked
    )


# ============ 动态 API ============

@router.get("/posts", response_model=PostList)
def list_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    post_type: Optional[PostType] = Query(None),
    author_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取动态列表"""
    query = db.query(Post).filter(Post.is_deleted == False)
    
    if post_type:
        query = query.filter(Post.post_type == post_type)
    
    if author_id:
        query = query.filter(Post.author_user_id == author_id)
    
    # 应用可见性过滤
    if not current_user.is_admin:
        query = query.filter(
            (Post.author_user_id == current_user.id) |
            (Post.visibility_scope_type == VisibilityScopeType.ALL) |
            (
                (Post.visibility_scope_type == VisibilityScopeType.ROLE_MIN_LEVEL) &
                (Post.visibility_min_role_level <= current_user.highest_role_level)
            )
        )
    
    total = query.count()
    posts = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    
    items = [post_to_read(p, current_user.id, db) for p in posts]
    
    return PostList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/posts", response_model=PostRead)
def create_post(
    post_in: PostCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """发布动态"""
    post = Post(
        author_user_id=current_user.id,
        post_type=post_in.post_type,
        content=post_in.content,
        attachments=post_in.attachments,
        related_project_id=post_in.related_project_id,
        related_resource_id=post_in.related_resource_id,
        related_vote_id=post_in.related_vote_id,
        related_announcement_id=post_in.related_announcement_id,
        visibility_scope_type=post_in.visibility_scope_type,
        visibility_min_role_level=post_in.visibility_min_role_level,
        visibility_user_ids=post_in.visibility_user_ids,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    
    return post_to_read(post, current_user.id, db)


@router.get("/posts/{post_id}", response_model=PostRead)
def get_post(
    post_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取动态详情"""
    post = db.query(Post).filter(
        Post.id == post_id,
        Post.is_deleted == False
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="动态不存在"
        )
    
    if not check_post_visibility(post, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此动态"
        )
    
    return post_to_read(post, current_user.id, db)


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除动态"""
    post = db.query(Post).filter(
        Post.id == post_id,
        Post.is_deleted == False
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="动态不存在"
        )
    
    if post.author_user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能删除自己的动态"
        )
    
    post.is_deleted = True
    post.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "动态已删除"}


# ============ 点赞 API ============

@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """点赞/取消点赞"""
    post = db.query(Post).filter(
        Post.id == post_id,
        Post.is_deleted == False
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="动态不存在"
        )
    
    if not check_post_visibility(post, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权操作此动态"
        )
    
    existing_like = db.query(Like).filter(
        Like.post_id == post_id,
        Like.user_id == current_user.id
    ).first()
    
    if existing_like:
        db.delete(existing_like)
        db.commit()
        return {"message": "已取消点赞", "liked": False}
    else:
        like = Like(
            post_id=post_id,
            user_id=current_user.id,
            created_at=datetime.utcnow()
        )
        db.add(like)
        db.commit()
        return {"message": "已点赞", "liked": True}


# ============ 评论 API ============

@router.get("/posts/{post_id}/comments", response_model=List[CommentRead])
def list_comments(
    post_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取动态评论"""
    post = db.query(Post).filter(
        Post.id == post_id,
        Post.is_deleted == False
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="动态不存在"
        )
    
    if not check_post_visibility(post, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权查看此动态"
        )
    
    comments = db.query(Comment).filter(
        Comment.post_id == post_id,
        Comment.is_deleted == False
    ).order_by(Comment.created_at.asc()).all()
    
    return [
        CommentRead(
            id=c.id,
            post_id=c.post_id,
            user_id=c.user_id,
            user_name=c.user.name if c.user else None,
            user_avatar=c.user.avatar_url if c.user else None,
            content=c.content,
            mentions=c.mentions,
            created_at=c.created_at
        )
        for c in comments
    ]


@router.post("/posts/{post_id}/comments", response_model=CommentRead)
def create_comment(
    post_id: int,
    comment_in: CommentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """发表评论"""
    post = db.query(Post).filter(
        Post.id == post_id,
        Post.is_deleted == False
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="动态不存在"
        )
    
    if not check_post_visibility(post, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权评论此动态"
        )
    
    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=comment_in.content,
        mentions=comment_in.mentions,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(comment)
    db.flush()
    
    # 发送 @ 通知
    if comment_in.mentions:
        for mentioned_user_id in comment_in.mentions:
            inbox_item = InboxItem(
                user_id=mentioned_user_id,
                category=InboxCategory.MENTION,
                title=f"{current_user.name} 在评论中提到了你",
                content=comment_in.content[:200],
                related_object_type="POST",
                related_object_id=post_id,
                is_read=False,
                created_at=datetime.utcnow()
            )
            db.add(inbox_item)
    
    db.commit()
    db.refresh(comment)
    
    return CommentRead(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        user_name=current_user.name,
        user_avatar=current_user.avatar_url,
        content=comment.content,
        mentions=comment.mentions,
        created_at=comment.created_at
    )


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除评论"""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.is_deleted == False
    ).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="评论不存在"
        )
    
    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只能删除自己的评论"
        )
    
    comment.is_deleted = True
    comment.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "评论已删除"}


# ============ 反馈 API ============

@router.get("/feedbacks", response_model=FeedbackList)
def list_feedbacks(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    status_filter: Optional[FeedbackStatus] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """获取反馈列表（管理员看所有，普通用户看自己的）"""
    query = db.query(Feedback).filter(Feedback.is_deleted == False)
    
    if not current_user.is_admin:
        query = query.filter(Feedback.user_id == current_user.id)
    
    if status_filter:
        query = query.filter(Feedback.status == status_filter)
    
    total = query.count()
    feedbacks = query.order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()
    
    items = [
        FeedbackRead(
            id=f.id,
            user_id=f.user_id,
            user_name=f.user.name if f.user else None,
            category=f.category,
            title=f.title,
            content=f.content,
            contact=f.contact,
            allow_contact=f.allow_contact,
            status=f.status,
            admin_reply=f.admin_reply,
            admin_user_id=f.admin_user_id,
            admin_name=f.admin.name if f.admin else None,
            admin_replied_at=f.admin_replied_at,
            created_at=f.created_at
        )
        for f in feedbacks
    ]
    
    return FeedbackList(
        items=items,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/feedbacks", response_model=FeedbackRead)
def create_feedback(
    feedback_in: FeedbackCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """提交意见反馈"""
    feedback = Feedback(
        user_id=current_user.id,
        category=feedback_in.category,
        title=feedback_in.title,
        content=feedback_in.content,
        contact=feedback_in.contact,
        allow_contact=feedback_in.allow_contact,
        status=FeedbackStatus.OPEN,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    
    return FeedbackRead(
        id=feedback.id,
        user_id=feedback.user_id,
        user_name=current_user.name,
        category=feedback.category,
        title=feedback.title,
        content=feedback.content,
        contact=feedback.contact,
        allow_contact=feedback.allow_contact,
        status=feedback.status,
        admin_reply=None,
        admin_user_id=None,
        admin_name=None,
        admin_replied_at=None,
        created_at=feedback.created_at
    )


@router.post("/feedbacks/{feedback_id}/reply")
def reply_feedback(
    feedback_id: int,
    reply_in: FeedbackReply,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """管理员回复反馈"""
    feedback = db.query(Feedback).filter(
        Feedback.id == feedback_id,
        Feedback.is_deleted == False
    ).first()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="反馈不存在"
        )
    
    feedback.admin_reply = reply_in.reply
    feedback.admin_user_id = current_user.id
    feedback.admin_replied_at = datetime.utcnow()
    feedback.status = reply_in.status
    feedback.updated_at = datetime.utcnow()
    
    # 通知反馈人
    inbox_item = InboxItem(
        user_id=feedback.user_id,
        category=InboxCategory.SYSTEM,
        title=f"您的反馈「{feedback.title}」已得到回复",
        content=reply_in.reply[:200],
        related_object_type="FEEDBACK",
        related_object_id=feedback_id,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(inbox_item)
    
    # 记录审计日志
    from app.models.audit import AuditLog
    status_text = "已解决" if reply_in.status.value == "RESOLVED" else "已拒绝" if reply_in.status.value == "REJECTED" else str(reply_in.status.value)
    audit_log = AuditLog(
        user_id=current_user.id,
        action="REPLY_FEEDBACK",
        object_type="FEEDBACK",
        object_id=feedback_id,
        summary=f"回复反馈「{feedback.title}」，状态：{status_text}，回复内容：{reply_in.reply[:50]}...",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    
    db.commit()
    
    return {"message": "反馈已回复"}


# ============ 私信 API ============

@router.get("/dm/threads", response_model=DMThreadList)
def list_dm_threads(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取私信会话列表"""
    threads = db.query(DMThread).filter(
        or_(
            DMThread.user_a_id == current_user.id,
            DMThread.user_b_id == current_user.id
        )
    ).order_by(DMThread.updated_at.desc()).all()
    
    items = []
    for t in threads:
        other_user_id = t.user_b_id if t.user_a_id == current_user.id else t.user_a_id
        other_user = t.user_b if t.user_a_id == current_user.id else t.user_a
        
        last_message = db.query(DMMessage).filter(
            DMMessage.thread_id == t.id,
            DMMessage.is_deleted == False
        ).order_by(DMMessage.created_at.desc()).first()
        
        unread_count = db.query(func.count(DMMessage.id)).filter(
            DMMessage.thread_id == t.id,
            DMMessage.receiver_id == current_user.id,
            DMMessage.is_read == False,
            DMMessage.is_deleted == False
        ).scalar()
        
        items.append(DMThreadRead(
            id=t.id,
            other_user_id=other_user_id,
            other_user_name=other_user.name if other_user else None,
            other_user_avatar=other_user.avatar_url if other_user else None,
            last_message=last_message.content[:50] if last_message else None,
            last_message_time=last_message.created_at if last_message else None,
            unread_count=unread_count
        ))
    
    return DMThreadList(items=items, total=len(items))


@router.get("/dm/threads/{other_user_id}/messages", response_model=List[DMMessageRead])
def get_dm_messages(
    other_user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """获取与某用户的私信消息"""
    # 查找或创建会话
    user_a_id = min(current_user.id, other_user_id)
    user_b_id = max(current_user.id, other_user_id)
    
    thread = db.query(DMThread).filter(
        DMThread.user_a_id == user_a_id,
        DMThread.user_b_id == user_b_id
    ).first()
    
    if not thread:
        return []
    
    messages = db.query(DMMessage).filter(
        DMMessage.thread_id == thread.id,
        DMMessage.is_deleted == False
    ).order_by(DMMessage.created_at.desc()).offset(skip).limit(limit).all()
    
    # 标记消息为已读
    db.query(DMMessage).filter(
        DMMessage.thread_id == thread.id,
        DMMessage.receiver_id == current_user.id,
        DMMessage.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    result = []
    for m in reversed(messages):  # 返回正序
        # 构建引用信息
        reference_out = None
        if m.reference_type and m.reference_id:
            reference_out = {
                "type": m.reference_type,
                "id": m.reference_id,
                "name": m.reference_name
            }
        
        result.append(DMMessageRead(
            id=m.id,
            thread_id=m.thread_id,
            sender_id=m.sender_id,
            sender_name=m.sender.name if m.sender else None,
            receiver_id=m.receiver_id,
            receiver_name=m.receiver.name if m.receiver else None,
            content=m.content,
            is_read=m.is_read,
            created_at=m.created_at,
            attachments=m.attachments,
            reference=reference_out
        ))
    
    return result


@router.post("/dm/threads/{other_user_id}/messages", response_model=DMMessageRead)
def send_dm_message(
    other_user_id: int,
    message_in: DMMessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """发送私信"""
    if other_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能给自己发私信"
        )
    
    # 检查对方用户是否存在
    other_user = db.query(User).filter(
        User.id == other_user_id,
        User.is_deleted == False,
        User.is_active == True
    ).first()
    
    if not other_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )
    
    # 查找或创建会话
    user_a_id = min(current_user.id, other_user_id)
    user_b_id = max(current_user.id, other_user_id)
    
    thread = db.query(DMThread).filter(
        DMThread.user_a_id == user_a_id,
        DMThread.user_b_id == user_b_id
    ).first()
    
    if not thread:
        thread = DMThread(
            user_a_id=user_a_id,
            user_b_id=user_b_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(thread)
        db.flush()
    
    # 处理附件
    attachments_data = None
    if message_in.attachments:
        attachments_data = [a.model_dump() for a in message_in.attachments]
    
    # 处理引用
    reference_type = None
    reference_id = None
    reference_name = None
    if message_in.reference:
        reference_type = message_in.reference.type
        reference_id = message_in.reference.id
        reference_name = message_in.reference.name
    
    # 创建消息
    message = DMMessage(
        thread_id=thread.id,
        sender_id=current_user.id,
        receiver_id=other_user_id,
        content=message_in.content or "",
        is_read=False,
        created_at=datetime.utcnow(),
        attachments=attachments_data,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_name=reference_name
    )
    db.add(message)
    
    # 更新会话时间
    thread.updated_at = datetime.utcnow()
    
    # 发送信箱通知
    content_preview = message_in.content[:200] if message_in.content else ""
    if not content_preview and message_in.attachments:
        content_preview = f"[{len(message_in.attachments)} 个附件]"
    if not content_preview and message_in.reference:
        content_preview = f"[引用{message_in.reference.type}：{message_in.reference.name}]"
    
    inbox_item = InboxItem(
        user_id=other_user_id,
        category=InboxCategory.DM,
        title=f"{current_user.name} 给你发送了私信",
        content=content_preview,
        related_object_type="DM_THREAD",
        related_object_id=thread.id,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(inbox_item)
    
    db.commit()
    db.refresh(message)
    
    # 构建返回的引用信息
    reference_out = None
    if message.reference_type and message.reference_id:
        reference_out = {
            "type": message.reference_type,
            "id": message.reference_id,
            "name": message.reference_name
        }
    
    return DMMessageRead(
        id=message.id,
        thread_id=message.thread_id,
        sender_id=message.sender_id,
        sender_name=current_user.name,
        receiver_id=message.receiver_id,
        receiver_name=other_user.name,
        content=message.content,
        is_read=message.is_read,
        created_at=message.created_at,
        attachments=message.attachments,
        reference=reference_out
    )


@router.post("/dm/threads/{other_user_id}/read")
def mark_dm_as_read(
    other_user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """标记与某用户的私信为已读"""
    # 查找会话
    user_a_id = min(current_user.id, other_user_id)
    user_b_id = max(current_user.id, other_user_id)
    
    thread = db.query(DMThread).filter(
        DMThread.user_a_id == user_a_id,
        DMThread.user_b_id == user_b_id
    ).first()
    
    if not thread:
        return {"message": "会话不存在"}
    
    # 标记私信消息为已读
    db.query(DMMessage).filter(
        DMMessage.thread_id == thread.id,
        DMMessage.receiver_id == current_user.id,
        DMMessage.is_read == False
    ).update({"is_read": True})
    
    # 同时标记信箱中来自该用户的私信通知为已读
    db.query(InboxItem).filter(
        InboxItem.user_id == current_user.id,
        InboxItem.category == InboxCategory.DM,
        InboxItem.related_object_type == "DM_THREAD",
        InboxItem.related_object_id == thread.id,
        InboxItem.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    
    return {"message": "已标记为已读"}

