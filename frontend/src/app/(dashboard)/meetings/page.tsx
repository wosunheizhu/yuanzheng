'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import { 
  Plus, 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  X,
  Loader2,
  Video,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Edit3,
  Check,
  Shield,
  Eye,
  ExternalLink,
  Phone,
  Mail,
  Briefcase,
  Save,
  Trash2,
  CalendarDays,
  LayoutGrid,
  Paperclip,
  Upload,
  Download,
  Image
} from 'lucide-react'
import { meetingService, Meeting, projectService, Project, userService, User } from '@/lib/services'
import apiClient from '@/lib/api'
import { useAuthStore } from '@/store/auth'

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
  accentMuted: 'rgba(250, 249, 246, 0.1)',
}

// 会议级别配置
const levelConfig: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  'INTERNAL': { 
    bg: 'rgba(250, 249, 246, 0.05)', 
    text: colors.text, 
    label: '内部会议',
    icon: <Shield size={12} />
  },
  'EXTERNAL': { 
    bg: 'rgba(250, 249, 246, 0.1)', 
    text: colors.text, 
    label: '对外会议',
    icon: <ExternalLink size={12} />
  },
}

// 会议状态配置
const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  'PLANNING': { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', label: '筹备中' },
  'CONFIRMED': { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80', label: '已确认' },
  'CANCELLED': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: '已取消' },
  'FINISHED': { bg: 'rgba(136, 136, 136, 0.15)', text: '#888888', label: '已结束' },
}

// 机密级别配置
const confidentialityConfig: Record<string, { label: string; color: string }> = {
  'LOW': { label: '公开', color: '#4ade80' },
  'MEDIUM': { label: '内部', color: '#fbbf24' },
  'HIGH': { label: '机密', color: '#ef4444' },
}

// 参与角色配置
const roleConfig: Record<string, { label: string }> = {
  'HOST': { label: '主持人' },
  'ATTENDEE': { label: '参与者' },
  'OPTIONAL': { label: '可选' },
}

// 出席状态配置
const attendanceConfig: Record<string, { label: string; color: string }> = {
  'INVITED': { label: '已邀请', color: '#888888' },
  'ATTENDING': { label: '将出席', color: '#4ade80' },
  'DECLINED': { label: '已拒绝', color: '#ef4444' },
  'NO_SHOW': { label: '未出席', color: '#fbbf24' },
}

// Tab配置
type DetailTab = 'participants' | 'guests' | 'minutes'

