'use client'

/**
 * 元征 · 合伙人赋能平台 - 交流社群
 * 高端简约现代艺术画廊风格
 * 整合：动态流、投票参与、私聊入口、意见反馈入口
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal,
  Send,
  AlertCircle,
  Loader2,
  Users,
  X,
  AtSign,
  ChevronDown,
  ChevronRight,
  Filter,
  Plus,
  Mail,
  MessageSquare,
  Eye,
  EyeOff,
  Link2,
  Folder,
  Paperclip,
  FileText,
  Image,
  File,
  Trash2,
  Download
} from 'lucide-react'
import { communityService, Post, Comment, userService, User, projectService, Project, resourceService, Resource, PostAttachment } from '@/lib/services'
import apiClient from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'
import Link from 'next/link'

// 颜色常量 - 高端简约艺术画廊风格
const colors = {
  bg: '#000000',
  bgElevated: '#0a0a0a',
  bgCard: '#111111',
  text: '#faf9f6',
  textSecondary: '#888888',
  textMuted: '#555555',
  border: '#222222',
  borderLight: '#333333',
  accent: '#faf9f6',
  like: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
}

// 帖子类型映射（移除投票类型）
const postTypeLabels: Record<string, { label: string; color: string }> = {
  'GENERAL': { label: '动态', color: colors.textSecondary },
  'PROJECT': { label: '项目', color: '#4ade80' },
  'RESOURCE': { label: '资源', color: '#3b82f6' },
  'ANNOUNCEMENT_REF': { label: '公告', color: '#f59e0b' },
}

// 可见范围选项
const visibilityOptions = [
  { value: 'ALL', label: '所有合伙人', icon: Users },
  { value: 'ROLE_MIN_LEVEL', label: '按角色级别', icon: Eye },
  { value: 'CUSTOM', label: '自定义', icon: EyeOff },
]

const roleMinLevelOptions = [
  { value: 1, label: '普通及以上' },
  { value: 2, label: '核心及以上' },
  { value: 3, label: '仅联合创始人' },
]

// 移除投票Tab，仅保留动态流

export default function CommunityPage() {
  const { user } = useAuthStore()
  
  // 动态列表状态
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // 发帖状态
  const [showPostForm, setShowPostForm] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostType, setNewPostType] = useState('GENERAL')
  const [newPostVisibility, setNewPostVisibility] = useState('ALL')
  const [newPostMinRoleLevel, setNewPostMinRoleLevel] = useState(1)
  const [newPostProjectId, setNewPostProjectId] = useState<number | undefined>()
  const [newPostResourceId, setNewPostResourceId] = useState<number | undefined>()
  const [newPostCustomUserIds, setNewPostCustomUserIds] = useState<number[]>([])
  const [posting, setPosting] = useState(false)
  
  // 附件状态
  const [attachments, setAttachments] = useState<{name: string; url: string; type?: string; size?: number}[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 评论状态
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  
  // 用户列表（用于@提及）
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionedUsers, setMentionedUsers] = useState<number[]>([])
  
  // 项目列表（用于关联）
  const [projects, setProjects] = useState<Project[]>([])
  
  // 资源列表（用于关联）
  const [resources, setResources] = useState<Resource[]>([])
  
  // 筛选状态
  const [postTypeFilter, setPostTypeFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
  // 删除帖子状态
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [postMenuOpenId, setPostMenuOpenId] = useState<number | null>(null)
  
  // 当前用户
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  
  const heroRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // 加载帖子列表
  const fetchPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
      try {
      if (!append) setLoading(true)
        setError(null)
        
      const params: any = { page: pageNum, page_size: 20 }
      if (postTypeFilter) params.post_type = postTypeFilter
      
      const response = await communityService.listPosts(params)
        
      if (append) {
          setPosts(prev => [...prev, ...(response.items || [])])
      } else {
        setPosts(response.items || [])
        }
        setHasMore((response.items?.length || 0) === 20)
      } catch (err) {
        console.error('Failed to fetch posts:', err)
        setError('无法加载社群动态')
      } finally {
        setLoading(false)
      }
  }, [postTypeFilter])

  useEffect(() => {
    setPage(1)
    fetchPosts(1)
  }, [fetchPosts])

  // 加载用户、项目和资源列表
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, projectsRes, resourcesRes, currentUser] = await Promise.all([
          userService.list({ limit: 100 }),
          projectService.list({ page_size: 100 }),
          resourceService.list({ page_size: 100 }),
          userService.getMe()
        ])
        setAllUsers(Array.isArray(usersRes) ? usersRes : usersRes.items || [])
        setProjects(projectsRes.items || [])
        setResources(resourcesRes.items || [])
        setCurrentUserId(currentUser.id)
      } catch (err) {
        console.error('Failed to fetch data:', err)
      }
    }
    fetchData()
  }, [])

  // 入场动画 - 先设置初始状态为不可见
  useEffect(() => {
    if (heroRef.current) {
      gsap.set(heroRef.current.children, { opacity: 0, y: 20 })
    }
  }, [])

  // 数据加载完成后执行动画
  useEffect(() => {
    if (!loading && heroRef.current) {
      gsap.to(heroRef.current.children, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }
  }, [loading])

  // 上传附件
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setUploadingFiles(true)
    
    try {
      const formData = new FormData()
      Array.from(files).forEach(file => {
        formData.append('files', file)
      })
      
      const response = await apiClient.post('/uploads/multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      const data = response.data
      
      if (data.uploaded && data.uploaded.length > 0) {
        setAttachments(prev => [...prev, ...data.uploaded])
        toast.success(`成功上传 ${data.uploaded.length} 个文件`)
      }
      
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((err: any) => {
          toast.error(`${err.filename}: ${err.error}`)
        })
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || '上传失败')
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 删除附件
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // 获取文件图标
  const getFileIcon = (type?: string, name?: string) => {
    const ext = name?.split('.').pop()?.toLowerCase()
    if (type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return Image
    }
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'].includes(ext || '')) {
      return FileText
    }
    return File
  }

  // 格式化文件大小
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  // 发布帖子
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return
    
    try {
      setPosting(true)
      const postData: any = {
        content: newPostContent,
        post_type: newPostType,
        visibility_scope_type: newPostVisibility,
      }
      
      if (newPostVisibility === 'ROLE_MIN_LEVEL') {
        postData.visibility_min_role_level = newPostMinRoleLevel
      }
      
      if (newPostVisibility === 'CUSTOM' && newPostCustomUserIds.length > 0) {
        postData.visibility_user_ids = newPostCustomUserIds
      }
      
      if (newPostType === 'PROJECT' && newPostProjectId) {
        postData.related_project_id = newPostProjectId
      }
      
      if (newPostType === 'RESOURCE' && newPostResourceId) {
        postData.related_resource_id = newPostResourceId
      }
      
      // 添加附件
      if (attachments.length > 0) {
        postData.attachments = attachments
      }
      
      await communityService.createPost(postData)
      
      setNewPostContent('')
      setNewPostType('GENERAL')
      setNewPostVisibility('ALL')
      setNewPostMinRoleLevel(1)
      setNewPostProjectId(undefined)
      setNewPostResourceId(undefined)
      setNewPostCustomUserIds([])
      setAttachments([])
      setShowPostForm(false)
      
      // 重新加载
      setPage(1)
      fetchPosts(1)
      toast.success('发布成功')
    } catch (err: any) {
      toast.error(err.message || '发布失败')
    } finally {
      setPosting(false)
    }
  }

  // 删除帖子
  const handleDeletePost = async () => {
    if (!deletingPostId) return
    
    try {
      await communityService.deletePost(deletingPostId)
      setPosts(prev => prev.filter(p => p.id !== deletingPostId))
      toast.success('帖子已删除')
      setShowDeleteConfirm(false)
      setDeletingPostId(null)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '删除失败')
    }
  }

  // 点赞
  const handleLike = async (postId: number) => {
    try {
      const result = await communityService.likePost(postId)
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            user_liked: result.liked,
            like_count: result.liked ? p.like_count + 1 : p.like_count - 1
          }
        }
        return p
      }))
    } catch (err) {
      console.error('Failed to like post:', err)
    }
  }

  // 加载评论
  const handleLoadComments = async (postId: number) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null)
      return
    }
    
    try {
      setExpandedPostId(postId)
      setLoadingComments(true)
      const data = await communityService.getComments(postId)
      setComments(data || [])
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  // 发表评论
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !expandedPostId) return
    
    try {
      setSubmittingComment(true)
      await communityService.createComment(expandedPostId, newComment, mentionedUsers.length > 0 ? mentionedUsers : undefined)
      
      setNewComment('')
      setMentionedUsers([])
      
      // 重新加载评论
      const data = await communityService.getComments(expandedPostId)
      setComments(data || [])
      
      // 更新帖子评论数
      setPosts(prev => prev.map(p => {
        if (p.id === expandedPostId) {
          return { ...p, comment_count: p.comment_count + 1 }
        }
        return p
      }))
    } catch (err: any) {
      toast.error(err.message || '评论失败')
    } finally {
      setSubmittingComment(false)
    }
  }


  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* Hero 区域 */}
      <section 
        ref={heroRef}
        className="min-h-[28vh] flex flex-col items-center justify-center text-center px-8 relative"
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(60, 60, 60, 0.12) 0%, transparent 60%)',
          }}
        />

        <p 
          className="text-xs uppercase tracking-widest mb-5"
          style={{ color: colors.textMuted, letterSpacing: '0.3em' }}
        >
          分享 · 交流 · 共鸣
        </p>

        <h1 
          className="text-4xl md:text-5xl mb-6 font-light tracking-wide"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
          }}
        >
          交流社群
        </h1>

        <p 
          className="text-sm max-w-md font-light"
          style={{ color: colors.textSecondary }}
        >
          分享观点，交流心得，建立深度连接
        </p>
      </section>

      {/* 导航和操作栏 */}
      <section className="px-8 pb-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          {/* 标题 */}
          <div className="flex items-center gap-0">
            <span
              className="px-6 py-3 text-xs uppercase tracking-widest"
              style={{ 
                color: colors.text,
                borderBottom: `1px solid ${colors.text}`,
                letterSpacing: '0.2em'
              }}
            >
              动态
            </span>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2.5 transition-all duration-300"
              style={{ 
                border: `1px solid ${colors.border}`,
                color: showFilters ? colors.text : colors.textMuted
              }}
            >
              <Filter size={14} strokeWidth={1} />
            </button>
            <button
              onClick={() => setShowPostForm(!showPostForm)}
              className="px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
              style={{ 
                background: colors.text,
                color: colors.bg,
                letterSpacing: '0.15em'
              }}
            >
              <Plus size={14} strokeWidth={1.5} />
              发布
            </button>
          </div>
        </div>

        {/* 筛选栏 */}
        {showFilters && (
          <div 
            className="mt-6 p-5"
          style={{ border: `1px solid ${colors.border}` }}
        >
            <p 
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
            >
              按类型筛选
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setPostTypeFilter(''); setPage(1); fetchPosts(1); }}
                className="px-4 py-2 text-xs uppercase tracking-widest transition-all duration-300"
                style={{ 
                  border: `1px solid ${!postTypeFilter ? colors.text : colors.border}`,
                  background: !postTypeFilter ? colors.text : 'transparent',
                  color: !postTypeFilter ? colors.bg : colors.textMuted,
                  letterSpacing: '0.1em'
                }}
              >
                全部
              </button>
              {Object.entries(postTypeLabels).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { setPostTypeFilter(key); setPage(1); fetchPosts(1); }}
                  className="px-4 py-2 text-xs uppercase tracking-widest transition-all duration-300"
                  style={{ 
                    border: `1px solid ${postTypeFilter === key ? val.color : colors.border}`,
                    background: postTypeFilter === key ? val.color : 'transparent',
                    color: postTypeFilter === key ? colors.bg : colors.textMuted,
                    letterSpacing: '0.1em'
                  }}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 发帖表单 */}
      {showPostForm && (
        <section className="px-8 pb-8 max-w-3xl mx-auto">
          <div 
            className="p-6"
            style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.border}` 
            }}
          >
            {/* 类型选择 */}
            <div className="mb-6">
              <p 
                className="text-xs uppercase tracking-widest mb-3"
                style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
              >
                类型
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(postTypeLabels).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setNewPostType(key)}
                    className="px-4 py-2 text-xs transition-all duration-300"
                    style={{ 
                      border: `1px solid ${newPostType === key ? val.color : colors.border}`,
                      color: newPostType === key ? val.color : colors.textMuted,
                    }}
                  >
                    {val.label}
                  </button>
                ))}
            </div>
            </div>

            {/* 项目关联（仅项目类型） */}
            {newPostType === 'PROJECT' && (
              <div className="mb-6">
                <p 
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
                >
                  关联项目
                </p>
                <select
                  value={newPostProjectId || ''}
                  onChange={(e) => setNewPostProjectId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-3 text-sm font-light transition-all duration-300 focus:outline-none cursor-pointer"
                  style={{ 
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="">选择项目...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 资源关联（仅资源类型） */}
            {newPostType === 'RESOURCE' && (
              <div className="mb-6">
                <p 
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
                >
                  关联资源
                </p>
                <select
                  value={newPostResourceId || ''}
                  onChange={(e) => setNewPostResourceId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-3 text-sm font-light transition-all duration-300 focus:outline-none cursor-pointer"
                  style={{ 
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="">选择资源...</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>{r.org_name} - {r.description.substring(0, 30)}{r.description.length > 30 ? '...' : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 内容输入 */}
            <div className="mb-6">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="分享你的想法..."
                className="w-full px-0 py-3 text-sm font-light resize-none transition-all duration-300 focus:outline-none"
                style={{ 
                  background: 'transparent',
                  borderBottom: `1px solid ${colors.border}`,
                  color: colors.text,
                  lineHeight: '1.8'
                }}
                rows={4}
                onFocus={(e) => e.currentTarget.style.borderBottomColor = colors.textSecondary}
                onBlur={(e) => e.currentTarget.style.borderBottomColor = colors.border}
              />
            </div>

            {/* 附件上传 */}
            <div className="mb-6">
              <p 
                className="text-xs uppercase tracking-widest mb-3"
                style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
              >
                附件
              </p>
              
              {/* 隐藏的文件输入 */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.zip,.rar,.7z"
              />
              
              {/* 上传按钮 */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFiles}
                className="w-full px-4 py-4 text-xs transition-all duration-300 flex items-center justify-center gap-2 border-dashed"
                style={{ 
                  border: `1px dashed ${colors.border}`,
                  color: colors.textMuted,
                  opacity: uploadingFiles ? 0.5 : 1
                }}
              >
                {uploadingFiles ? (
                  <>
                    <Loader2 size={14} className="animate-spin" strokeWidth={1} />
                    上传中...
                  </>
                ) : (
                  <>
                    <Paperclip size={14} strokeWidth={1} />
                    点击上传附件（支持图片、文档、压缩包，最大10MB）
                  </>
                )}
              </button>
              
              {/* 已上传附件列表 */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file, index) => {
                    const FileIcon = getFileIcon(file.type, file.name)
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-3 px-3 py-2"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        <FileIcon size={16} strokeWidth={1} style={{ color: colors.textSecondary }} />
                        <span className="flex-1 text-xs truncate" style={{ color: colors.text }}>
                          {file.name}
                        </span>
                        {file.size && (
                          <span className="text-xs" style={{ color: colors.textMuted }}>
                            {formatFileSize(file.size)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-1 transition-all duration-300 hover:opacity-50"
                          style={{ color: colors.textMuted }}
                        >
                          <X size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 可见范围 */}
            <div className="mb-6">
              <p 
                className="text-xs uppercase tracking-widest mb-3"
                style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
              >
                可见范围
              </p>
              <div className="flex flex-wrap gap-2">
                {visibilityOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setNewPostVisibility(opt.value)}
                    className="px-4 py-2 text-xs transition-all duration-300 flex items-center gap-2"
                    style={{ 
                      border: `1px solid ${newPostVisibility === opt.value ? colors.text : colors.border}`,
                      color: newPostVisibility === opt.value ? colors.text : colors.textMuted,
                    }}
                  >
                    <opt.icon size={12} strokeWidth={1} />
                    {opt.label}
                  </button>
                ))}
              </div>
              {newPostVisibility === 'ROLE_MIN_LEVEL' && (
                <div className="mt-3 flex gap-2">
                  {roleMinLevelOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setNewPostMinRoleLevel(opt.value)}
                      className="px-3 py-1.5 text-xs transition-all duration-300"
                      style={{ 
                        border: `1px solid ${newPostMinRoleLevel === opt.value ? colors.text : colors.border}`,
                        color: newPostMinRoleLevel === opt.value ? colors.text : colors.textMuted,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              
              {/* 自定义用户选择 */}
              {newPostVisibility === 'CUSTOM' && (
                <div className="mt-3">
                  <p 
                    className="text-xs mb-2"
                    style={{ color: colors.textMuted }}
                  >
                    选择可见用户（已选 {newPostCustomUserIds.length} 人）
                  </p>
                  <div 
                    className="max-h-48 overflow-y-auto p-3 space-y-1"
                    style={{ 
                      border: `1px solid ${colors.border}`,
                      background: 'rgba(255,255,255,0.02)'
                    }}
                  >
                    {allUsers.filter(u => u.id !== currentUserId).map(user => {
                      const isSelected = newPostCustomUserIds.includes(user.id)
                      return (
                        <button
                          key={user.id}
                          onClick={() => {
                            if (isSelected) {
                              setNewPostCustomUserIds(prev => prev.filter(id => id !== user.id))
                            } else {
                              setNewPostCustomUserIds(prev => [...prev, user.id])
                            }
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left transition-all duration-200"
                          style={{ 
                            background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                            border: `1px solid ${isSelected ? colors.text : 'transparent'}`,
                          }}
                        >
                          <div 
                            className="w-8 h-8 flex items-center justify-center text-xs font-light"
                            style={{ 
                              border: `1px solid ${colors.border}`,
                              color: colors.text
                            }}
                          >
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              user.name?.charAt(0) || '?'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p 
                              className="text-sm font-light truncate"
                              style={{ color: colors.text }}
                            >
                              {user.name}
                            </p>
                            {user.organization && (
                              <p 
                                className="text-xs truncate"
                                style={{ color: colors.textMuted }}
                              >
                                {user.organization}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <div 
                              className="w-5 h-5 flex items-center justify-center"
                              style={{ color: colors.text }}
                            >
                              ✓
                            </div>
                          )}
                        </button>
                      )
                    })}
                    {allUsers.filter(u => u.id !== currentUserId).length === 0 && (
                      <p 
                        className="text-xs text-center py-4"
                        style={{ color: colors.textMuted }}
                      >
                        暂无其他用户
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowPostForm(false)}
                className="px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300"
                style={{ 
                  border: `1px solid ${colors.border}`,
                  color: colors.textMuted,
                  letterSpacing: '0.1em'
                }}
              >
                取消
              </button>
                <button 
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || posting}
                className="px-6 py-2.5 text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
                style={{ 
                  background: colors.text,
                  color: colors.bg,
                  opacity: (!newPostContent.trim() || posting) ? 0.3 : 1,
                  letterSpacing: '0.15em'
                }}
                >
                  {posting ? (
                    <>
                    <Loader2 size={14} className="animate-spin" strokeWidth={1.5} />
                    发布中
                    </>
                  ) : (
                    <>
                    <Send size={14} strokeWidth={1.5} />
                      发布
                    </>
                  )}
                </button>
              </div>
            </div>
        </section>
      )}

      {/* 主内容区 */}
      <section className="px-8 pb-24 max-w-3xl mx-auto">
        {/* 动态流 */}
        <>
        {loading && posts.length === 0 ? (
          <div className="text-center py-20">
                <Loader2 
                  size={20} 
                  className="animate-spin mx-auto mb-4" 
                  strokeWidth={1}
                  style={{ color: colors.textMuted }} 
                />
                <p className="text-xs uppercase tracking-widest" style={{ color: colors.textMuted, letterSpacing: '0.15em' }}>
                  加载中
                </p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
                <AlertCircle size={24} className="mx-auto mb-4" strokeWidth={1} style={{ color: colors.textMuted }} />
                <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>{error}</p>
                <button onClick={() => fetchPosts(1)} className="text-xs uppercase tracking-widest" style={{ color: colors.text, letterSpacing: '0.1em' }}>
              重试
            </button>
          </div>
        ) : (
              <div ref={contentRef} className="space-y-0">
            {posts.map((post) => {
              const typeInfo = postTypeLabels[post.post_type] || postTypeLabels['GENERAL']
                  const isExpanded = expandedPostId === post.id
              
              return (
                <div 
                  key={post.id}
                      className="py-8"
                      style={{ borderBottom: `1px solid ${colors.border}` }}
                >
                  {/* 作者信息 */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                      <div 
                            className="w-10 h-10 flex items-center justify-center text-xs font-light tracking-wider"
                        style={{ 
                              border: `1px solid ${colors.border}`,
                              color: colors.text,
                            }}
                          >
                            {post.author_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                            <p className="text-sm font-light tracking-wide" style={{ color: colors.text }}>
                          {post.author_name}
                        </p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs" style={{ color: colors.textMuted }}>
                                {formatTime(post.created_at)}
                              </span>
                          <span 
                                className="text-xs uppercase tracking-widest"
                                style={{ color: typeInfo.color, letterSpacing: '0.1em' }}
                          >
                            {typeInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* 更多操作菜单 */}
                    <div className="relative">
                    <button 
                        onClick={() => setPostMenuOpenId(postMenuOpenId === post.id ? null : post.id)}
                        className="p-2 transition-opacity duration-300 hover:opacity-50"
                        style={{ color: colors.textMuted }}
                    >
                        <MoreHorizontal size={16} strokeWidth={1} />
                    </button>
                      
                      {/* 下拉菜单 */}
                      {postMenuOpenId === post.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 py-1 min-w-[120px] z-10"
                          style={{ 
                            background: colors.bgCard,
                            border: `1px solid ${colors.border}`
                          }}
                        >
                          {/* 只有作者本人可以删除 */}
                          {post.author_user_id === currentUserId && (
                            <button
                              onClick={() => {
                                setDeletingPostId(post.id)
                                setShowDeleteConfirm(true)
                                setPostMenuOpenId(null)
                              }}
                              className="w-full px-4 py-2 text-left text-xs flex items-center gap-2 transition-colors duration-200 hover:bg-white/5"
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={14} strokeWidth={1} />
                              删除帖子
                            </button>
                          )}
                          {post.author_user_id !== currentUserId && (
                            <div 
                              className="px-4 py-2 text-xs"
                              style={{ color: colors.textMuted }}
                            >
                              暂无操作
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 内容 */}
                  <p 
                        className="mb-5 whitespace-pre-wrap text-sm font-light leading-relaxed"
                    style={{ color: colors.text }}
                  >
                    {post.content}
                  </p>

                      {/* 附件 */}
                      {post.attachments && post.attachments.length > 0 && (
                        <div className="mb-5 space-y-2">
                          {post.attachments.map((file, index) => {
                            const FileIcon = getFileIcon(file.type, file.name)
                            const isImage = file.type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.name?.split('.').pop()?.toLowerCase() || '')
                            // 拼接完整的后端 URL
                            const fileUrl = file.url.startsWith('http') ? file.url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${file.url}`
                            
                            return (
                              <div key={index}>
                                {isImage ? (
                                  // 图片预览
                                  <a 
                                    href={fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img 
                                      src={fileUrl} 
                                      alt={file.name}
                                      className="max-w-full max-h-64 object-contain"
                                      style={{ border: `1px solid ${colors.border}` }}
                                    />
                                  </a>
                                ) : (
                                  // 文件链接
                                  <a 
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:bg-white/5"
                                    style={{ border: `1px solid ${colors.border}` }}
                                  >
                                    <FileIcon size={16} strokeWidth={1} style={{ color: colors.textSecondary }} />
                                    <span className="flex-1 text-xs truncate" style={{ color: colors.text }}>
                                      {file.name}
                                    </span>
                                    {file.size && (
                                      <span className="text-xs" style={{ color: colors.textMuted }}>
                                        {formatFileSize(file.size)}
                                      </span>
                                    )}
                                    <Download size={12} strokeWidth={1} style={{ color: colors.textMuted }} />
                                  </a>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* 关联项目 */}
                      {post.related_project_id && post.related_project_name && (
                        <Link 
                          href={`/projects/${post.related_project_id}`}
                          className="mb-5 px-4 py-3 flex items-center gap-3 transition-all duration-300 hover:bg-white/5"
                          style={{ border: `1px solid ${colors.border}` }}
                        >
                          <Folder size={14} strokeWidth={1} style={{ color: '#4ade80' }} />
                          <span className="text-xs" style={{ color: colors.textSecondary }}>
                            {post.related_project_name}
                          </span>
                          <ChevronRight size={12} strokeWidth={1} style={{ color: colors.textMuted, marginLeft: 'auto' }} />
                        </Link>
                      )}

                      {/* 关联资源 */}
                      {post.related_resource_id && post.related_resource_name && (
                        <Link 
                          href={`/resources/${post.related_resource_id}`}
                          className="mb-5 px-4 py-3 flex items-center gap-3 transition-all duration-300 hover:bg-white/5"
                          style={{ border: `1px solid ${colors.border}` }}
                        >
                          <Link2 size={14} strokeWidth={1} style={{ color: '#3b82f6' }} />
                          <span className="text-xs" style={{ color: colors.textSecondary }}>
                            {post.related_resource_name}
                          </span>
                          <ChevronRight size={12} strokeWidth={1} style={{ color: colors.textMuted, marginLeft: 'auto' }} />
                        </Link>
                      )}

                      {/* 操作栏 */}
                      <div className="flex items-center gap-6">
                    <button 
                      onClick={() => handleLike(post.id)}
                          className="flex items-center gap-2 text-xs transition-all duration-300"
                          style={{ color: post.user_liked ? colors.like : colors.textMuted }}
                    >
                      <Heart 
                            size={16} 
                            strokeWidth={1}
                        className={post.user_liked ? 'fill-current' : ''} 
                      />
                      <span>{post.like_count}</span>
                    </button>
                    <button 
                      onClick={() => handleLoadComments(post.id)}
                          className="flex items-center gap-2 text-xs transition-all duration-300"
                          style={{ color: isExpanded ? colors.text : colors.textMuted }}
                    >
                          <MessageCircle size={16} strokeWidth={1} />
                      <span>{post.comment_count}</span>
                      <ChevronDown 
                            size={12} 
                            strokeWidth={1}
                        className="transition-transform duration-300"
                        style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
                      />
                    </button>
                  </div>

                  {/* 评论区 */}
                  {isExpanded && (
                        <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${colors.border}` }}>
                      {loadingComments ? (
                            <div className="text-center py-6">
                              <Loader2 size={16} className="animate-spin mx-auto" strokeWidth={1} style={{ color: colors.textMuted }} />
                        </div>
                      ) : (
                        <>
                          {/* 评论列表 */}
                          {comments.length > 0 && (
                                <div className="space-y-5 mb-6">
                              {comments.map((comment) => (
                                <div key={comment.id} className="flex items-start gap-3">
                                  <div 
                                        className="w-7 h-7 flex items-center justify-center text-xs font-light shrink-0"
                                    style={{ 
                                          border: `1px solid ${colors.border}`,
                                          color: colors.textSecondary,
                                        }}
                                      >
                                        {comment.user_name?.charAt(0) || 'U'}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-light" style={{ color: colors.text }}>
                                        {comment.user_name}
                                      </span>
                                          <span className="text-xs" style={{ color: colors.textMuted }}>
                                        {formatTime(comment.created_at)}
                                      </span>
                                    </div>
                                        <p className="text-sm font-light" style={{ color: colors.textSecondary }}>
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 发表评论 */}
                          <div className="flex items-center gap-3">
                            <div 
                                  className="w-7 h-7 flex items-center justify-center text-xs font-light shrink-0"
                                  style={{ 
                                    border: `1px solid ${colors.border}`,
                                    color: colors.textSecondary,
                                  }}
                            >
                              {user?.name?.charAt(0) || 'U'}
                            </div>
                                <div className="flex-1 flex items-center gap-3">
                              <input
                                type="text"
                                    placeholder="写下评论..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                                    className="flex-1 py-2 text-sm font-light focus:outline-none"
                                    style={{ 
                                      background: 'transparent',
                                      borderBottom: `1px solid ${colors.border}`,
                                      color: colors.text
                                    }}
                              />
                              <button
                                onClick={handleSubmitComment}
                                disabled={!newComment.trim() || submittingComment}
                                    className="p-2 transition-all duration-300"
                                    style={{ 
                                      color: newComment.trim() ? colors.text : colors.textMuted,
                                      opacity: (!newComment.trim() || submittingComment) ? 0.5 : 1
                                    }}
                              >
                                {submittingComment ? (
                                      <Loader2 size={14} className="animate-spin" strokeWidth={1} />
                                ) : (
                                      <Send size={14} strokeWidth={1} />
                                )}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {posts.length === 0 && !loading && (
                  <div className="text-center py-20">
                    <Users size={24} className="mx-auto mb-4 opacity-30" strokeWidth={1} style={{ color: colors.textMuted }} />
                    <p className="text-xs uppercase tracking-widest" style={{ color: colors.textMuted, letterSpacing: '0.15em' }}>
                      暂无动态
                    </p>
              </div>
            )}

            {/* 加载更多 */}
            {hasMore && posts.length > 0 && (
                  <div className="text-center pt-8">
                <button
                      onClick={() => { setPage(p => p + 1); fetchPosts(page + 1, true); }}
                  disabled={loading}
                      className="px-6 py-3 text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2 mx-auto"
                      style={{ 
                        border: `1px solid ${colors.border}`,
                        color: colors.textSecondary,
                        letterSpacing: '0.1em'
                      }}
                >
                  {loading ? (
                    <>
                          <Loader2 size={14} className="animate-spin" strokeWidth={1} />
                          加载中
                    </>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
        </>
      </section>

      {/* 快捷入口 */}
      <div 
        className="fixed bottom-8 right-8 flex flex-col gap-3"
        style={{ zIndex: 50 }}
      >
        <Link
          href="/messages"
          className="w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-105"
          style={{ 
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
          }}
          title="私信"
        >
          <MessageSquare size={18} strokeWidth={1} style={{ color: colors.textSecondary }} />
        </Link>
        <Link
          href="/feedback"
          className="w-12 h-12 flex items-center justify-center transition-all duration-300 hover:scale-105"
          style={{ 
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
          }}
          title="意见反馈"
        >
          <Mail size={18} strokeWidth={1} style={{ color: colors.textSecondary }} />
        </Link>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => {
            setShowDeleteConfirm(false)
            setDeletingPostId(null)
          }}
        >
          <div 
            className="p-8 max-w-md w-full"
            style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.border}` 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-lg font-light"
                style={{ color: colors.text }}
              >
                确认删除
              </h2>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletingPostId(null)
                }}
                className="p-1 transition-opacity duration-300 hover:opacity-50"
                style={{ color: colors.textMuted }}
              >
                <X size={18} strokeWidth={1} />
              </button>
            </div>
            
            <p 
              className="text-sm font-light mb-8"
        style={{ color: colors.textSecondary }}
      >
              确定要删除这条帖子吗？此操作不可撤销。
            </p>
            
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletingPostId(null)
                }}
                className="px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300"
                style={{ 
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                  letterSpacing: '0.1em'
                }}
              >
                取消
              </button>
              <button
                onClick={handleDeletePost}
                className="px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300"
                style={{ 
                  background: '#ef4444',
                  color: '#fff',
                  letterSpacing: '0.1em'
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 点击其他地方关闭菜单 */}
      {postMenuOpenId && (
        <div 
          className="fixed inset-0 z-0"
          onClick={() => setPostMenuOpenId(null)}
        />
      )}
    </div>
  )
}
