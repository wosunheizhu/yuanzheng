'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ArrowLeft, Mail, AlertCircle, Check, Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'

// Homepage URL
const HOMEPAGE_URL = process.env.NEXT_PUBLIC_HOMEPAGE_URL || 'http://localhost:3847'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

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
  const [step, setStep] = useState(1) // 1: 输入邮箱, 2: 提交成功
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
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
      // 调用密码重置请求 API
      const response = await fetch(`${API_URL}/auth/password-reset-request?email=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || '提交失败')
      }
      
      setStep(2)
      toast.success('已通知管理员！')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
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
          <Link href={HOMEPAGE_URL} className="inline-block hover:opacity-80 transition-opacity">
            <img 
              src="/logo.png" 
              alt="元征" 
              className="h-14 w-auto mx-auto mb-3"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
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
            {step === 1 ? '忘记密码' : '申请已提交'}
          </h2>
          <p style={{ color: colors.textSecondary }}>
            {step === 1
              ? '请输入您的注册邮箱，我们将通知管理员为您重置密码'
              : '管理员将尽快处理您的请求'}
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
                  '提交申请'
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
              <p className="mb-4 text-lg" style={{ color: colors.text }}>
                申请已提交
              </p>
              <p
                className="font-medium mb-4"
                style={{ color: colors.text }}
              >
                {email}
              </p>
              
              {/* 说明 */}
              <div 
                className="p-4 rounded-lg mb-6 text-left"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${colors.border}`
                }}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare size={18} style={{ color: colors.textSecondary, marginTop: 2 }} />
                  <div>
                    <p className="text-sm mb-2" style={{ color: colors.text }}>
                      管理员已收到您的密码重置申请
                    </p>
                    <p className="text-xs" style={{ color: colors.textSecondary }}>
                      管理员核实身份后，将通过邮件告知您的密码。请注意查收邮件，包括垃圾邮件文件夹。
                    </p>
                  </div>
                </div>
              </div>

              {/* 返回登录 */}
              <Link
                href="/login"
                className="inline-block w-full py-3 rounded-lg font-medium transition-all hover:opacity-80"
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
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
