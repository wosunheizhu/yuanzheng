'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { gsap } from 'gsap'
import { 
  Search, 
  Filter, 
  Plus, 
  ChevronRight, 
  Clock, 
  User, 
  Briefcase,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Send,
  FileText,
  Check
} from 'lucide-react'
import { demandService, projectService, Demand, DemandResponse, Project } from '@/lib/services'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'

// 颜色常量
const colors = {
  bg: '#000000',
  cardBg: 'rgba(20, 20, 20, 0.98)',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
  success: '#4ade80',
  error: '#ef4444',
  warning: '#fbbf24',
}

// 需求状态配置
const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  'OPEN': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '进行中' },
  'CLOSED': { bg: 'rgba(136, 136, 136, 0.1)', text: '#888888', label: '已关闭' },
  'FULFILLED': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', label: '已完成' },
}

// 响应状态配置
const responseStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  'SUBMITTED': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '待审核' },
  'PENDING': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '待审核' },
  'ACCEPTED_PENDING_USAGE': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', label: '待使用' },
  'ACCEPTED': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '已接受' },
  'REJECTED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '已拒绝' },
  'IN_USE': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', label: '使用中' },
  'USED': { bg: 'rgba(136, 136, 136, 0.1)', text: '#888888', label: '已完成' },
}

// 格式化时间
function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days < 1) return '今天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

