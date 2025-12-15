'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { 
  Briefcase, 
  TrendingUp, 
  Users, 
  Clock,
  Star,
  ChevronRight,
  Plus,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Coins,
  MessageSquare,
  UserPlus
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { tokenService, projectService, notificationService, demandService, meetingService } from '@/lib/services'
import type { TokenAccount, TokenTransaction, Project, InboxStats } from '@/lib/services'

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

// 交易方向图标
function getTransactionIcon(direction: string, type: 'in' | 'out') {
  if (direction === 'DIVIDEND') return <Gift size={18} style={{ color: colors.success }} />
  if (direction === 'ADMIN_GRANT') return <Coins size={18} style={{ color: colors.success }} />
  if (direction === 'ADMIN_DEDUCT') return <Coins size={18} style={{ color: colors.error }} />
  if (type === 'in') return <ArrowDownRight size={18} style={{ color: colors.success }} />
  return <ArrowUpRight size={18} style={{ color: colors.error }} />
}

// 格式化时间
function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

// 状态标签
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; text: string }> = {
    'ONGOING': { bg: 'rgba(74, 222, 128, 0.15)', color: colors.success, text: '进行中' },
    'PAUSED': { bg: 'rgba(251, 191, 36, 0.15)', color: colors.warning, text: '暂停' },
    'COMPLETED': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', text: '已完成' },
    'ABANDONED': { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280', text: '废弃' },
    'PENDING_REVIEW': { bg: 'rgba(251, 191, 36, 0.15)', color: colors.warning, text: '待审核' },
  }
  const c = config[status] || config['ONGOING']
  return (
    <span 
      className="text-xs px-3 py-1 rounded-full"
      style={{ background: c.bg, color: c.color }}
    >
      {c.text}
    </span>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const heroRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [tokenAccount, setTokenAccount] = useState<TokenAccount | null>(null)
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [inboxStats, setInboxStats] = useState<InboxStats | null>(null)
  const [responseStats, setResponseStats] = useState<{ total_responses: number; accepted_responses: number; used_responses: number } | null>(null)
  const [guestStats, setGuestStats] = useState<{ total_invited_guests: number } | null>(null)

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      const [accountRes, txRes, projectRes, inboxRes, responseStatsRes, guestStatsRes] = await Promise.all([
        tokenService.getMyAccount(),
        tokenService.getMyTransactions({ page_size: 5 }),
        projectService.list({ my_projects: true, page_size: 5 }),
        notificationService.getStats(),
        demandService.getMyResponsesStats(),
        meetingService.getGuestStats(),
      ])
      
      setTokenAccount(accountRes)
      setTransactions(txRes.items)
      setProjects(projectRes.items)
      setInboxStats(inboxRes)
      setResponseStats(responseStatsRes)
      setGuestStats(guestStatsRes)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 动画 - 使用 fromTo 避免闪烁
  useEffect(() => {
    if (loading) return
    
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    
    if (heroRef.current) {
      tl.fromTo(heroRef.current.children, 
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.15 }
      )
    }

    if (statsRef.current) {
      tl.fromTo(statsRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 },
        '-=0.4'
      )
    }

    if (contentRef.current) {
      tl.fromTo(contentRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.15 },
        '-=0.3'
      )
    }
  }, [loading])

  // 获取问候语
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  // 计算Token使用率
  const getTokenUsage = () => {
    if (!tokenAccount) return 0
    const balance = parseFloat(tokenAccount.balance)
    const initial = parseFloat(tokenAccount.initial_balance)
    return Math.round(((initial - balance) / initial) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.textSecondary }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* Hero 区域 */}
      <section 
        ref={heroRef}
        className="min-h-[60vh] flex flex-col items-center justify-center text-center px-8 relative gsap-hero"
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(80, 80, 80, 0.2) 0%, transparent 60%)',
          }}
        />

        <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
          {getGreeting()}，{user?.name || '欢迎回来'}
        </p>

        <h1 
          className="text-5xl md:text-6xl mb-6"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 500,
            letterSpacing: '0.1em'
          }}
        >
          仪表盘
        </h1>

        <p className="text-lg max-w-xl" style={{ color: colors.textSecondary }}>
          记录协作 · 量化贡献 · 可视化价值
        </p>

        <div className="flex items-center gap-4 mt-10">
          {(user?.is_admin || (user?.role_level ?? 0) >= 3) && (
            <Link 
              href="/projects/new" 
              className="flex items-center gap-2 py-3 px-6 font-medium text-sm transition-all duration-300 hover:opacity-90 hover:scale-105"
              style={{ 
                background: colors.text,
                color: colors.bg,
                borderRadius: '50px'
              }}
            >
              <Plus size={18} />
              <span>新建项目</span>
            </Link>
          )}
          <Link 
            href="/resources" 
            className="py-3 px-6 font-medium text-sm transition-all duration-300 hover:border-white hover:bg-white/5"
            style={{ 
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '50px'
            }}
          >
            浏览资源
          </Link>
        </div>
      </section>

      {/* Token & 统计概览 */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-6 gap-4 md:gap-6 gsap-stats">
          {/* Token 余额 */}
          <div 
            className="col-span-2 p-8 relative overflow-hidden"
            style={{ 
              background: 'rgba(30, 30, 30, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: `1px solid ${colors.border}`
            }}
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className="p-3 rounded-full"
                  style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                >
                  <TrendingUp size={20} style={{ color: colors.text }} />
                </div>
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  Token 余额
                </span>
              </div>
              <p 
                className="text-5xl font-light"
                style={{ 
                  color: colors.text,
                  fontFamily: "'Noto Serif SC', serif"
                }}
              >
                {tokenAccount ? parseFloat(tokenAccount.balance).toLocaleString() : '0'}
              </p>
              <p className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                初始额度 {tokenAccount ? parseFloat(tokenAccount.initial_balance).toLocaleString() : '0'} · 
                已使用 {getTokenUsage()}%
              </p>
            </div>
            <div 
              className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)' }}
            />
          </div>

          {/* 参与项目 */}
          <div 
            className="p-6"
            style={{ 
              background: 'rgba(30, 30, 30, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: `1px solid ${colors.border}`
            }}
          >
            <Briefcase size={20} style={{ color: colors.textSecondary }} />
            <p className="text-3xl font-light mt-4 mb-1" style={{ color: colors.text }}>
              {projects.length}
            </p>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              参与项目
            </p>
          </div>

          {/* 未读消息 */}
          <Link 
            href="/inbox"
            className="p-6 relative cursor-pointer transition-all duration-300 hover:bg-white/5 hover:scale-[1.02]"
            style={{ 
              background: 'rgba(30, 30, 30, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: `1px solid ${colors.border}`
            }}
          >
            <Users size={20} style={{ color: colors.textSecondary }} />
            <p className="text-3xl font-light mt-4 mb-1" style={{ color: colors.text }}>
              {inboxStats?.total_unread || 0}
            </p>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              未读消息
            </p>
            {(inboxStats?.total_unread ?? 0) > 0 && (
              <span 
                className="absolute top-4 right-4 w-2 h-2 rounded-full"
                style={{ background: colors.error }}
              />
            )}
          </Link>

          {/* 累计响应需求 */}
          <Link 
            href="/my-responses"
            className="p-6 cursor-pointer transition-all duration-300 hover:bg-white/5 hover:scale-[1.02]"
            style={{ 
              background: 'rgba(30, 30, 30, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: `1px solid ${colors.border}`
            }}
          >
            <MessageSquare size={20} style={{ color: colors.textSecondary }} />
            <p className="text-3xl font-light mt-4 mb-1" style={{ color: colors.text }}>
              {responseStats?.total_responses || 0}
            </p>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              累计响应
            </p>
          </Link>

          {/* 邀请外部嘉宾 */}
          <Link 
            href="/my-guests"
            className="p-6 cursor-pointer transition-all duration-300 hover:bg-white/5 hover:scale-[1.02]"
            style={{ 
              background: 'rgba(30, 30, 30, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: `1px solid ${colors.border}`
            }}
          >
            <UserPlus size={20} style={{ color: colors.textSecondary }} />
            <p className="text-3xl font-light mt-4 mb-1" style={{ color: colors.text }}>
              {guestStats?.total_invited_guests || 0}
            </p>
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              邀请嘉宾
            </p>
          </Link>
        </div>
      </section>

      {/* 项目与交易 */}
      <section ref={contentRef} className="px-8 pb-24 max-w-6xl mx-auto gsap-content">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 我的项目 */}
          <div 
            className="p-6"
            style={{ 
              background: 'rgba(30, 30, 30, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: `1px solid ${colors.border}`
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg" style={{ color: colors.text }}>我的项目</h3>
              <Link 
                href="/projects"
                className="flex items-center gap-1 text-sm transition-colors duration-300 hover:opacity-80"
                style={{ color: colors.textSecondary }}
              >
                <span>全部</span>
                <ChevronRight size={16} />
              </Link>
            </div>
            
            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: colors.textSecondary }}>
                  暂无参与的项目
                </p>
              ) : (
                projects.map((project) => (
                  <Link 
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:bg-white/5"
                    style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                      >
                        <Briefcase size={18} style={{ color: colors.textSecondary }} />
                      </div>
                      <div>
                        <p className="text-sm" style={{ color: colors.text }}>{project.name}</p>
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                          {project.business_type} · {project.creator_name}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={project.review_status === 'APPROVED' ? project.business_status : project.review_status} />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Token 交易 */}
          <div 
            className="p-6"
            style={{ 
              background: 'rgba(30, 30, 30, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: `1px solid ${colors.border}`
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg" style={{ color: colors.text }}>Token 交易</h3>
              <Link 
                href="/token"
                className="flex items-center gap-1 text-sm transition-colors duration-300 hover:opacity-80"
                style={{ color: colors.textSecondary }}
              >
                <span>全部</span>
                <ChevronRight size={16} />
              </Link>
            </div>
            
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: colors.textSecondary }}>
                  暂无交易记录
                </p>
              ) : (
                transactions.map((tx) => {
                  // 判断是否是收入：管理员发放、项目分红是收入，转账则看接收方是否是自己
                  const isIncome = tx.direction === 'ADMIN_GRANT' || tx.direction === 'DIVIDEND' 
                    ? true 
                    : (tx.direction === 'TRANSFER' && tx.to_user_id === user?.id)
                  return (
                    <div 
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ 
                            background: isIncome 
                              ? 'rgba(74, 222, 128, 0.15)' 
                              : 'rgba(239, 68, 68, 0.15)' 
                          }}
                        >
                          {getTransactionIcon(tx.direction, isIncome ? 'in' : 'out')}
                        </div>
                        <div>
                          <p className="text-sm" style={{ color: colors.text }}>
                            {tx.reason || (isIncome ? tx.from_user_name : tx.to_user_name) || tx.direction}
                          </p>
                          <p className="text-xs flex items-center gap-1" style={{ color: colors.textSecondary }}>
                            <Clock size={12} />
                            {formatTime(tx.created_at)}
                          </p>
                        </div>
                      </div>
                      <span 
                        className="font-medium"
                        style={{ color: isIncome ? colors.success : colors.error }}
                      >
                        {isIncome ? '+' : '-'}{parseFloat(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            <Link 
              href="/token/transfer"
              className="w-full mt-6 py-3 font-medium text-sm transition-all duration-300 hover:border-white hover:bg-white/5 block text-center"
              style={{ 
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '50px'
              }}
            >
              发起 Token 交易
            </Link>
          </div>
        </div>
      </section>

      {/* 底部版权 */}
      <footer className="text-center py-8" style={{ color: colors.textSecondary }}>
        <p className="text-xs">© 2024 元征 · 合伙人赋能平台</p>
      </footer>
    </div>
  )
}
