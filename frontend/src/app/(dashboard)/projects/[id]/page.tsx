'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { gsap } from 'gsap'
import { toast } from 'sonner'
import { 
  ArrowLeft,
  Briefcase,
  Clock,
  Users,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Edit3,
  Settings,
  History,
  MessageSquare,
  TrendingUp,
  DollarSign,
  UserPlus,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  X,
  Loader2
} from 'lucide-react'
import { projectService, Project, ProjectEvent, ProjectShare, ProjectJoinRequest, demandService, Demand, userService } from '@/lib/services'
import { useAuthStore } from '@/store/auth'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
}

// 状态颜色映射
const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  'ONGOING': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '进行中' },
  'PAUSED': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '已暂停' },
  'COMPLETED': { bg: 'rgba(136, 136, 136, 0.1)', text: '#888888', label: '已完成' },
  'ABANDONED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '已废弃' },
}

const reviewStatusColors: Record<string, { bg: string; text: string; label: string }> = {
  'PENDING_REVIEW': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '待审核' },
  'APPROVED': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '已通过' },
  'REJECTED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '已拒绝' },
}

// 事件类型图标映射
const eventIcons: Record<string, React.ReactNode> = {
  'PROJECT_CREATED': <Plus size={16} />,
  'PROJECT_UPDATED': <Edit3 size={16} />,
  'MEMBER_JOINED': <UserPlus size={16} />,
  'MEMBER_LEFT': <Users size={16} />,
  'STATUS_CHANGED': <Settings size={16} />,
  'MILESTONE_ADDED': <CheckCircle size={16} />,
  'DEMAND_CREATED': <FileText size={16} />,
  'DEMAND_CLOSED': <CheckCircle size={16} />,
  'RESPONSE_ACCEPTED': <CheckCircle size={16} />,
  'TOKEN_TRANSACTION': <DollarSign size={16} />,
  'TOKEN_DIVIDEND_DISTRIBUTED': <TrendingUp size={16} />,
  'SHARE_STRUCTURE_CHANGED': <Settings size={16} />,
  'MEETING_SCHEDULED': <MessageSquare size={16} />,
  'NEWS_PUBLISHED': <FileText size={16} />,
  'VALUE_RECORDED': <TrendingUp size={16} />,
  'COMMENT': <MessageSquare size={16} />,
}

