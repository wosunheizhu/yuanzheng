'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { 
  Shield,
  Users,
  Briefcase,
  Coins,
  MessageSquare,
  Bell,
  FileCheck,
  TrendingUp,
  ChevronRight,
  Search,
  Filter,
  Check,
  X,
  Loader2,
  AlertCircle,
  Plus,
  Eye,
  Edit3,
  Ban,
  Send,
  DollarSign
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { adminService, projectService, tokenService, userService, auditLogService, announcementService, Project, User, TokenTransaction, AuditLog, Announcement } from '@/lib/services'
import { getErrorMessage } from '@/lib/api'
import { toast } from 'sonner'
import { History, Clock, Trash2 } from 'lucide-react'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
  success: '#4ade80',
  error: '#ef4444',
  warning: '#fbbf24',
}

// Tab 类型
type TabType = 'overview' | 'projects' | 'tokens' | 'users' | 'feedback' | 'announcements' | 'history'

// 项目审核状态
const reviewStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  'PENDING_REVIEW': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '待审核' },
  'APPROVED': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '已通过' },
  'REJECTED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '已拒绝' },
}

// 交易状态
const txStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  'PENDING_ADMIN_APPROVAL': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '待审批' },
  'PENDING_RECEIVER_CONFIRM': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', label: '待确认' },
  'COMPLETED': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '已完成' },
  'REJECTED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '已拒绝' },
}

