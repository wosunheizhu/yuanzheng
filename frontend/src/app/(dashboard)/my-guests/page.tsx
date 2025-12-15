'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { 
  UserPlus, 
  ArrowLeft,
  Clock,
  Loader2,
  Building2,
  Phone,
  Mail,
  User,
  Calendar
} from 'lucide-react'
import { meetingService } from '@/lib/services'
import type { ExternalGuest } from '@/lib/services'

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

export default function MyGuestsPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(true)
  const [guests, setGuests] = useState<ExternalGuest[]>([])
  const [stats, setStats] = useState<{ total_invited_guests: number } | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [guestsRes, statsRes] = await Promise.all([
        meetingService.getMyInvitations(),
        meetingService.getGuestStats(),
      ])
      setGuests(guestsRes)
      setStats(statsRes)
    } catch (error) {
      console.error('Failed to load guests:', error)
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
          邀请的外部嘉宾
        </h1>

        <p className="text-lg max-w-xl" style={{ color: colors.textSecondary }}>
          累计邀请 {stats?.total_invited_guests || 0} 位外部嘉宾参加座谈会
        </p>
      </section>

      {/* 嘉宾列表 */}
      <section ref={contentRef} className="px-8 pb-24 max-w-4xl mx-auto">
        {guests.length === 0 ? (
          <div 
            className="text-center py-16 rounded-2xl"
            style={{ 
              background: 'rgba(30, 30, 30, 0.9)',
              border: `1px solid ${colors.border}`
            }}
          >
            <UserPlus size={48} className="mx-auto mb-4" style={{ color: colors.textSecondary }} />
            <p style={{ color: colors.textSecondary }}>暂无邀请的外部嘉宾</p>
            <Link 
              href="/meetings"
              className="inline-block mt-4 px-6 py-2 rounded-full text-sm transition-all duration-300 hover:opacity-90"
              style={{ 
                background: colors.text,
                color: colors.bg
              }}
            >
              去座谈会
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guests.map((guest) => (
              <Link
                key={guest.id}
                href={`/meetings/${guest.meeting_id}`}
                className="block p-6 rounded-2xl transition-all duration-300 hover:bg-white/5"
                style={{ 
                  background: 'rgba(30, 30, 30, 0.9)',
                  border: `1px solid ${colors.border}`
                }}
              >
                <div className="flex items-start gap-4">
                  {/* 头像 */}
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-medium shrink-0"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: colors.text
                    }}
                  >
                    {guest.name.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium mb-1 truncate" style={{ color: colors.text }}>
                      {guest.name}
                    </h3>
                    
                    {guest.title && (
                      <div className="flex items-center gap-2 mb-2">
                        <User size={12} style={{ color: colors.textSecondary }} />
                        <span className="text-sm truncate" style={{ color: colors.textSecondary }}>
                          {guest.title}
                        </span>
                      </div>
                    )}

                    {guest.organization && (
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 size={12} style={{ color: colors.textSecondary }} />
                        <span className="text-sm truncate" style={{ color: colors.textSecondary }}>
                          {guest.organization}
                        </span>
                      </div>
                    )}

                    {guest.contact && (
                      <div className="flex items-center gap-2 mb-2">
                        <Phone size={12} style={{ color: colors.textSecondary }} />
                        <span className="text-sm truncate" style={{ color: colors.textSecondary }}>
                          {guest.contact}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: colors.textSecondary }}>
                      <Calendar size={12} />
                      <span>座谈会 #{guest.meeting_id}</span>
                      <span>·</span>
                      <span>{formatTime(guest.created_at)}</span>
                    </div>

                    {guest.notes && (
                      <p 
                        className="text-xs mt-2 line-clamp-2"
                        style={{ color: colors.textSecondary }}
                      >
                        备注: {guest.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
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