export default function DemandsPage() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const [demands, setDemands] = useState<Demand[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilter, setShowFilter] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [initialDemandId, setInitialDemandId] = useState<number | null>(null)
  
  // 需求详情
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null)
  const [responses, setResponses] = useState<DemandResponse[]>([])
  const [responsesLoading, setResponsesLoading] = useState(false)
  
  // 新建需求表单
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    business_type: '协议转让',
    industry: '',
    project_ids: [] as number[],
    visibility_scope_type: 'ALL',
    visibility_min_role_level: 1,
    // 激励形式
    reward_equity: '',
    reward_token: '',
    reward_other: '',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [reviewingResponseId, setReviewingResponseId] = useState<number | null>(null)
  
  // 标记完成相关状态
  const [showMarkCompleteModal, setShowMarkCompleteModal] = useState(false)
  const [markingResponse, setMarkingResponse] = useState<DemandResponse | null>(null)
  const [markCompleteForm, setMarkCompleteForm] = useState({
    note: '',
    initiate_payment: false,
    token_amount: '',
    payment_reason: ''
  })
  const [markingComplete, setMarkingComplete] = useState(false)
  
  // 响应表单
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [responseForm, setResponseForm] = useState({
    proposal: '',
    note: '',
    // 意向激励
    reward_equity: '',
    reward_token: '',
    reward_other: '',
  })
  const [respondingTo, setRespondingTo] = useState<Demand | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  // 读取URL中的需求ID参数
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (idParam) {
      setInitialDemandId(parseInt(idParam))
    }
  }, [searchParams])

  // 加载需求列表
  useEffect(() => {
    const fetchDemands = async () => {
      try {
        setLoading(true)
        setError(null)
        const params: any = { page, page_size: 20 }
        if (statusFilter !== 'all') {
          params.status = statusFilter
        }
        const response = await demandService.list(params)
        if (page === 1) {
          setDemands(response.items || [])
        } else {
          setDemands(prev => [...prev, ...(response.items || [])])
        }
        setHasMore((response.items?.length || 0) === 20)
      } catch (err) {
        console.error('Failed to fetch demands:', err)
        setError('无法加载需求列表')
      } finally {
        setLoading(false)
      }
    }
    fetchDemands()
  }, [page, statusFilter])

  // 如果有初始需求ID，自动打开详情
  useEffect(() => {
    if (initialDemandId && demands.length > 0 && !selectedDemand) {
      const demand = demands.find(d => d.id === initialDemandId)
      if (demand) {
        setSelectedDemand(demand)
        loadResponses(demand)
        setInitialDemandId(null) // 清除，避免重复触发
      }
    }
  }, [initialDemandId, demands, selectedDemand])

  // 加载项目列表（用于创建需求）
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectService.list({ my_projects: true })
        setProjects(response.items || [])
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [])

  // 入场动画 - 使用 fromTo 避免闪烁
  useEffect(() => {
    if (heroRef.current) {
      gsap.fromTo(heroRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
      )
    }
  }, [])

  // 加载需求响应
  const loadResponses = async (demand: Demand) => {
    setSelectedDemand(demand)
    setResponsesLoading(true)
    try {
      const data = await demandService.getResponses(demand.id)
      setResponses(data || [])
    } catch (err) {
      console.error('Failed to fetch responses:', err)
      toast.error('无法加载响应列表')
    } finally {
      setResponsesLoading(false)
    }
  }

  // 创建需求
  const handleCreateDemand = async () => {
    if (!createForm.title || !createForm.description || createForm.project_ids.length === 0) {
      toast.error('请填写完整信息')
      return
    }
    
    // 构建激励形式对象
    const expected_reward: Record<string, any> = {}
    if (createForm.reward_equity) expected_reward.equity = createForm.reward_equity
    if (createForm.reward_token) expected_reward.token = parseInt(createForm.reward_token)
    if (createForm.reward_other) expected_reward.other = createForm.reward_other
    
    setSubmitting(true)
    try {
      await demandService.create({
        project_ids: createForm.project_ids,
        title: createForm.title,
        description: createForm.description,
        business_type: createForm.business_type,
        industry: createForm.industry || undefined,
        participant_ids: user?.id ? [user.id] : [],
        expected_reward: Object.keys(expected_reward).length > 0 ? expected_reward : undefined,
        visibility_scope_type: createForm.visibility_scope_type,
        visibility_min_role_level: createForm.visibility_scope_type === 'ROLE_MIN_LEVEL' 
          ? createForm.visibility_min_role_level 
          : undefined,
      })
      toast.success('需求发布成功！')
      setShowCreateForm(false)
      setCreateForm({
        title: '',
        description: '',
        business_type: '协议转让',
        industry: '',
        project_ids: [],
        visibility_scope_type: 'ALL',
        visibility_min_role_level: 1,
        reward_equity: '',
        reward_token: '',
        reward_other: '',
        note: '',
      })
      // 刷新列表
      setPage(1)
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // 提交响应
  const handleSubmitResponse = async () => {
    if (!respondingTo || !responseForm.proposal) {
      toast.error('请填写响应内容')
      return
    }
    
    // 构建意向激励对象
    const expected_reward: Record<string, any> = {}
    if (responseForm.reward_equity) expected_reward.equity = responseForm.reward_equity
    if (responseForm.reward_token) expected_reward.token = parseInt(responseForm.reward_token)
    if (responseForm.reward_other) expected_reward.other = responseForm.reward_other
    
    setSubmitting(true)
    try {
      await demandService.createResponse({
        demand_id: respondingTo.id,
        proposal: responseForm.proposal,
        note: responseForm.note,
        expected_reward: Object.keys(expected_reward).length > 0 ? expected_reward : undefined,
      })
      toast.success('响应提交成功！')
      setShowResponseForm(false)
      setResponseForm({ proposal: '', note: '', reward_equity: '', reward_token: '', reward_other: '' })
      setRespondingTo(null)
      // 刷新响应列表
      if (selectedDemand) {
        loadResponses(selectedDemand)
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // 审核响应
  const handleReviewResponse = async (responseId: number, accepted: boolean) => {
    setReviewingResponseId(responseId)
    try {
      await demandService.reviewResponse(responseId, {
        accepted,
        comment: accepted ? '响应已接受' : '响应已拒绝',
      })
      toast.success(accepted ? '已接受响应' : '已拒绝响应')
      // 刷新响应列表
      if (selectedDemand) {
        loadResponses(selectedDemand)
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setReviewingResponseId(null)
    }
  }

  // 打开标记完成模态框
  const openMarkCompleteModal = (response: DemandResponse) => {
    setMarkingResponse(response)
    setMarkCompleteForm({
      note: '',
      initiate_payment: false,
      token_amount: response.final_reward?.token?.toString() || response.expected_reward?.token?.toString() || '',
      payment_reason: `需求「${selectedDemand?.title}」完成结算`
    })
    setShowMarkCompleteModal(true)
  }

  // 标记需求完成
  const handleMarkComplete = async () => {
    if (!markingResponse) return
    
    setMarkingComplete(true)
    try {
      const payload: any = {
        note: markCompleteForm.note || undefined,
        initiate_payment: markCompleteForm.initiate_payment,
      }
      
      if (markCompleteForm.initiate_payment && markCompleteForm.token_amount) {
        payload.token_amount = parseFloat(markCompleteForm.token_amount)
        payload.payment_reason = markCompleteForm.payment_reason || undefined
      }
      
      await demandService.markUsed(markingResponse.id, payload)
      toast.success('需求已标记完成' + (markCompleteForm.initiate_payment ? '，Token支付已发起' : ''))
      setShowMarkCompleteModal(false)
      setMarkingResponse(null)
      
      // 刷新响应列表
      if (selectedDemand) {
        loadResponses(selectedDemand)
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setMarkingComplete(false)
    }
  }

  // 检查当前用户是否是需求 owner
  const isDemandOwner = (demand: Demand) => {
    if (!user) return false
    if (user.is_admin) return true
    return demand.owner_user_id === user.id || 
           demand.participants?.some(p => p.user_id === user.id && p.is_owner)
  }

  // 过滤需求
  const filteredDemands = demands.filter(d =>
    searchQuery === '' ||
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div ref={containerRef} className="min-h-screen pb-20" style={{ background: colors.bg }}>
      {/* Hero Section */}
      <div ref={heroRef} className="px-8 pt-12 pb-8 max-w-6xl mx-auto gsap-hero">
        <h1 className="text-4xl font-serif mb-4" style={{ color: colors.text }}>
          需求中心
        </h1>
        <p className="text-lg" style={{ color: colors.textSecondary }}>
          发布项目需求，寻找合伙人资源支持
        </p>
      </div>

      {/* 搜索和筛选 */}
      <div className="px-8 pb-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap gap-4 items-center">
          {/* 搜索框 */}
          <div className="flex-1 min-w-[300px] relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: colors.textSecondary }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索需求标题或描述..."
              className="w-full pl-12 pr-4 py-3 rounded-xl outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${colors.border}`,
                color: colors.text,
              }}
            />
          </div>

          {/* 筛选按钮 */}
          <div className="relative">
            <button
              className="btn-outline py-3 px-5 flex items-center gap-2"
              onClick={() => setShowFilter(!showFilter)}
            >
              <Filter size={18} />
              <span>筛选</span>
              {statusFilter !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              )}
            </button>

            {showFilter && (
              <div
                className="absolute top-full right-0 mt-2 w-48 py-2 rounded-xl z-50"
                style={{
                  background: 'rgba(30, 30, 30, 0.95)',
                  border: `1px solid ${colors.border}`,
                  backdropFilter: 'blur(20px)',
                }}
              >
                {[
                  { value: 'all', label: '全部' },
                  { value: 'OPEN', label: '进行中' },
                  { value: 'FULFILLED', label: '已完成' },
                  { value: 'CLOSED', label: '已关闭' },
                ].map((option) => (
                  <button
                    key={option.value}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
                    style={{ color: colors.text }}
                    onClick={() => {
                      setStatusFilter(option.value)
                      setShowFilter(false)
                      setPage(1)
                    }}
                  >
                    {option.label}
                    {statusFilter === option.value && <CheckCircle size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 新建按钮 */}
          <button
            className="btn-primary py-3 px-5 flex items-center gap-2"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={18} />
            <span>发布需求</span>
          </button>
        </div>
      </div>

      {/* 需求列表 */}
      <div className="px-8 max-w-6xl mx-auto">
        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin" style={{ color: colors.textSecondary }} />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertCircle size={48} className="mx-auto mb-4" style={{ color: colors.error }} />
            <p style={{ color: colors.textSecondary }}>{error}</p>
          </div>
        ) : filteredDemands.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
            <p style={{ color: colors.textSecondary }}>暂无需求</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDemands.map((demand) => {
              const status = statusConfig[demand.status] || statusConfig['OPEN']
              return (
                <div
                  key={demand.id}
                  className="p-6 rounded-2xl cursor-pointer hover:bg-white/5 transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${colors.border}`,
                  }}
                  onClick={() => loadResponses(demand)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium" style={{ color: colors.text }}>
                          {demand.title}
                        </h3>
                        <span
                          className="text-xs px-3 py-1 rounded-full"
                          style={{ background: status.bg, color: status.text }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm mb-4 line-clamp-2" style={{ color: colors.textSecondary }}>
                        {demand.description}
                      </p>
                      <div className="flex items-center gap-4 flex-wrap text-sm" style={{ color: colors.textSecondary }}>
                        {demand.project_name && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
                            <Briefcase size={12} />
                            {demand.project_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          {demand.business_type}
                        </span>
                        {demand.industry && (
                          <span>{demand.industry}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatTime(demand.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} />
                          {demand.response_count || 0} 响应
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} style={{ color: colors.textSecondary }} />
                  </div>
                </div>
              )
            })}

            {/* 加载更多 */}
            {hasMore && (
              <button
                className="w-full py-4 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                style={{
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
                onClick={() => setPage(page + 1)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  '加载更多'
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 需求详情弹窗 */}
      {selectedDemand && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setSelectedDemand(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-8"
            style={{
              background: 'rgba(20, 20, 20, 0.98)',
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-medium mb-2" style={{ color: colors.text }}>
                  {selectedDemand.title}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {(() => {
                    const status = statusConfig[selectedDemand.status] || statusConfig['OPEN']
                    return (
                      <span
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ background: status.bg, color: status.text }}
                      >
                        {status.label}
                      </span>
                    )
                  })()}
                  <span className="text-sm" style={{ color: colors.textSecondary }}>
                    {selectedDemand.business_type}
                  </span>
                  {selectedDemand.industry && (
                    <span className="text-sm" style={{ color: colors.textSecondary }}>
                      · {selectedDemand.industry}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedDemand(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            {/* 关联项目 */}
            {selectedDemand.project_name && (
              <div 
                className="mb-6 p-4 rounded-xl"
                style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
              >
                <div className="flex items-center gap-3">
                  <Briefcase size={18} className="text-blue-400" />
                  <div>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>关联项目</p>
                    <Link
                      href={`/projects/${selectedDemand.project_id}`}
                      className="font-medium hover:underline"
                      style={{ color: '#60a5fa' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selectedDemand.project_name}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 需求人 */}
            {selectedDemand.participants && selectedDemand.participants.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
                  需求人
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDemand.participants.map((p) => (
                    <span
                      key={p.user_id}
                      className="px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
                      style={{ 
                        background: p.is_owner ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${p.is_owner ? 'rgba(74, 222, 128, 0.3)' : colors.border}`,
                        color: colors.text
                      }}
                    >
                      <User size={14} />
                      {p.user_name}
                      {p.is_owner && <span className="text-xs text-green-400">(负责人)</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 激励形式 */}
            {selectedDemand.expected_reward && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>
                  激励形式
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedDemand.expected_reward.equity && (
                    <span className="px-3 py-1.5 rounded-lg text-sm bg-green-500/10 text-green-400 border border-green-500/20">
                      项目股份: {selectedDemand.expected_reward.equity}
                    </span>
                  )}
                  {selectedDemand.expected_reward.token && (
                    <span className="px-3 py-1.5 rounded-lg text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Token: {selectedDemand.expected_reward.token}
                    </span>
                  )}
                  {selectedDemand.expected_reward.other && (
                    <span className="px-3 py-1.5 rounded-lg text-sm bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      其他: {selectedDemand.expected_reward.other}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 描述 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
                需求描述
              </h3>
              <p style={{ color: colors.text }}>{selectedDemand.description}</p>
            </div>

            {/* 响应需求按钮 */}
            {selectedDemand.status === 'OPEN' && (
              <button
                className="btn-primary w-full py-3 mb-6 flex items-center justify-center gap-2"
                onClick={() => {
                  setRespondingTo(selectedDemand)
                  setShowResponseForm(true)
                }}
              >
                <Send size={18} />
                响应此需求
              </button>
            )}

            {/* 响应列表 */}
            <div>
              <h3 className="text-sm font-medium mb-4" style={{ color: colors.textSecondary }}>
                响应列表 ({responses.length})
              </h3>
              {responsesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin" style={{ color: colors.textSecondary }} />
                </div>
              ) : responses.length === 0 ? (
                <p className="text-center py-8" style={{ color: colors.textSecondary }}>
                  暂无响应
                </p>
              ) : (
                <div className="space-y-4">
                  {responses.map((response) => {
                    const respStatus = responseStatusConfig[response.status] || responseStatusConfig['PENDING']
                    const isReviewing = reviewingResponseId === response.id
                    return (
                      <div
                        key={response.id}
                        className="p-4 rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: `1px solid ${colors.border}`,
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                              <User size={14} />
                            </div>
                            <span style={{ color: colors.text }}>
                              {response.responder?.name || response.responder_name || '匿名用户'}
                            </span>
                          </div>
                          <span
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ background: respStatus.bg, color: respStatus.text }}
                          >
                            {respStatus.label}
                          </span>
                        </div>
                        
                        {/* 响应方案 */}
                        <p className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                          {response.proposal}
                        </p>
                        
                        {/* 意向激励 */}
                        {response.expected_reward && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {response.expected_reward.equity && (
                              <span className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                                股份: {response.expected_reward.equity}
                              </span>
                            )}
                            {response.expected_reward.token && (
                              <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Token: {response.expected_reward.token}
                              </span>
                            )}
                            {response.expected_reward.other && (
                              <span className="px-2 py-1 rounded text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                其他: {response.expected_reward.other}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* 审核按钮 - 仅需求 owner 可见且响应状态为 SUBMITTED */}
                        {selectedDemand && isDemandOwner(selectedDemand) && response.status === 'SUBMITTED' && (
                          <div className="flex gap-2 pt-3 border-t border-white/10">
                            <button
                              onClick={() => handleReviewResponse(response.id, true)}
                              disabled={isReviewing}
                              className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                              style={{
                                background: 'rgba(74, 222, 128, 0.1)',
                                color: '#4ade80',
                                border: '1px solid rgba(74, 222, 128, 0.3)',
                              }}
                            >
                              {isReviewing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              接受
                            </button>
                            <button
                              onClick={() => handleReviewResponse(response.id, false)}
                              disabled={isReviewing}
                              className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              {isReviewing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                              拒绝
                            </button>
                          </div>
                        )}
                        
                        {/* 标记完成按钮 - 仅需求 owner 可见且响应状态为 ACCEPTED_PENDING_USAGE */}
                        {selectedDemand && isDemandOwner(selectedDemand) && response.status === 'ACCEPTED_PENDING_USAGE' && (
                          <div className="pt-3 border-t border-white/10">
                            <button
                              onClick={() => openMarkCompleteModal(response)}
                              className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                              style={{
                                background: 'rgba(74, 222, 128, 0.15)',
                                color: '#4ade80',
                                border: '1px solid rgba(74, 222, 128, 0.4)',
                              }}
                            >
                              <Check size={16} />
                              标记完成并结算
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新建需求弹窗 */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowCreateForm(false)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-8"
            style={{
              background: 'rgba(20, 20, 20, 0.98)',
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium" style={{ color: colors.text }}>
                发布需求
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* 关联项目 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  关联项目 *
                </label>
                <select
                  value={createForm.project_ids[0] || ''}
                  onChange={(e) => setCreateForm({ ...createForm, project_ids: [Number(e.target.value)] })}
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="">请选择项目</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* 标题 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  需求标题 *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="请输入需求标题"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 业务类型 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  业务类型
                </label>
                <select
                  value={createForm.business_type}
                  onChange={(e) => setCreateForm({ ...createForm, business_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="协议转让">协议转让</option>
                  <option value="并购重组">并购重组</option>
                  <option value="产业赋能">产业赋能</option>
                  <option value="债权业务">债权业务</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              {/* 需求行业 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  需求行业
                </label>
                <input
                  type="text"
                  value={createForm.industry}
                  onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
                  placeholder="如：金融科技、新能源、医疗健康..."
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  需求描述 *
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="详细描述您的需求..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 激励形式 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  激励形式
                </label>
                <div className="space-y-3">
                  {/* 项目股份 */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-20" style={{ color: colors.textSecondary }}>项目股份</span>
                    <input
                      type="text"
                      value={createForm.reward_equity}
                      onChange={(e) => setCreateForm({ ...createForm, reward_equity: e.target.value })}
                      placeholder="如：5%"
                      className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  </div>
                  {/* Token */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-20" style={{ color: colors.textSecondary }}>Token</span>
                    <input
                      type="number"
                      value={createForm.reward_token}
                      onChange={(e) => setCreateForm({ ...createForm, reward_token: e.target.value })}
                      placeholder="如：1000"
                      className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  </div>
                  {/* 其他 */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-20" style={{ color: colors.textSecondary }}>其他</span>
                    <input
                      type="text"
                      value={createForm.reward_other}
                      onChange={(e) => setCreateForm({ ...createForm, reward_other: e.target.value })}
                      placeholder="如：现金奖励、资源对接..."
                      className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 可见范围 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  可见范围
                </label>
                <select
                  value={createForm.visibility_scope_type}
                  onChange={(e) => setCreateForm({ ...createForm, visibility_scope_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  <option value="ALL">全部合伙人</option>
                  <option value="ROLE_MIN_LEVEL">按角色等级</option>
                </select>
                {createForm.visibility_scope_type === 'ROLE_MIN_LEVEL' && (
                  <select
                    value={createForm.visibility_min_role_level}
                    onChange={(e) => setCreateForm({ ...createForm, visibility_min_role_level: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-lg outline-none mt-2"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  >
                    <option value={1}>普通合伙人及以上</option>
                    <option value={2}>核心合伙人及以上</option>
                    <option value={3}>仅联合创始人</option>
                  </select>
                )}
              </div>

              {/* 提交按钮 */}
              <button
                onClick={handleCreateDemand}
                disabled={submitting || !createForm.title || !createForm.description || createForm.project_ids.length === 0}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: colors.text,
                  color: colors.bg,
                }}
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={18} />
                    发布需求
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 响应需求弹窗 */}
      {showResponseForm && respondingTo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => {
            setShowResponseForm(false)
            setRespondingTo(null)
          }}
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
                响应需求
              </h2>
              <button
                onClick={() => {
                  setShowResponseForm(false)
                  setRespondingTo(null)
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: colors.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-sm" style={{ color: colors.textSecondary }}>响应需求：</p>
              <p style={{ color: colors.text }}>{respondingTo.title}</p>
            </div>

            <div className="space-y-5">
              {/* 方案描述 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  您的方案 *
                </label>
                <textarea
                  value={responseForm.proposal}
                  onChange={(e) => setResponseForm({ ...responseForm, proposal: e.target.value })}
                  placeholder="描述您可以提供的资源或解决方案..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
              </div>

              {/* 意向激励 */}
              <div>
                <label className="block text-sm mb-3" style={{ color: colors.textSecondary }}>
                  意向激励
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {/* 项目股份 */}
                  <div className="flex items-center gap-3">
                    <span 
                      className="text-sm w-20 shrink-0"
                      style={{ color: colors.textSecondary }}
                    >
                      项目股份
                    </span>
                    <input
                      type="text"
                      value={responseForm.reward_equity}
                      onChange={(e) => setResponseForm({ ...responseForm, reward_equity: e.target.value })}
                      placeholder="如：5%"
                      className="flex-1 px-4 py-2 rounded-lg outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  </div>
                  {/* Token */}
                  <div className="flex items-center gap-3">
                    <span 
                      className="text-sm w-20 shrink-0"
                      style={{ color: colors.textSecondary }}
                    >
                      Token
                    </span>
                    <input
                      type="number"
                      value={responseForm.reward_token}
                      onChange={(e) => setResponseForm({ ...responseForm, reward_token: e.target.value })}
                      placeholder="Token 数量"
                      className="flex-1 px-4 py-2 rounded-lg outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  </div>
                  {/* 其他 */}
                  <div className="flex items-center gap-3">
                    <span 
                      className="text-sm w-20 shrink-0"
                      style={{ color: colors.textSecondary }}
                    >
                      其他
                    </span>
                    <input
                      type="text"
                      value={responseForm.reward_other}
                      onChange={(e) => setResponseForm({ ...responseForm, reward_other: e.target.value })}
                      placeholder="其他激励形式描述"
                      className="flex-1 px-4 py-2 rounded-lg outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  备注（可选）
                </label>
                <textarea
                  value={responseForm.note}
                  onChange={(e) => setResponseForm({ ...responseForm, note: e.target.value })}
                  placeholder="其他补充信息..."
                  rows={2}
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
                onClick={handleSubmitResponse}
                disabled={submitting || !responseForm.proposal}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: colors.text,
                  color: colors.bg,
                }}
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    提交响应
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 标记完成模态框 */}
      {showMarkCompleteModal && markingResponse && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={(e) => e.target === e.currentTarget && setShowMarkCompleteModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl p-8 space-y-6"
            style={{ 
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-medium" style={{ color: colors.text }}>
                  标记需求完成
                </h3>
                <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                  确认资源已使用，可同时发起Token支付
                </p>
              </div>
              <button
                onClick={() => setShowMarkCompleteModal(false)}
                className="p-2 rounded-lg transition-colors hover:bg-white/10"
              >
                <X size={20} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            {/* 响应信息 */}
            <div 
              className="p-4 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}` }}
            >
              <p className="text-sm" style={{ color: colors.textSecondary }}>资源方</p>
              <p className="font-medium" style={{ color: colors.text }}>
                {markingResponse.responder_name}
              </p>
              {(markingResponse.final_reward || markingResponse.expected_reward) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(markingResponse.final_reward?.token || markingResponse.expected_reward?.token) && (
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Token: {markingResponse.final_reward?.token || markingResponse.expected_reward?.token}
                    </span>
                  )}
                  {(markingResponse.final_reward?.equity || markingResponse.expected_reward?.equity) && (
                    <span className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                      股权: {markingResponse.final_reward?.equity || markingResponse.expected_reward?.equity}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 备注 */}
            <div>
              <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                完成备注
              </label>
              <textarea
                value={markCompleteForm.note}
                onChange={(e) => setMarkCompleteForm({ ...markCompleteForm, note: e.target.value })}
                placeholder="可选，记录完成情况..."
                rows={2}
                className="w-full px-4 py-3 rounded-lg outline-none resize-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            </div>

            {/* 发起支付开关 */}
            <div 
              className="p-4 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.border}` }}
            >
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium" style={{ color: colors.text }}>发起Token支付</p>
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    同时向资源方发起Token转账（需管理员审批）
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={markCompleteForm.initiate_payment}
                  onChange={(e) => setMarkCompleteForm({ 
                    ...markCompleteForm, 
                    initiate_payment: e.target.checked 
                  })}
                  className="w-5 h-5 rounded"
                />
              </label>

              {markCompleteForm.initiate_payment && (
                <div className="mt-4 space-y-4 pt-4 border-t border-white/10">
                  <div>
                    <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                      Token数量 *
                    </label>
                    <input
                      type="number"
                      value={markCompleteForm.token_amount}
                      onChange={(e) => setMarkCompleteForm({ 
                        ...markCompleteForm, 
                        token_amount: e.target.value 
                      })}
                      placeholder="输入Token数量"
                      className="w-full px-4 py-3 rounded-lg outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                      支付原因
                    </label>
                    <input
                      type="text"
                      value={markCompleteForm.payment_reason}
                      onChange={(e) => setMarkCompleteForm({ 
                        ...markCompleteForm, 
                        payment_reason: e.target.value 
                      })}
                      placeholder="支付说明"
                      className="w-full px-4 py-3 rounded-lg outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowMarkCompleteModal(false)}
                className="flex-1 py-3 rounded-lg font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                取消
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={markingComplete || (markCompleteForm.initiate_payment && !markCompleteForm.token_amount)}
                className="flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(74, 222, 128, 0.15)',
                  color: '#4ade80',
                  border: '1px solid rgba(74, 222, 128, 0.4)',
                }}
              >
                {markingComplete ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Check size={18} />
                    确认完成
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