// Tabs
type TabType = 'overview' | 'demands' | 'timeline' | 'members' | 'shares'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = Number(params.id)
  
  const { user } = useAuthStore()
  const [project, setProject] = useState<Project | null>(null)
  const [events, setEvents] = useState<ProjectEvent[]>([])
  const [demands, setDemands] = useState<Demand[]>([])
  const [loading, setLoading] = useState(true)
  const [eventsLoading, setEventsLoading] = useState(true)
  const [demandsLoading, setDemandsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  
  // 加入项目模态框状态
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinForm, setJoinForm] = useState({
    desired_role: 'MEMBER' as 'OWNER' | 'MEMBER',
    duty_description: '',
    intended_share_pct: '',
    note: ''
  })
  const [joinSubmitting, setJoinSubmitting] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState(false)
  
  // 加入申请审核状态
  const [joinRequests, setJoinRequests] = useState<ProjectJoinRequest[]>([])
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false)
  const [reviewingId, setReviewingId] = useState<number | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewForm, setReviewForm] = useState<{
    requestId: number | null
    approved: boolean
    actual_share_pct: string
    deductions: { share_id: number; amount: string }[]  // 从多个股权方扣除
    comment: string
  }>({
    requestId: null,
    approved: true,
    actual_share_pct: '',
    deductions: [],
    comment: ''
  })
  
  // 邀请成员模态框状态
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    invitee_id: 0,
    invitee_name: '',
    proposed_role: 'MEMBER' as 'OWNER' | 'MEMBER' | 'RECORDER',
    proposed_duty: '',
    proposed_share_pct: '',
    message: ''
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<any[]>([])
  const [userSearching, setUserSearching] = useState(false)
  
  // 调整股权模态框状态
  const [showAdjustSharesModal, setShowAdjustSharesModal] = useState(false)
  const [adjustSharesForm, setAdjustSharesForm] = useState<{
    shares: { owner_type: 'ORG' | 'USER'; owner_id: number; owner_name: string; percentage: string; note: string }[]
    reason: string
  }>({
    shares: [],
    reason: ''
  })
  const [adjustSharesLoading, setAdjustSharesLoading] = useState(false)
  
  // 编辑项目模态框状态
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    business_type: '',
    industry: '',
    region: ''
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  
  // 项目设置模态框状态
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    business_status: 'ONGOING' as 'ONGOING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED',
    visibility_scope_type: 'PUBLIC' as 'PUBLIC' | 'INTERNAL' | 'PRIVATE',
    visibility_min_role_level: 1
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  
  // 事件编辑相关状态
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ProjectEvent | null>(null)
  const [editEventForm, setEditEventForm] = useState({
    title: '',
    description: '',
    edit_reason: ''
  })
  const [editEventLoading, setEditEventLoading] = useState(false)
  const [editEventError, setEditEventError] = useState<string | null>(null)
  
  // 新建事件相关状态
  const [showCreateEventModal, setShowCreateEventModal] = useState(false)
  const [createEventForm, setCreateEventForm] = useState({
    event_type: 'NOTE',
    title: '',
    description: ''
  })
  const [createEventLoading, setCreateEventLoading] = useState(false)
  const [createEventError, setCreateEventError] = useState<string | null>(null)
  
  // 事件编辑历史
  const [showEventHistory, setShowEventHistory] = useState(false)
  const [eventHistory, setEventHistory] = useState<any[]>([])
  const [eventHistoryLoading, setEventHistoryLoading] = useState(false)
  const [viewingHistoryEventId, setViewingHistoryEventId] = useState<number | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)

  // 加载项目详情
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return
      
      try {
        setLoading(true)
        setError(null)
        const data = await projectService.get(projectId)
        setProject(data)
      } catch (err) {
        console.error('Failed to fetch project:', err)
        setError('无法加载项目详情')
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [projectId])

  // 加载项目事件/时间线
  useEffect(() => {
    const fetchEvents = async () => {
      if (!projectId) return
      
      try {
        setEventsLoading(true)
        const data = await projectService.getEvents(projectId, { limit: 50 })
        setEvents(data || [])
      } catch (err) {
        console.error('Failed to fetch events:', err)
      } finally {
        setEventsLoading(false)
      }
    }
    fetchEvents()
  }, [projectId])

  // 加载项目需求
  useEffect(() => {
    const fetchDemands = async () => {
      if (!projectId) return
      
      try {
        setDemandsLoading(true)
        const data = await demandService.list({ project_id: projectId })
        setDemands(data.items || [])
      } catch (err) {
        console.error('Failed to fetch demands:', err)
      } finally {
        setDemandsLoading(false)
      }
    }
    fetchDemands()
  }, [projectId])

  // 加载加入申请列表（负责人/管理员）
  useEffect(() => {
    const fetchJoinRequests = async () => {
      if (!projectId || !project) return
      
      // 检查当前用户是否有权限查看加入申请
      const userIsOwner = project.members?.some(m => m.user_id === user?.id && m.role_in_project === 'OWNER')
      const userCanEdit = userIsOwner || user?.is_admin
      if (!userCanEdit) return
      
      try {
        setJoinRequestsLoading(true)
        const data = await projectService.getJoinRequests(projectId)
        setJoinRequests(data || [])
      } catch (err) {
        console.error('Failed to fetch join requests:', err)
      } finally {
        setJoinRequestsLoading(false)
      }
    }
    fetchJoinRequests()
  }, [projectId, project, user])

  // 入场动画
  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.set(containerRef.current.children, { opacity: 0, y: 30 })
      gsap.to(containerRef.current.children, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }
  }, [loading])

  // 检查用户权限
  const isOwner = project?.members?.some(m => m.user_id === user?.id && m.role_in_project === 'OWNER')
  const isMember = project?.members?.some(m => m.user_id === user?.id)
  const canEdit = isOwner || user?.is_admin

  // 提交加入项目申请
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 表单验证
    if (!joinForm.duty_description.trim()) {
      setJoinError('请填写加入后职责')
      return
    }
    if (!joinForm.intended_share_pct || parseFloat(joinForm.intended_share_pct) < 0 || parseFloat(joinForm.intended_share_pct) > 49) {
      setJoinError('意向股份应在 0-49% 之间（元征固定持有51%）')
      return
    }

    try {
      setJoinSubmitting(true)
      setJoinError(null)
      
      await projectService.requestJoin(projectId, {
        desired_role: joinForm.desired_role,
        duty_description: joinForm.duty_description.trim(),
        intended_share_pct: parseFloat(joinForm.intended_share_pct),
        note: joinForm.note.trim() || undefined
      })
      
      setJoinSuccess(true)
      // 3秒后关闭模态框
      setTimeout(() => {
        setShowJoinModal(false)
        setJoinSuccess(false)
        setJoinForm({
          desired_role: 'MEMBER',
          duty_description: '',
          intended_share_pct: '',
          note: ''
        })
      }, 2000)
    } catch (err: any) {
      console.error('Failed to submit join request:', err)
      const errorMsg = err.response?.data?.detail || '提交申请失败，请稍后重试'
      setJoinError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg))
    } finally {
      setJoinSubmitting(false)
    }
  }

  // 处理审核加入申请
  const handleReviewRequest = async (approved: boolean) => {
    if (!reviewForm.requestId) return
    
    // 如果通过且有股份，验证扣除总额
    const shareAmount = reviewForm.actual_share_pct ? parseFloat(reviewForm.actual_share_pct) : 0
    if (approved && shareAmount > 0) {
      const totalDeduction = reviewForm.deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
      if (Math.abs(totalDeduction - shareAmount) > 0.01) {
        alert(`扣除总额 (${totalDeduction.toFixed(2)}%) 必须等于分配股份 (${shareAmount.toFixed(2)}%)`)
        return
      }
      // 检查每个扣除是否有效
      for (const d of reviewForm.deductions) {
        const share = project?.shares?.find(s => s.id === d.share_id)
        if (share && parseFloat(d.amount) > parseFloat(share.percentage)) {
          alert(`${share.owner_name} 只有 ${share.percentage}% 股份，无法扣除 ${d.amount}%`)
          return
        }
      }
    }
    
    try {
      setReviewingId(reviewForm.requestId)
      
      // 构建扣除列表
      const deductions = reviewForm.deductions
        .filter(d => parseFloat(d.amount) > 0)
        .map(d => ({ share_id: d.share_id, amount: parseFloat(d.amount) }))
      
      await projectService.reviewJoinRequest(reviewForm.requestId, {
        approved,
        actual_share_pct: shareAmount || undefined,
        deductions: deductions.length > 0 ? deductions : undefined,
        comment: reviewForm.comment || undefined
      })
      
      // 更新列表
      setJoinRequests(prev => prev.map(r => 
        r.id === reviewForm.requestId 
          ? { ...r, status: approved ? 'APPROVED' : 'REJECTED' } 
          : r
      ))
      
      // 如果通过，刷新项目数据
      if (approved) {
        const updatedProject = await projectService.get(projectId)
        setProject(updatedProject)
      }
      
      setShowReviewModal(false)
      setReviewForm({ requestId: null, approved: true, actual_share_pct: '', deductions: [], comment: '' })
    } catch (err: any) {
      console.error('Failed to review join request:', err)
      alert(err.response?.data?.detail || '审核失败')
    } finally {
      setReviewingId(null)
    }
  }

  // 打开审核模态框
  const openReviewModal = (request: ProjectJoinRequest, approved: boolean) => {
    // 默认从第一个用户股权方扣除全部
    const userShares = project?.shares?.filter(s => s.owner_type === 'USER') || []
    const defaultDeductions = userShares.length > 0 
      ? [{ share_id: userShares[0].id, amount: request.intended_share_pct?.toString() || '0' }]
      : []
    
    setReviewForm({
      requestId: request.id,
      approved,
      actual_share_pct: request.intended_share_pct?.toString() || '',
      deductions: defaultDeductions,
      comment: ''
    })
    setShowReviewModal(true)
  }
  
  // 更新扣除金额
  const updateDeduction = (shareId: number, amount: string) => {
    setReviewForm(f => {
      const existing = f.deductions.find(d => d.share_id === shareId)
      if (existing) {
        return {
          ...f,
          deductions: f.deductions.map(d => 
            d.share_id === shareId ? { ...d, amount } : d
          )
        }
      } else {
        return {
          ...f,
          deductions: [...f.deductions, { share_id: shareId, amount }]
        }
      }
    })
  }
  
  // 获取扣除金额
  const getDeductionAmount = (shareId: number): string => {
    return reviewForm.deductions.find(d => d.share_id === shareId)?.amount || ''
  }
  
  // 计算扣除总额
  const getTotalDeduction = (): number => {
    return reviewForm.deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
  }
  
  // 打开调整股权模态框
  const openAdjustSharesModal = () => {
    if (!project?.shares) return
    setAdjustSharesForm({
      shares: project.shares.map(s => ({
        owner_type: s.owner_type,
        owner_id: s.owner_id,
        owner_name: s.owner_name || '',
        percentage: parseFloat(s.percentage).toString(),
        note: s.note || ''
      })),
      reason: ''
    })
    setShowAdjustSharesModal(true)
  }
  
  // 打开编辑项目模态框
  const openEditModal = () => {
    if (!project) return
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      business_type: project.business_type || '',
      industry: project.industry || '',
      region: project.region || ''
    })
    setEditError(null)
    setShowEditModal(true)
  }
  
  // 提交编辑项目
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    
    if (!editForm.name.trim()) {
      setEditError('项目名称不能为空')
      return
    }
    
    setEditLoading(true)
    setEditError(null)
    
    try {
      const updated = await projectService.update(projectId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        business_type: editForm.business_type || undefined,
        industry: editForm.industry || undefined,
        region: editForm.region || undefined
      })
      setProject(updated)
      setShowEditModal(false)
    } catch (err: any) {
      console.error('Error updating project:', err)
      setEditError(err?.response?.data?.detail || '更新失败')
    } finally {
      setEditLoading(false)
    }
  }
  
  // 打开设置模态框
  const openSettingsModal = () => {
    if (!project) return
    setSettingsForm({
      business_status: project.business_status as any || 'ONGOING',
      visibility_scope_type: project.visibility_scope_type as any || 'PUBLIC',
      visibility_min_role_level: project.visibility_min_role_level || 1
    })
    setSettingsError(null)
    setShowSettingsModal(true)
  }
  
  // 提交设置
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    
    setSettingsLoading(true)
    setSettingsError(null)
    
    try {
      const updated = await projectService.update(projectId, {
        business_status: settingsForm.business_status,
        visibility_scope_type: settingsForm.visibility_scope_type,
        visibility_min_role_level: settingsForm.visibility_min_role_level
      })
      setProject(updated)
      setShowSettingsModal(false)
    } catch (err: any) {
      console.error('Error updating project settings:', err)
      setSettingsError(err?.response?.data?.detail || '更新失败')
    } finally {
      setSettingsLoading(false)
    }
  }
  
  // 打开编辑事件模态框
  const openEditEventModal = (event: ProjectEvent) => {
    setEditingEvent(event)
    setEditEventForm({
      title: event.title,
      description: event.description || '',
      edit_reason: ''
    })
    setEditEventError(null)
    setShowEditEventModal(true)
  }
  
  // 提交事件编辑
  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent) return
    
    setEditEventLoading(true)
    setEditEventError(null)
    
    try {
      const updated = await projectService.updateEvent(projectId, editingEvent.id, {
        title: editEventForm.title,
        description: editEventForm.description,
        edit_reason: editEventForm.edit_reason
      })
      
      // 更新本地状态
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? updated : e))
      setShowEditEventModal(false)
      toast.success('事件已更新')
    } catch (err: any) {
      console.error('Error updating event:', err)
      setEditEventError(err?.response?.data?.detail || '更新失败')
    } finally {
      setEditEventLoading(false)
    }
  }
  
  // 查看事件编辑历史
  const viewEventHistory = async (eventId: number) => {
    setViewingHistoryEventId(eventId)
    setEventHistoryLoading(true)
    setShowEventHistory(true)
    
    try {
      const history = await projectService.getEventEditHistory(projectId, eventId)
      setEventHistory(history)
    } catch (err) {
      console.error('Error fetching event history:', err)
      setEventHistory([])
    } finally {
      setEventHistoryLoading(false)
    }
  }
  
  // 检查用户是否可以编辑事件
  const canEditEvent = user && (user.is_admin || isMember)
  
  // 打开新建事件模态框
  const openCreateEventModal = () => {
    setCreateEventForm({
      event_type: 'NOTE',
      title: '',
      description: ''
    })
    setCreateEventError(null)
    setShowCreateEventModal(true)
  }
  
  // 提交新建事件
  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setCreateEventLoading(true)
    setCreateEventError(null)
    
    try {
      const newEvent = await projectService.createEvent(projectId, {
        event_type: createEventForm.event_type,
        title: createEventForm.title,
        description: createEventForm.description || undefined
      })
      
      // 将新事件添加到列表开头
      setEvents(prev => [newEvent, ...prev])
      setShowCreateEventModal(false)
      toast.success('动态已发布')
    } catch (err: any) {
      console.error('Error creating event:', err)
      setCreateEventError(err?.response?.data?.detail || '发布失败')
    } finally {
      setCreateEventLoading(false)
    }
  }
  
  // 更新股权比例
  const updateSharePercentage = (index: number, percentage: string) => {
    setAdjustSharesForm(f => ({
      ...f,
      shares: f.shares.map((s, i) => i === index ? { ...s, percentage } : s)
    }))
  }
  
  // 添加新股权方
  const addNewShare = () => {
    setAdjustSharesForm(f => ({
      ...f,
      shares: [...f.shares, { owner_type: 'USER', owner_id: 0, owner_name: '', percentage: '0', note: '' }]
    }))
  }
  
  // 移除股权方
  const removeShare = (index: number) => {
    const share = adjustSharesForm.shares[index]
    // 不能移除元征的股权
    if (share.owner_type === 'ORG' && share.owner_id === 0) {
      alert('元征固定持股51%，不能移除')
      return
    }
    setAdjustSharesForm(f => ({
      ...f,
      shares: f.shares.filter((_, i) => i !== index)
    }))
  }
  
  // 计算股权总额
  const getTotalSharePercentage = (): number => {
    return adjustSharesForm.shares.reduce((sum, s) => sum + (parseFloat(s.percentage) || 0), 0)
  }
  
  // 搜索用户
  const searchUsers = async (query: string) => {
    if (!query || query.length < 1) {
      setUserSearchResults([])
      return
    }
    
    try {
      setUserSearching(true)
      // 使用userService进行搜索
      const data = await userService.list({ search: query, limit: 10 })
      // 过滤掉已是成员的用户
      const memberIds = project?.members?.map(m => m.user_id) || []
      // data 是数组格式
      const users = Array.isArray(data) ? data : (data as any).items || []
      const filtered = users.filter((u: any) => !memberIds.includes(u.id))
      setUserSearchResults(filtered)
    } catch (err) {
      console.error('Failed to search users:', err)
    } finally {
      setUserSearching(false)
    }
  }
  
  // 选择被邀请人
  const selectInvitee = (user: any) => {
    setInviteForm(f => ({
      ...f,
      invitee_id: user.id,
      invitee_name: user.name
    }))
    setUserSearchQuery('')
    setUserSearchResults([])
  }
  
  // 提交邀请
  const handleInvite = async () => {
    if (!inviteForm.invitee_id) {
      alert('请选择要邀请的用户')
      return
    }
    
    try {
      setInviteLoading(true)
      await projectService.createInvitation(projectId, {
        invitee_id: inviteForm.invitee_id,
        proposed_role: inviteForm.proposed_role,
        proposed_duty: inviteForm.proposed_duty || undefined,
        proposed_share_pct: inviteForm.proposed_share_pct ? parseFloat(inviteForm.proposed_share_pct) : undefined,
        message: inviteForm.message || undefined
      })
      
      setShowInviteModal(false)
      setInviteForm({
        invitee_id: 0,
        invitee_name: '',
        proposed_role: 'MEMBER',
        proposed_duty: '',
        proposed_share_pct: '',
        message: ''
      })
      alert('邀请已发送！')
    } catch (err: any) {
      console.error('Failed to invite:', err)
      alert(err.response?.data?.detail || '邀请发送失败')
    } finally {
      setInviteLoading(false)
    }
  }
  
  // 提交股权调整
  const handleAdjustShares = async () => {
    const total = getTotalSharePercentage()
    if (Math.abs(total - 100) > 0.01) {
      alert(`股权总额必须为100%，当前为 ${total.toFixed(2)}%`)
      return
    }
    
    // 检查元征是否保持51%
    const orgShare = adjustSharesForm.shares.find(s => s.owner_type === 'ORG' && s.owner_id === 0)
    if (!orgShare || parseFloat(orgShare.percentage) !== 51) {
      alert('元征必须固定持股51%')
      return
    }
    
    if (!adjustSharesForm.reason.trim()) {
      alert('请填写调整原因')
      return
    }
    
    try {
      setAdjustSharesLoading(true)
      await projectService.adjustShares(projectId, {
        shares: adjustSharesForm.shares.map(s => ({
          owner_type: s.owner_type,
          owner_id: s.owner_id,
          percentage: parseFloat(s.percentage),
          note: s.note || undefined
        })),
        reason: adjustSharesForm.reason
      })
      
      // 刷新项目数据
      const updatedProject = await projectService.get(projectId)
      setProject(updatedProject)
      
      setShowAdjustSharesModal(false)
    } catch (err: any) {
      console.error('Failed to adjust shares:', err)
      alert(err.response?.data?.detail || '调整股权失败')
    } finally {
      setAdjustSharesLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: colors.textSecondary }}>加载项目详情...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
          <p className="mb-4" style={{ color: colors.textSecondary }}>{error || '项目不存在'}</p>
          <Link href="/projects" className="btn-outline py-2 px-4 text-sm">
            返回项目列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* 顶部导航 */}
      <div 
        className="sticky top-16 z-20 px-8 py-4"
        style={{ 
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${colors.border}`
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 rounded-full transition-colors duration-300 hover:bg-white/10"
              style={{ color: colors.textSecondary }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-medium" style={{ color: colors.text }}>
                {project.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: statusColors[project.business_status]?.bg,
                    color: statusColors[project.business_status]?.text,
                  }}
                >
                  {statusColors[project.business_status]?.label}
                </span>
                {project.review_status !== 'APPROVED' && (
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: reviewStatusColors[project.review_status]?.bg,
                      color: reviewStatusColors[project.review_status]?.text,
                    }}
                  >
                    {reviewStatusColors[project.review_status]?.label}
                  </span>
                )}
              </div>
            </div>
          </div>

            <div className="flex items-center gap-2">
            {/* 非成员显示加入按钮 */}
            {!isMember && (
              <button 
                onClick={() => setShowJoinModal(true)}
                className="btn-outline py-2 px-4 text-sm flex items-center gap-2"
              >
                <UserPlus size={16} />
                加入项目
              </button>
            )}
            
            {canEdit && (
              <>
                <button 
                  onClick={openEditModal}
                className="btn-outline py-2 px-4 text-sm flex items-center gap-2"
              >
                <Edit3 size={16} />
                编辑
                </button>
                <button 
                  onClick={openSettingsModal}
                  className="btn-outline py-2 px-4 text-sm flex items-center gap-2"
                >
                <Settings size={16} />
                设置
              </button>
              </>
          )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div 
        className="px-8 py-4"
        style={{ borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-1">
          {(() => {
            const pendingJoinRequests = joinRequests.filter(r => r.status === 'PENDING').length
            const tabs = [
            { key: 'overview', label: '概览', icon: <Briefcase size={16} /> },
              { key: 'demands', label: '需求', icon: <FileText size={16} />, count: demands.length > 0 ? demands.length : undefined },
            { key: 'timeline', label: '时间线', icon: <History size={16} /> },
              { key: 'members', label: '成员', icon: <Users size={16} />, pendingCount: canEdit ? pendingJoinRequests : undefined },
            { key: 'shares', label: '股权', icon: <TrendingUp size={16} /> },
            ]
            return tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-300"
              style={{
                background: activeTab === tab.key ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: activeTab === tab.key ? colors.text : colors.textSecondary,
              }}
            >
              {tab.icon}
              {tab.label}
                {/* 普通计数（蓝色） */}
                {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                    {tab.count}
                  </span>
                )}
                {/* 待审核计数（红色警示） */}
                {'pendingCount' in tab && tab.pendingCount !== undefined && tab.pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 animate-pulse">
                    {tab.pendingCount}
                  </span>
                )}
            </button>
            ))
          })()}
        </div>
      </div>

      {/* 内容区域 */}
      <div ref={containerRef} className="px-8 py-8 max-w-5xl mx-auto">
        {/* 概览 Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 基本信息卡片 */}
            <div 
              className="glass-card p-6"
              style={{ border: `1px solid ${colors.border}` }}
            >
              <h2 className="text-lg font-medium mb-4" style={{ color: colors.text }}>
                项目信息
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>描述</p>
                  <p className="text-sm" style={{ color: colors.text }}>
                    {project.description || '暂无描述'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>业务类型</p>
                    <p className="text-sm" style={{ color: colors.text }}>{project.business_type}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>行业</p>
                    <p className="text-sm" style={{ color: colors.text }}>{project.industry || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>区域</p>
                    <p className="text-sm" style={{ color: colors.text }}>{project.region || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>创建者</p>
                    <p className="text-sm" style={{ color: colors.text }}>{project.creator_name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-6 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
                <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
                  <Clock size={14} />
                  创建于 {new Date(project.created_at).toLocaleDateString('zh-CN')}
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: colors.textSecondary }}>
                  <Edit3 size={14} />
                  更新于 {new Date(project.updated_at).toLocaleDateString('zh-CN')}
                </div>
              </div>
            </div>

            {/* 快速统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div 
                className="glass-card p-4 text-center"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <Users size={20} className="mx-auto mb-2" style={{ color: colors.textSecondary }} />
                <p className="text-2xl font-light" style={{ color: colors.text }}>
                  {project.members?.length || 0}
                </p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>成员</p>
              </div>
              <div 
                className="glass-card p-4 text-center"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <TrendingUp size={20} className="mx-auto mb-2" style={{ color: colors.textSecondary }} />
                <p className="text-2xl font-light" style={{ color: colors.text }}>
                  {project.shares?.length || 0}
                </p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>股权方</p>
              </div>
              <div 
                className="glass-card p-4 text-center"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <History size={20} className="mx-auto mb-2" style={{ color: colors.textSecondary }} />
                <p className="text-2xl font-light" style={{ color: colors.text }}>
                  {events.length}
                </p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>事件记录</p>
              </div>
              <div 
                className="glass-card p-4 text-center"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <DollarSign size={20} className="mx-auto mb-2" style={{ color: colors.textSecondary }} />
                <p className="text-2xl font-light" style={{ color: colors.text }}>
                  -
                </p>
                <p className="text-xs" style={{ color: colors.textSecondary }}>Token 流转</p>
              </div>
            </div>

            {/* 最近动态 */}
            <div 
              className="glass-card p-6"
              style={{ border: `1px solid ${colors.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium" style={{ color: colors.text }}>
                  最近动态
                </h2>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className="text-sm flex items-center gap-1 transition-colors duration-300 hover:opacity-80"
                  style={{ color: colors.textSecondary }}
                >
                  查看全部
                  <ChevronRight size={16} />
                </button>
              </div>
              
              {eventsLoading ? (
                <p className="text-sm py-4" style={{ color: colors.textSecondary }}>加载中...</p>
              ) : events.length === 0 ? (
                <p className="text-sm py-4" style={{ color: colors.textSecondary }}>暂无动态</p>
              ) : (
                <div className="space-y-4">
                  {events.slice(0, 5).map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                      >
                        {eventIcons[event.event_type] || <History size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: colors.text }}>
                          {event.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                          {event.created_by_name} · {new Date(event.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 需求 Tab */}
        {activeTab === 'demands' && (
          <div 
            className="glass-card p-6"
            style={{ border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium" style={{ color: colors.text }}>
                项目需求
              </h2>
              <Link
                href="/demands"
                className="text-sm flex items-center gap-1 transition-colors duration-300 hover:opacity-80"
                style={{ color: colors.textSecondary }}
              >
                发布需求 <ChevronRight size={14} />
              </Link>
            </div>

            {demandsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-t-transparent rounded-full" 
                  style={{ borderColor: colors.textSecondary, borderTopColor: 'transparent' }} />
              </div>
            ) : demands.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={40} className="mx-auto mb-3 opacity-50" style={{ color: colors.textSecondary }} />
                <p style={{ color: colors.textSecondary }}>暂无需求</p>
                <Link
                  href="/demands"
                  className="inline-block mt-4 px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', color: colors.text }}
                >
                  发布第一个需求
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {demands.map((demand) => {
                  const statusInfo = {
                    'OPEN': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '进行中' },
                    'CLOSED': { bg: 'rgba(136, 136, 136, 0.1)', text: '#888888', label: '已关闭' },
                    'FULFILLED': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', label: '已完成' },
                    'CANCELLED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '已取消' },
                  }[demand.status] || { bg: 'rgba(136, 136, 136, 0.1)', text: '#888888', label: demand.status }
                  
                  return (
                    <div
                      key={demand.id}
                      className="p-4 rounded-xl cursor-pointer hover:bg-white/5 transition-all"
                      style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${colors.border}` }}
                      onClick={() => router.push(`/demands?id=${demand.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium" style={{ color: colors.text }}>
                              {demand.title}
                            </h3>
                            <span
                              className="text-xs px-2 py-1 rounded-full"
                              style={{ background: statusInfo.bg, color: statusInfo.text }}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2 mb-3" style={{ color: colors.textSecondary }}>
                            {demand.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs" style={{ color: colors.textSecondary }}>
                            <span className="flex items-center gap-1">
                              <Briefcase size={12} />
                              {demand.business_type}
                            </span>
                            {demand.industry && (
                              <span>{demand.industry}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <MessageSquare size={12} />
                              {demand.response_count || 0} 响应
                            </span>
                            <span>
                              {new Date(demand.created_at).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                          {demand.expected_reward && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-xs" style={{ color: colors.textSecondary }}>激励:</span>
                              {demand.expected_reward.equity && (
                                <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400">
                                  股份 {demand.expected_reward.equity}
                                </span>
                              )}
                              {demand.expected_reward.token && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                                  Token {demand.expected_reward.token}
                                </span>
                              )}
                              {demand.expected_reward.other && (
                                <span className="text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-400">
                                  {demand.expected_reward.other}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight size={18} style={{ color: colors.textSecondary }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 时间线 Tab */}
        {activeTab === 'timeline' && (
          <div 
            className="glass-card p-6"
            style={{ border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-light tracking-wide" style={{ color: colors.text, letterSpacing: '0.1em' }}>
              项目时间线
            </h2>
              {canEditEvent && (
                <button
                  onClick={openCreateEventModal}
                  className="group flex items-center gap-3 px-5 py-2.5 text-sm tracking-wider transition-all duration-300"
                  style={{
                    background: 'transparent',
                    color: colors.text,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    letterSpacing: '0.15em'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <Plus size={14} strokeWidth={1} />
                  新建动态
                </button>
              )}
            </div>
            
            {eventsLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p style={{ color: colors.textSecondary }}>加载时间线...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <History size={48} className="mx-auto mb-4 opacity-30" style={{ color: colors.textSecondary }} />
                <p style={{ color: colors.textSecondary }}>暂无事件记录</p>
              </div>
            ) : (
              <div className="relative">
                {/* 时间线竖线 */}
                <div 
                  className="absolute left-4 top-0 bottom-0 w-px"
                  style={{ background: colors.border }}
                />
                
                <div className="space-y-6">
                  {events.map((event, index) => (
                    <div key={event.id} className="flex items-start gap-4 relative">
                      {/* 时间点 */}
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                        style={{ 
                          background: colors.bg,
                          border: `2px solid ${colors.border}`
                        }}
                      >
                        {eventIcons[event.event_type] || <History size={14} style={{ color: colors.textSecondary }} />}
                      </div>
                      
                      {/* 事件内容 */}
                      <div 
                        className="flex-1 p-4 rounded-xl transition-colors duration-300 hover:bg-white/5"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${colors.border}`
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                              {event.title}
                            </p>
                            {event.description && (
                              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                                {event.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: colors.textSecondary }}>
                              <span>{event.created_by_name}</span>
                              <span>·</span>
                              <span>{new Date(event.created_at).toLocaleString('zh-CN')}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {/* 编辑按钮 */}
                            {canEditEvent && (
                              <button
                                onClick={() => openEditEventModal(event)}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                title="编辑"
                              >
                                <Edit3 size={14} style={{ color: colors.textSecondary }} />
                              </button>
                            )}
                            {/* 查看历史按钮 */}
                            <button
                              onClick={() => viewEventHistory(event.id)}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                              title="查看编辑历史"
                            >
                              <History size={14} style={{ color: colors.textSecondary }} />
                            </button>
                            {/* 类型标签 */}
                          <span 
                              className="text-xs px-2 py-1 rounded"
                            style={{ 
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: colors.textSecondary
                            }}
                          >
                            {event.event_type}
                          </span>
                          </div>
                        </div>

                        {/* 状态变更 */}
                        {event.old_status && event.new_status && (
                          <div 
                            className="mt-3 pt-3 flex items-center gap-2 text-xs"
                            style={{ borderTop: `1px solid ${colors.border}` }}
                          >
                            <span style={{ color: colors.textSecondary }}>状态变更：</span>
                            <span 
                              className="px-2 py-0.5 rounded"
                              style={{
                                background: statusColors[event.old_status]?.bg || 'rgba(136, 136, 136, 0.1)',
                                color: statusColors[event.old_status]?.text || colors.textSecondary,
                              }}
                            >
                              {statusColors[event.old_status]?.label || event.old_status}
                            </span>
                            <ChevronRight size={14} style={{ color: colors.textSecondary }} />
                            <span 
                              className="px-2 py-0.5 rounded"
                              style={{
                                background: statusColors[event.new_status]?.bg || 'rgba(136, 136, 136, 0.1)',
                                color: statusColors[event.new_status]?.text || colors.textSecondary,
                              }}
                            >
                              {statusColors[event.new_status]?.label || event.new_status}
                            </span>
                          </div>
                        )}

                        {/* 股权变更快照 */}
                        {event.share_change_snapshot && (
                          <div 
                            className="mt-3 pt-3 text-xs space-y-2"
                            style={{ borderTop: `1px solid ${colors.border}` }}
                          >
                            <p className="font-medium" style={{ color: colors.text }}>股权变更详情</p>
                            <div className="grid grid-cols-2 gap-4">
                              {/* 变更前 */}
                              <div>
                                <p className="mb-1" style={{ color: colors.textSecondary }}>变更前：</p>
                                <div className="space-y-1">
                                  {(event.share_change_snapshot.old || []).map((s: any, i: number) => (
                                    <div key={i} className="flex justify-between">
                                      <span style={{ color: colors.textSecondary }}>
                                        {s.owner_type === 'ORG' ? '元征' : (s.owner_name || `用户${s.owner_id}`)}
                                      </span>
                                      <span style={{ color: colors.text }}>{parseFloat(s.percentage).toFixed(1)}%</span>
                          </div>
                                  ))}
                                </div>
                              </div>
                              {/* 变更后 */}
                              <div>
                                <p className="mb-1" style={{ color: colors.textSecondary }}>变更后：</p>
                                <div className="space-y-1">
                                  {(event.share_change_snapshot.new || []).map((s: any, i: number) => {
                                    const oldShare = (event.share_change_snapshot.old || []).find(
                                      (o: any) => o.owner_type === s.owner_type && o.owner_id === s.owner_id
                                    )
                                    const oldPct = oldShare ? parseFloat(oldShare.percentage) : 0
                                    const newPct = parseFloat(s.percentage)
                                    const diff = newPct - oldPct
                                    return (
                                      <div key={i} className="flex justify-between items-center">
                                        <span style={{ color: colors.textSecondary }}>
                                          {s.owner_type === 'ORG' ? '元征' : (s.owner_name || `用户${s.owner_id}`)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <span style={{ color: colors.text }}>{newPct.toFixed(1)}%</span>
                                          {diff !== 0 && (
                                            <span style={{ color: diff > 0 ? '#4ade80' : '#ef4444', fontSize: '10px' }}>
                                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 成员 Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* 待审核的加入申请 - 仅负责人/管理员可见 */}
            {canEdit && joinRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <div 
                className="glass-card p-6"
                style={{ border: `1px solid rgba(251, 191, 36, 0.3)`, background: 'rgba(251, 191, 36, 0.02)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <h2 className="text-lg font-medium" style={{ color: colors.text }}>
                    待审核的加入申请
                  </h2>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' }}
                  >
                    {joinRequests.filter(r => r.status === 'PENDING').length} 个待处理
                  </span>
                </div>
                
                <div className="space-y-3">
                  {joinRequests.filter(r => r.status === 'PENDING').map((request) => (
                    <div 
                      key={request.id}
                      className="p-4 rounded-xl"
                      style={{ background: 'rgba(255, 255, 255, 0.03)', border: `1px solid ${colors.border}` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0"
                            style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                          >
                            {request.applicant_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium" style={{ color: colors.text }}>
                                {request.applicant_name}
                              </p>
                              <span 
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  background: request.desired_role === 'OWNER' 
                                    ? 'rgba(251, 191, 36, 0.1)' 
                                    : 'rgba(59, 130, 246, 0.1)',
                                  color: request.desired_role === 'OWNER' ? '#fbbf24' : '#3b82f6'
                                }}
                              >
                                申请成为{request.desired_role === 'OWNER' ? '负责人' : '普通成员'}
                              </span>
                            </div>
                            <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                              <strong>职责：</strong>{request.duty_description}
                            </p>
                            {request.intended_share_pct !== undefined && request.intended_share_pct !== null && (
                              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                                <strong>意向股份：</strong>{request.intended_share_pct}%
                              </p>
                            )}
                            {request.note && (
                              <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                                <strong>备注：</strong>{request.note}
                              </p>
                            )}
                            <p className="text-xs mt-2" style={{ color: colors.textSecondary }}>
                              申请时间：{new Date(request.created_at).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => openReviewModal(request, false)}
                            disabled={reviewingId === request.id}
                            className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all hover:opacity-80"
                            style={{ 
                              background: 'rgba(239, 68, 68, 0.1)', 
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            <XCircle size={14} />
                            拒绝
                          </button>
                          <button
                            onClick={() => openReviewModal(request, true)}
                            disabled={reviewingId === request.id}
                            className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all hover:opacity-80"
                            style={{ 
                              background: 'rgba(74, 222, 128, 0.1)', 
                              color: '#4ade80',
                              border: '1px solid rgba(74, 222, 128, 0.3)'
                            }}
                          >
                            {reviewingId === request.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            通过
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 项目成员列表 */}
          <div 
            className="glass-card p-6"
            style={{ border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium" style={{ color: colors.text }}>
                项目成员
              </h2>
              {canEdit && (
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="btn-outline py-2 px-4 text-sm flex items-center gap-2"
                  >
                  <UserPlus size={16} />
                  邀请成员
                </button>
              )}
            </div>
            
            {project.members?.length === 0 ? (
              <p className="text-center py-12" style={{ color: colors.textSecondary }}>
                暂无成员
              </p>
            ) : (
              <div className="space-y-3">
                {project.members?.map((member) => (
                  <div 
                    key={member.user_id}
                    className="flex items-center justify-between p-4 rounded-xl transition-colors duration-300 hover:bg-white/5"
                    style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{ background: 'rgba(255, 255, 255, 0.1)', color: colors.text }}
                      >
                        {member.user_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: colors.text }}>
                          {member.user_name}
                        </p>
                        {member.duty_description && (
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {member.duty_description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: member.role_in_project === 'OWNER' 
                            ? 'rgba(251, 191, 36, 0.1)' 
                            : 'rgba(255, 255, 255, 0.05)',
                          color: member.role_in_project === 'OWNER' 
                            ? '#fbbf24' 
                            : colors.textSecondary,
                        }}
                      >
                        {member.role_in_project === 'OWNER' ? '项目负责人' : 
                         member.role_in_project === 'RECORDER' ? '记录员' : '成员'}
                      </span>
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        {new Date(member.join_time).toLocaleDateString('zh-CN')} 加入
                      </span>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>

            {/* 已处理的申请历史 - 仅负责人/管理员可见 */}
            {canEdit && joinRequests.filter(r => r.status !== 'PENDING').length > 0 && (
              <div 
                className="glass-card p-6"
                style={{ border: `1px solid ${colors.border}` }}
              >
                <h2 className="text-lg font-medium mb-4" style={{ color: colors.text }}>
                  申请历史
                </h2>
                
                <div className="space-y-2">
                  {joinRequests.filter(r => r.status !== 'PENDING').map((request) => (
                    <div 
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                          style={{ background: 'rgba(255, 255, 255, 0.05)', color: colors.textSecondary }}
                        >
                          {request.applicant_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: colors.text }}>
                            {request.applicant_name}
                          </p>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {new Date(request.created_at).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <span 
                        className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: request.status === 'APPROVED' 
                            ? 'rgba(74, 222, 128, 0.1)' 
                            : 'rgba(239, 68, 68, 0.1)',
                          color: request.status === 'APPROVED' ? '#4ade80' : '#ef4444'
                        }}
                      >
                        {request.status === 'APPROVED' ? '已通过' : '已拒绝'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 股权 Tab */}
        {activeTab === 'shares' && (
          <div 
            className="glass-card p-6"
            style={{ border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium" style={{ color: colors.text }}>
                股权结构
              </h2>
              {canEdit && (
                <button 
                  onClick={openAdjustSharesModal}
                  className="btn-outline py-2 px-4 text-sm flex items-center gap-2"
                >
                  <Settings size={16} />
                  调整股权
                </button>
              )}
            </div>
            
            {project.shares?.length === 0 ? (
              <p className="text-center py-12" style={{ color: colors.textSecondary }}>
                暂无股权信息
              </p>
            ) : (
              <div className="space-y-4">
                {/* 饼图可视化（简易版） */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {project.shares?.map((share, index) => (
                    <div 
                      key={share.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                      style={{ 
                        background: `hsla(${(index * 60) % 360}, 50%, 50%, 0.1)`,
                        border: `1px solid hsla(${(index * 60) % 360}, 50%, 50%, 0.3)`
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ background: `hsl(${(index * 60) % 360}, 50%, 50%)` }}
                      />
                      <span className="text-sm" style={{ color: colors.text }}>
                        {share.owner_name}: {parseFloat(share.percentage).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* 详细列表 */}
                <div className="space-y-3">
                  {project.shares?.map((share) => (
                    <div 
                      key={share.id}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                          style={{ 
                            background: share.owner_type === 'ORG' 
                              ? 'rgba(147, 51, 234, 0.2)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: colors.text 
                          }}
                        >
                          {share.owner_type === 'ORG' ? <Briefcase size={18} /> : share.owner_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: colors.text }}>
                            {share.owner_name}
                          </p>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {share.owner_type === 'ORG' ? '组织' : '个人'} · 
                            自 {new Date(share.effective_from).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p 
                          className="text-2xl font-light"
                          style={{ color: colors.text }}
                        >
                          {parseFloat(share.percentage).toFixed(1)}%
                        </p>
                        {share.note && (
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {share.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer 
        className="text-center py-8"
        style={{ color: colors.textSecondary }}
      >
        <p className="text-xs">
          © 2024 元征 · 合伙人赋能平台
        </p>
      </footer>

      {/* 加入项目模态框 */}
      {showJoinModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowJoinModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ 
              background: 'rgba(20, 20, 20, 0.95)',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* 模态框头部 */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
                  加入项目
                </h2>
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  申请加入「{project.name}」
                </p>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="p-2 rounded-full transition-colors hover:bg-white/10"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 成功提示 */}
            {joinSuccess ? (
              <div className="text-center py-8">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(74, 222, 128, 0.1)' }}
                >
                  <CheckCircle size={32} style={{ color: '#4ade80' }} />
                </div>
                <h3 className="text-lg font-medium mb-2" style={{ color: colors.text }}>
                  申请已提交
                </h3>
                <p className="text-sm" style={{ color: colors.textSecondary }}>
                  项目负责人将审核您的申请，请耐心等待
                </p>
              </div>
            ) : (
              <form onSubmit={handleJoinSubmit} className="space-y-5">
                {/* 错误提示 */}
                {joinError && (
                  <div 
                    className="p-3 rounded-lg flex items-center gap-2 text-sm"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                  >
                    <AlertCircle size={16} />
                    {joinError}
                  </div>
                )}

                {/* 加入后身份 - 必填 */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    加入后身份 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setJoinForm(f => ({ ...f, desired_role: 'OWNER' }))}
                      className="p-4 rounded-xl text-left transition-all"
                      style={{ 
                        background: joinForm.desired_role === 'OWNER' 
                          ? 'rgba(251, 191, 36, 0.1)' 
                          : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${joinForm.desired_role === 'OWNER' ? '#fbbf24' : colors.border}`,
                        color: joinForm.desired_role === 'OWNER' ? '#fbbf24' : colors.textSecondary
                      }}
                    >
                      <div className="font-medium" style={{ color: joinForm.desired_role === 'OWNER' ? colors.text : colors.textSecondary }}>
                        负责人
                      </div>
                      <p className="text-xs mt-1">负责项目决策与管理</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setJoinForm(f => ({ ...f, desired_role: 'MEMBER' }))}
                      className="p-4 rounded-xl text-left transition-all"
                      style={{ 
                        background: joinForm.desired_role === 'MEMBER' 
                          ? 'rgba(59, 130, 246, 0.1)' 
                          : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${joinForm.desired_role === 'MEMBER' ? '#3b82f6' : colors.border}`,
                        color: joinForm.desired_role === 'MEMBER' ? '#3b82f6' : colors.textSecondary
                      }}
                    >
                      <div className="font-medium" style={{ color: joinForm.desired_role === 'MEMBER' ? colors.text : colors.textSecondary }}>
                        普通成员
                      </div>
                      <p className="text-xs mt-1">参与项目协作</p>
                    </button>
                  </div>
                </div>

                {/* 加入后职责 - 必填 */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    加入项目后职责 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={joinForm.duty_description}
                    onChange={(e) => setJoinForm(f => ({ ...f, duty_description: e.target.value }))}
                    placeholder="请描述您加入后将负责的工作..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  />
                </div>

                {/* 意向获得股份 - 必填 */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    意向获得股份 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="49"
                      value={joinForm.intended_share_pct}
                      onChange={(e) => setJoinForm(f => ({ ...f, intended_share_pct: e.target.value }))}
                      placeholder="例如：5"
                      className="w-full px-4 py-3 pr-12 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                    />
                    <span 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                      style={{ color: colors.textSecondary }}
                    >
                      %
                    </span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: colors.textSecondary }}>
                    元征固定持有 51%，剩余 49% 由合伙人分配
                  </p>
                </div>

                {/* 备注 - 可选 */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    备注 <span style={{ color: colors.textSecondary }}>（可选）</span>
                  </label>
                  <textarea
                    value={joinForm.note}
                    onChange={(e) => setJoinForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="其他补充说明..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  />
                </div>

                {/* 提交按钮 */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: colors.textSecondary,
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={joinSubmitting}
                    className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                    style={{ 
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      opacity: joinSubmitting ? 0.6 : 1
                    }}
                  >
                    {joinSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        提交中...
                      </>
                    ) : (
                      '提交申请'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 审核确认模态框 */}
      {showReviewModal && reviewForm.requestId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowReviewModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl p-6"
            style={{ 
              background: 'rgba(20, 20, 20, 0.95)',
              border: `1px solid ${colors.border}`,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
                {reviewForm.approved ? '确认通过申请' : '确认拒绝申请'}
              </h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-2 rounded-full transition-colors hover:bg-white/10"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {reviewForm.approved && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      实际分配股份 <span style={{ color: colors.textSecondary }}>（可修改）</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="49"
                        value={reviewForm.actual_share_pct}
                        onChange={(e) => setReviewForm(f => ({ ...f, actual_share_pct: e.target.value }))}
                        className="w-full px-4 py-3 pr-12 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: `1px solid ${colors.border}`,
                          color: colors.text
                        }}
                      />
                      <span 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        %
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                      申请人意向股份，可根据实际情况调整
                    </p>
                  </div>

                  {/* 从多个股权方扣除 */}
                  {reviewForm.actual_share_pct && parseFloat(reviewForm.actual_share_pct) > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                        股份扣除分配 <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-3">
                        {project?.shares?.filter(s => s.owner_type === 'USER').map((share) => {
                          const deductAmount = getDeductionAmount(share.id)
                          const deductNum = parseFloat(deductAmount) || 0
                          const remaining = parseFloat(share.percentage) - deductNum
                          return (
                            <div
                              key={share.id}
                              className="p-3 rounded-xl"
                              style={{ 
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${deductNum > 0 ? '#3b82f6' : colors.border}`,
                              }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                                    style={{ background: 'rgba(255, 255, 255, 0.1)', color: colors.text }}
                                  >
                                    {share.owner_name?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <span style={{ color: colors.text }}>{share.owner_name}</span>
                                    <div className="text-xs" style={{ color: colors.textSecondary }}>
                                      当前: {parseFloat(share.percentage).toFixed(1)}%
                                      {deductNum > 0 && (
                                        <span style={{ color: '#ef4444' }}> → {remaining.toFixed(1)}%</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm" style={{ color: colors.textSecondary }}>扣除:</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={share.percentage}
                                  value={deductAmount}
                                  onChange={(e) => updateDeduction(share.id, e.target.value)}
                                  placeholder="0"
                                  className="flex-1 px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                                  style={{ 
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: `1px solid ${colors.border}`,
                                    color: colors.text
                                  }}
                                />
                                <span className="text-sm" style={{ color: colors.textSecondary }}>%</span>
                              </div>
    </div>
  )
                        })}
                      </div>
                      {/* 扣除总额提示 */}
                      <div className="mt-3 p-3 rounded-xl" style={{ 
                        background: Math.abs(getTotalDeduction() - parseFloat(reviewForm.actual_share_pct || '0')) < 0.01 
                          ? 'rgba(74, 222, 128, 0.1)' 
                          : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${Math.abs(getTotalDeduction() - parseFloat(reviewForm.actual_share_pct || '0')) < 0.01 ? '#4ade80' : '#ef4444'}`
                      }}>
                        <div className="flex justify-between text-sm">
                          <span style={{ color: colors.text }}>扣除总额:</span>
                          <span style={{ 
                            color: Math.abs(getTotalDeduction() - parseFloat(reviewForm.actual_share_pct || '0')) < 0.01 
                              ? '#4ade80' 
                              : '#ef4444' 
                          }}>
                            {getTotalDeduction().toFixed(2)}% / {parseFloat(reviewForm.actual_share_pct || '0').toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs mt-2" style={{ color: colors.textSecondary }}>
                        扣除总额必须等于分配股份，可从多个股权方扣除（元征51%固定不变）
                      </p>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  审批意见 <span style={{ color: colors.textSecondary }}>（可选）</span>
                </label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder={reviewForm.approved ? '欢迎加入...' : '请说明拒绝原因...'}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  取消
                </button>
                <button
                  onClick={() => handleReviewRequest(reviewForm.approved)}
                  disabled={reviewingId !== null}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{ 
                    background: reviewForm.approved 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff',
                    opacity: reviewingId !== null ? 0.6 : 1
                  }}
                >
                  {reviewingId !== null ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      {reviewForm.approved ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {reviewForm.approved ? '确认通过' : '确认拒绝'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 调整股权模态框 */}
      {showAdjustSharesModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowAdjustSharesModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ 
              background: 'linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)',
              border: `1px solid ${colors.border}`
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
                调整股权结构
              </h2>
              <button
                onClick={() => setShowAdjustSharesModal(false)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 股权列表 */}
              <div className="space-y-3">
                {adjustSharesForm.shares.map((share, index) => {
                  const isOrg = share.owner_type === 'ORG'
                  return (
                    <div
                      key={index}
                      className="p-4 rounded-xl"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${colors.border}`
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                            style={{ 
                              background: isOrg ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
                              color: isOrg ? '#ef4444' : '#60a5fa' 
                            }}
                          >
                            {isOrg ? '元' : share.owner_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <span style={{ color: colors.text }}>
                              {isOrg ? '元征' : (share.owner_name || `用户 ${share.owner_id}`)}
                            </span>
                            <div className="text-xs" style={{ color: colors.textSecondary }}>
                              {isOrg ? '组织固定持股' : '个人'}
                            </div>
                          </div>
                        </div>
                        {!isOrg && (
                          <button
                            onClick={() => removeShare(index)}
                            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            style={{ color: '#ef4444' }}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: colors.textSecondary }}>股份:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={share.percentage}
                          onChange={(e) => updateSharePercentage(index, e.target.value)}
                          disabled={isOrg}
                          className="flex-1 px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                          style={{ 
                            background: isOrg ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${colors.border}`,
                            color: isOrg ? colors.textSecondary : colors.text,
                            cursor: isOrg ? 'not-allowed' : 'text'
                          }}
                        />
                        <span className="text-sm" style={{ color: colors.textSecondary }}>%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* 股权总额 */}
              <div className="p-3 rounded-xl" style={{ 
                background: Math.abs(getTotalSharePercentage() - 100) < 0.01 
                  ? 'rgba(74, 222, 128, 0.1)' 
                  : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${Math.abs(getTotalSharePercentage() - 100) < 0.01 ? '#4ade80' : '#ef4444'}`
              }}>
                <div className="flex justify-between text-sm">
                  <span style={{ color: colors.text }}>股权总额:</span>
                  <span style={{ 
                    color: Math.abs(getTotalSharePercentage() - 100) < 0.01 ? '#4ade80' : '#ef4444' 
                  }}>
                    {getTotalSharePercentage().toFixed(2)}% / 100%
                  </span>
                </div>
              </div>
              
              {/* 调整原因 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  调整原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={adjustSharesForm.reason}
                  onChange={(e) => setAdjustSharesForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="请说明调整股权的原因..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowAdjustSharesModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleAdjustShares}
                  disabled={adjustSharesLoading}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{ 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    opacity: adjustSharesLoading ? 0.6 : 1
                  }}
                >
                  {adjustSharesLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      保存调整
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 邀请成员模态框 */}
      {showInviteModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowInviteModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ 
              background: 'linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)',
              border: `1px solid ${colors.border}`
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
                邀请成员加入
              </h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 搜索用户 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  选择用户 <span className="text-red-500">*</span>
                </label>
                {inviteForm.invitee_id ? (
                  <div 
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
                      >
                        {inviteForm.invitee_name.charAt(0)}
                      </div>
                      <span style={{ color: colors.text }}>{inviteForm.invitee_name}</span>
                    </div>
                    <button
                      onClick={() => setInviteForm(f => ({ ...f, invitee_id: 0, invitee_name: '' }))}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      style={{ color: colors.textSecondary }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value)
                        searchUsers(e.target.value)
                      }}
                      placeholder="输入用户名搜索..."
                      className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text
                      }}
                    />
                    {userSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 size={16} className="animate-spin" style={{ color: colors.textSecondary }} />
                      </div>
                    )}
                    {/* 搜索结果 */}
                    {userSearchResults.length > 0 && (
                      <div 
                        className="absolute w-full mt-2 rounded-xl overflow-hidden max-h-60 overflow-y-auto z-10"
                        style={{ 
                          background: '#1a1a1a',
                          border: `1px solid ${colors.border}`,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                        }}
                      >
                        {userSearchResults.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => selectInvitee(user)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                          >
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                              style={{ background: 'rgba(255, 255, 255, 0.1)', color: colors.text }}
                            >
                              {user.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div style={{ color: colors.text }}>{user.name}</div>
                              <div className="text-xs" style={{ color: colors.textSecondary }}>
                                {user.organization || '未设置组织'}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* 建议角色 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  建议角色
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'MEMBER', label: '普通成员' },
                    { value: 'RECORDER', label: '记录员' },
                    { value: 'OWNER', label: '负责人' },
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setInviteForm(f => ({ ...f, proposed_role: role.value as any }))}
                      className="py-2 px-3 rounded-lg text-sm transition-all"
                      style={{
                        background: inviteForm.proposed_role === role.value 
                          ? 'rgba(59, 130, 246, 0.2)' 
                          : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${inviteForm.proposed_role === role.value ? '#3b82f6' : colors.border}`,
                        color: inviteForm.proposed_role === role.value ? '#60a5fa' : colors.text
                      }}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 建议职责 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  建议职责 <span style={{ color: colors.textSecondary }}>（可选）</span>
                </label>
                <input
                  type="text"
                  value={inviteForm.proposed_duty}
                  onChange={(e) => setInviteForm(f => ({ ...f, proposed_duty: e.target.value }))}
                  placeholder="如：负责技术开发"
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                />
              </div>
              
              {/* 建议股份 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  建议股份 <span style={{ color: colors.textSecondary }}>（可选）</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="49"
                    value={inviteForm.proposed_share_pct}
                    onChange={(e) => setInviteForm(f => ({ ...f, proposed_share_pct: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-3 pr-12 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  />
                  <span 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm"
                    style={{ color: colors.textSecondary }}
                  >
                    %
                  </span>
                </div>
              </div>
              
              {/* 邀请留言 */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  邀请留言 <span style={{ color: colors.textSecondary }}>（可选）</span>
                </label>
                <textarea
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="邀请您加入我们的项目..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-white/20"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading || !inviteForm.invitee_id}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{ 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    opacity: inviteLoading || !inviteForm.invitee_id ? 0.6 : 1
                  }}
                >
                  {inviteLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      发送中...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      发送邀请
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 编辑项目模态框 - 艺术画廊风格 */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: 'rgba(18, 18, 18, 0.75)', backdropFilter: 'blur(20px) brightness(1.2)' }}
          onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div 
            className="w-full max-w-xl p-10 max-h-[90vh] overflow-y-auto"
            style={{ 
              background: '#0a0a0a',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {/* 极简标题栏 */}
            <div className="flex items-center justify-between mb-12">
              <h3 
                className="text-2xl font-extralight tracking-widest uppercase"
                style={{ color: '#fff', letterSpacing: '0.25em' }}
              >
                编辑项目
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 transition-opacity duration-300 hover:opacity-50"
                style={{ color: 'rgba(255, 255, 255, 0.4)' }}
              >
                <X size={18} strokeWidth={1} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="space-y-10">
              {/* 项目名称 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  项目名称 <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full py-3 text-lg font-light tracking-wide transition-all duration-300 focus:outline-none"
                  style={{ 
                    background: 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    letterSpacing: '0.05em'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>
              
              {/* 项目描述 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  项目描述
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full py-3 text-sm font-light tracking-wide resize-none transition-all duration-300 focus:outline-none"
                  style={{ 
                    background: 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    lineHeight: '1.8'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>
              
              {/* 业务类型 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-6"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  业务类型
                </label>
                <div className="flex flex-wrap gap-0">
                  {['协议转让', '并购重组', '产业赋能', '债权业务', '其他'].map((type, index) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, business_type: type }))}
                      className="py-3 px-5 text-xs uppercase tracking-widest transition-all duration-300"
                      style={{
                        background: editForm.business_type === type
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'transparent',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        borderBottom: editForm.business_type === type 
                          ? '1px solid rgba(255, 255, 255, 0.8)' 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderLeft: index === 0 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                        color: editForm.business_type === type 
                          ? '#fff' 
                          : 'rgba(255, 255, 255, 0.35)',
                        letterSpacing: '0.1em'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 行业和区域 */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label 
                    className="block text-xs uppercase tracking-widest mb-4"
                    style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                  >
                    行业
                  </label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm(f => ({ ...f, industry: e.target.value }))}
                    className="w-full py-3 text-sm font-light tracking-wide transition-all duration-300 focus:outline-none"
                    style={{ 
                      background: 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.5)'}
                    onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
                  />
                </div>
                <div>
                  <label 
                    className="block text-xs uppercase tracking-widest mb-4"
                    style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                  >
                    区域
                  </label>
                  <input
                    type="text"
                    value={editForm.region}
                    onChange={(e) => setEditForm(f => ({ ...f, region: e.target.value }))}
                    className="w-full py-3 text-sm font-light tracking-wide transition-all duration-300 focus:outline-none"
                    style={{ 
                      background: 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.5)'}
                    onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
                  />
                </div>
              </div>
              
              {editError && (
                <div 
                  className="text-xs tracking-wide py-3"
                  style={{ color: 'rgba(239, 68, 68, 0.8)', borderLeft: '2px solid rgba(239, 68, 68, 0.5)', paddingLeft: '12px' }}
                >
                  {editError}
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="flex gap-6 pt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-4 text-xs uppercase tracking-widest transition-all duration-300"
                  style={{ 
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    letterSpacing: '0.2em'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-4 text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3"
                  style={{ 
                    background: '#fff',
                    color: '#0a0a0a',
                    opacity: editLoading ? 0.3 : 1,
                    letterSpacing: '0.2em'
                  }}
                  onMouseEnter={(e) => {
                    if (!editLoading) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                  }}
                >
                  {editLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" strokeWidth={1} />
                      保存中
                    </>
                  ) : (
                    '保存'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 项目设置模态框 - 艺术画廊风格 */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: 'rgba(18, 18, 18, 0.75)', backdropFilter: 'blur(20px) brightness(1.2)' }}
          onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}
        >
          <div 
            className="w-full max-w-xl p-10 max-h-[90vh] overflow-y-auto"
            style={{ 
              background: '#0a0a0a',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {/* 极简标题栏 */}
            <div className="flex items-center justify-between mb-12">
              <h3 
                className="text-2xl font-extralight tracking-widest uppercase"
                style={{ color: '#fff', letterSpacing: '0.25em' }}
              >
                项目设置
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 transition-opacity duration-300 hover:opacity-50"
                style={{ color: 'rgba(255, 255, 255, 0.4)' }}
              >
                <X size={18} strokeWidth={1} />
              </button>
            </div>
            
            <form onSubmit={handleSettingsSubmit} className="space-y-12">
              {/* 项目状态 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-6"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  项目状态
                </label>
                <div className="grid grid-cols-2 gap-px" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                  {[
                    { value: 'ONGOING', label: '进行中' },
                    { value: 'PAUSED', label: '已暂停' },
                    { value: 'COMPLETED', label: '已完成' },
                    { value: 'ABANDONED', label: '已废弃' },
                  ].map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => setSettingsForm(f => ({ ...f, business_status: status.value as any }))}
                      className="py-5 text-xs uppercase tracking-widest transition-all duration-300"
                      style={{
                        background: settingsForm.business_status === status.value 
                          ? 'rgba(255, 255, 255, 0.08)' 
                          : '#0a0a0a',
                        color: settingsForm.business_status === status.value 
                          ? '#fff' 
                          : 'rgba(255, 255, 255, 0.35)',
                        letterSpacing: '0.15em'
                      }}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 可见性设置 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-6"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  可见性
                </label>
                <div className="space-y-px" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                  {[
                    { value: 'PUBLIC', label: '公开', desc: '所有用户可见' },
                    { value: 'INTERNAL', label: '内部', desc: '仅达到指定角色等级的用户可见' },
                    { value: 'PRIVATE', label: '私密', desc: '仅项目成员可见' },
                  ].map((visibility) => (
                    <button
                      key={visibility.value}
                      type="button"
                      onClick={() => setSettingsForm(f => ({ ...f, visibility_scope_type: visibility.value as any }))}
                      className="w-full flex items-center justify-between py-5 px-6 transition-all duration-300 text-left"
                      style={{
                        background: settingsForm.visibility_scope_type === visibility.value 
                          ? 'rgba(255, 255, 255, 0.08)' 
                          : '#0a0a0a',
                      }}
                    >
                      <div>
                        <div 
                          className="text-xs uppercase tracking-widest mb-1"
                          style={{ 
                            color: settingsForm.visibility_scope_type === visibility.value ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                            letterSpacing: '0.15em'
                          }}
                        >
                          {visibility.label}
                        </div>
                        <div 
                          className="text-xs font-light"
                          style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                        >
                          {visibility.desc}
                        </div>
                      </div>
                      {settingsForm.visibility_scope_type === visibility.value && (
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ background: '#fff' }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 角色等级设置（仅内部可见时显示） */}
              {settingsForm.visibility_scope_type === 'INTERNAL' && (
                <div>
                  <label 
                    className="block text-xs uppercase tracking-widest mb-6"
                    style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                  >
                    最低角色等级
                  </label>
                  <div className="flex gap-0">
                    {[
                      { value: 1, label: '普通' },
                      { value: 2, label: '核心' },
                      { value: 3, label: '创始' },
                    ].map((level, index) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setSettingsForm(f => ({ ...f, visibility_min_role_level: level.value }))}
                        className="flex-1 py-4 text-xs uppercase tracking-widest transition-all duration-300"
                        style={{
                          background: settingsForm.visibility_min_role_level === level.value
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'transparent',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          borderBottom: settingsForm.visibility_min_role_level === level.value 
                            ? '1px solid rgba(255, 255, 255, 0.8)' 
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          borderLeft: index === 0 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                          color: settingsForm.visibility_min_role_level === level.value 
                            ? '#fff' 
                            : 'rgba(255, 255, 255, 0.35)',
                          letterSpacing: '0.15em'
                        }}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {settingsError && (
                <div 
                  className="text-xs tracking-wide py-3"
                  style={{ color: 'rgba(239, 68, 68, 0.8)', borderLeft: '2px solid rgba(239, 68, 68, 0.5)', paddingLeft: '12px' }}
                >
                  {settingsError}
                </div>
              )}
              
              {/* 操作按钮 */}
              <div className="flex gap-6 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-4 text-xs uppercase tracking-widest transition-all duration-300"
                  style={{ 
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    letterSpacing: '0.2em'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="flex-1 py-4 text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3"
                  style={{ 
                    background: '#fff',
                    color: '#0a0a0a',
                    opacity: settingsLoading ? 0.3 : 1,
                    letterSpacing: '0.2em'
                  }}
                  onMouseEnter={(e) => {
                    if (!settingsLoading) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                  }}
                >
                  {settingsLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" strokeWidth={1} />
                      保存中
                    </>
                  ) : (
                    '保存'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 编辑事件模态框 */}
      {showEditEventModal && editingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowEditEventModal(false)}
        >
          <div 
            className="glass-card p-6 rounded-2xl w-full max-w-lg"
            style={{ border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Edit3 className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-medium" style={{ color: colors.text }}>编辑事件</h3>
              </div>
              <button
                onClick={() => setShowEditEventModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} style={{ color: colors.textSecondary }} />
              </button>
            </div>
            
            <form onSubmit={handleEditEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  事件标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editEventForm.title}
                  onChange={(e) => setEditEventForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  事件描述
                </label>
                <textarea
                  value={editEventForm.description}
                  onChange={(e) => setEditEventForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  编辑原因
                </label>
                <input
                  type="text"
                  value={editEventForm.edit_reason}
                  onChange={(e) => setEditEventForm(f => ({ ...f, edit_reason: e.target.value }))}
                  placeholder="简要说明修改原因..."
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                />
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  编辑历史将被保留，任何人都可以查看
                </p>
              </div>
              
              {editEventError && (
                <div className="flex items-center gap-2 text-red-400 text-sm p-3 rounded-lg bg-red-500/10">
                  <AlertCircle size={16} />
                  {editEventError}
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditEventModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: colors.textSecondary,
                    border: `1px solid ${colors.border}`
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editEventLoading}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
                  style={{ 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    opacity: editEventLoading ? 0.6 : 1
                  }}
                >
                  {editEventLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      保存修改
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 编辑历史模态框 */}
      {showEventHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => e.target === e.currentTarget && setShowEventHistory(false)}
        >
          <div 
            className="glass-card p-6 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            style={{ border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <History className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium" style={{ color: colors.text }}>编辑历史</h3>
              </div>
              <button
                onClick={() => setShowEventHistory(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} style={{ color: colors.textSecondary }} />
              </button>
            </div>
            
            {eventHistoryLoading ? (
              <div className="text-center py-12">
                <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: colors.textSecondary }} />
                <p style={{ color: colors.textSecondary }}>加载历史记录...</p>
              </div>
            ) : eventHistory.length === 0 ? (
              <div className="text-center py-12">
                <History size={48} className="mx-auto mb-4 opacity-30" style={{ color: colors.textSecondary }} />
                <p style={{ color: colors.textSecondary }}>暂无编辑记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {eventHistory.map((h, index) => (
                  <div 
                    key={h.id}
                    className="p-4 rounded-xl"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium" style={{ color: colors.text }}>
                        {h.edited_by_name || '未知用户'} 编辑
                      </span>
                      <span className="text-xs" style={{ color: colors.textSecondary }}>
                        {new Date(h.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    
                    {h.edit_reason && (
                      <p className="text-xs mb-3" style={{ color: colors.textSecondary }}>
                        原因：{h.edit_reason}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>修改前</p>
                        <div 
                          className="p-2 rounded-lg text-xs"
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#fca5a5'
                          }}
                        >
                          <p className="font-medium">{h.old_title}</p>
                          {h.old_description && (
                            <p className="mt-1 opacity-80">{h.old_description}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: colors.textSecondary }}>修改后</p>
                        <div 
                          className="p-2 rounded-lg text-xs"
                          style={{ 
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: '#86efac'
                          }}
                        >
                          <p className="font-medium">{h.new_title}</p>
                          {h.new_description && (
                            <p className="mt-1 opacity-80">{h.new_description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 新建事件模态框 - 艺术画廊风格 */}
      {showCreateEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: 'rgba(18, 18, 18, 0.75)', backdropFilter: 'blur(20px) brightness(1.2)' }}
          onClick={(e) => e.target === e.currentTarget && setShowCreateEventModal(false)}
        >
          <div 
            className="w-full max-w-xl p-10"
            style={{ 
              background: '#0a0a0a',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {/* 极简标题栏 */}
            <div className="flex items-center justify-between mb-12">
              <h3 
                className="text-2xl font-extralight tracking-widest uppercase"
                style={{ color: '#fff', letterSpacing: '0.25em' }}
              >
                新建动态
              </h3>
              <button
                onClick={() => setShowCreateEventModal(false)}
                className="p-2 transition-opacity duration-300 hover:opacity-50"
                style={{ color: 'rgba(255, 255, 255, 0.4)' }}
              >
                <X size={18} strokeWidth={1} />
              </button>
            </div>
            
            <form onSubmit={handleCreateEventSubmit} className="space-y-10">
              {/* 类型选择 - 极简线条风格 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-6"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  类型
                </label>
                <div className="flex gap-0">
                  {[
                    { value: 'NOTE', label: '备注' },
                    { value: 'MILESTONE_ADDED', label: '里程碑' },
                    { value: 'EVENT_CORRECTED', label: '更正' },
                  ].map((type, index) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setCreateEventForm(f => ({ ...f, event_type: type.value }))}
                      className="flex-1 py-4 text-xs uppercase tracking-widest transition-all duration-300"
                      style={{
                        background: createEventForm.event_type === type.value
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'transparent',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        borderBottom: createEventForm.event_type === type.value 
                          ? '1px solid rgba(255, 255, 255, 0.8)' 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderLeft: index === 0 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                        color: createEventForm.event_type === type.value 
                          ? '#fff' 
                          : 'rgba(255, 255, 255, 0.35)',
                        letterSpacing: '0.15em'
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* 标题输入 - 极简下划线风格 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  标题 <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={createEventForm.title}
                  onChange={(e) => setCreateEventForm(f => ({ ...f, title: e.target.value }))}
                  placeholder=""
                  className="w-full py-3 text-lg font-light tracking-wide transition-all duration-300 focus:outline-none"
                  style={{ 
                    background: 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    letterSpacing: '0.05em'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
                  required
                />
              </div>
              
              {/* 描述输入 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  描述
                </label>
                <textarea
                  value={createEventForm.description}
                  onChange={(e) => setCreateEventForm(f => ({ ...f, description: e.target.value }))}
                  placeholder=""
                  rows={3}
                  className="w-full py-3 text-sm font-light tracking-wide resize-none transition-all duration-300 focus:outline-none"
                  style={{ 
                    background: 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    letterSpacing: '0.03em',
                    lineHeight: '1.8'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>
              
              {createEventError && (
                <div 
                  className="text-xs tracking-wide py-3"
                  style={{ color: 'rgba(239, 68, 68, 0.8)', borderLeft: '2px solid rgba(239, 68, 68, 0.5)', paddingLeft: '12px' }}
                >
                  {createEventError}
                </div>
              )}
              
              {/* 操作按钮 - 极简风格 */}
              <div className="flex gap-6 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="flex-1 py-4 text-xs uppercase tracking-widest transition-all duration-300"
                  style={{ 
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    letterSpacing: '0.2em'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createEventLoading || !createEventForm.title.trim()}
                  className="flex-1 py-4 text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3"
                  style={{ 
                    background: '#fff',
                    color: '#0a0a0a',
                    opacity: (createEventLoading || !createEventForm.title.trim()) ? 0.3 : 1,
                    letterSpacing: '0.2em'
                  }}
                  onMouseEnter={(e) => {
                    if (!createEventLoading && createEventForm.title.trim()) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                  }}
                >
                  {createEventLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" strokeWidth={1} />
                      发布中
                    </>
                  ) : (
                    '发布'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

