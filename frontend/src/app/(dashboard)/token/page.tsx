'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { gsap } from 'gsap'
import { 
  TrendingUp,
  TrendingDown,
  Clock,
  Send,
  Download,
  Filter,
  Search,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { tokenService, TokenAccount, TokenTransaction, userService, User as UserType } from '@/lib/services'
import { useAuthStore } from '@/store/auth'

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

// 交易状态映射
const transactionStatusColors: Record<string, { bg: string; text: string; label: string }> = {
  'PENDING_ADMIN_APPROVAL': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '待管理员审批' },
  'PENDING_RECEIVER_CONFIRM': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', label: '待接收方确认' },
  'COMPLETED': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '已完成' },
  'REJECTED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '已拒绝' },
  'CANCELLED': { bg: 'rgba(136, 136, 136, 0.1)', text: '#888888', label: '已取消' },
}

// 交易方向映射
const directionLabels: Record<string, { label: string; icon: React.ReactNode; isIncome: boolean }> = {
  'TRANSFER': { label: '转账', icon: <Send size={16} />, isIncome: false },
  'ADMIN_GRANT': { label: '管理员发放', icon: <Download size={16} />, isIncome: true },
  'ADMIN_DEDUCT': { label: '管理员扣除', icon: <TrendingDown size={16} />, isIncome: false },
  'DIVIDEND': { label: '项目分红', icon: <TrendingUp size={16} />, isIncome: true },
}

