'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { authService } from '@/lib/services'
import { useAuthStore } from '@/store/auth'
import { getErrorMessage } from '@/lib/api'

// Homepage URL
const HOMEPAGE_URL = process.env.NEXT_PUBLIC_HOMEPAGE_URL || 'http://localhost:3847'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
  error: '#ef4444',
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const containerRef = useRef<HTMLDivElement>(null)

  // 入场动画
  useEffect(() => {
    if (containerRef.current) {
      const children = containerRef.current.children
      
      // 先设置初始状态为不可见
      gsap.set(children, { opacity: 0, y: 30 })
      
      // 然后动画到可见状态
      gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.2
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 先清除错误
    setError('')
    setIsLoading(true)
    
    try {
      const response = await authService.login(email, password)
      
      // 保存登录状态
      login(
        {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          phone: response.user.phone,
          avatar_url: response.user.avatar_url,
          organization: response.user.organization,
          role_level: response.user.highest_role_level,
          is_admin: response.user.is_admin,
        },
        response.access_token
      )
      
      // 跳转到首页（漩涡页面）
      window.location.href = HOMEPAGE_URL
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err) || '登录失败，请检查账号密码'
      setError(errorMsg)
      setIsLoading(false)
      return // 确保不继续执行
    }
    
    setIsLoading(false)
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: colors.bg }}
    >
      {/* 背景装饰 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(80, 80, 80, 0.25) 0%, transparent 60%)',
        }}
      />

      {/* 顶部导航 */}
      <nav 
        className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 flex items-center gap-8"
        style={{ 
          background: 'rgba(30, 30, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '50px',
          border: `1px solid ${colors.border}`
        }}
      >
        {/* Logo */}
        <Link href={HOMEPAGE_URL} className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="元征" 
            className="h-7 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <span 
            className="text-sm"
            style={{ 
              color: colors.text,
              fontFamily: "'Noto Serif SC', serif",
              fontWeight: 500 
            }}
          >
            元征
          </span>
        </Link>

        {/* 分隔线 */}
        <div className="w-px h-5" style={{ background: colors.border }} />

        {/* 导航链接 */}
        <div className="hidden sm:flex items-center gap-4">
          <a 
            href={`${HOMEPAGE_URL}#sectionExpression`}
            className="text-sm transition-colors duration-300 hover:opacity-80"
            style={{ color: colors.textSecondary }}
          >
            关于元征
          </a>
          <a 
            href={`${HOMEPAGE_URL}#sectionSearch`}
            className="text-sm transition-colors duration-300 hover:opacity-80"
            style={{ color: colors.textSecondary }}
          >
            活动日程
          </a>
        </div>

        {/* 返回首页 */}
        <a 
          href={HOMEPAGE_URL}
          className="text-sm py-2 px-4 transition-all duration-300 hover:border-white"
          style={{ 
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '50px'
          }}
        >
          返回首页
        </a>
      </nav>

      {/* 主内容 */}
      <div 
        ref={containerRef}
        className="relative z-10 w-full max-w-md px-8"
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img 
            src="/logo.png" 
            alt="元征" 
            className="h-16 w-auto"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>

        {/* 标题 */}
        <h1 
          className="text-4xl text-center mb-2"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 500,
            letterSpacing: '0.1em'
          }}
        >
          登录
        </h1>
        <p 
          className="text-center mb-10"
          style={{ color: colors.textSecondary }}
        >
          元征 · 合伙人赋能平台
        </p>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 错误提示 - 始终渲染，通过透明度控制显隐 */}
          <div 
            className="flex items-center gap-3 px-4 py-3 text-sm transition-all duration-300"
            style={{ 
              background: error ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              border: `1px solid ${error ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
              borderRadius: '2px',
              color: 'rgba(239, 68, 68, 0.9)',
              opacity: error ? 1 : 0,
              height: error ? 'auto' : 0,
              padding: error ? '12px 16px' : 0,
              marginBottom: error ? 0 : '-20px',
              overflow: 'hidden'
            }}
          >
            <AlertCircle size={16} strokeWidth={1.5} />
            <span>{error || ''}</span>
          </div>
          
          {/* 邮箱/手机号 */}
          <div>
            <input
              type="text"
              placeholder="邮箱或手机号"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 text-sm transition-all duration-300"
              style={{ 
                background: 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                color: colors.text,
                outline: 'none'
              }}
              required
            />
          </div>

          {/* 密码 */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 pr-12 text-sm transition-all duration-300"
              style={{ 
                background: 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                color: colors.text,
                outline: 'none'
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-300 hover:opacity-80"
              style={{ color: colors.textSecondary }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* 忘记密码 */}
          <div className="flex justify-end">
            <Link 
              href="/forgot-password"
              className="text-sm transition-colors duration-300 hover:opacity-80"
              style={{ color: colors.textSecondary }}
            >
              忘记密码?
            </Link>
          </div>

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-4 font-medium text-sm transition-all duration-300 hover:opacity-90"
            style={{ 
              background: colors.text,
              color: colors.bg,
              borderRadius: '50px'
            }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: colors.bg }} />
                <div className="w-1.5 h-1.5 rounded-full animate-pulse delay-100" style={{ background: colors.bg }} />
                <div className="w-1.5 h-1.5 rounded-full animate-pulse delay-200" style={{ background: colors.bg }} />
              </div>
            ) : (
              <>
                <span>登录</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* 底部提示 */}
        <p 
          className="text-center mt-8 text-sm"
          style={{ color: colors.textSecondary }}
        >
          还没有账号?{' '}
          <Link
            href="/register"
            className="hover:underline"
            style={{ color: colors.text }}
          >
            申请注册
          </Link>
        </p>
      </div>

      {/* 底部版权 */}
      <div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs"
        style={{ color: colors.textSecondary }}
      >
        © 2024 元征 · 合伙人赋能平台
      </div>
    </div>
  )
}