export default function MeetingsPage() {
  const { user } = useAuthStore()
  
  // 会议列表状态
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // 项目和用户列表
  const [projects, setProjects] = useState<Project[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  // 详情状态
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('participants')
  const [meetingMinutes, setMeetingMinutes] = useState<any>(null)
  const [loadingMinutes, setLoadingMinutes] = useState(false)
  
  // 创建会议弹窗
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  
  // 添加嘉宾弹窗
  const [showAddGuestModal, setShowAddGuestModal] = useState(false)
  const [addingGuest, setAddingGuest] = useState(false)
  
  // 编辑纪要
  const [editingMinutes, setEditingMinutes] = useState(false)
  const [minutesContent, setMinutesContent] = useState('')
  const [savingMinutes, setSavingMinutes] = useState(false)
  const [minutesAttachments, setMinutesAttachments] = useState<any[]>([])
  const [uploadingMinutesFiles, setUploadingMinutesFiles] = useState(false)
  
  // 删除会议确认
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingMeeting, setDeletingMeeting] = useState(false)
  
  // 删除嘉宾确认
  const [guestToDelete, setGuestToDelete] = useState<number | null>(null)
  const [deletingGuest, setDeletingGuest] = useState(false)
  
  // 添加参会人员弹窗
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [participantForm, setParticipantForm] = useState({
    user_id: 0,
    role: 'ATTENDEE' as 'HOST' | 'ATTENDEE' | 'OPTIONAL'
  })
  
  // 移除参会人员确认
  const [participantToRemove, setParticipantToRemove] = useState<number | null>(null)
  const [removingParticipant, setRemovingParticipant] = useState(false)
  
  // 日历状态
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')
  
  const heroRef = useRef<HTMLDivElement>(null)

  // 加载会议列表
  const fetchMeetings = useCallback(async () => {
      try {
        setLoading(true)
        setError(null)
        
        const params: any = { page, page_size: 20 }
        if (filterStatus) params.status = filterStatus
        if (filterProjectId) params.related_project_id = filterProjectId
        
        const response = await meetingService.list(params)
        
        if (page === 1) {
          setMeetings(response.items || [])
        } else {
          setMeetings(prev => [...prev, ...(response.items || [])])
        }
        setHasMore((response.items?.length || 0) === 20)
      } catch (err) {
        console.error('Failed to fetch meetings:', err)
        setError('无法加载座谈会列表')
      } finally {
        setLoading(false)
      }
  }, [page, filterStatus, filterProjectId])

  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // 加载项目列表
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectService.list({ page: 1, page_size: 100 })
        setProjects(response.items || [])
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [])

  // 加载用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await userService.list({ limit: 100 })
        // response 可能是 { items: [...], total: ... } 或者直接是数组
        const users = Array.isArray(response) ? response : (response.items || [])
        setAllUsers(users)
      } catch (err) {
        console.error('Failed to fetch users:', err)
      }
    }
    fetchUsers()
  }, [])

  // 加载会议纪要
  useEffect(() => {
    if (selectedMeeting && detailTab === 'minutes') {
      const fetchMinutes = async () => {
        try {
          setLoadingMinutes(true)
          const response = await meetingService.getMinutes(selectedMeeting.id)
          setMeetingMinutes(response)
          setMinutesContent(response?.content || '')
        } catch (err: any) {
          if (err?.response?.status !== 404) {
            console.error('Failed to fetch minutes:', err)
          }
          setMeetingMinutes(null)
          setMinutesContent('')
        } finally {
          setLoadingMinutes(false)
        }
      }
      fetchMinutes()
    }
  }, [selectedMeeting, detailTab])

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

  // 过滤会议
  const filteredMeetings = meetings.filter(m => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      m.title.toLowerCase().includes(search) ||
      m.description?.toLowerCase().includes(search) ||
      m.location?.toLowerCase().includes(search) ||
      m.related_project_name?.toLowerCase().includes(search)
    )
  }).filter(m => {
    if (!filterLevel) return true
    return m.meeting_level === filterLevel
  })

  // 格式化日期时间
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' }),
      time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('zh-CN'),
      dateOnly: date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    }
  }

  // 生成日历天数
  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  // 检查某天的会议
  const getMeetingsOnDay = (day: number) => {
    if (!day) return []
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    return meetings.filter(m => {
      const meetingDate = new Date(m.start_time)
      return meetingDate.getFullYear() === year && 
             meetingDate.getMonth() === month && 
             meetingDate.getDate() === day
    })
  }

  // 保存会议纪要
  const handleSaveMinutes = async () => {
    if (!selectedMeeting) return
    
    try {
      setSavingMinutes(true)
      await meetingService.createOrUpdateMinutes(selectedMeeting.id, {
        content: minutesContent,
        attachments: minutesAttachments
      })
      setEditingMinutes(false)
      // 重新加载纪要
      const response = await meetingService.getMinutes(selectedMeeting.id)
      setMeetingMinutes(response)
      setMinutesAttachments(response?.attachments || [])
    } catch (err) {
      console.error('Failed to save minutes:', err)
      alert('保存失败，请重试')
    } finally {
      setSavingMinutes(false)
    }
  }
  
  // 上传纪要附件
  const handleMinutesFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    setUploadingMinutesFiles(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }
      
      const response = await apiClient.post('/uploads/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const uploadedFiles = response.data.uploaded || []
      const newAttachments = uploadedFiles.map((f: any) => ({
        name: f.name,
        url: f.url,
        type: f.type,
        size: f.size
      }))
      
      setMinutesAttachments(prev => [...prev, ...newAttachments])
    } catch (err) {
      console.error('Failed to upload files:', err)
      alert('上传失败，请重试')
    } finally {
      setUploadingMinutesFiles(false)
      e.target.value = ''
    }
  }
  
  // 删除座谈会
  const handleDeleteMeeting = async () => {
    if (!selectedMeeting) return
    
    try {
      setDeletingMeeting(true)
      await meetingService.delete(selectedMeeting.id)
      setShowDeleteConfirm(false)
      setSelectedMeeting(null)
      setPage(1)
      fetchMeetings()
    } catch (err) {
      console.error('Failed to delete meeting:', err)
      alert('删除失败，请重试')
    } finally {
      setDeletingMeeting(false)
    }
  }
  
  // 删除外部嘉宾
  const handleDeleteGuest = async () => {
    if (!selectedMeeting || !guestToDelete) return
    
    try {
      setDeletingGuest(true)
      await meetingService.deleteGuest(selectedMeeting.id, guestToDelete)
      setGuestToDelete(null)
      // 刷新会议详情
      const response = await meetingService.get(selectedMeeting.id)
      setSelectedMeeting(response)
    } catch (err) {
      console.error('Failed to delete guest:', err)
      alert('删除失败，请重试')
    } finally {
      setDeletingGuest(false)
    }
  }
  
  // 添加参会人员
  const handleAddParticipant = async () => {
    if (!selectedMeeting || !participantForm.user_id) {
      alert('请选择用户')
      return
    }
    
    try {
      setAddingParticipant(true)
      await meetingService.addParticipant(selectedMeeting.id, {
        user_id: participantForm.user_id,
        role: participantForm.role
      })
      setShowAddParticipantModal(false)
      setParticipantForm({ user_id: 0, role: 'ATTENDEE' })
      // 刷新会议详情
      const response = await meetingService.get(selectedMeeting.id)
      setSelectedMeeting(response)
    } catch (err: any) {
      console.error('Failed to add participant:', err)
      alert(err?.response?.data?.detail || '添加失败，请重试')
    } finally {
      setAddingParticipant(false)
    }
  }
  
  // 移除参会人员
  const handleRemoveParticipant = async () => {
    if (!selectedMeeting || !participantToRemove) return
    
    try {
      setRemovingParticipant(true)
      await meetingService.removeParticipant(selectedMeeting.id, participantToRemove)
      setParticipantToRemove(null)
      // 刷新会议详情
      const response = await meetingService.get(selectedMeeting.id)
      setSelectedMeeting(response)
    } catch (err) {
      console.error('Failed to remove participant:', err)
      alert('移除失败，请重试')
    } finally {
      setRemovingParticipant(false)
    }
  }
  
  // 判断当前用户是否可以管理会议（仅管理员）
  const canManageMeeting = user?.is_admin === true

  // 创建会议表单状态
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    meeting_level: 'INTERNAL',
    confidentiality_level: 'LOW',
    related_project_id: null as number | null,
    start_time: '',
    end_time: '',
    location: '',
    visibility_scope_type: 'ALL',
    visibility_min_role_level: 1,
    participant_ids: [] as number[],
  })

  // 创建会议
  const handleCreateMeeting = async () => {
    if (!createForm.title || !createForm.start_time || !createForm.end_time) {
      alert('请填写必要信息')
      return
    }
    
    try {
      setCreating(true)
      await meetingService.create({
        ...createForm,
        start_time: new Date(createForm.start_time).toISOString(),
        end_time: new Date(createForm.end_time).toISOString(),
      } as any)
      setShowCreateModal(false)
      setCreateForm({
        title: '',
        description: '',
        meeting_level: 'INTERNAL',
        confidentiality_level: 'LOW',
        related_project_id: null,
        start_time: '',
        end_time: '',
        location: '',
        visibility_scope_type: 'ALL',
        visibility_min_role_level: 1,
        participant_ids: [],
      })
      setPage(1)
      fetchMeetings()
    } catch (err) {
      console.error('Failed to create meeting:', err)
      alert('创建失败，请重试')
    } finally {
      setCreating(false)
    }
  }

  // 添加嘉宾表单状态
  const [guestForm, setGuestForm] = useState({
    name: '',
    organization: '',
    title: '',
    contact: '',
    notes: '',
    invited_by_user_ids: [] as number[],
  })
  
  // 邀请人搜索状态
  const [inviterSearch, setInviterSearch] = useState('')
  const [showInviterDropdown, setShowInviterDropdown] = useState(false)
  
  // 获取选中的邀请人列表信息
  const selectedInviters = allUsers.filter(u => guestForm.invited_by_user_ids.includes(u.id))
  
  // 筛选邀请人列表（排除已选中的）
  const filteredInviters = allUsers.filter(u => 
    !guestForm.invited_by_user_ids.includes(u.id) &&
    (u.name.toLowerCase().includes(inviterSearch.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(inviterSearch.toLowerCase())))
  )
  
  // 添加邀请人
  const handleAddInviter = (userId: number) => {
    setGuestForm(f => ({
      ...f,
      invited_by_user_ids: [...f.invited_by_user_ids, userId]
    }))
    setInviterSearch('')
    setShowInviterDropdown(false)
  }
  
  // 移除邀请人
  const handleRemoveInviter = (userId: number) => {
    setGuestForm(f => ({
      ...f,
      invited_by_user_ids: f.invited_by_user_ids.filter(id => id !== userId)
    }))
  }

  // 添加外部嘉宾
  const handleAddGuest = async () => {
    if (!selectedMeeting || !guestForm.name) {
      alert('请填写嘉宾姓名')
      return
    }
    
    try {
      setAddingGuest(true)
      await meetingService.addGuest(selectedMeeting.id, {
        name: guestForm.name,
        organization: guestForm.organization,
        title: guestForm.title,
        contact: guestForm.contact,
        notes: guestForm.notes,
        invited_by_user_ids: guestForm.invited_by_user_ids.length > 0 ? guestForm.invited_by_user_ids : undefined,
      })
      setShowAddGuestModal(false)
      setGuestForm({ name: '', organization: '', title: '', contact: '', notes: '', invited_by_user_ids: [] })
      setInviterSearch('')
      // 刷新会议详情
      const response = await meetingService.get(selectedMeeting.id)
      setSelectedMeeting(response)
    } catch (err) {
      console.error('Failed to add guest:', err)
      alert('添加失败，请重试')
    } finally {
      setAddingGuest(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* Hero 区域 */}
      <section 
        ref={heroRef}
        className="min-h-[32vh] flex flex-col items-center justify-center text-center px-8 relative"
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(60, 60, 60, 0.12) 0%, transparent 60%)',
          }}
        />

        {/* 装饰线条 */}
        <div className="absolute top-1/4 left-0 w-24 h-px" style={{ background: `linear-gradient(to right, transparent, ${colors.border})` }} />
        <div className="absolute top-1/4 right-0 w-24 h-px" style={{ background: `linear-gradient(to left, transparent, ${colors.border})` }} />

        <p 
          className="text-xs uppercase tracking-[0.3em] mb-6"
          style={{ color: colors.textMuted }}
        >
          Schedule & Meetings
        </p>

        <h1 
          className="text-5xl md:text-6xl mb-6 tracking-tight"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 400,
            letterSpacing: '-0.02em'
          }}
        >
          日常座谈会
        </h1>

        <p 
          className="text-base max-w-lg mb-12"
          style={{ color: colors.textSecondary, lineHeight: 1.8 }}
        >
          协调时间安排，记录会议内容，追踪外部嘉宾贡献
        </p>

      </section>

      {/* 座谈会内容 */}
      <section className="px-8 pb-24 max-w-7xl mx-auto">
          {/* 工具栏 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
          {/* 搜索框 */}
            <div className="relative flex-1">
            <Search 
                size={16} 
              className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: colors.textMuted }}
            />
            <input
              type="text"
              placeholder="搜索座谈会..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-full text-sm transition-all duration-300 focus:outline-none"
                style={{ 
                  background: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
            />
          </div>

            {/* 视图切换 */}
            <div 
              className="flex items-center gap-1 p-1 rounded-full"
              style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}
            >
              <button
                onClick={() => setViewMode('list')}
                className="p-2.5 rounded-full transition-all duration-300"
                style={{ 
                  background: viewMode === 'list' ? colors.accentMuted : 'transparent',
                  color: viewMode === 'list' ? colors.text : colors.textMuted,
                }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className="p-2.5 rounded-full transition-all duration-300"
                style={{ 
                  background: viewMode === 'calendar' ? colors.accentMuted : 'transparent',
                  color: viewMode === 'calendar' ? colors.text : colors.textMuted,
                }}
              >
                <CalendarDays size={16} />
              </button>
          </div>

          {/* 筛选 */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm transition-all duration-300"
              style={{ 
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
              }}
            >
              <Filter size={16} />
            筛选
            <ChevronDown 
                size={14} 
              className="transition-transform duration-300"
              style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0)' }}
            />
          </button>

          {/* 新建座谈会（仅管理员可见） */}
          {canManageMeeting && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:opacity-90"
              style={{ 
                background: colors.text,
                color: colors.bg,
              }}
            >
              <Plus size={16} />
              新建座谈会
          </button>
          )}
        </div>

        {/* 筛选面板 */}
        {showFilters && (
          <div 
              className="mb-8 p-6 rounded-2xl"
              style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}
          >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                  <label className="block text-xs mb-2 uppercase tracking-wider" style={{ color: colors.textMuted }}>
                    状态
                  </label>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={{ 
                      background: colors.bgElevated,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                >
                  <option value="">全部状态</option>
                  <option value="PLANNING">筹备中</option>
                  <option value="CONFIRMED">已确认</option>
                  <option value="FINISHED">已结束</option>
                  <option value="CANCELLED">已取消</option>
                </select>
              </div>
              <div>
                  <label className="block text-xs mb-2 uppercase tracking-wider" style={{ color: colors.textMuted }}>
                    级别
                  </label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={{ 
                      background: colors.bgElevated,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  >
                    <option value="">全部级别</option>
                    <option value="INTERNAL">内部会议</option>
                    <option value="EXTERNAL">对外会议</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-2 uppercase tracking-wider" style={{ color: colors.textMuted }}>
                    关联项目
                  </label>
                <select
                  value={filterProjectId || ''}
                  onChange={(e) => { setFilterProjectId(e.target.value ? Number(e.target.value) : null); setPage(1) }}
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={{ 
                      background: colors.bgElevated,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                >
                  <option value="">全部项目</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 日历侧边栏 */}
            <div 
              className="lg:col-span-1 p-6 rounded-2xl h-fit lg:sticky lg:top-24"
              style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-medium" style={{ color: colors.text }}>
                {calendarDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
              </h3>
                <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                >
                    <ChevronLeft size={16} style={{ color: colors.textSecondary }} />
                </button>
                <button 
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                >
                    <ChevronRight size={16} style={{ color: colors.textSecondary }} />
                </button>
              </div>
            </div>
            
            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
                <div 
                  key={day} 
                    className="text-center text-xs py-2"
                    style={{ color: colors.textMuted }}
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, index) => {
                const isToday = day && 
                  new Date().getDate() === day && 
                  new Date().getMonth() === calendarDate.getMonth() && 
                  new Date().getFullYear() === calendarDate.getFullYear()
                  const dayMeetings = getMeetingsOnDay(day as number)
                  const hasMeeting = dayMeetings.length > 0
                
                return (
                  <div 
                    key={index}
                      className="aspect-square flex flex-col items-center justify-center text-xs rounded-lg relative cursor-pointer transition-colors hover:bg-white/5"
                    style={{ 
                      color: day ? colors.text : 'transparent',
                        background: isToday ? colors.accentMuted : 'transparent'
                    }}
                  >
                    {day}
                    {hasMeeting && (
                      <span 
                        className="absolute bottom-1 w-1 h-1 rounded-full"
                        style={{ background: '#4ade80' }}
                      />
                    )}
                  </div>
                )
              })}
            </div>

              {/* 统计信息 */}
              <div className="mt-8 pt-6 space-y-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: colors.textSecondary }}>本月会议</span>
                  <span style={{ color: colors.text }}>{meetings.filter(m => {
                    const d = new Date(m.start_time)
                    return d.getMonth() === calendarDate.getMonth() && d.getFullYear() === calendarDate.getFullYear()
                  }).length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: colors.textSecondary }}>即将开始</span>
                  <span style={{ color: '#4ade80' }}>{meetings.filter(m => m.status === 'CONFIRMED' && new Date(m.start_time) > new Date()).length}</span>
                </div>
            </div>
          </div>

          {/* 会议列表 */}
            <div className="lg:col-span-3 space-y-4">
            {loading && meetings.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-8 h-8 border border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>加载中...</p>
              </div>
            ) : error ? (
                <div className="text-center py-24">
                  <AlertCircle size={40} className="mx-auto mb-4" style={{ color: colors.textMuted }} />
                  <p className="mb-4 text-sm" style={{ color: colors.textSecondary }}>{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="px-6 py-2 rounded-full text-sm transition-all"
                    style={{ border: `1px solid ${colors.border}`, color: colors.text }}
                  >
                  重试
                </button>
              </div>
              ) : filteredMeetings.length === 0 ? (
                <div className="text-center py-24">
                  <Calendar size={48} className="mx-auto mb-4" style={{ color: colors.textMuted, opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    {searchQuery ? '没有找到匹配的座谈会' : '暂无座谈会'}
                  </p>
              </div>
            ) : (
              <>
                {filteredMeetings.map((meeting) => {
                    const level = levelConfig[meeting.meeting_level]
                    const status = statusConfig[meeting.status]
                    const confidentiality = confidentialityConfig[meeting.confidentiality_level]
                  const startTime = formatDateTime(meeting.start_time)
                  const endTime = formatDateTime(meeting.end_time)
                  
                  return (
                    <div 
                      key={meeting.id}
                        onClick={() => { setSelectedMeeting(meeting); setDetailTab('participants') }}
                        className="group p-6 rounded-2xl transition-all duration-300 cursor-pointer"
                        style={{ 
                          background: colors.bgCard,
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1 min-w-0">
                          {/* 标签行 */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span 
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                              style={{ background: level?.bg, color: level?.text }}
                            >
                                {level?.icon}
                              {level?.label}
                            </span>
                            <span 
                                className="text-xs px-2.5 py-1 rounded-full"
                              style={{ background: status?.bg, color: status?.text }}
                            >
                              {status?.label}
                            </span>
                            {meeting.related_project_name && (
                              <span 
                                  className="text-xs px-2.5 py-1 rounded-full truncate max-w-[150px]"
                                style={{ 
                                    background: colors.accentMuted,
                                  color: colors.textSecondary
                                }}
                              >
                                {meeting.related_project_name}
                              </span>
                            )}
                          </div>
                          
                          {/* 标题 */}
                          <h3 
                              className="text-lg font-medium mb-4 group-hover:opacity-80 transition-opacity"
                            style={{ color: colors.text }}
                          >
                            {meeting.title}
                          </h3>
                          
                          {/* 信息行 */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: colors.textSecondary }}>
                              <span className="flex items-center gap-1.5">
                                <Calendar size={14} style={{ color: colors.textMuted }} />
                              {startTime.date}
                            </span>
                              <span className="flex items-center gap-1.5">
                                <Clock size={14} style={{ color: colors.textMuted }} />
                              {startTime.time} - {endTime.time}
                            </span>
                            {meeting.location && (
                                <span className="flex items-center gap-1.5">
                                  {meeting.location.includes('线上') || meeting.location.includes('http') ? (
                                    <Video size={14} style={{ color: colors.textMuted }} />
                                  ) : (
                                    <Building2 size={14} style={{ color: colors.textMuted }} />
                                  )}
                                  <span className="truncate max-w-[150px]">{meeting.location}</span>
                              </span>
                            )}
                              <span className="flex items-center gap-1.5">
                                <Users size={14} style={{ color: colors.textMuted }} />
                              {meeting.participants?.length || 0} 人
                            </span>
                          </div>
                        </div>

                          {/* 右侧信息 */}
                          <div className="flex flex-col items-end gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ background: confidentiality?.color }}
                            />
                            {meeting.has_minutes && (
                              <FileText size={14} style={{ color: colors.textMuted }} />
                            )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* 加载更多 */}
                  {hasMore && (
                    <div className="text-center pt-4">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={loading}
                        className="px-8 py-2.5 rounded-full text-sm transition-all inline-flex items-center gap-2"
                        style={{ 
                          border: `1px solid ${colors.border}`,
                          color: colors.textSecondary,
                        }}
                    >
                      {loading ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                          加载中...
                        </>
                      ) : (
                        '加载更多'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* 会议详情弹窗 */}
      {selectedMeeting && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setSelectedMeeting(null)}
        >
          <div 
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{ 
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="sticky top-0 z-10 p-8 pb-0 rounded-t-2xl" style={{ background: colors.bg }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                  <div className="flex items-center gap-2 mb-3">
                  <span 
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                    style={{ 
                        background: levelConfig[selectedMeeting.meeting_level]?.bg,
                        color: levelConfig[selectedMeeting.meeting_level]?.text
                    }}
                  >
                      {levelConfig[selectedMeeting.meeting_level]?.icon}
                      {levelConfig[selectedMeeting.meeting_level]?.label}
                  </span>
                  <span 
                      className="text-xs px-2.5 py-1 rounded-full"
                    style={{ 
                        background: statusConfig[selectedMeeting.status]?.bg,
                        color: statusConfig[selectedMeeting.status]?.text
                      }}
                    >
                      {statusConfig[selectedMeeting.status]?.label}
                    </span>
                    <span 
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{ 
                        background: colors.accentMuted,
                        color: confidentialityConfig[selectedMeeting.confidentiality_level]?.color
                      }}
                    >
                      {confidentialityConfig[selectedMeeting.confidentiality_level]?.label}
                  </span>
                </div>
                  <h2 
                    className="text-2xl font-medium"
                    style={{ color: colors.text, fontFamily: "'Noto Serif SC', serif" }}
                  >
                  {selectedMeeting.title}
                </h2>
              </div>
                <div className="flex items-center gap-2">
                  {/* 删除按钮（管理员/联创可见） */}
                  {canManageMeeting && (
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 rounded-full transition-colors hover:bg-red-500/10"
                      title="删除座谈会"
                    >
                      <Trash2 size={18} style={{ color: '#ef4444' }} />
                    </button>
                  )}
              <button 
                onClick={() => setSelectedMeeting(null)}
                    className="p-2 rounded-full transition-colors hover:bg-white/5"
              >
                <X size={20} style={{ color: colors.textSecondary }} />
              </button>
                </div>
            </div>

              {/* 会议基本信息 */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>时间</p>
                  <p className="text-sm" style={{ color: colors.text }}>
                    {formatDateTime(selectedMeeting.start_time).dateOnly}
                  </p>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    {formatDateTime(selectedMeeting.start_time).time} - {formatDateTime(selectedMeeting.end_time).time}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>地点</p>
                  <p className="text-sm flex items-center gap-2" style={{ color: colors.text }}>
                    {selectedMeeting.location?.includes('线上') || selectedMeeting.location?.includes('http') ? (
                      <Video size={14} style={{ color: colors.textMuted }} />
                    ) : (
                      <Building2 size={14} style={{ color: colors.textMuted }} />
                    )}
                    {selectedMeeting.location || '待定'}
                  </p>
                </div>
                {selectedMeeting.related_project_name && (
                <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>关联项目</p>
                    <p className="text-sm" style={{ color: colors.text }}>
                      {selectedMeeting.related_project_name}
                  </p>
                </div>
              )}
                <div>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: colors.textMuted }}>创建人</p>
                  <p className="text-sm" style={{ color: colors.text }}>
                    {selectedMeeting.created_by_name || '未知'}
                  </p>
                </div>
              </div>

              {selectedMeeting.description && (
                <div className="mb-8">
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>描述</p>
                  <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                    {selectedMeeting.description}
                  </p>
                </div>
              )}
              
              {/* Tab 切换 */}
              <div 
                className="flex items-center gap-1 p-1 rounded-xl"
                style={{ background: colors.bgCard }}
              >
                <button
                  onClick={() => setDetailTab('participants')}
                  className="flex-1 py-2.5 rounded-lg text-sm transition-all"
                  style={{ 
                    background: detailTab === 'participants' ? colors.accentMuted : 'transparent',
                    color: detailTab === 'participants' ? colors.text : colors.textSecondary,
                  }}
                >
                  参会人员 ({selectedMeeting.participants?.length || 0})
                </button>
                <button
                  onClick={() => setDetailTab('guests')}
                  className="flex-1 py-2.5 rounded-lg text-sm transition-all"
                  style={{ 
                    background: detailTab === 'guests' ? colors.accentMuted : 'transparent',
                    color: detailTab === 'guests' ? colors.text : colors.textSecondary,
                  }}
                >
                  外部嘉宾 ({selectedMeeting.external_guests?.length || 0})
                </button>
                <button
                  onClick={() => setDetailTab('minutes')}
                  className="flex-1 py-2.5 rounded-lg text-sm transition-all"
                  style={{ 
                    background: detailTab === 'minutes' ? colors.accentMuted : 'transparent',
                    color: detailTab === 'minutes' ? colors.text : colors.textSecondary,
                  }}
                >
                  会议纪要
                </button>
              </div>
            </div>

            {/* Tab 内容 */}
            <div className="p-8 pt-6">
              {/* 参会人员 Tab */}
              {detailTab === 'participants' && (
                <div className="space-y-3">
                  {/* 添加参会人员按钮（管理员/联创可见） */}
                  {canManageMeeting && (
                    <button
                      onClick={() => setShowAddParticipantModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all hover:bg-white/5"
                      style={{ border: `1px dashed ${colors.border}`, color: colors.textSecondary }}
                    >
                      <UserPlus size={16} />
                      邀请参会人员
                    </button>
                  )}
                  
                  {selectedMeeting.participants && selectedMeeting.participants.length > 0 ? (
                    selectedMeeting.participants.map((p: any, i: number) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                            style={{ background: colors.accentMuted, color: colors.text }}
                          >
                            {(p.user_name || '?').charAt(0)}
                          </div>
                <div>
                            <p className="text-sm font-medium" style={{ color: colors.text }}>
                              {p.user_name || '未知用户'}
                            </p>
                            <p className="text-xs" style={{ color: colors.textSecondary }}>
                              {roleConfig[p.role]?.label}
                  </p>
                </div>
            </div>
                        <div className="flex items-center gap-2">
                    <span 
                            className="text-xs px-2.5 py-1 rounded-full"
                      style={{ 
                              background: colors.accentMuted,
                              color: attendanceConfig[p.attendance_status]?.color
                      }}
                    >
                            {attendanceConfig[p.attendance_status]?.label}
                    </span>
                          {/* 移除按钮（非主持人，管理员/联创可见） */}
                          {canManageMeeting && p.role !== 'HOST' && (
                            <button
                              onClick={() => setParticipantToRemove(p.user_id)}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                              title="移除"
                            >
                              <X size={14} style={{ color: '#ef4444' }} />
                            </button>
              )}
            </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Users size={32} className="mx-auto mb-3" style={{ color: colors.textMuted, opacity: 0.3 }} />
                      <p className="text-sm" style={{ color: colors.textSecondary }}>暂无参会人员</p>
                    </div>
                  )}
              </div>
            )}

              {/* 外部嘉宾 Tab */}
              {detailTab === 'guests' && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowAddGuestModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm transition-all hover:bg-white/5"
                    style={{ border: `1px dashed ${colors.border}`, color: colors.textSecondary }}
                  >
                    <UserPlus size={16} />
                    添加外部嘉宾
                  </button>

                  {selectedMeeting.external_guests && selectedMeeting.external_guests.length > 0 ? (
                    selectedMeeting.external_guests.map((g: any) => (
                      <div 
                        key={g.id}
                        className="p-5 rounded-xl"
                        style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-base font-medium" style={{ color: colors.text }}>
                              {g.name}
                            </p>
                            {g.organization && (
                              <p className="text-sm flex items-center gap-1.5 mt-1" style={{ color: colors.textSecondary }}>
                                <Building2 size={12} />
                                {g.organization}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {g.title && (
                    <span 
                                className="text-xs px-2.5 py-1 rounded-full"
                                style={{ background: colors.accentMuted, color: colors.text }}
                              >
                                {g.title}
                              </span>
                            )}
                            {/* 删除按钮（邀请人或管理员/联创可见） */}
                            {(g.invited_by_user_id === user?.id || g.invited_by_user_ids?.includes(user?.id || 0) || canManageMeeting) && (
                              <button
                                onClick={() => setGuestToDelete(g.id)}
                                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                                title="删除嘉宾"
                              >
                                <Trash2 size={14} style={{ color: '#ef4444' }} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: colors.textMuted }}>
                          {g.contact && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} />
                              {g.contact}
                            </span>
                          )}
                          {(g.invited_by_names?.length || g.invited_by_name) && (
                            <span className="flex items-center gap-1">
                              <UserPlus size={11} />
                              {g.invited_by_names?.length 
                                ? `${g.invited_by_names.join('、')} 邀请`
                                : `${g.invited_by_name} 邀请`
                              }
                            </span>
                          )}
                        </div>

                        {g.notes && (
                          <p className="mt-3 text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                            {g.notes}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <ExternalLink size={32} className="mx-auto mb-3" style={{ color: colors.textMuted, opacity: 0.3 }} />
                      <p className="text-sm" style={{ color: colors.textSecondary }}>暂无外部嘉宾</p>
                    </div>
                  )}
                </div>
              )}

              {/* 会议纪要 Tab */}
              {detailTab === 'minutes' && (
                <div>
                  {loadingMinutes ? (
                    <div className="text-center py-12">
                      <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: colors.textSecondary }} />
                      <p className="text-sm" style={{ color: colors.textSecondary }}>加载中...</p>
                    </div>
                  ) : editingMinutes ? (
                    <div className="space-y-4">
                      <textarea
                        value={minutesContent}
                        onChange={(e) => setMinutesContent(e.target.value)}
                        placeholder="在此输入会议纪要内容...支持 Markdown 格式"
                        className="w-full h-64 p-4 rounded-xl text-sm resize-none focus:outline-none"
                      style={{ 
                          background: colors.bgCard,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                      />
                      
                      {/* 附件上传区域 */}
                      <div 
                        className="p-4 rounded-xl"
                        style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs uppercase tracking-wider" style={{ color: colors.textMuted }}>
                            附件 ({minutesAttachments.length})
                          </p>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer transition-colors hover:opacity-80" style={{ color: colors.textSecondary }}>
                            <input
                              type="file"
                              multiple
                              onChange={handleMinutesFileUpload}
                              className="hidden"
                              disabled={uploadingMinutesFiles}
                            />
                            {uploadingMinutesFiles ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Upload size={12} />
                            )}
                            上传附件
                          </label>
                        </div>
                        
                        {minutesAttachments.length > 0 ? (
                          <div className="space-y-2">
                            {minutesAttachments.map((att, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg"
                                style={{ background: colors.bgElevated }}
                              >
                                <div className="flex items-center gap-2">
                                  {att.type?.startsWith('image/') ? (
                                    <Image size={14} style={{ color: colors.textSecondary }} />
                                  ) : (
                                    <Paperclip size={14} style={{ color: colors.textSecondary }} />
                                  )}
                                  <span className="text-xs truncate max-w-[200px]" style={{ color: colors.text }}>
                                    {att.name}
                    </span>
                                </div>
                                <button
                                  onClick={() => setMinutesAttachments(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1 rounded transition-colors hover:bg-red-500/10"
                                >
                                  <X size={12} style={{ color: '#ef4444' }} />
                                </button>
                              </div>
                  ))}
                </div>
                        ) : (
                          <p className="text-xs text-center py-4" style={{ color: colors.textMuted }}>
                            暂无附件，点击上传
                          </p>
                        )}
              </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSaveMinutes}
                          disabled={savingMinutes}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all"
                          style={{ background: colors.text, color: colors.bg }}
                        >
                          {savingMinutes ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                          保存
                        </button>
                        <button
                          onClick={() => { 
                            setEditingMinutes(false)
                            setMinutesContent(meetingMinutes?.content || '')
                            setMinutesAttachments(meetingMinutes?.attachments || [])
                          }}
                          className="px-5 py-2.5 rounded-full text-sm transition-all"
                          style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : meetingMinutes ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          由 {meetingMinutes.created_by_name} 于 {formatDateTime(meetingMinutes.updated_at || meetingMinutes.created_at).full} 更新
                        </p>
                        {/* 编辑按钮（仅管理员可见） */}
                        {canManageMeeting && (
                          <button
                            onClick={() => {
                              setEditingMinutes(true)
                              setMinutesAttachments(meetingMinutes?.attachments || [])
                            }}
                            className="flex items-center gap-1.5 text-xs transition-colors"
                            style={{ color: colors.textSecondary }}
                          >
                            <Edit3 size={12} />
                            编辑
                          </button>
                        )}
                      </div>
                      <div 
                        className="p-5 rounded-xl prose prose-invert prose-sm max-w-none"
                        style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}
                      >
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: colors.text }}>
                          {meetingMinutes.content}
                        </pre>
                      </div>
                      
                      {/* 显示已有附件 */}
                      {meetingMinutes.attachments && meetingMinutes.attachments.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                            附件 ({meetingMinutes.attachments.length})
                          </p>
                          <div className="space-y-2">
                            {meetingMinutes.attachments.map((att: any, idx: number) => (
                              <a
                                key={idx}
                                href={att.url?.startsWith('http') ? att.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${att.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 rounded-lg transition-colors hover:bg-white/5"
                                style={{ background: colors.bgCard, border: `1px solid ${colors.border}` }}
                              >
                                {att.type?.startsWith('image/') ? (
                                  <Image size={16} style={{ color: colors.textSecondary }} />
                                ) : (
                                  <Paperclip size={16} style={{ color: colors.textSecondary }} />
                                )}
                                <span className="text-sm flex-1 truncate" style={{ color: colors.text }}>
                                  {att.name}
                                </span>
                                <Download size={14} style={{ color: colors.textMuted }} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText size={32} className="mx-auto mb-3" style={{ color: colors.textMuted, opacity: 0.3 }} />
                      <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>暂无会议纪要</p>
                      {/* 添加纪要按钮（仅管理员可见） */}
                      {canManageMeeting && (
                        <button
                          onClick={() => setEditingMinutes(true)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm transition-all"
                          style={{ border: `1px solid ${colors.border}`, color: colors.text }}
                        >
                          <Edit3 size={14} />
                          添加纪要
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 创建会议弹窗 */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-8"
                      style={{ 
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 
                className="text-xl font-medium"
                style={{ color: colors.text, fontFamily: "'Noto Serif SC', serif" }}
              >
                新建座谈会
              </h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full transition-colors hover:bg-white/5"
              >
                <X size={20} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  会议主题 *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="输入会议主题"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                    开始时间 *
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.start_time}
                    onChange={(e) => setCreateForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                    style={{ 
                      background: colors.bgCard,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                    结束时间 *
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.end_time}
                    onChange={(e) => setCreateForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                    style={{ 
                      background: colors.bgCard,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  地点/会议链接
                </label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) => setCreateForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="线下地址或线上会议链接"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                    会议级别
                  </label>
                  <select
                    value={createForm.meeting_level}
                    onChange={(e) => setCreateForm(f => ({ ...f, meeting_level: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                    style={{ 
                      background: colors.bgCard,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  >
                    <option value="INTERNAL">内部会议</option>
                    <option value="EXTERNAL">对外会议</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                    保密级别
                  </label>
                  <select
                    value={createForm.confidentiality_level}
                    onChange={(e) => setCreateForm(f => ({ ...f, confidentiality_level: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                    style={{ 
                      background: colors.bgCard,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  >
                    <option value="LOW">公开</option>
                    <option value="MEDIUM">内部</option>
                    <option value="HIGH">机密</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  关联项目
                </label>
                <select
                  value={createForm.related_project_id || ''}
                  onChange={(e) => setCreateForm(f => ({ ...f, related_project_id: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="">无关联项目</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  会议描述
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="会议议题或备注"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleCreateMeeting}
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all"
                  style={{ background: colors.text, color: colors.bg }}
                >
                  {creating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  创建座谈会
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 rounded-full text-sm transition-all"
                  style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
              </div>
            )}

      {/* 添加嘉宾弹窗 */}
      {showAddGuestModal && selectedMeeting && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowAddGuestModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl p-8"
            style={{ 
              background: colors.bg,
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-lg font-medium"
                style={{ color: colors.text }}
              >
                添加外部嘉宾
              </h2>
              <button 
                onClick={() => setShowAddGuestModal(false)}
                className="p-2 rounded-full transition-colors hover:bg-white/5"
              >
                <X size={18} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  姓名 *
                </label>
                <input
                  type="text"
                  value={guestForm.name}
                  onChange={(e) => setGuestForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="嘉宾姓名"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  机构
                </label>
                <input
                  type="text"
                  value={guestForm.organization}
                  onChange={(e) => setGuestForm(f => ({ ...f, organization: e.target.value }))}
                  placeholder="所属机构/公司"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  职务
                </label>
                <input
                  type="text"
                  value={guestForm.title}
                  onChange={(e) => setGuestForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="职务/头衔"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  联系方式
                </label>
                <input
                  type="text"
                  value={guestForm.contact}
                  onChange={(e) => setGuestForm(f => ({ ...f, contact: e.target.value }))}
                  placeholder="电话/邮箱/微信"
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  备注
                </label>
                <textarea
                  value={guestForm.notes}
                  onChange={(e) => setGuestForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="其他备注信息"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 邀请人（可搜索多选，非必填） */}
              <div className="relative">
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  邀请人（可选，可多选）
                </label>
                
                {/* 已选中的邀请人列表 */}
                {selectedInviters.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedInviters.map(inviter => (
                      <div
                        key={inviter.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                        style={{ 
                          background: colors.accentMuted,
                          color: colors.text,
                        }}
                      >
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                          style={{ background: colors.bg }}
                        >
                          {inviter.name.charAt(0)}
                        </div>
                        <span>{inviter.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInviter(inviter.id)}
                          className="ml-1 hover:opacity-70"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 搜索输入框 */}
                <div className="relative">
                  <input
                    type="text"
                    value={inviterSearch}
                    onChange={(e) => {
                      setInviterSearch(e.target.value)
                      setShowInviterDropdown(true)
                    }}
                    onFocus={() => setShowInviterDropdown(true)}
                    placeholder={selectedInviters.length > 0 ? "继续添加邀请人..." : "搜索并选择邀请人..."}
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                    style={{ 
                      background: colors.bgCard,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                  {showInviterDropdown && (
                    <div 
                      className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl z-10"
                      style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                    >
                      {filteredInviters.length > 0 ? (
                        filteredInviters.slice(0, 10).map(u => (
                          <div
                            key={u.id}
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5"
                            onClick={() => handleAddInviter(u.id)}
                          >
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                              style={{ background: colors.accentMuted, color: colors.text }}
                            >
                              {u.name.charAt(0)}
                            </div>
                            <span className="text-sm" style={{ color: colors.text }}>{u.name}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm" style={{ color: colors.textSecondary }}>
                          {inviterSearch ? '未找到匹配用户' : '所有用户已选择'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleAddGuest}
                  disabled={addingGuest}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all"
                  style={{ background: colors.text, color: colors.bg }}
                >
                  {addingGuest ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  添加嘉宾
                </button>
                <button
                  onClick={() => setShowAddGuestModal(false)}
                  className="px-6 py-3 rounded-full text-sm transition-all"
                  style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
                >
                  取消
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除座谈会确认弹窗 */}
      {showDeleteConfirm && selectedMeeting && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl p-8"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4" style={{ color: colors.text }}>
              确认删除座谈会？
            </h3>
            <p className="text-sm mb-6" style={{ color: colors.textSecondary }}>
              此操作将删除「{selectedMeeting.title}」及其所有相关记录，且无法恢复。
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteMeeting}
                disabled={deletingMeeting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {deletingMeeting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                确认删除
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-full text-sm transition-all"
                style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 删除嘉宾确认弹窗 */}
      {guestToDelete && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setGuestToDelete(null)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl p-8"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4" style={{ color: colors.text }}>
              确认删除嘉宾？
            </h3>
            <p className="text-sm mb-6" style={{ color: colors.textSecondary }}>
              此操作将从座谈会中移除该外部嘉宾。
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDeleteGuest}
                disabled={deletingGuest}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {deletingGuest ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                确认删除
              </button>
              <button
                onClick={() => setGuestToDelete(null)}
                className="flex-1 py-3 rounded-full text-sm transition-all"
                style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 移除参会人员确认弹窗 */}
      {participantToRemove && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setParticipantToRemove(null)}
        >
          <div 
            className="w-full max-w-sm rounded-2xl p-8"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-medium mb-4" style={{ color: colors.text }}>
              确认移除参会人员？
            </h3>
            <p className="text-sm mb-6" style={{ color: colors.textSecondary }}>
              此操作将从座谈会中移除该参会人员。
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRemoveParticipant}
                disabled={removingParticipant}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                {removingParticipant ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                确认移除
              </button>
              <button
                onClick={() => setParticipantToRemove(null)}
                className="flex-1 py-3 rounded-full text-sm transition-all"
                style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 添加参会人员弹窗 */}
      {showAddParticipantModal && selectedMeeting && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowAddParticipantModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl p-8"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium" style={{ color: colors.text }}>
                邀请参会人员
              </h2>
              <button 
                onClick={() => setShowAddParticipantModal(false)}
                className="p-2 rounded-full transition-colors hover:bg-white/5"
              >
                <X size={18} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  选择用户 *
                </label>
                <select
                  value={participantForm.user_id || ''}
                  onChange={(e) => setParticipantForm(f => ({ ...f, user_id: Number(e.target.value) }))}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="">请选择用户</option>
                  {allUsers
                    .filter(u => !selectedMeeting.participants?.some((p: any) => p.user_id === u.id))
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: colors.textMuted }}>
                  参与角色
                </label>
                <select
                  value={participantForm.role}
                  onChange={(e) => setParticipantForm(f => ({ ...f, role: e.target.value as any }))}
                  className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                  style={{ 
                    background: colors.bgCard,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="ATTENDEE">参与者</option>
                  <option value="OPTIONAL">可选</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleAddParticipant}
                  disabled={addingParticipant}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-all"
                  style={{ background: colors.text, color: colors.bg }}
                >
                  {addingParticipant ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  邀请
                </button>
                <button
                  onClick={() => setShowAddParticipantModal(false)}
                  className="px-6 py-3 rounded-full text-sm transition-all"
                  style={{ border: `1px solid ${colors.border}`, color: colors.textSecondary }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部版权 */}
      <footer 
        className="text-center py-12"
        style={{ color: colors.textMuted }}
      >
        <p className="text-xs tracking-wider">
          © 2024 元征 · 合伙人赋能平台
        </p>
      </footer>
    </div>
  )
}
