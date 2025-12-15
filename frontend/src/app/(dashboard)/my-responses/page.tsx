'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { 
  MessageSquare, 
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Building2
} from 'lucide-react'
import { demandService } from '@/lib/services'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
  success: '#4ade80',
  error: '#ef4444',
  warning: '#fbbf24',
  info: '#3b82f6',
}

interface DemandResponse {
  id: number
  demand_id: number
  demand_title?: string
  demand_project_name?: string
  responder_id: number
  responder_name?: string
  proposal: string
  expected_reward?: any
  final_reward?: any
  status: string
  created_at: string
  updated_at: string
}

// 状态配置
const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  'SUBMITTED': { label: '已提交', color: colors.info, bg: 'rgba(59, 130, 246, 0.15)', icon: <Clock size={14} /> },
  'ACCEPTED_PENDING_USAGE': { label: '已接受', color: colors.success, bg: 'rgba(74, 222, 128, 0.15)', icon: <CheckCircle2 size={14} /> },
  'USED': { label: '已完成', color: colors.success, bg: 'rgba(74, 222, 128, 0.15)', icon: <CheckCircle2 size={14} /> },
  'REJECTED': { label: '被拒绝', color: colors.error, bg: 'rgba(239, 68, 68, 0.15)', icon: <XCircle size={14} /> },
  'ABANDONED': { label: '已废弃', color: colors.textSecondary, bg: 'rgba(107, 114, 128, 0.15)', icon: <XCircle size={14} /> },
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function MyResponsesPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [responses, setResponses] = useState<DemandResponse[]>([])
  const [stats, setStats] = useState<{ total_responses: number; accepted_responses: number; used_responses: number } | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [responsesRes, statsRes] = await Promise.all([
        demandService.getMyResponses(),
        demandService.getMyResponsesStats(),
      ])
      setResponses(responsesRes)
      setStats(statsRes)
    } catch (error) {
      console.error('Failed to load responses:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 动画 - 在内容渲染后执行
  const [animationReady, setAnimationReady] = useState(false)

  useEffect(() => {
    if (loading || animationReady) return

    // 使用 requestAnimationFrame 确保 DOM 已经渲染
    requestAnimationFrame(() => {
      if (heroRef.current) {
        gsap.set(heroRef.current.children, { opacity: 0, y: 30 })
      }
      if (contentRef.current) {
        gsap.set(contentRef.current.children, { opacity: 0, y: 30 })
      }

      // 执行入场动画
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      
      if (heroRef.current) {
        tl.to(heroRef.current.children, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
        })
      }

      if (contentRef.current) {
        tl.to(contentRef.current.children, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
        }, '-=0.4')
      }

      setAnimationReady(true)
    })
  }, [loading, animationReady])

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
        className="min-h-[40vh] flex flex-col items-center justify-center text-center px-8 relative"
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(80, 80, 80, 0.2) 0%, transparent 60%)',
          }}
        />

        <Link 
          href="/dashboard"
          className="flex items-center gap-2 mb-8 text-sm transition-colors duration-300 hover:opacity-80"
          style={{ color: colors.textSecondary }}
        >
          <ArrowLeft size={16} />
          返回仪表盘
        </Link>

        <h1 
          className="text-4xl md:text-5xl mb-6 font-light tracking-wide"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
          }}
        >
          我的需求响应
        </h1>

        <p className="text-lg max-w-xl" style={{ color: colors.textSecondary }}>
          累计响应 {stats?.total_responses || 0} 个需求 · 
          已接受 {stats?.accepted_responses || 0} · 
          已完成 {stats?.used_responses || 0}
        </p>
      </section>

      {/* 响应列表 */}
      <section ref={contentRef} className="px-8 pb-24 max-w-4xl mx-auto">
        {responses.length === 0 ? (
          <div 
            className="text-center py-16 rounded-2xl"
            style={{ 
              background: 'rgba(30, 30, 30, 0.9)',
              border: `1px solid ${colors.border}`
            }}
          >
            <MessageSquare size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
            <p style={{ color: colors.textSecondary }}>暂无需求响应记录</p>
            <Link 
              href="/demands"
              className="inline-block mt-4 px-6 py-2 rounded-full text-sm transition-all duration-300 hover:opacity-90"
              style={{ 
                background: colors.text,
                color: colors.bg
              }}
            >
              去响应需求
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => {
              const config = statusConfig[response.status] || statusConfig['SUBMITTED']
              return (
                <Link
                  key={response.id}
                  href={`/demands/${response.demand_id}`}
                  className="block p-6 rounded-2xl transition-all duration-300 hover:bg-white/5"
                  style={{ 
                    background: 'rgba(30, 30, 30, 0.9)',
                    border: `1px solid ${colors.border}`
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText size={18} style={{ color: colors.textSecondary }} />
                        <h3 className="font-medium truncate" style={{ color: colors.text }}>
                          {response.demand_title || `需求 #${response.demand_id}`}
                        </h3>
                      </div>
                      
                      {response.demand_project_name && (
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 size={14} style={{ color: colors.textSecondary }} />
                          <span className="text-sm" style={{ color: colors.textSecondary }}>
                            {response.demand_project_name}
                          </span>
                        </div>
                      )}

                      <p 
                        className="text-sm line-clamp-2 mb-3"
                        style={{ color: colors.textSecondary }}
                      >
                        {response.proposal}
                      </p>

                      <div className="flex items-center gap-4 text-xs" style={{ color: colors.textSecondary }}>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(response.created_at)}
                        </span>
                        {response.final_reward && (
                          <span>
                            奖励: {JSON.stringify(response.final_reward)}
                          </span>
                        )}
                      </div>
                    </div>

                    <span 
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap"
                      style={{ background: config.bg, color: config.color }}
                    >
                      {config.icon}
                      {config.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* 底部版权 */}
      <footer className="text-center py-8" style={{ color: colors.textSecondary }}>
        <p className="text-xs">© 2024 元征 · 合伙人赋能平台</p>
      </footer>
    </div>
  )
}

