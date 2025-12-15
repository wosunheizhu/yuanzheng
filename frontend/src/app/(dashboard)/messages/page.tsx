'use client'

/**
 * 元征 · 合伙人赋能平台 - 私信页面
 * 高端简约现代艺术画廊风格
 * 支持附件、引用项目/资源
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { 
  Send,
  Search,
  Loader2,
  ArrowLeft,
  Plus,
  X,
  MessageSquare,
  Paperclip,
  Folder,
  Link2,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  ExternalLink
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { dmService, userService, User, projectService, Project, resourceService, Resource, DMMessage, DMAttachment, DMReference } from '@/lib/services'
import apiClient from '@/lib/api'
import Link from 'next/link'

// 颜色常量 - 高端简约艺术画廊风格
const colors = {
  bg: '#000000',
  bgElevated: '#0a0a0a',
  bgCard: '#111111',
  bgHover: 'rgba(255, 255, 255, 0.03)',
  bgActive: 'rgba(255, 255, 255, 0.05)',
  text: '#faf9f6',
  textSecondary: '#888888',
  textMuted: '#555555',
  border: '#222222',
  borderLight: '#333333',
  accent: '#faf9f6',
  online: '#22c55e',
  myBubble: '#2a2a2a',
  myBubbleText: '#faf9f6',
  theirBubble: 'rgba(255, 255, 255, 0.05)',
  theirBubbleBorder: 'rgba(255, 255, 255, 0.1)'
}

// 会话线程接口
interface DMThread {
  id: number
  other_user_id: number
  other_user_name: string
  other_user_avatar?: string
  last_message?: string
  last_message_time?: string
  unread_count: number
  is_online?: boolean
  role_level?: number
}

// 本地附件类型别名（与 services.ts 中的 DMAttachment 一致）
type MessageAttachment = DMAttachment

// 本地引用类型别名（与 services.ts 中的 DMReference 一致）
type MessageReference = DMReference

// 获取角色标签
function getRoleLabel(level?: number): string {
  switch (level) {
    case 3: return '联创'
    case 2: return '核心'
    case 1: return '普通'
    default: return ''
  }
}

// 获取用户首字母
function getInitials(name: string): string {
  const chars = name.split('')
  return chars.length > 0 ? chars[0].toUpperCase() : '?'
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
}

// 获取文件图标
function getFileIcon(type: string, name: string) {
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return ImageIcon
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i.test(name)) return FileText
  return File
}

export default function MessagesPage() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  
  const [threads, setThreads] = useState<DMThread[]>([])
  const [selectedThread, setSelectedThread] = useState<DMThread | null>(null)
  const [messages, setMessages] = useState<DMMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  
  // 新建会话
  const [showNewChat, setShowNewChat] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])
  
  // 附件
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 引用项目/资源
  const [showReferenceMenu, setShowReferenceMenu] = useState(false)
  const [referenceType, setReferenceType] = useState<'project' | 'resource' | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [selectedReference, setSelectedReference] = useState<MessageReference | null>(null)
  
  const heroRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // URL 参数处理
  useEffect(() => {
    const userId = searchParams.get('user')
    if (userId) {
      loadOrCreateThread(parseInt(userId))
    }
  }, [searchParams])

  // 加载会话列表、用户列表、项目、资源
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [threadsRes, usersRes, projectsRes, resourcesRes] = await Promise.all([
          dmService.listThreads(),
          userService.list({ limit: 100 }),
          projectService.list({ page_size: 100 }),
          resourceService.list({ page_size: 100 })
        ])
        setThreads(threadsRes.items || [])
        setAllUsers(Array.isArray(usersRes) ? usersRes : usersRes.items || [])
        setProjects(projectsRes.items || [])
        setResources(resourcesRes.items || [])
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('加载失败，请刷新页面')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // 加载消息
  useEffect(() => {
    if (!selectedThread) return
    
    const fetchMessages = async () => {
      try {
        setMessagesLoading(true)
        const data = await dmService.getMessages(selectedThread.other_user_id)
        // 按时间从早到晚排序
        const sortedMessages = (data || []).sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setMessages(sortedMessages)
        // 标记为已读
        await dmService.markAsRead(selectedThread.other_user_id)
        // 更新未读数
        setThreads(prev => prev.map(t => 
          t.id === selectedThread.id ? { ...t, unread_count: 0 } : t
        ))
      } catch (error) {
        console.error('Error fetching messages:', error)
      } finally {
        setMessagesLoading(false)
      }
    }
    
    fetchMessages()
    
    // 重置附件和引用
    setAttachments([])
    setSelectedReference(null)
    
    // 自动聚焦输入框
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [selectedThread])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 初始化动画状态 - 立即设置透明度为0
  useEffect(() => {
    if (heroRef.current) {
      gsap.set(heroRef.current.children, { opacity: 0, y: 20 })
    }
    if (contentRef.current) {
      gsap.set(contentRef.current, { opacity: 0, y: 20 })
    }
  }, [])

  // 入场动画 - 数据加载完成后执行
  useEffect(() => {
    if (loading) return
    
    const tl = gsap.timeline()
    
    if (heroRef.current) {
      tl.to(
        heroRef.current.children,
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
      )
    }
    
    if (contentRef.current) {
      tl.to(
        contentRef.current,
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
        '-=0.4'
      )
    }
  }, [loading])

  // 文件上传
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setUploadingFiles(true)
    
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }
      
      const response = await apiClient.post('/uploads/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      // 后端返回 { uploaded: [...], errors: [...] }
      const uploadedFiles = response.data.uploaded || []
      const newAttachments: MessageAttachment[] = uploadedFiles.map((f: any) => ({
        name: f.name,
        url: f.url,
        type: f.type,
        size: f.size
      }))
      
      setAttachments(prev => [...prev, ...newAttachments])
      toast.success(`已上传 ${uploadedFiles.length} 个文件`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('文件上传失败')
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 发送消息
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if ((!newMessage.trim() && attachments.length === 0 && !selectedReference) || !selectedThread || sending) return
    
    const content = newMessage.trim()
        setNewMessage('')
    
    // 乐观更新
    const optimisticMessage: DMMessage = {
      id: Date.now(),
          sender_id: user?.id || 1,
          receiver_id: selectedThread.other_user_id,
      content: content,
          is_read: false,
          created_at: new Date().toISOString(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      reference: selectedReference || undefined
    }
    setMessages(prev => [...prev, optimisticMessage])
    
    // 清除附件和引用
    const sentAttachments = [...attachments]
    const sentReference = selectedReference
    setAttachments([])
    setSelectedReference(null)
    
    try {
      setSending(true)
      // 构建发送数据
      const messageData: {
        content?: string
        attachments?: DMAttachment[]
        reference?: DMReference
      } = {}
      
      if (content) messageData.content = content
      if (sentAttachments.length > 0) messageData.attachments = sentAttachments
      if (sentReference) messageData.reference = sentReference
      
      const message = await dmService.sendMessage(selectedThread.other_user_id, messageData)
      // 替换乐观消息为服务器返回的真实消息
      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? message : m
      ))
      // 更新会话列表
      setThreads(prev => prev.map(t => 
        t.id === selectedThread.id 
          ? { ...t, last_message: content || '发送了附件', last_message_time: new Date().toISOString() }
          : t
      ))
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('发送失败，请重试')
      // 回滚乐观更新
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      setNewMessage(content)
      setAttachments(sentAttachments)
      setSelectedReference(sentReference)
    } finally {
      setSending(false)
    }
  }

  // 搜索过滤用户
  const filteredUsers = allUsers.filter(u => {
    if (u.id === user?.id) return false
    if (!userSearch.trim()) return true
    return u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
           u.organization?.toLowerCase().includes(userSearch.toLowerCase())
  })

  // 创建新会话
  async function loadOrCreateThread(userId: number) {
    const existing = threads.find(t => t.other_user_id === userId)
    if (existing) {
      setSelectedThread(existing)
      setShowNewChat(false)
      return
    }
    
    try {
      const userData = await userService.get(userId)
        const newThread: DMThread = {
          id: Date.now(),
          other_user_id: userId,
          other_user_name: userData.name,
          other_user_avatar: userData.avatar_url,
          unread_count: 0,
        role_level: userData.highest_role_level
        }
        setThreads([newThread, ...threads])
        setSelectedThread(newThread)
    } catch (error) {
      console.error('Error creating thread:', error)
      toast.error('无法创建会话')
    }
    
    setShowNewChat(false)
    setUserSearch('')
  }

  // 格式化时间
  function formatTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 86400000) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
    if (diff < 604800000) {
      return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
    }
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  // 格式化消息时间戳
  function formatMessageTime(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  // 判断是否需要显示日期分隔符
  function shouldShowDateSeparator(current: string, previous?: string): boolean {
    if (!previous) return true
    const currentDate = new Date(current).toDateString()
    const previousDate = new Date(previous).toDateString()
    return currentDate !== previousDate
  }

  // 格式化日期分隔符
  function formatDateSeparator(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    
    if (date.toDateString() === now.toDateString()) return '今天'
    
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return '昨天'
    
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
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
          私密 · 高效 · 连接
        </p>

        <h1 
          className="text-4xl md:text-5xl mb-6 font-light tracking-wide"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
          }}
        >
          私信
        </h1>

        <p 
          className="text-sm max-w-md font-light"
          style={{ color: colors.textSecondary }}
        >
          与合伙人直接对话，建立深度连接
        </p>
      </section>

      {/* 主内容区 */}
      <section 
        ref={contentRef} 
        className="px-8 pb-24 max-w-5xl mx-auto"
      >
        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-0"
          style={{ 
            border: `1px solid ${colors.border}`,
            minHeight: '70vh'
          }}
        >
        {/* 会话列表 */}
        <div 
            className={`md:col-span-1 flex flex-col ${selectedThread ? 'hidden md:flex' : 'flex'}`}
            style={{ 
              borderRight: `1px solid ${colors.border}`,
              background: colors.bgElevated
            }}
          >
            {/* 标题栏 */}
            <div 
              className="px-6 py-5 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <p 
                className="text-xs uppercase tracking-widest"
                style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
              >
                会话
              </p>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
                className="w-8 h-8 flex items-center justify-center transition-all duration-300"
                style={{ 
                  border: `1px solid ${colors.border}`,
                  background: showNewChat ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = colors.borderLight}
                onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
              >
                {showNewChat ? (
                  <X size={12} strokeWidth={1} style={{ color: colors.textSecondary }} />
                ) : (
                  <Plus size={12} strokeWidth={1} style={{ color: colors.textSecondary }} />
                )}
            </button>
          </div>
          
          {/* 新建会话搜索 */}
          {showNewChat && (
            <div 
                className="px-6 py-4"
                style={{ borderBottom: `1px solid ${colors.border}` }}
            >
                <div className="relative mb-4">
                <Search 
                  className="absolute left-0 top-1/2 -translate-y-1/2" 
                    size={12} 
                  strokeWidth={1}
                    style={{ color: colors.textMuted }} 
                />
                <input
                  type="text"
                    placeholder="搜索合伙人..."
                  value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-5 py-2 text-xs font-light focus:outline-none"
                  style={{ 
                    background: 'transparent',
                      borderBottom: `1px solid ${colors.border}`,
                      color: colors.text
                  }}
                    autoFocus
                />
              </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredUsers.slice(0, 10).map(u => (
                    <button
                      key={u.id}
                      onClick={() => loadOrCreateThread(u.id)}
                      className="w-full px-3 py-3 text-left flex items-center gap-3 transition-all duration-300"
                      style={{ borderBottom: `1px solid ${colors.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = colors.bgHover}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div 
                        className="w-8 h-8 flex items-center justify-center text-[10px] font-light"
                        style={{ 
                          border: `1px solid ${colors.border}`,
                          color: colors.textSecondary
                        }}
                      >
                        {getInitials(u.name || '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-light" style={{ color: colors.text }}>
                          {u.name}
                        </p>
                      {u.organization && (
                          <p className="text-[10px] font-light truncate" style={{ color: colors.textMuted }}>
                          {u.organization}
                        </p>
                      )}
                      </div>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="text-[10px] font-light text-center py-4" style={{ color: colors.textMuted }}>
                      未找到匹配的用户
                    </p>
              )}
                </div>
            </div>
          )}
          
          {/* 会话列表 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 
                      size={16} 
                      className="animate-spin" 
                      strokeWidth={1} 
                      style={{ color: colors.textMuted }} 
                    />
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: colors.textMuted }}>
                      加载中
                    </p>
                  </div>
              </div>
            ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6">
                  <div 
                    className="w-12 h-12 mb-4 flex items-center justify-center"
                    style={{ border: `1px solid ${colors.border}` }}
                  >
                    <MessageSquare size={16} strokeWidth={0.5} style={{ color: colors.textMuted }} />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: colors.textMuted }}>
                  暂无会话
                </p>
                  <p className="text-[10px] font-light text-center" style={{ color: colors.textMuted }}>
                    点击右上角开始新对话
                </p>
              </div>
            ) : (
              threads.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                    className="w-full px-6 py-4 text-left transition-all duration-300 group"
                  style={{
                      background: selectedThread?.id === thread.id ? colors.bgActive : 'transparent',
                      borderBottom: `1px solid ${colors.border}`
                  }}
                  onMouseEnter={(e) => {
                    if (selectedThread?.id !== thread.id) {
                        e.currentTarget.style.background = colors.bgHover
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedThread?.id !== thread.id) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                    <div className="flex items-center gap-4">
                      {/* 头像 */}
                      <div className="relative">
                        <div 
                          className="w-12 h-12 flex items-center justify-center text-sm font-light"
                          style={{ 
                            border: `1px solid ${colors.border}`,
                            color: colors.textSecondary,
                            background: colors.bgCard
                          }}
                        >
                          {getInitials(thread.other_user_name)}
                        </div>
                        {thread.is_online && (
                          <div 
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                            style={{ 
                              background: colors.online,
                              border: `2px solid ${colors.bgElevated}`
                            }}
                          />
                        )}
                      </div>
                      
                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-light truncate" style={{ color: colors.text }}>
                      {thread.other_user_name}
                    </p>
                            {thread.role_level && (
                              <span 
                                className="text-[8px] uppercase tracking-wider px-1 py-0.5"
                                style={{ 
                                  color: colors.textMuted,
                                  border: `1px solid ${colors.border}`
                                }}
                              >
                                {getRoleLabel(thread.role_level)}
                              </span>
                            )}
                          </div>
                    {thread.last_message_time && (
                            <p className="text-[10px] font-light" style={{ color: colors.textMuted }}>
                        {formatTime(thread.last_message_time)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                          <p 
                            className="text-xs font-light truncate pr-2"
                            style={{ color: colors.textMuted }}
                          >
                      {thread.last_message || '开始对话'}
                    </p>
                    {thread.unread_count > 0 && (
                      <span 
                              className="flex-shrink-0 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-medium px-1"
                              style={{ background: colors.accent, color: colors.bg }}
                      >
                        {thread.unread_count}
                      </span>
                    )}
                        </div>
                      </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 消息区域 */}
          <div 
            className={`md:col-span-2 flex flex-col ${!selectedThread ? 'hidden md:flex' : 'flex'}`}
            style={{ background: colors.bg }}
          >
          {selectedThread ? (
            <>
              {/* 对话头部 */}
              <div 
                  className="px-6 py-4 flex items-center justify-between"
                  style={{ 
                    borderBottom: `1px solid ${colors.border}`,
                    background: colors.bgElevated
                  }}
                >
                  <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedThread(null)}
                      className="md:hidden p-2 -ml-2 transition-opacity duration-300 hover:opacity-50"
                      style={{ color: colors.textSecondary }}
                >
                  <ArrowLeft size={16} strokeWidth={1} />
                </button>
                    
                    {/* 头像 */}
                    <div className="relative">
                      <div 
                        className="w-11 h-11 flex items-center justify-center text-sm font-light"
                        style={{ 
                          border: `1px solid ${colors.border}`,
                          color: colors.textSecondary,
                          background: colors.bgCard
                        }}
                      >
                        {getInitials(selectedThread.other_user_name)}
                      </div>
                      {selectedThread.is_online && (
                        <div 
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                          style={{ 
                            background: colors.online,
                            border: `2px solid ${colors.bgElevated}`
                          }}
                        />
                      )}
                    </div>
                    
                <div>
                      <div className="flex items-center gap-2">
                  <p 
                    className="text-sm font-light tracking-wide"
                          style={{ color: colors.text }}
                  >
                    {selectedThread.other_user_name}
                  </p>
                        {selectedThread.role_level && (
                          <span 
                            className="text-[8px] uppercase tracking-wider px-1 py-0.5"
                            style={{ 
                              color: colors.textMuted,
                              border: `1px solid ${colors.border}`
                            }}
                          >
                            {getRoleLabel(selectedThread.role_level)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-light mt-0.5" style={{ color: colors.textMuted }}>
                        {selectedThread.is_online ? '在线' : '离线'}
                      </p>
                    </div>
                </div>
              </div>
              
              {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto px-8 py-8" style={{ maxHeight: '55vh' }}>
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-20">
                      <Loader2 
                        size={16} 
                        className="animate-spin" 
                        strokeWidth={1} 
                        style={{ color: colors.textMuted }} 
                      />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <p className="text-[10px] font-light" style={{ color: colors.textMuted }}>
                        发送消息开始对话
                      </p>
                  </div>
                ) : (
                    <div className="space-y-4">
                      {messages.map((msg, index) => {
                    const isMe = msg.sender_id === user?.id
                        const showDateSeparator = shouldShowDateSeparator(
                          msg.created_at, 
                          messages[index - 1]?.created_at
                        )
                        
                    return (
                          <div key={msg.id}>
                            {/* 日期分隔符 */}
                            {showDateSeparator && (
                              <div className="flex items-center justify-center py-4">
                                <span 
                                  className="text-[9px] uppercase tracking-widest px-3 py-1"
                                  style={{ 
                                    color: colors.textMuted,
                                    background: colors.bgCard,
                                    border: `1px solid ${colors.border}`
                                  }}
                                >
                                  {formatDateSeparator(msg.created_at)}
                                </span>
                              </div>
                            )}
                            
                            {/* 消息 */}
                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`flex items-start gap-3 max-w-[75%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                {/* 头像 - 始终显示 */}
                                <div 
                                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-sm font-light"
                                  style={{ 
                                    border: `1px solid ${colors.border}`,
                                    color: colors.textMuted,
                                    background: colors.bgCard
                                  }}
                                >
                                  {isMe ? getInitials(user?.name || '我') : getInitials(selectedThread.other_user_name)}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  {/* 引用的项目/资源 */}
                                  {msg.reference && (
                                    <Link
                                      href={msg.reference.type === 'project' ? `/projects/${msg.reference.id}` : `/resources/${msg.reference.id}`}
                                      className="flex items-center gap-2 px-3 py-2 mb-2 text-[10px] transition-all duration-300 hover:opacity-80"
                                      style={{ 
                                        background: 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${colors.border}` 
                                      }}
                                    >
                                      {msg.reference.type === 'project' ? (
                                        <Folder size={12} strokeWidth={1} style={{ color: colors.textSecondary }} />
                                      ) : (
                                        <Link2 size={12} strokeWidth={1} style={{ color: colors.textSecondary }} />
                                      )}
                                      <span style={{ color: colors.textSecondary }}>
                                        {msg.reference.type === 'project' ? '项目' : '资源'}：
                                      </span>
                                      <span style={{ color: colors.text }}>{msg.reference.name}</span>
                                      <ExternalLink size={10} strokeWidth={1} style={{ color: colors.textMuted }} />
                                    </Link>
                                  )}
                                  
                                  {/* 消息内容 */}
                                  {msg.content && (
                                    <div
                                      className="px-5 py-3 text-sm font-light leading-relaxed"
                            style={{
                                        background: isMe ? colors.myBubble : colors.theirBubble,
                                        color: isMe ? colors.myBubbleText : colors.text,
                                        border: isMe ? 'none' : `1px solid ${colors.theirBubbleBorder}`
                                      }}
                                    >
                                      {msg.content.replace(/^\[引用(项目|资源)：[^\]]+\]\s*/, '')}
                          </div>
                                  )}
                                  
                                  {/* 附件 */}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {msg.attachments.map((file, idx) => {
                                        const FileIcon = getFileIcon(file.type, file.name)
                                        const isImage = file.type.startsWith('image/')
                                        const fileUrl = file.url.startsWith('http') ? file.url : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${file.url}`
                                        
                                        return isImage ? (
                                          <a
                                            key={idx}
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                          >
                                            <img 
                                              src={fileUrl} 
                                              alt={file.name}
                                              className="max-w-full max-h-48 object-contain"
                                              style={{ border: `1px solid ${colors.border}` }}
                                            />
                                          </a>
                                        ) : (
                                          <a
                                            key={idx}
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 text-[10px] transition-all duration-300 hover:bg-white/5"
                                            style={{ border: `1px solid ${colors.border}` }}
                                          >
                                            <FileIcon size={14} strokeWidth={1} style={{ color: colors.textSecondary }} />
                                            <span className="flex-1 truncate" style={{ color: colors.text }}>{file.name}</span>
                                            {file.size && (
                                              <span style={{ color: colors.textMuted }}>{formatFileSize(file.size)}</span>
                                            )}
                                            <Download size={12} strokeWidth={1} style={{ color: colors.textMuted }} />
                                          </a>
                                        )
                                      })}
                                    </div>
                                  )}
                                  
                                  {/* 时间戳 */}
                                  <p 
                                    className={`text-[9px] mt-1 font-light ${isMe ? 'text-right' : ''}`}
                                    style={{ color: colors.textMuted }}
                                  >
                                    {formatMessageTime(msg.created_at)}
                                    {isMe && msg.is_read && (
                                      <span className="ml-1">· 已读</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                        </div>
                      </div>
                    )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                
                {/* 输入区域 */}
                <div 
                  className="px-6 py-4"
                  style={{ 
                    borderTop: `1px solid ${colors.border}`,
                    background: colors.bgElevated
                  }}
                >
                  {/* 已选引用 */}
                  {selectedReference && (
                    <div 
                      className="flex items-center justify-between px-3 py-2 mb-3"
                      style={{ 
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}` 
                      }}
                    >
                      <div className="flex items-center gap-2 text-[10px]">
                        {selectedReference.type === 'project' ? (
                          <Folder size={12} strokeWidth={1} style={{ color: colors.textSecondary }} />
                        ) : (
                          <Link2 size={12} strokeWidth={1} style={{ color: colors.textSecondary }} />
                        )}
                        <span style={{ color: colors.textSecondary }}>
                          引用{selectedReference.type === 'project' ? '项目' : '资源'}：
                        </span>
                        <span style={{ color: colors.text }}>{selectedReference.name}</span>
                      </div>
                      <button
                        onClick={() => setSelectedReference(null)}
                        className="p-1 transition-opacity duration-300 hover:opacity-50"
                      >
                        <X size={12} strokeWidth={1} style={{ color: colors.textMuted }} />
                      </button>
                    </div>
                  )}
                  
                  {/* 已上传附件 */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {attachments.map((file, idx) => {
                        const FileIcon = getFileIcon(file.type, file.name)
                        return (
                          <div 
                            key={idx}
                            className="flex items-center gap-2 px-2 py-1"
                            style={{ 
                              background: 'rgba(255,255,255,0.03)',
                              border: `1px solid ${colors.border}` 
                            }}
                          >
                            <FileIcon size={12} strokeWidth={1} style={{ color: colors.textSecondary }} />
                            <span className="text-[10px] max-w-[100px] truncate" style={{ color: colors.text }}>
                              {file.name}
                            </span>
                            <button
                              onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                              className="p-0.5 transition-opacity duration-300 hover:opacity-50"
                            >
                              <X size={10} strokeWidth={1} style={{ color: colors.textMuted }} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    {/* 附件按钮 */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles}
                      className="w-10 h-10 flex items-center justify-center transition-all duration-300"
                      style={{ border: `1px solid ${colors.border}` }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = colors.borderLight}
                      onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
                    >
                      {uploadingFiles ? (
                        <Loader2 size={14} className="animate-spin" strokeWidth={1} style={{ color: colors.textMuted }} />
                      ) : (
                        <Paperclip size={14} strokeWidth={1} style={{ color: colors.textSecondary }} />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                    />
                    
                    {/* 引用按钮 */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowReferenceMenu(!showReferenceMenu)}
                        className="w-10 h-10 flex items-center justify-center transition-all duration-300"
                        style={{ 
                          border: `1px solid ${colors.border}`,
                          background: showReferenceMenu ? 'rgba(255,255,255,0.05)' : 'transparent'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = colors.borderLight}
                        onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
                      >
                        <Link2 size={14} strokeWidth={1} style={{ color: colors.textSecondary }} />
                      </button>
                      
                      {/* 引用菜单 */}
                      {showReferenceMenu && (
                        <div 
                          className="absolute bottom-full left-0 mb-2 w-48"
                          style={{ 
                            background: colors.bgCard,
                            border: `1px solid ${colors.border}`,
                            zIndex: 50
                          }}
                        >
                          {!referenceType ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setReferenceType('project')}
                                className="w-full px-4 py-3 text-left text-xs flex items-center gap-2 transition-all duration-300 hover:bg-white/5"
                                style={{ borderBottom: `1px solid ${colors.border}` }}
                              >
                                <Folder size={14} strokeWidth={1} style={{ color: colors.textSecondary }} />
                                <span style={{ color: colors.text }}>引用项目</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setReferenceType('resource')}
                                className="w-full px-4 py-3 text-left text-xs flex items-center gap-2 transition-all duration-300 hover:bg-white/5"
                              >
                                <Link2 size={14} strokeWidth={1} style={{ color: colors.textSecondary }} />
                                <span style={{ color: colors.text }}>引用资源</span>
                              </button>
                            </>
                          ) : (
                            <div className="max-h-[200px] overflow-y-auto">
                              <div 
                                className="px-3 py-2 flex items-center justify-between"
                                style={{ borderBottom: `1px solid ${colors.border}` }}
                              >
                                <span className="text-[10px]" style={{ color: colors.textMuted }}>
                                  选择{referenceType === 'project' ? '项目' : '资源'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setReferenceType(null)}
                                  className="text-[10px] transition-opacity hover:opacity-50"
                                  style={{ color: colors.textSecondary }}
                                >
                                  返回
                                </button>
                              </div>
                              {(referenceType === 'project' ? projects : resources).map(item => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedReference({
                                      type: referenceType,
                                      id: item.id,
                                      name: referenceType === 'project' ? (item as Project).name : (item as Resource).org_name
                                    })
                                    setShowReferenceMenu(false)
                                    setReferenceType(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-[11px] transition-all duration-300 hover:bg-white/5 truncate"
                                  style={{ 
                                    color: colors.text,
                                    borderBottom: `1px solid ${colors.border}` 
                                  }}
                                >
                                  {referenceType === 'project' ? (item as Project).name : (item as Resource).org_name}
                                </button>
                              ))}
                              {(referenceType === 'project' ? projects : resources).length === 0 && (
                                <p className="px-4 py-3 text-[10px] text-center" style={{ color: colors.textMuted }}>
                                  暂无{referenceType === 'project' ? '项目' : '资源'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
              </div>
              
              {/* 输入框 */}
                    <div className="flex-1 relative">
                  <input
                        ref={inputRef}
                    type="text"
                        placeholder="输入消息..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                        className="w-full px-5 py-3 text-sm font-light focus:outline-none"
                    style={{ 
                          background: colors.bgCard,
                          border: `1px solid ${colors.border}`,
                          color: colors.text
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = colors.borderLight}
                        onBlur={(e) => e.currentTarget.style.borderColor = colors.border}
                      />
                    </div>
                    
                    {/* 发送按钮 */}
                  <button
                    type="submit"
                      disabled={(!newMessage.trim() && attachments.length === 0 && !selectedReference) || sending}
                      className="w-10 h-10 flex items-center justify-center transition-all duration-300"
                    style={{
                        background: (newMessage.trim() || attachments.length > 0 || selectedReference) && !sending ? colors.accent : colors.bgCard,
                        border: `1px solid ${(newMessage.trim() || attachments.length > 0 || selectedReference) && !sending ? colors.accent : colors.border}`,
                        opacity: ((!newMessage.trim() && attachments.length === 0 && !selectedReference) || sending) ? 0.5 : 1
                    }}
                  >
                    {sending ? (
                        <Loader2 
                          size={14} 
                          className="animate-spin" 
                          strokeWidth={1} 
                          style={{ color: colors.bg }} 
                        />
                      ) : (
                        <Send 
                          size={14} 
                          strokeWidth={1} 
                          style={{ color: (newMessage.trim() || attachments.length > 0 || selectedReference) ? colors.bg : colors.textMuted }} 
                        />
                    )}
                  </button>
              </form>
                </div>
            </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div 
                  className="w-16 h-16 mb-5 flex items-center justify-center"
                  style={{ border: `1px solid ${colors.border}` }}
                >
                  <Send size={20} strokeWidth={0.5} style={{ color: colors.textMuted }} />
                </div>
                <p 
                  className="text-[10px] uppercase tracking-[0.2em] mb-2"
                  style={{ color: colors.textMuted }}
                >
                  选择对话
                </p>
                <p 
                  className="text-xs font-light"
                  style={{ color: colors.textMuted }}
                >
                  从左侧选择一个会话开始聊天
              </p>
            </div>
          )}
        </div>
      </div>
      </section>
    </div>
  )
}