export default function AdminPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [loading, setLoading] = useState(true)
  
  // 统计数据
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    pendingProjects: 0,
    pendingTransactions: 0,
    totalTokenValue: 0,
    pendingFeedback: 0,
  })
  
  // 待审核项目
  const [pendingProjects, setPendingProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  
  // 待审批交易
  const [pendingTransactions, setPendingTransactions] = useState<TokenTransaction[]>([])
  const [txLoading, setTxLoading] = useState(false)
  
  // Token 操作
  const [showTokenForm, setShowTokenForm] = useState(false)
  const [tokenAction, setTokenAction] = useState<'grant' | 'deduct'>('grant')
  const [tokenForm, setTokenForm] = useState({
    userId: '',
    amount: '',
    reason: '',
  })
  const [tokenSubmitting, setTokenSubmitting] = useState(false)
  const [userSearchResults, setUserSearchResults] = useState<User[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  
  // 公告表单
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    visibility: 'ALL',
  })
  const [announcementSubmitting, setAnnouncementSubmitting] = useState(false)
  
  // 公告列表
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(false)
  
  // 反馈管理
  interface Feedback {
    id: number
    user_id: number
    user_name?: string
    category: string
    title: string
    content: string
    contact?: string
    allow_contact: boolean
    status: string
    admin_reply?: string
    admin_user_id?: number
    admin_name?: string
    admin_replied_at?: string
    created_at: string
  }
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [feedbacksLoading, setFeedbacksLoading] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [replyForm, setReplyForm] = useState({ reply: '', status: 'RESOLVED' })
  const [replySubmitting, setReplySubmitting] = useState(false)
  
  // 用户管理
  interface UserItem {
    id: number
    name: string
    avatar_url?: string
    organization?: string
    title?: string
    expertise?: string
    tags?: string[]
    highest_role_level: number
    is_admin?: boolean
    email?: string
    phone?: string
    is_active?: boolean
    created_at?: string
  }
  const [users, setUsers] = useState<UserItem[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<number | null>(null)
  const [showCreateUserForm, setShowCreateUserForm] = useState(false)
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role_code: 'NORMAL',
    password: '',
  })
  const [createUserSubmitting, setCreateUserSubmitting] = useState(false)
  const [showUserDetailModal, setShowUserDetailModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  
  // 项目分红
  const [showDividendForm, setShowDividendForm] = useState(false)
  const [dividendForm, setDividendForm] = useState({
    projectId: '',
    description: '',
  })
  const [dividendRecipients, setDividendRecipients] = useState<{ userId: number; userName: string; amount: string; selected: boolean }[]>([])
  const [dividendSubmitting, setDividendSubmitting] = useState(false)
  const [projectSearchQuery, setProjectSearchQuery] = useState('')
  const [projectSearchResults, setProjectSearchResults] = useState<Project[]>([])
  const [selectedDividendProject, setSelectedDividendProject] = useState<Project | null>(null)
  const [projectMembersLoading, setProjectMembersLoading] = useState(false)

  // 操作历史
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLogsLoading, setAuditLogsLoading] = useState(false)
  const [auditLogFilter, setAuditLogFilter] = useState({
    action: '',
    object_type: '',
  })
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [availableObjectTypes, setAvailableObjectTypes] = useState<string[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  // 权限检查
  useEffect(() => {
    if (!user?.is_admin) {
      router.replace('/dashboard')
      toast.error('您没有管理员权限')
    }
  }, [user, router])

  // 加载统计数据
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const data = await adminService.getDashboardStats()
        setStats({
          totalUsers: data.users?.total || 0,
          totalProjects: data.projects?.total || 0,
          pendingProjects: data.projects?.pending_review || 0,
          pendingTransactions: data.tokens?.pending_transactions || 0,
          totalTokenValue: data.tokens?.total_balance || 0,
          pendingFeedback: data.feedback?.pending || 0,
        })
      } catch (err) {
        console.error('Failed to fetch stats:', err)
        // API 失败时保持默认值 0
      } finally {
        setLoading(false)
      }
    }
    if (user?.is_admin) {
      fetchStats()
    }
  }, [user])

  // 加载待审核项目
  useEffect(() => {
    const fetchPendingProjects = async () => {
      if (activeTab !== 'projects') return
      try {
        setProjectsLoading(true)
        const response = await projectService.list({ review_status: 'PENDING_REVIEW' })
        setPendingProjects(response.items || [])
      } catch (err) {
        console.error('Failed to fetch pending projects:', err)
      } finally {
        setProjectsLoading(false)
      }
    }
    fetchPendingProjects()
  }, [activeTab])

  // 加载待审批交易
  useEffect(() => {
    const fetchPendingTx = async () => {
      if (activeTab !== 'tokens') return
      try {
        setTxLoading(true)
        const data = await adminService.getPendingTransactions()
        setPendingTransactions(data || [])
      } catch (err) {
        console.error('Failed to fetch pending transactions:', err)
      } finally {
        setTxLoading(false)
      }
    }
    fetchPendingTx()
  }, [activeTab])

  // 加载反馈列表
  useEffect(() => {
    const fetchFeedbacks = async () => {
      if (activeTab !== 'feedback') return
      try {
        setFeedbacksLoading(true)
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
        const response = await fetch(`${API_URL}/community/feedbacks?limit=50`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          setFeedbacks(data.items || [])
        }
      } catch (err) {
        console.error('Failed to fetch feedbacks:', err)
      } finally {
        setFeedbacksLoading(false)
      }
    }
    fetchFeedbacks()
  }, [activeTab])

  // 加载公告列表
  const fetchAnnouncements = async () => {
    try {
      setAnnouncementsLoading(true)
      const response = await announcementService.list({ limit: 50 })
      setAnnouncements(response.items || [])
    } catch (err) {
      console.error('Failed to fetch announcements:', err)
    } finally {
      setAnnouncementsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'announcements') return
    fetchAnnouncements()
  }, [activeTab])

  // 加载审计日志
  const fetchAuditLogs = async () => {
    try {
      setAuditLogsLoading(true)
      const params: any = { limit: 50 }
      if (auditLogFilter.action) params.action = auditLogFilter.action
      if (auditLogFilter.object_type) params.object_type = auditLogFilter.object_type
      const response = await auditLogService.list(params)
      setAuditLogs(response.items || [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setAuditLogsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'history') return
    fetchAuditLogs()
    // 加载筛选选项
    const loadFilterOptions = async () => {
      try {
        const [actionsRes, typesRes] = await Promise.all([
          auditLogService.getActions(),
          auditLogService.getObjectTypes(),
        ])
        setAvailableActions(actionsRes.actions || [])
        setAvailableObjectTypes(typesRes.object_types || [])
      } catch (err) {
        console.error('Failed to fetch filter options:', err)
      }
    }
    loadFilterOptions()
  }, [activeTab])

  // 筛选变化时重新加载
  useEffect(() => {
    if (activeTab === 'history') {
      fetchAuditLogs()
    }
  }, [auditLogFilter])

  // 加载用户列表
  const fetchUsersList = async (search?: string) => {
    try {
      setUsersLoading(true)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const params = new URLSearchParams({ limit: '100' })
      if (search) params.append('search', search)
      const response = await fetch(`${API_URL}/users/admin/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setUsersLoading(false)
    }
  }
  
  useEffect(() => {
    if (activeTab !== 'users') return
    fetchUsersList()
  }, [activeTab])
  
  // 用户搜索防抖
  useEffect(() => {
    if (activeTab !== 'users') return
    const timer = setTimeout(() => {
      fetchUsersList(userSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch, activeTab])

  // 搜索用户
  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearchQuery.trim()) {
        setUserSearchResults([])
        return
      }
      try {
        const response = await userService.list({ search: userSearchQuery })
        setUserSearchResults(response.items || [])
      } catch (err) {
        console.error('Failed to search users:', err)
      }
    }
    const timer = setTimeout(searchUsers, 300)
    return () => clearTimeout(timer)
  }, [userSearchQuery])

  // 入场动画
  useEffect(() => {
    if (heroRef.current) {
      gsap.set(heroRef.current.children, { opacity: 0, y: 30 })
      gsap.to(heroRef.current.children, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }
  }, [])

  // 审核项目
  const handleReviewProject = async (projectId: number, approved: boolean) => {
    try {
      await adminService.reviewProject(projectId, approved, '')
      toast.success(approved ? '项目已通过审核' : '项目已拒绝')
      setPendingProjects(prev => prev.filter(p => p.id !== projectId))
      setStats(prev => ({ ...prev, pendingProjects: prev.pendingProjects - 1 }))
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    }
  }

  // 审批交易
  const handleReviewTransaction = async (txId: number, approved: boolean) => {
    try {
      if (approved) {
        await adminService.approveTransaction(txId)
      } else {
        await adminService.rejectTransaction(txId, '管理员拒绝')
      }
      toast.success(approved ? '交易已批准' : '交易已拒绝')
      setPendingTransactions(prev => prev.filter(t => t.id !== txId))
      setStats(prev => ({ ...prev, pendingTransactions: prev.pendingTransactions - 1 }))
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    }
  }

  // Token 发放/扣除
  const handleTokenAction = async () => {
    if (!tokenForm.userId || !tokenForm.amount || !tokenForm.reason) {
      toast.error('请填写完整信息')
      return
    }
    
    setTokenSubmitting(true)
    try {
      if (tokenAction === 'grant') {
        await adminService.grantToken({
          user_id: Number(tokenForm.userId),
          amount: Number(tokenForm.amount),
          reason: tokenForm.reason,
        })
        toast.success('Token 发放成功')
      } else {
        await adminService.deductToken({
          user_id: Number(tokenForm.userId),
          amount: Number(tokenForm.amount),
          reason: tokenForm.reason,
        })
        toast.success('Token 扣除成功')
      }
      setShowTokenForm(false)
      setTokenForm({ userId: '', amount: '', reason: '' })
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setTokenSubmitting(false)
    }
  }

  // 搜索项目（分红用）
  useEffect(() => {
    const searchProjects = async () => {
      if (!projectSearchQuery.trim()) {
        setProjectSearchResults([])
        return
      }
      try {
        const result = await projectService.list({ search: projectSearchQuery, limit: 10 })
        setProjectSearchResults(result.items || [])
      } catch (err) {
        console.error('Failed to search projects:', err)
      }
    }
    const timer = setTimeout(searchProjects, 200)
    return () => clearTimeout(timer)
  }, [projectSearchQuery])

  // 选择项目后加载项目成员
  useEffect(() => {
    const loadProjectMembers = async () => {
      if (!selectedDividendProject) {
        setDividendRecipients([])
        return
      }
      
      try {
        setProjectMembersLoading(true)
        const project = await projectService.get(selectedDividendProject.id)
        
        // 将项目成员转换为分红接收人列表
        const recipients = (project.members || [])
          .filter((m: any) => m.leave_time === null) // 只显示在职成员
          .map((m: any) => ({
            userId: m.user_id,
            userName: m.user?.name || m.user_name || `用户${m.user_id}`,
            amount: '',
            selected: false
          }))
        
        setDividendRecipients(recipients)
      } catch (err) {
        console.error('Failed to load project members:', err)
        toast.error('加载项目成员失败')
      } finally {
        setProjectMembersLoading(false)
      }
    }
    
    loadProjectMembers()
  }, [selectedDividendProject])

  // 切换选择分红接收人
  const toggleDividendRecipient = (userId: number) => {
    setDividendRecipients(dividendRecipients.map(r =>
      r.userId === userId ? { ...r, selected: !r.selected } : r
    ))
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    const allSelected = dividendRecipients.every(r => r.selected)
    setDividendRecipients(dividendRecipients.map(r => ({ ...r, selected: !allSelected })))
  }

  // 更新分红金额
  const updateDividendAmount = (userId: number, amount: string) => {
    setDividendRecipients(dividendRecipients.map(r => 
      r.userId === userId ? { ...r, amount } : r
    ))
  }

  // 提交分红
  const handleDividendSubmit = async () => {
    const selectedRecipients = dividendRecipients.filter(r => r.selected)
    
    if (!selectedDividendProject || !dividendForm.description) {
      toast.error('请填写完整信息')
      return
    }
    
    if (selectedRecipients.length === 0) {
      toast.error('请至少选择一名接收人')
      return
    }
    
    const invalidRecipient = selectedRecipients.find(r => !r.amount || Number(r.amount) <= 0)
    if (invalidRecipient) {
      toast.error(`请为 ${invalidRecipient.userName} 填写有效金额`)
      return
    }
    
    setDividendSubmitting(true)
    try {
      await tokenService.createDividend({
        project_id: selectedDividendProject.id,
        description: dividendForm.description,
        recipients: selectedRecipients.map(r => ({
          user_id: r.userId,
          amount: Number(r.amount),
        })),
      })
      toast.success('项目分红发放成功')
      setShowDividendForm(false)
      setDividendForm({ projectId: '', description: '' })
      setDividendRecipients([])
      setSelectedDividendProject(null)
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setDividendSubmitting(false)
    }
  }

  // 创建用户
  const handleCreateUser = async () => {
    if (!createUserForm.name || !createUserForm.role_code) {
      toast.error('请填写必要信息')
      return
    }
    if (!createUserForm.email && !createUserForm.phone) {
      toast.error('请填写邮箱或手机号')
      return
    }
    
    setCreateUserSubmitting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: createUserForm.name,
          email: createUserForm.email || null,
          phone: createUserForm.phone || null,
          role_code: createUserForm.role_code,
          password: createUserForm.password || 'changeme123',
        })
      })
      
      if (response.ok) {
        const newUserData = await response.json()
        toast.success('用户创建成功')
        // 转换为 UserItem 格式
        const newUser: UserItem = {
          id: newUserData.id,
          name: newUserData.name,
          avatar_url: newUserData.avatar_url,
          organization: newUserData.organization,
          title: newUserData.title,
          expertise: newUserData.expertise,
          tags: newUserData.tags,
          highest_role_level: newUserData.highest_role_level || 
            (createUserForm.role_code === 'FOUNDING' ? 3 : createUserForm.role_code === 'CORE' ? 2 : 1),
          is_admin: newUserData.is_admin || false,
          email: newUserData.email,
          phone: newUserData.phone,
          is_active: newUserData.is_active !== false,
          created_at: newUserData.created_at,
        }
        setUsers([newUser, ...users])
        setShowCreateUserForm(false)
        setCreateUserForm({ name: '', email: '', phone: '', role_code: 'NORMAL', password: '' })
      } else {
        const err = await response.json()
        // 处理 Pydantic 验证错误格式
        let errorMessage = '创建失败'
        if (err.detail) {
          if (typeof err.detail === 'string') {
            errorMessage = err.detail
          } else if (Array.isArray(err.detail) && err.detail.length > 0) {
            errorMessage = err.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join('; ')
          }
        }
        toast.error(errorMessage)
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setCreateUserSubmitting(false)
    }
  }

  // 更改用户角色
  const handleChangeUserRole = async (userId: number, roleCode: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${API_URL}/users/${userId}/role?role_code=${roleCode}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        // 更新本地状态
        setUsers(users.map(u => 
          u.id === userId ? { ...u, highest_role_level: data.role.level } : u
        ))
      } else {
        toast.error('更新失败')
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    }
  }

  // 切换管理员状态
  const handleToggleAdmin = async (userId: number) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${API_URL}/users/${userId}/toggle-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        // 更新本地状态
        setUsers(users.map(u => 
          u.id === userId ? { ...u, is_admin: !u.is_admin } : u
        ))
      } else {
        toast.error('操作失败')
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    }
  }

  // 删除用户
  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`确定要删除用户「${userName}」吗？此操作不可恢复。`)) return
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        toast.success('用户已删除')
        setUsers(users.filter(u => u.id !== userId))
      } else {
        const err = await response.json()
        toast.error(err.detail || '删除失败')
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    }
  }

  // 回复反馈
  const handleReplyFeedback = async () => {
    if (!selectedFeedback || !replyForm.reply) {
      toast.error('请填写回复内容')
      return
    }
    
    setReplySubmitting(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const response = await fetch(`${API_URL}/community/feedbacks/${selectedFeedback.id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reply: replyForm.reply,
          status: replyForm.status
        })
      })
      
      if (response.ok) {
        toast.success('回复成功')
        setShowReplyForm(false)
        setSelectedFeedback(null)
        setReplyForm({ reply: '', status: 'RESOLVED' })
        // 刷新反馈列表
        setFeedbacks(prev => prev.map(f => 
          f.id === selectedFeedback.id 
            ? { ...f, status: replyForm.status, admin_reply: replyForm.reply }
            : f
        ))
      } else {
        toast.error('回复失败')
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setReplySubmitting(false)
    }
  }

  // 发布公告
  const handlePublishAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.content) {
      toast.error('请填写标题和内容')
      return
    }
    
    setAnnouncementSubmitting(true)
    try {
      await announcementService.create({
        title: announcementForm.title,
        content: announcementForm.content,
        visibility_scope_type: announcementForm.visibility,
      })
      toast.success('公告发布成功')
      setShowAnnouncementForm(false)
      setAnnouncementForm({ title: '', content: '', visibility: 'ALL' })
      // 重新加载公告列表
      fetchAnnouncements()
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setAnnouncementSubmitting(false)
    }
  }

  // 删除公告
  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm('确定要删除这条公告吗？')) return
    
    try {
      await announcementService.delete(id)
      toast.success('公告已删除')
      fetchAnnouncements()
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    }
  }

  if (!user?.is_admin) {
    return null
  }

  const tabs = [
    { id: 'overview', label: '总览', icon: <TrendingUp size={18} /> },
    { id: 'projects', label: '项目审核', icon: <Briefcase size={18} />, badge: stats.pendingProjects },
    { id: 'tokens', label: 'Token 管理', icon: <Coins size={18} />, badge: stats.pendingTransactions },
    { id: 'users', label: '用户管理', icon: <Users size={18} /> },
    { id: 'feedback', label: '反馈管理', icon: <MessageSquare size={18} />, badge: stats.pendingFeedback },
    { id: 'announcements', label: '公告管理', icon: <Bell size={18} /> },
    { id: 'history', label: '操作历史', icon: <History size={18} /> },
  ]

  return (
    <div ref={containerRef} className="min-h-screen pb-20" style={{ background: colors.bg }}>
      {/* Hero Section */}
      <div ref={heroRef} className="px-8 pt-12 pb-8 max-w-6xl mx-auto gsap-hero">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={32} style={{ color: colors.warning }} />
          <h1 className="text-4xl font-serif" style={{ color: colors.text }}>
            管理员控制台
          </h1>
        </div>
        <p className="text-lg" style={{ color: colors.textSecondary }}>
          管理平台用户、项目、Token 和系统设置
        </p>
      </div>

      {/* Tabs */}
      <div className="px-8 max-w-6xl mx-auto mb-8">
        <div 
          className="flex gap-2 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-white text-black' : 'hover:bg-white/5'
              }`}
              style={{
                color: activeTab === tab.id ? colors.bg : colors.text,
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ 
                    background: activeTab === tab.id ? 'rgba(0,0,0,0.2)' : 'rgba(251, 191, 36, 0.2)',
                    color: activeTab === tab.id ? colors.bg : colors.warning 
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 max-w-6xl mx-auto">
        {/* 总览 Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: '总用户数', value: stats.totalUsers, icon: <Users size={20} /> },
                { label: '总项目数', value: stats.totalProjects, icon: <Briefcase size={20} /> },
                { label: '待审核项目', value: stats.pendingProjects, icon: <FileCheck size={20} />, warning: true },
                { label: '待审批交易', value: stats.pendingTransactions, icon: <Coins size={20} />, warning: true },
                { label: 'Token 总值', value: `${(stats.totalTokenValue / 10000).toFixed(1)}万`, icon: <DollarSign size={20} /> },
                { label: '待处理反馈', value: stats.pendingFeedback, icon: <MessageSquare size={20} />, warning: true },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2" style={{ color: colors.textSecondary }}>
                    {stat.icon}
                    <span className="text-sm">{stat.label}</span>
                  </div>
                  <div 
                    className="text-2xl font-medium"
                    style={{ color: stat.warning && stat.value > 0 ? colors.warning : colors.text }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* 快捷操作 */}
            <div
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${colors.border}`,
              }}
            >
              <h3 className="text-lg font-medium mb-4" style={{ color: colors.text }}>
                快捷操作
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => { setTokenAction('grant'); setShowTokenForm(true); }}
                  className="p-4 rounded-xl text-left hover:bg-white/5 transition-all"
                  style={{ border: `1px solid ${colors.border}` }}
                >
                  <Plus size={24} className="mb-2" style={{ color: colors.success }} />
                  <div style={{ color: colors.text }}>发放 Token</div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>向用户发放 Token</div>
                </button>
                <button
                  onClick={() => { setTokenAction('deduct'); setShowTokenForm(true); }}
                  className="p-4 rounded-xl text-left hover:bg-white/5 transition-all"
                  style={{ border: `1px solid ${colors.border}` }}
                >
                  <Ban size={24} className="mb-2" style={{ color: colors.error }} />
                  <div style={{ color: colors.text }}>扣除 Token</div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>从用户扣除 Token</div>
                </button>
                <button
                  onClick={() => setShowAnnouncementForm(true)}
                  className="p-4 rounded-xl text-left hover:bg-white/5 transition-all"
                  style={{ border: `1px solid ${colors.border}` }}
                >
                  <Bell size={24} className="mb-2" style={{ color: colors.warning }} />
                  <div style={{ color: colors.text }}>发布公告</div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>向用户发布公告</div>
                </button>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="p-4 rounded-xl text-left hover:bg-white/5 transition-all"
                  style={{ border: `1px solid ${colors.border}` }}
                >
                  <FileCheck size={24} className="mb-2" style={{ color: colors.text }} />
                  <div style={{ color: colors.text }}>审核项目</div>
                  <div className="text-sm" style={{ color: colors.textSecondary }}>
                    {stats.pendingProjects} 个待审核
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 项目审核 Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-4">
            {projectsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin" style={{ color: colors.textSecondary }} />
              </div>
            ) : pendingProjects.length === 0 ? (
              <div className="text-center py-20">
                <FileCheck size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
                <p style={{ color: colors.textSecondary }}>没有待审核的项目</p>
              </div>
            ) : (
              pendingProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-6 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>
                        {project.name}
                      </h3>
                      <p className="text-sm mb-4 line-clamp-2" style={{ color: colors.textSecondary }}>
                        {project.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm" style={{ color: colors.textSecondary }}>
                        <span>{project.business_type}</span>
                        <span>•</span>
                        <span>{project.industry}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewProject(project.id, true)}
                        className="p-3 rounded-lg hover:bg-green-500/20 transition-all"
                        style={{ color: colors.success }}
                        title="通过"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={() => handleReviewProject(project.id, false)}
                        className="p-3 rounded-lg hover:bg-red-500/20 transition-all"
                        style={{ color: colors.error }}
                        title="拒绝"
                      >
                        <X size={20} />
                      </button>
                      <button
                        onClick={() => router.push(`/projects/${project.id}`)}
                        className="p-3 rounded-lg hover:bg-white/5 transition-all"
                        style={{ color: colors.textSecondary }}
                        title="查看详情"
                      >
                        <Eye size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Token 管理 Tab */}
        {activeTab === 'tokens' && (
          <div className="space-y-6">
            {/* 操作按钮 */}
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => { setTokenAction('grant'); setShowTokenForm(true); }}
                className="btn-primary py-3 px-5 flex items-center gap-2"
              >
                <Plus size={18} />
                发放 Token
              </button>
              <button
                onClick={() => { setTokenAction('deduct'); setShowTokenForm(true); }}
                className="btn-outline py-3 px-5 flex items-center gap-2"
              >
                <Ban size={18} />
                扣除 Token
              </button>
              <button
                onClick={() => setShowDividendForm(true)}
                className="py-3 px-5 flex items-center gap-2 rounded-lg font-medium transition-all"
                style={{
                  background: 'rgba(251, 191, 36, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                }}
              >
                <DollarSign size={18} />
                项目分红
              </button>
            </div>

            {/* 待审批交易 */}
            <div>
              <h3 className="text-lg font-medium mb-4" style={{ color: colors.text }}>
                待审批交易
              </h3>
              {txLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin" style={{ color: colors.textSecondary }} />
                </div>
              ) : pendingTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Coins size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
                  <p style={{ color: colors.textSecondary }}>没有待审批的交易</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 rounded-xl flex items-center justify-between"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ color: colors.text }}>
                            {tx.from_user_name || '系统'} → {tx.to_user_name}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ 
                              background: txStatusConfig[tx.status]?.bg,
                              color: txStatusConfig[tx.status]?.text 
                            }}
                          >
                            {txStatusConfig[tx.status]?.label}
                          </span>
                        </div>
                        <div className="text-sm" style={{ color: colors.textSecondary }}>
                          {tx.reason}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-medium" style={{ color: colors.text }}>
                          {tx.amount.toLocaleString()} Token
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReviewTransaction(tx.id, true)}
                            className="p-2 rounded-lg hover:bg-green-500/20 transition-all"
                            style={{ color: colors.success }}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleReviewTransaction(tx.id, false)}
                            className="p-2 rounded-lg hover:bg-red-500/20 transition-all"
                            style={{ color: colors.error }}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 用户管理 Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* 操作栏 */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCreateUserForm(true)}
                  className="btn-primary py-3 px-5 flex items-center gap-2"
                >
                  <Plus size={18} />
                  创建用户
                </button>
              </div>
              
              {/* 搜索和筛选 */}
              <div className="flex gap-3 flex-1 max-w-xl">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: colors.textSecondary }} />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="搜索姓名、邮箱、手机号..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                </div>
                <select
                  value={userRoleFilter ?? ''}
                  onChange={(e) => setUserRoleFilter(e.target.value ? Number(e.target.value) : null)}
                  className="px-4 py-2.5 rounded-lg outline-none cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="">全部角色</option>
                  <option value="3">联合创始人</option>
                  <option value="2">核心合伙人</option>
                  <option value="1">普通合伙人</option>
                </select>
              </div>
            </div>
            
            {/* 用户统计 */}
            <div className="flex gap-6 text-sm" style={{ color: colors.textSecondary }}>
              <span>共 {users.length} 位用户</span>
              <span>联合创始人: {users.filter(u => u.highest_role_level === 3).length}</span>
              <span>核心合伙人: {users.filter(u => u.highest_role_level === 2).length}</span>
              <span>普通合伙人: {users.filter(u => u.highest_role_level === 1).length}</span>
              <span>管理员: {users.filter(u => u.is_admin).length}</span>
            </div>

            {/* 用户列表 */}
            {usersLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin" style={{ color: colors.textSecondary }} />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20">
                <Users size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
                <p style={{ color: colors.textSecondary }}>暂无用户</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users
                  .filter(u => userRoleFilter === null || u.highest_role_level === userRoleFilter)
                  .map((u) => {
                  const roleConfig: Record<number, { label: string; color: string }> = {
                    3: { label: '联合创始人', color: '#fbbf24' },
                    2: { label: '核心合伙人', color: '#3b82f6' },
                    1: { label: '普通合伙人', color: '#6b7280' },
                  }
                  const role = roleConfig[u.highest_role_level] || roleConfig[1]
                  
                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-xl flex items-center justify-between hover:bg-white/[0.02] transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <div 
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedUser(u)
                          setShowUserDetailModal(true)
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium"
                          style={{ background: `${role.color}20`, color: role.color }}
                        >
                          {u.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium" style={{ color: colors.text }}>
                              {u.name}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ background: `${role.color}20`, color: role.color }}
                            >
                              {role.label}
                            </span>
                            {u.is_admin && (
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                              >
                                管理员
                              </span>
                            )}
                            {!u.is_active && (
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ background: 'rgba(107, 114, 128, 0.2)', color: '#6b7280' }}
                              >
                                已禁用
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm" style={{ color: colors.textSecondary }}>
                            <span className="truncate max-w-[150px]">{u.organization || u.title || '暂无机构'}</span>
                            {u.email && <span className="truncate max-w-[200px]">{u.email}</span>}
                            {u.phone && <span>{u.phone}</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* 角色选择 */}
                        <select
                          value={u.highest_role_level === 3 ? 'FOUNDING' : u.highest_role_level === 2 ? 'CORE' : 'NORMAL'}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                          className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${colors.border}`,
                            color: colors.text,
                          }}
                        >
                          <option value="FOUNDING">联合创始人</option>
                          <option value="CORE">核心合伙人</option>
                          <option value="NORMAL">普通合伙人</option>
                        </select>
                        
                        {/* 管理员开关 */}
                        <button
                          onClick={() => handleToggleAdmin(u.id)}
                          className="px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap"
                          style={{
                            background: u.is_admin ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${u.is_admin ? '#ef4444' : colors.border}`,
                            color: u.is_admin ? '#ef4444' : colors.textSecondary,
                          }}
                        >
                          {u.is_admin ? '取消管理员' : '设为管理员'}
                        </button>
                        
                        {/* 查看详情 */}
                        <button
                          onClick={() => {
                            setSelectedUser(u)
                            setShowUserDetailModal(true)
                          }}
                          className="p-2 rounded-lg hover:bg-white/10 transition-all"
                          style={{ color: colors.textSecondary }}
                          title="查看详情"
                        >
                          <Eye size={18} />
                        </button>
                        
                        {/* 删除按钮 */}
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-2 rounded-lg hover:bg-red-500/20 transition-all"
                          style={{ color: colors.error }}
                          title="删除用户"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                
                {users.filter(u => userRoleFilter === null || u.highest_role_level === userRoleFilter).length === 0 && (
                  <div className="text-center py-12">
                    <Users size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
                    <p style={{ color: colors.textSecondary }}>没有匹配的用户</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 反馈管理 Tab */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            {feedbacksLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin" style={{ color: colors.textSecondary }} />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-20">
                <MessageSquare size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
                <p style={{ color: colors.textSecondary }}>暂无用户反馈</p>
              </div>
            ) : (
              feedbacks.map((feedback) => {
                const categoryConfig: Record<string, { label: string; color: string }> = {
                  'PRODUCT': { label: '产品建议', color: '#3b82f6' },
                  'BUG': { label: 'Bug报告', color: '#ef4444' },
                  'POLICY': { label: '平台规则', color: '#f59e0b' },
                  'OTHER': { label: '其他', color: '#6b7280' },
                }
                const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
                  'OPEN': { label: '待处理', bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' },
                  'IN_PROGRESS': { label: '处理中', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
                  'RESOLVED': { label: '已解决', bg: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' },
                  'CLOSED': { label: '已关闭', bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' },
                }
                const cat = categoryConfig[feedback.category] || categoryConfig['OTHER']
                const status = statusConfig[feedback.status] || statusConfig['OPEN']
                
                return (
                  <div
                    key={feedback.id}
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: `${cat.color}20`, color: cat.color }}
                          >
                            {cat.label}
                          </span>
                          <span
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: status.bg, color: status.color }}
                          >
                            {status.label}
                          </span>
                          <span className="text-sm" style={{ color: colors.textSecondary }}>
                            {feedback.user_name || `用户 #${feedback.user_id}`}
                          </span>
                          <span className="text-xs" style={{ color: colors.textSecondary }}>
                            {new Date(feedback.created_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>
                          {feedback.title}
                        </h3>
                        <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                          {feedback.content}
                        </p>
                        {feedback.contact && (
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            联系方式: {feedback.contact}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {feedback.status === 'OPEN' && (
                          <button
                            onClick={() => {
                              setSelectedFeedback(feedback)
                              setShowReplyForm(true)
                            }}
                            className="px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-white/10 transition-all"
                            style={{ 
                              border: `1px solid ${colors.border}`,
                              color: colors.text 
                            }}
                          >
                            <Edit3 size={16} />
                            回复
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* 管理员回复 */}
                    {feedback.admin_reply && (
                      <div
                        className="p-4 rounded-lg mt-4"
                        style={{ background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Check size={16} style={{ color: colors.success }} />
                          <span className="text-sm font-medium" style={{ color: colors.success }}>
                            管理员回复
                          </span>
                          {feedback.admin_replied_at && (
                            <span className="text-xs" style={{ color: colors.textSecondary }}>
                              {new Date(feedback.admin_replied_at).toLocaleString('zh-CN')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: colors.text }}>
                          {feedback.admin_reply}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* 公告管理 Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <button
              onClick={() => setShowAnnouncementForm(true)}
              className="btn-primary py-3 px-5 flex items-center gap-2"
            >
              <Plus size={18} />
              发布公告
            </button>

            {announcementsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin" style={{ color: colors.textSecondary }} />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12">
                <Bell size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
                <p style={{ color: colors.textSecondary }}>暂无公告</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-6 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-medium mb-2" style={{ color: colors.text }}>
                          {announcement.title}
                        </h4>
                        <p className="text-sm mb-3 line-clamp-3" style={{ color: colors.textSecondary }}>
                          {announcement.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs" style={{ color: colors.textSecondary }}>
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {announcement.created_by_name || `用户 ${announcement.created_by_user_id}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(announcement.created_at).toLocaleString('zh-CN')}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6',
                            }}
                          >
                            {announcement.visibility_scope_type === 'ALL' ? '全员可见' : 
                             announcement.visibility_scope_type === 'ROLE_MIN_LEVEL' ? `角色等级 ≥ ${announcement.visibility_min_role_level}` :
                             '自定义可见'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: colors.error }}
                        title="删除公告"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 操作历史 Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* 筛选栏 */}
            <div className="flex flex-wrap gap-4">
              <select
                value={auditLogFilter.object_type}
                onChange={(e) => setAuditLogFilter({ ...auditLogFilter, object_type: e.target.value })}
                className="px-4 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              >
                <option value="">全部类型</option>
                {availableObjectTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <select
                value={auditLogFilter.action}
                onChange={(e) => setAuditLogFilter({ ...auditLogFilter, action: e.target.value })}
                className="px-4 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              >
                <option value="">全部操作</option>
                {availableActions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
              <button
                onClick={() => setAuditLogFilter({ action: '', object_type: '' })}
                className="px-4 py-2 rounded-lg transition-colors hover:bg-white/10"
                style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
              >
                重置筛选
              </button>
            </div>

            {/* 日志列表 */}
            {auditLogsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={32} className="animate-spin" style={{ color: colors.textSecondary }} />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <History size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
                <p style={{ color: colors.textSecondary }}>暂无操作记录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background: 'rgba(251, 191, 36, 0.1)',
                              color: '#fbbf24',
                            }}
                          >
                            {log.object_type}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6',
                            }}
                          >
                            {log.action}
                          </span>
                        </div>
                        <p className="text-sm mb-2" style={{ color: colors.text }}>
                          {log.summary}
                        </p>
                        <div className="flex items-center gap-4 text-xs" style={{ color: colors.textSecondary }}>
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {log.user_name || `用户 ${log.user_id}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(log.created_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Token 操作弹窗 */}
      {showTokenForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowTokenForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-8"
            style={{
              background: 'rgba(20, 20, 20, 0.98)',
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium" style={{ color: colors.text }}>
                {tokenAction === 'grant' ? '发放 Token' : '扣除 Token'}
              </h2>
              <button
                onClick={() => setShowTokenForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* 用户搜索 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  选择用户 *
                </label>
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="搜索用户姓名或邮箱..."
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
                {userSearchResults.length > 0 && (
                  <div
                    className="mt-2 rounded-lg overflow-hidden"
                    style={{
                      background: 'rgba(30, 30, 30, 0.98)',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {userSearchResults.slice(0, 5).map((u) => (
                      <button
                        key={u.id}
                        className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
                        onClick={() => {
                          setTokenForm({ ...tokenForm, userId: String(u.id) })
                          setUserSearchQuery(u.name)
                          setUserSearchResults([])
                        }}
                      >
                        <span style={{ color: colors.text }}>{u.name}</span>
                        <span className="text-sm" style={{ color: colors.textSecondary }}>{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 数量 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  数量 *
                </label>
                <input
                  type="number"
                  value={tokenForm.amount}
                  onChange={(e) => setTokenForm({ ...tokenForm, amount: e.target.value })}
                  placeholder="请输入 Token 数量"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 原因 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  原因 *
                </label>
                <textarea
                  value={tokenForm.reason}
                  onChange={(e) => setTokenForm({ ...tokenForm, reason: e.target.value })}
                  placeholder="请说明原因..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 提交按钮 */}
              <button
                onClick={handleTokenAction}
                disabled={tokenSubmitting || !tokenForm.userId || !tokenForm.amount || !tokenForm.reason}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: tokenAction === 'grant' ? colors.success : colors.error,
                  color: colors.bg,
                }}
              >
                {tokenSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {tokenAction === 'grant' ? <Plus size={18} /> : <Ban size={18} />}
                    确认{tokenAction === 'grant' ? '发放' : '扣除'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 用户详情弹窗 */}
      {showUserDetailModal && selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowUserDetailModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-8"
            style={{
              background: 'rgba(20, 20, 20, 0.98)',
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium" style={{ color: colors.text }}>
                用户详情
              </h2>
              <button
                onClick={() => setShowUserDetailModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* 用户头像和基本信息 */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium"
                  style={{ 
                    background: selectedUser.highest_role_level === 3 ? 'rgba(251, 191, 36, 0.2)' :
                               selectedUser.highest_role_level === 2 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                    color: selectedUser.highest_role_level === 3 ? '#fbbf24' :
                           selectedUser.highest_role_level === 2 ? '#3b82f6' : '#6b7280'
                  }}
                >
                  {selectedUser.name[0]}
                </div>
                <div>
                  <h3 className="text-xl font-medium" style={{ color: colors.text }}>
                    {selectedUser.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ 
                        background: selectedUser.highest_role_level === 3 ? 'rgba(251, 191, 36, 0.2)' :
                                   selectedUser.highest_role_level === 2 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                        color: selectedUser.highest_role_level === 3 ? '#fbbf24' :
                               selectedUser.highest_role_level === 2 ? '#3b82f6' : '#6b7280'
                      }}
                    >
                      {selectedUser.highest_role_level === 3 ? '联合创始人' :
                       selectedUser.highest_role_level === 2 ? '核心合伙人' : '普通合伙人'}
                    </span>
                    {selectedUser.is_admin && (
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                      >
                        管理员
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 详细信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>邮箱</label>
                  <p style={{ color: colors.text }}>{selectedUser.email || '-'}</p>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>手机</label>
                  <p style={{ color: colors.text }}>{selectedUser.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>机构</label>
                  <p style={{ color: colors.text }}>{selectedUser.organization || '-'}</p>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>职位</label>
                  <p style={{ color: colors.text }}>{selectedUser.title || '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>专业领域</label>
                  <p style={{ color: colors.text }}>{selectedUser.expertise || '-'}</p>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>账号状态</label>
                  <p style={{ color: selectedUser.is_active ? colors.success : colors.error }}>
                    {selectedUser.is_active !== false ? '正常' : '已禁用'}
                  </p>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: colors.textSecondary }}>注册时间</label>
                  <p style={{ color: colors.text }}>
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('zh-CN') : '-'}
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                <button
                  onClick={() => {
                    handleToggleAdmin(selectedUser.id)
                    setSelectedUser({ ...selectedUser, is_admin: !selectedUser.is_admin })
                  }}
                  className="flex-1 py-2.5 rounded-lg font-medium transition-all"
                  style={{
                    background: selectedUser.is_admin ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedUser.is_admin ? '#ef4444' : colors.border}`,
                    color: selectedUser.is_admin ? '#ef4444' : colors.text,
                  }}
                >
                  {selectedUser.is_admin ? '取消管理员' : '设为管理员'}
                </button>
                <button
                  onClick={() => {
                    setShowUserDetailModal(false)
                    handleDeleteUser(selectedUser.id, selectedUser.name)
                  }}
                  className="py-2.5 px-6 rounded-lg font-medium transition-all hover:bg-red-500/20"
                  style={{
                    border: `1px solid ${colors.error}`,
                    color: colors.error,
                  }}
                >
                  删除用户
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 创建用户弹窗 */}
      {showCreateUserForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowCreateUserForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-8"
            style={{
              background: 'rgba(20, 20, 20, 0.98)',
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium" style={{ color: colors.text }}>
                创建用户
              </h2>
              <button
                onClick={() => setShowCreateUserForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* 姓名 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  姓名 *
                </label>
                <input
                  type="text"
                  value={createUserForm.name}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                  placeholder="请输入姓名"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 邮箱 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  邮箱
                </label>
                <input
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                  placeholder="请输入邮箱"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 手机号 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  手机号
                </label>
                <input
                  type="tel"
                  value={createUserForm.phone}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, phone: e.target.value })}
                  placeholder="请输入手机号"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 角色 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  角色等级 *
                </label>
                <select
                  value={createUserForm.role_code}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, role_code: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg outline-none cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="FOUNDING">联合创始人（初始 100,000 Token）</option>
                  <option value="CORE">核心合伙人（初始 30,000 Token）</option>
                  <option value="NORMAL">普通合伙人（初始 10,000 Token）</option>
                </select>
              </div>

              {/* 初始密码 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  初始密码（可选）
                </label>
                <input
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                  placeholder="留空则使用默认密码 changeme123"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              <p className="text-xs" style={{ color: colors.textSecondary }}>
                * 邮箱和手机号至少填写一个
              </p>

              {/* 提交按钮 */}
              <button
                onClick={handleCreateUser}
                disabled={createUserSubmitting || !createUserForm.name}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: colors.text,
                  color: colors.bg,
                }}
              >
                {createUserSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={18} />
                    创建用户
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 回复反馈弹窗 */}
      {showReplyForm && selectedFeedback && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowReplyForm(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-8"
            style={{
              background: 'rgba(20, 20, 20, 0.98)',
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium" style={{ color: colors.text }}>
                回复反馈
              </h2>
              <button
                onClick={() => setShowReplyForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 原反馈信息 */}
            <div
              className="p-4 rounded-lg mb-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}` }}
            >
              <h4 className="font-medium mb-2" style={{ color: colors.text }}>
                {selectedFeedback.title}
              </h4>
              <p className="text-sm" style={{ color: colors.textSecondary }}>
                {selectedFeedback.content}
              </p>
            </div>

            <div className="space-y-5">
              {/* 回复内容 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  回复内容 *
                </label>
                <textarea
                  value={replyForm.reply}
                  onChange={(e) => setReplyForm({ ...replyForm, reply: e.target.value })}
                  placeholder="请输入回复内容..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 状态选择 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  更新状态
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'RESOLVED', label: '已解决' },
                    { value: 'IN_PROGRESS', label: '处理中' },
                    { value: 'CLOSED', label: '关闭' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setReplyForm({ ...replyForm, status: opt.value })}
                      className="px-4 py-2 rounded-lg transition-all"
                      style={{
                        background: replyForm.status === opt.value ? colors.text : 'rgba(255,255,255,0.03)',
                        color: replyForm.status === opt.value ? colors.bg : colors.text,
                        border: `1px solid ${replyForm.status === opt.value ? colors.text : colors.border}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 提交按钮 */}
              <button
                onClick={handleReplyFeedback}
                disabled={replySubmitting || !replyForm.reply}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: colors.success,
                  color: colors.bg,
                }}
              >
                {replySubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    发送回复
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 公告发布弹窗 */}
      {showAnnouncementForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowAnnouncementForm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-8"
            style={{
              background: 'rgba(20, 20, 20, 0.98)',
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium" style={{ color: colors.text }}>
                发布公告
              </h2>
              <button
                onClick={() => setShowAnnouncementForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* 标题 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  公告标题 *
                </label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="请输入公告标题"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 内容 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  公告内容 *
                </label>
                <textarea
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  placeholder="请输入公告内容..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-lg outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 提交按钮 */}
              <button
                onClick={handlePublishAnnouncement}
                disabled={announcementSubmitting || !announcementForm.title || !announcementForm.content}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: colors.text,
                  color: colors.bg,
                }}
              >
                {announcementSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    发布公告
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 项目分红弹窗 */}
      {showDividendForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowDividendForm(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-8"
            style={{
              background: 'rgba(20, 20, 20, 0.98)',
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <DollarSign size={24} style={{ color: '#fbbf24' }} />
                <h2 className="text-xl font-medium" style={{ color: colors.text }}>
                  项目分红
                </h2>
              </div>
              <button
                onClick={() => setShowDividendForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* 选择项目 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  选择项目 *
                </label>
                {selectedDividendProject ? (
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}` }}
                  >
                    <span style={{ color: colors.text }}>{selectedDividendProject.name}</span>
                    <button
                      onClick={() => setSelectedDividendProject(null)}
                      className="p-1 rounded hover:bg-white/10"
                    >
                      <X size={16} style={{ color: colors.textSecondary }} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Search size={16} style={{ color: colors.textSecondary }} />
                    </div>
                    <input
                      type="text"
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      placeholder="搜索项目..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                    {projectSearchResults.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 rounded-lg max-h-40 overflow-y-auto z-10"
                        style={{ background: 'rgba(30,30,30,0.98)', border: `1px solid ${colors.border}` }}
                      >
                        {projectSearchResults.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => {
                              setSelectedDividendProject(project)
                              setProjectSearchQuery('')
                              setProjectSearchResults([])
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-white/10 transition-colors"
                            style={{ color: colors.text }}
                          >
                            {project.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 分红说明 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  分红说明 *
                </label>
                <input
                  type="text"
                  value={dividendForm.description}
                  onChange={(e) => setDividendForm({ ...dividendForm, description: e.target.value })}
                  placeholder="如：2024年Q4项目分红"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 项目成员列表 */}
              {selectedDividendProject && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm" style={{ color: colors.textSecondary }}>
                      选择分红成员 ({dividendRecipients.filter(r => r.selected).length}/{dividendRecipients.length})
                    </label>
                    <button
                      onClick={toggleSelectAll}
                      className="text-sm px-2 py-1 rounded hover:bg-white/10 transition-colors"
                      style={{ color: '#fbbf24' }}
                    >
                      {dividendRecipients.every(r => r.selected) ? '取消全选' : '全选'}
                    </button>
                  </div>
                  
                  {projectMembersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={24} className="animate-spin" style={{ color: colors.textSecondary }} />
                    </div>
                  ) : dividendRecipients.length === 0 ? (
                    <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                      该项目暂无成员
                    </div>
                  ) : (
                    <div
                      className="rounded-lg divide-y max-h-64 overflow-y-auto"
                      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}`, borderColor: colors.border }}
                    >
                      {dividendRecipients.map((recipient) => (
                        <div 
                          key={recipient.userId} 
                          className="flex items-center gap-3 p-3 transition-colors"
                          style={{ 
                            background: recipient.selected ? 'rgba(251, 191, 36, 0.08)' : 'transparent'
                          }}
                        >
                          {/* 勾选框 */}
                          <input
                            type="checkbox"
                            checked={recipient.selected}
                            onChange={() => toggleDividendRecipient(recipient.userId)}
                            className="w-4 h-4 rounded shrink-0 cursor-pointer"
                            style={{ accentColor: '#fbbf24' }}
                          />
                          
                          {/* 头像 */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
                            style={{ background: 'rgba(255,255,255,0.1)', color: colors.text }}
                          >
                            {recipient.userName?.charAt(0) || '?'}
                          </div>
                          
                          {/* 名称 */}
                          <span className="flex-1 min-w-0 truncate" style={{ color: colors.text }}>
                            {recipient.userName}
                          </span>
                          
                          {/* 金额输入 - 仅选中时显示 */}
                          {recipient.selected && (
                            <>
                              <input
                                type="number"
                                value={recipient.amount}
                                onChange={(e) => updateDividendAmount(recipient.userId, e.target.value)}
                                placeholder="金额"
                                className="w-24 px-3 py-2 rounded-lg outline-none text-right"
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: `1px solid ${colors.border}`,
                                  color: colors.text,
                                }}
                              />
                              <span className="text-sm shrink-0" style={{ color: colors.textSecondary }}>Token</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 合计 */}
                  {dividendRecipients.some(r => r.selected) && (
                    <div className="mt-3 flex justify-between text-sm" style={{ color: colors.textSecondary }}>
                      <span>已选 {dividendRecipients.filter(r => r.selected).length} 人</span>
                      <span style={{ color: '#fbbf24' }}>
                        合计: {dividendRecipients.filter(r => r.selected).reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString()} Token
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 提交按钮 */}
              <button
                onClick={handleDividendSubmit}
                disabled={dividendSubmitting || !selectedDividendProject || !dividendForm.description || !dividendRecipients.some(r => r.selected)}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(251, 191, 36, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                }}
              >
                {dividendSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <DollarSign size={18} />
                    确认发放分红
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

