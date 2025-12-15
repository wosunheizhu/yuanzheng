"""
元征 · 合伙人赋能平台 - 文件上传 API
"""
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse

from app.core.deps import get_current_active_user
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["文件上传"])

# 上传目录
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# 允许的文件类型
ALLOWED_EXTENSIONS = {
    # 图片
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    # 文档
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md',
    # 压缩包
    'zip', 'rar', '7z',
}

# 最大文件大小 (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


def get_file_extension(filename: str) -> str:
    """获取文件扩展名"""
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def generate_unique_filename(original_filename: str) -> str:
    """生成唯一文件名"""
    ext = get_file_extension(original_filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    return f"{timestamp}_{unique_id}.{ext}" if ext else f"{timestamp}_{unique_id}"


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """上传单个文件"""
    # 检查文件扩展名
    ext = get_file_extension(file.filename or '')
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型: {ext}。允许的类型: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    
    # 读取文件内容
    content = await file.read()
    
    # 检查文件大小
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件过大。最大允许 {MAX_FILE_SIZE // 1024 // 1024}MB"
        )
    
    # 生成唯一文件名
    unique_filename = generate_unique_filename(file.filename or 'file')
    
    # 按用户ID和日期组织目录
    date_dir = datetime.now().strftime('%Y/%m')
    user_dir = UPLOAD_DIR / str(current_user.id) / date_dir
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存文件
    file_path = user_dir / unique_filename
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # 返回文件信息
    return {
        "name": file.filename,
        "url": f"/api/v1/uploads/{current_user.id}/{date_dir}/{unique_filename}",
        "type": file.content_type,
        "size": len(content)
    }


@router.post("/multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """上传多个文件"""
    results = []
    errors = []
    
    for file in files:
        try:
            # 检查文件扩展名
            ext = get_file_extension(file.filename or '')
            if ext not in ALLOWED_EXTENSIONS:
                errors.append({
                    "filename": file.filename,
                    "error": f"不支持的文件类型: {ext}"
                })
                continue
            
            # 读取文件内容
            content = await file.read()
            
            # 检查文件大小
            if len(content) > MAX_FILE_SIZE:
                errors.append({
                    "filename": file.filename,
                    "error": f"文件过大，最大允许 {MAX_FILE_SIZE // 1024 // 1024}MB"
                })
                continue
            
            # 生成唯一文件名
            unique_filename = generate_unique_filename(file.filename or 'file')
            
            # 按用户ID和日期组织目录
            date_dir = datetime.now().strftime('%Y/%m')
            user_dir = UPLOAD_DIR / str(current_user.id) / date_dir
            user_dir.mkdir(parents=True, exist_ok=True)
            
            # 保存文件
            file_path = user_dir / unique_filename
            with open(file_path, 'wb') as f:
                f.write(content)
            
            results.append({
                "name": file.filename,
                "url": f"/api/v1/uploads/{current_user.id}/{date_dir}/{unique_filename}",
                "type": file.content_type,
                "size": len(content)
            })
        except Exception as e:
            errors.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return {
        "uploaded": results,
        "errors": errors
    }


@router.get("/{user_id}/{year}/{month}/{filename}")
async def get_file(
    user_id: int,
    year: str,
    month: str,
    filename: str,
):
    """获取上传的文件（公开访问）
    
    注意：文件访问不需要认证，因为：
    1. 文件名是随机生成的UUID，难以猜测
    2. 帖子本身已有权限控制，未授权用户看不到帖子内容和附件链接
    """
    file_path = UPLOAD_DIR / str(user_id) / year / month / filename
    
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    # 获取文件扩展名以设置正确的 content-type
    ext = get_file_extension(filename)
    media_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
    }
    
    return FileResponse(
        file_path, 
        media_type=media_types.get(ext, 'application/octet-stream'),
        filename=filename
    )

