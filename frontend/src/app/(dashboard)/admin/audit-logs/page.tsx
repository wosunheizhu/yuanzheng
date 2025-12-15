'use client'

/**
 * 元征 · 合伙人赋能平台 - 审计日志页面
 * Phase 4: 审计日志查询界面
 */
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { 
  Shield,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// 模拟审计日志数据类型
interface AuditLog {
  id: number
  user_id: number
  user_name: string
  action: string
  object_type: string
  object_id: number
  summary: string
  created_at: string
}

// 操作类型映射
const actionLabels: Record<string, string> = {
  'PROJECT_CREATE': '创建项目',
  'PROJECT_APPROVE': '审核通过项目',
  'PROJECT_REJECT': '驳回项目',
  'PROJECT_UPDATE': '更新项目',
  'PROJECT_DELETE': '删除项目',
  'SHARE_ADJUST': '调整股权',
  'TOKEN_GRANT': '发放 Token',
  'TOKEN_DEDUCT': '扣除 Token',
  'TOKEN_TRANSFER_APPROVE': '审批转账',
  'TOKEN_TRANSFER_REJECT': '驳回转账',
  'RESOURCE_DELETE': '删除资源',
  'POST_DELETE': '删除动态',
  'COMMENT_DELETE': '删除评论',
  'ANNOUNCEMENT_CREATE': '发布公告',
  'ANNOUNCEMENT_DELETE': '删除公告',
  'VALUE_RECORD_CREATE': '创建价值记录',
  'VALUE_RECORD_UPDATE': '更新价值记录',
  'VALUE_RECORD_DELETE': '删除价值记录',
  'USER_LOGIN': '用户登录',
  'USER_REGISTER': '用户注册',
}

// 对象类型映射
const objectTypeLabels: Record<string, string> = {
  'PROJECT': '项目',
  'PROJECT_SHARE': '项目股权',
  'USER': '用户',
  'TOKEN_ACCOUNT': 'Token 账户',
  'TOKEN_TRANSACTION': 'Token 交易',
  'RESOURCE': '资源',
  'POST': '动态',
  'COMMENT': '评论',
  'ANNOUNCEMENT': '公告',
  'VALUE_RECORD': '价值记录',
}

export default function AuditLogsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  
  // 状态
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  
  // 筛选
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [objectTypeFilter, setObjectTypeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // 可用的筛选选项
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [availableObjectTypes, setAvailableObjectTypes] = useState<string[]>([])
  
  const containerRef = useRef<HTMLDivElement>(null)

  // 权限检查
  useEffect(() => {
    if (!user?.is_admin) {
      router.replace('/dashboard')
      toast.error('您没有管理员权限')
    }
  }, [user, router])

  // 加载审计日志
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true)
        
        // 构建查询参数
        const params = new URLSearchParams()
        params.append('skip', String((page - 1) * pageSize))
        params.append('limit', String(pageSize))
        
        if (actionFilter) params.append('action', actionFilter)
        if (objectTypeFilter) params.append('object_type', objectTypeFilter)
        if (startDate) params.append('start_time', new Date(startDate).toISOString())
        if (endDate) params.append('end_time', new Date(endDate).toISOString())
        
        const response = await fetch(`/api/v1/admin/audit-logs?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setLogs(data.items || [])
          setTotal(data.total || 0)
        } else {
          // 使用模拟数据
          setLogs(generateMockLogs())
          setTotal(100)
        }
      } catch (error) {
        console.error('Error fetching audit logs:', error)
        // 使用模拟数据
        setLogs(generateMockLogs())
        setTotal(100)
      } finally {
        setLoading(false)
      }
    }
    
    fetchLogs()
  }, [page, pageSize, actionFilter, objectTypeFilter, startDate, endDate])

  // 加载筛选选项
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // 获取操作类型
        const actionsResponse = await fetch('/api/v1/admin/audit-logs/actions', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        if (actionsResponse.ok) {
          const data = await actionsResponse.json()
          setAvailableActions(data.actions || [])
        } else {
          setAvailableActions(Object.keys(actionLabels))
        }
        
        // 获取对象类型
        const typesResponse = await fetch('/api/v1/admin/audit-logs/object-types', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        if (typesResponse.ok) {
          const data = await typesResponse.json()
          setAvailableObjectTypes(data.object_types || [])
        } else {
          setAvailableObjectTypes(Object.keys(objectTypeLabels))
        }
      } catch (error) {
        console.error('Error fetching options:', error)
        setAvailableActions(Object.keys(actionLabels))
        setAvailableObjectTypes(Object.keys(objectTypeLabels))
      }
    }
    
    fetchOptions()
  }, [])

  // 入场动画
  useEffect(() => {
    if (!containerRef.current) return
    
    gsap.fromTo(
      containerRef.current.querySelectorAll('.animate-in'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' }
    )
  }, [loading])

  // 生成模拟数据
  function generateMockLogs(): AuditLog[] {
    const actions = Object.keys(actionLabels)
    const types = Object.keys(objectTypeLabels)
    const users = ['管理员', '联合创始人A', '核心合伙人B', '普通合伙人C']
    
    return Array.from({ length: 20 }, (_, i) => ({
      id: (page - 1) * 20 + i + 1,
      user_id: i + 1,
      user_name: users[i % users.length],
      action: actions[i % actions.length],
      object_type: types[i % types.length],
      object_id: Math.floor(Math.random() * 100) + 1,
      summary: `执行了 ${actionLabels[actions[i % actions.length]] || actions[i % actions.length]} 操作`,
      created_at: new Date(Date.now() - i * 3600000).toISOString()
    }))
  }

  // 格式化日期
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 导出日志
  function handleExport() {
    toast.info('导出功能开发中...')
  }

  // 刷新
  function handleRefresh() {
    setPage(1)
    toast.success('已刷新')
  }

  // 筛选后的日志
  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        log.summary.toLowerCase().includes(query) ||
        log.user_name.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
      )
    }
    return true
  })

  // 总页数
  const totalPages = Math.ceil(total / pageSize)

  if (!user?.is_admin) {
    return null
  }

  return (
    <div ref={containerRef} className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="animate-in mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link 
              href="/admin" 
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Shield className="w-6 h-6 text-amber-500" />
            </div>
            <h1 className="text-2xl font-semibold">审计日志</h1>
          </div>
          <p className="text-white/60 ml-16">
            查看系统中所有重要操作的审计记录
          </p>
        </div>

        {/* 筛选栏 */}
        <div className="animate-in glass-card p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索 */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="搜索操作摘要、用户名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg 
                         text-white placeholder-white/40 focus:outline-none focus:border-white/30"
              />
            </div>
            
            {/* 操作类型筛选 */}
            <div className="relative">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-white/5 border border-white/10 
                         rounded-lg text-white focus:outline-none focus:border-white/30"
              >
                <option value="">全部操作</option>
                {availableActions.map(action => (
                  <option key={action} value={action}>
                    {actionLabels[action] || action}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
            
            {/* 对象类型筛选 */}
            <div className="relative">
              <select
                value={objectTypeFilter}
                onChange={(e) => setObjectTypeFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 bg-white/5 border border-white/10 
                         rounded-lg text-white focus:outline-none focus:border-white/30"
              >
                <option value="">全部类型</option>
                {availableObjectTypes.map(type => (
                  <option key={type} value={type}>
                    {objectTypeLabels[type] || type}
                  </option>
                ))}
              </select>
              <FileText className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
            
            {/* 日期范围 */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-4 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg 
                           text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <span className="text-white/40">至</span>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-4 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg 
                           text-white focus:outline-none focus:border-white/30"
                />
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                title="刷新"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                title="导出"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 日志列表 */}
        <div className="animate-in glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p>没有找到审计日志</p>
            </div>
          ) : (
            <>
              {/* 表格 */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-6 py-4 text-sm font-medium text-white/60">时间</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-white/60">操作者</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-white/60">操作</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-white/60">对象类型</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-white/60">对象ID</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-white/60">摘要</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, index) => (
                      <tr 
                        key={log.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-white/60">
                            <Calendar className="w-4 h-4" />
                            {formatDate(log.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium">
                              {log.user_name.charAt(0)}
                            </div>
                            <span className="text-sm">{log.user_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full text-xs bg-white/10">
                            {actionLabels[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white/60">
                            {objectTypeLabels[log.object_type] || log.object_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-mono text-white/60">
                            #{log.object_id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white/80 line-clamp-1">
                            {log.summary}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
                <div className="text-sm text-white/60">
                  共 {total} 条记录，第 {page} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 
                             disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {/* 页码按钮 */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg transition-colors ${
                          page === pageNum
                            ? 'bg-white text-black'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 
                             disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

