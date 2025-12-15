'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { ArrowLeft, Mail, AlertCircle, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
  success: '#4ade80',
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: 输入邮箱, 2: 发送成功
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)

  // 入场动画
  useEffect(() => {
    if (containerRef.current) {
      const children = containerRef.current.children
      gsap.set(children, { opacity: 0, y: 30 })
      gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.2
      })
    }
  }, [step])

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const validateEmail = () => {
    if (!email.trim()) {
      setError('请输入邮箱地址')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEmail()) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // TODO: 调用发送重置邮件 API
      // await authService.sendResetPasswordEmail(email)
      
      // 模拟发送成功
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setStep(2)
      setCountdown(60)
      toast.success('重置邮件已发送！')
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    
    setIsLoading(true)
    try {
      // TODO: 调用重新发送 API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setCountdown(60)
      toast.success('重置邮件已重新发送！')
    } catch (err) {
      toast.error('发送失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: colors.bg }}
    >
      <div
        ref={containerRef}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={HOMEPAGE_URL}>
            <h1
              className="text-3xl font-serif tracking-wider cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: colors.text }}
            >
              元 征
            </h1>
          </Link>
          <p className="mt-2" style={{ color: colors.textSecondary }}>
            合伙人赋能平台
          </p>
        </div>

        {/* 返回登录 */}
        <div className="mb-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
            style={{ color: colors.textSecondary }}
          >
            <ArrowLeft size={16} />
            返回登录
          </Link>
        </div>

        {/* 标题 */}
        <div className="mb-8">
          <h2
            className="text-2xl font-medium mb-2"
            style={{ color: colors.text }}
          >
            {step === 1 ? '忘记密码' : '邮件已发送'}
          </h2>
          <p style={{ color: colors.textSecondary }}>
            {step === 1
              ? '请输入您的注册邮箱，我们将发送密码重置链接'
              : '请检查您的邮箱并点击重置链接'}
          </p>
        </div>

        {/* 表单区域 */}
        <div
          className="p-8 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${colors.border}`,
          }}
        >
          {step === 1 ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 邮箱 */}
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  邮箱地址
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: colors.textSecondary }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    placeholder="请输入注册邮箱"
                    className="w-full pl-12 pr-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              {/* 错误提示 */}
              {error && (
                <div
                  className="p-3 rounded-lg flex items-center gap-2"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: colors.error,
                  }}
                >
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: colors.text,
                  color: colors.bg,
                }}
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  '发送重置链接'
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4">
              {/* 成功图标 */}
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6"
                style={{ background: 'rgba(74, 222, 128, 0.1)' }}
              >
                <Check size={32} style={{ color: colors.success }} />
              </div>

              {/* 提示信息 */}
              <p className="mb-4" style={{ color: colors.text }}>
                重置链接已发送至
              </p>
              <p
                className="font-medium mb-6"
                style={{ color: colors.text }}
              >
                {email}
              </p>
              <p className="text-sm mb-6" style={{ color: colors.textSecondary }}>
                如果没有收到邮件，请检查垃圾邮件文件夹
              </p>

              {/* 重新发送按钮 */}
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || isLoading}
                className="w-full py-3 rounded-lg font-medium transition-all hover:opacity-80 disabled:opacity-50"
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              >
                {countdown > 0 ? (
                  `${countdown}秒后可重新发送`
                ) : isLoading ? (
                  <Loader2 size={18} className="animate-spin inline" />
                ) : (
                  '重新发送'
                )}
              </button>

              {/* 返回登录 */}
              <Link
                href="/login"
                className="block mt-4 text-sm hover:underline"
                style={{ color: colors.textSecondary }}
              >
                返回登录
              </Link>
            </div>
          )}
        </div>

        {/* 帮助链接 */}
        <p
          className="mt-6 text-center text-sm"
          style={{ color: colors.textSecondary }}
        >
          需要帮助？{' '}
          <a
            href="mailto:support@yuanzheng.com"
            className="hover:underline"
            style={{ color: colors.text }}
          >
            联系客服
          </a>
        </p>
      </div>
    </div>
  )
}