export default function TokenPage() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const [account, setAccount] = useState<TokenAccount | null>(null)
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // 转账表单状态
  const [showTransferForm, setShowTransferForm] = useState(false)
  const [transferTo, setTransferTo] = useState<number | null>(null)
  const [transferToSearch, setTransferToSearch] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [transferProjectId, setTransferProjectId] = useState<number | null>(null)
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  const [userSearchResults, setUserSearchResults] = useState<UserType[]>([])
  const [userSearching, setUserSearching] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  // 处理 URL 参数（从 /token/transfer 重定向或合伙人页面）
  useEffect(() => {
    const shouldTransfer = searchParams.get('transfer')
    const toUserId = searchParams.get('to')
    
    if (shouldTransfer === '1') {
      setShowTransferForm(true)
      if (toUserId) {
        // 预填接收者
        setTransferTo(Number(toUserId))
        // 获取用户信息显示姓名
        userService.get(Number(toUserId)).then(u => {
          setTransferToSearch(u.name)
        }).catch(() => {})
      }
    }
  }, [searchParams])

  // 加载账户信息
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        setLoading(true)
        const data = await tokenService.getMyAccount()
        setAccount(data)
      } catch (err) {
        console.error('Failed to fetch account:', err)
        setError('无法加载账户信息')
      } finally {
        setLoading(false)
      }
    }
    fetchAccount()
  }, [])

  // 加载交易记录
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setTxLoading(true)
        const params: any = { page, page_size: 20 }
        if (filter) params.direction = filter
        const data = await tokenService.getMyTransactions(params)
        
        if (page === 1) {
          setTransactions(data.items || [])
        } else {
          setTransactions(prev => [...prev, ...(data.items || [])])
        }
        setHasMore((data.items?.length || 0) === 20)
      } catch (err) {
        console.error('Failed to fetch transactions:', err)
      } finally {
        setTxLoading(false)
      }
    }
    fetchTransactions()
  }, [page, filter])

  // 入场动画
  useEffect(() => {
    if (!loading && heroRef.current) {
      gsap.set(heroRef.current.children, { opacity: 0, y: 30 })
      gsap.to(heroRef.current.children, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }
  }, [loading])

  // 搜索用户
  useEffect(() => {
    const searchUsers = async () => {
      if (!transferToSearch || transferToSearch.trim().length < 1) {
        setUserSearchResults([])
        return
      }
      
      try {
        setUserSearching(true)
        const response = await userService.list({ search: transferToSearch.trim(), limit: 20 })
        setUserSearchResults(response.items.filter(u => u.id !== user?.id) || [])
      } catch (err) {
        console.error('Failed to search users:', err)
      } finally {
        setUserSearching(false)
      }
    }
    
    const timer = setTimeout(searchUsers, 200)  // 减少延迟
    return () => clearTimeout(timer)
  }, [transferToSearch, user?.id])

  // 提交转账
  const handleTransfer = async () => {
    if (!transferTo || !transferAmount || !transferReason) return
    
    try {
      setTransferSubmitting(true)
      await tokenService.createTransaction({
        to_user_id: transferTo,
        amount: parseFloat(transferAmount),
        reason: transferReason,
        related_project_id: transferProjectId || undefined,
      })
      
      // 刷新数据
      setShowTransferForm(false)
      setTransferTo(null)
      setTransferToSearch('')
      setTransferAmount('')
      setTransferReason('')
      setTransferProjectId(null)
      setPage(1)
      
      // 重新加载账户和交易
      const [newAccount] = await Promise.all([
        tokenService.getMyAccount(),
      ])
      setAccount(newAccount)
    } catch (err: any) {
      alert(err.message || '转账失败')
    } finally {
      setTransferSubmitting(false)
    }
  }

  // 确认收款
  const handleConfirmTransaction = async (txId: number, accept: boolean) => {
    try {
      await tokenService.confirmTransaction(txId, accept, accept ? undefined : '拒绝接收')
      
      // 刷新数据
      setPage(1)
      const [newAccount] = await Promise.all([
        tokenService.getMyAccount(),
      ])
      setAccount(newAccount)
    } catch (err: any) {
      alert(err.message || '操作失败')
    }
  }

  // 判断是否是收入
  const isIncome = (tx: TokenTransaction) => {
    if (tx.direction === 'ADMIN_GRANT' || tx.direction === 'DIVIDEND') return true
    if (tx.direction === 'TRANSFER' && tx.to_user_id === user?.id) return true
    return false
  }

  // 格式化金额
  const formatAmount = (amount: string | number) => {
    return parseFloat(amount.toString()).toLocaleString('zh-CN')
  }

  // 过滤交易
  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      tx.reason?.toLowerCase().includes(search) ||
      tx.from_user_name?.toLowerCase().includes(search) ||
      tx.to_user_name?.toLowerCase().includes(search) ||
      tx.project_name?.toLowerCase().includes(search)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: colors.textSecondary }}>加载账户信息...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* Hero 区域 */}
      <section 
        ref={heroRef}
        className="min-h-[50vh] flex flex-col items-center justify-center text-center px-8 relative gsap-hero"
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(80, 80, 80, 0.15) 0%, transparent 60%)',
          }}
        />

        <p className="text-sm mb-2" style={{ color: colors.textSecondary }}>
          我的 Token 余额
        </p>

        <h1 
          className="text-6xl md:text-7xl font-light mb-4"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif"
          }}
        >
          {account ? formatAmount(account.balance) : '0'}
        </h1>

        <p className="text-sm mb-8" style={{ color: colors.textSecondary }}>
          初始额度 {account ? formatAmount(account.initial_balance) : '0'} · 
          已使用 {account && parseFloat(account.initial_balance) > 0 
            ? ((parseFloat(account.initial_balance) - parseFloat(account.balance)) / parseFloat(account.initial_balance) * 100).toFixed(1) 
            : '0'}%
        </p>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTransferForm(true)}
            className="btn-primary py-3 px-6 flex items-center gap-2"
          >
            <Send size={18} />
            发起转账
          </button>
        </div>
      </section>

      {/* 交易记录区域 */}
      <section className="px-8 pb-24 max-w-4xl mx-auto">
        {/* 筛选栏 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search 
              size={18} 
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: colors.textSecondary }}
            />
            <input
              type="text"
              placeholder="搜索交易记录..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12 w-full"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={18} style={{ color: colors.textSecondary }} />
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value)
                setPage(1)
              }}
              className="input-field py-2 px-4 text-sm"
              style={{ minWidth: '120px' }}
            >
              <option value="">全部类型</option>
              <option value="TRANSFER">转账</option>
              <option value="ADMIN_GRANT">管理员发放</option>
              <option value="ADMIN_DEDUCT">管理员扣除</option>
              <option value="DIVIDEND">项目分红</option>
            </select>
          </div>
        </div>

        {/* 交易列表 */}
        <div 
          className="glass-card"
          style={{ border: `1px solid ${colors.border}` }}
        >
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <h2 className="text-lg font-medium" style={{ color: colors.text }}>
              交易记录
            </h2>
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              共 {transactions.length} 条
            </span>
          </div>

          {txLoading && transactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p style={{ color: colors.textSecondary }}>加载交易记录...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-30" style={{ color: colors.textSecondary }} />
              <p style={{ color: colors.textSecondary }}>
                {searchQuery ? '没有找到匹配的交易记录' : '暂无交易记录'}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: colors.border }}>
              {filteredTransactions.map((tx) => {
                const income = isIncome(tx)
                const statusInfo = transactionStatusColors[tx.status]
                const directionInfo = directionLabels[tx.direction]
                const needsAction = tx.status === 'PENDING_RECEIVER_CONFIRM' && tx.to_user_id === user?.id
                
                return (
                  <div 
                    key={tx.id}
                    className="p-4 transition-colors duration-300 hover:bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* 图标 */}
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ 
                            background: income 
                              ? 'rgba(74, 222, 128, 0.1)' 
                              : 'rgba(239, 68, 68, 0.1)' 
                          }}
                        >
                          {income ? (
                            <ArrowDownLeft size={18} style={{ color: colors.success }} />
                          ) : (
                            <ArrowUpRight size={18} style={{ color: colors.error }} />
                          )}
                        </div>
                        
                        {/* 信息 */}
                        <div>
                          <p className="text-sm font-medium" style={{ color: colors.text }}>
                            {tx.reason || directionInfo?.label || tx.direction}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: colors.textSecondary }}>
                            {tx.direction === 'TRANSFER' && (
                              <>
                                <span>
                                  {income 
                                    ? `来自 ${tx.from_user_name}`
                                    : `转给 ${tx.to_user_name}`
                                  }
                                </span>
                                <span>·</span>
                              </>
                            )}
                            {tx.project_name && (
                              <>
                                <span>{tx.project_name}</span>
                                <span>·</span>
                              </>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(tx.created_at).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          
                          {/* 状态标签 */}
                          <div className="flex items-center gap-2 mt-2">
                            <span 
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                background: statusInfo?.bg,
                                color: statusInfo?.text,
                              }}
                            >
                              {statusInfo?.label}
                            </span>
                            {tx.admin_comment && (
                              <span 
                                className="text-xs"
                                style={{ color: colors.textSecondary }}
                              >
                                备注: {tx.admin_comment}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* 金额和操作 */}
                      <div className="text-right">
                        <p 
                          className="text-xl font-medium"
                          style={{ color: income ? colors.success : colors.error }}
                        >
                          {income ? '+' : '-'}{formatAmount(tx.amount)}
                        </p>
                        
                        {needsAction && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => handleConfirmTransaction(tx.id, true)}
                              className="p-1.5 rounded-full transition-colors duration-300 hover:bg-green-500/20"
                              title="确认接收"
                            >
                              <CheckCircle size={18} style={{ color: colors.success }} />
                            </button>
                            <button
                              onClick={() => handleConfirmTransaction(tx.id, false)}
                              className="p-1.5 rounded-full transition-colors duration-300 hover:bg-red-500/20"
                              title="拒绝接收"
                            >
                              <XCircle size={18} style={{ color: colors.error }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 加载更多 */}
          {hasMore && transactions.length > 0 && (
            <div className="p-4 text-center" style={{ borderTop: `1px solid ${colors.border}` }}>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={txLoading}
                className="btn-outline py-2 px-6 text-sm flex items-center gap-2 mx-auto"
              >
                {txLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    加载中...
                  </>
                ) : (
                  <>
                    加载更多
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 转账弹窗 */}
      {showTransferForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowTransferForm(false)}
        >
          <div 
            className="glass-card p-6 w-full max-w-md"
            style={{ border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-medium mb-6" style={{ color: colors.text }}>
              发起 Token 转账
            </h2>

            <div className="space-y-4">
              {/* 接收方 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  接收方
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜索用户姓名或邮箱..."
                    value={transferToSearch}
                    onChange={(e) => {
                      setTransferToSearch(e.target.value)
                      setTransferTo(null)
                    }}
                    className="input-field w-full"
                  />
                  {userSearching && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: colors.textSecondary }} />
                  )}
                </div>
                
                {/* 搜索结果 */}
                {userSearchResults.length > 0 && !transferTo && (
                  <div 
                    className="mt-2 rounded-lg overflow-hidden"
                    style={{ 
                      background: 'rgba(30, 30, 30, 0.95)',
                      border: `1px solid ${colors.border}` 
                    }}
                  >
                    {userSearchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setTransferTo(u.id)
                          setTransferToSearch(u.name)
                        }}
                        className="w-full flex items-center gap-3 p-3 text-left transition-colors duration-300 hover:bg-white/10"
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          style={{ background: 'rgba(255, 255, 255, 0.1)', color: colors.text }}
                        >
                          {u.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: colors.text }}>{u.name}</p>
                          <p className="text-xs" style={{ color: colors.textSecondary }}>
                            {u.email || u.phone}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {transferTo && (
                  <p className="text-xs mt-1" style={{ color: colors.success }}>
                    已选择: {transferToSearch}
                  </p>
                )}
              </div>

              {/* 金额 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  转账金额
                </label>
                <input
                  type="number"
                  placeholder="输入 Token 数量"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="input-field w-full"
                  min="1"
                  max={account ? parseFloat(account.balance) : 0}
                />
                <p className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                  可用余额: {account ? formatAmount(account.balance) : '0'}
                </p>
              </div>

              {/* 原因 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  转账原因
                </label>
                <textarea
                  placeholder="请说明转账原因..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="input-field w-full resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => setShowTransferForm(false)}
                className="btn-outline flex-1 py-3"
              >
                取消
              </button>
              <button
                onClick={handleTransfer}
                disabled={!transferTo || !transferAmount || !transferReason || transferSubmitting}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
              >
                {transferSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    确认转账
                  </>
                )}
              </button>
            </div>

            <p className="text-xs mt-4 text-center" style={{ color: colors.textSecondary }}>
              转账需要管理员审批后才能完成
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer 
        className="text-center py-8"
        style={{ color: colors.textSecondary }}
      >
        <p className="text-xs">
          © 2024 元征 · 合伙人赋能平台
        </p>
      </footer>
    </div>
  )
}

