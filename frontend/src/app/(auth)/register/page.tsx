'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { Eye, EyeOff, ArrowRight, AlertCircle, User, Mail, Phone, Building2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import { authService } from '@/lib/services'

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

// 合伙人类型选项
const roleOptions = [
  { value: 'FOUNDING', label: '联合创始人', description: '核心创始团队成员' },
  { value: 'CORE', label: '核心合伙人', description: '核心业务骨干' },
  { value: 'REGULAR', label: '普通合伙人', description: '正式合伙人成员' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: 基本信息, 2: 身份验证, 3: 完成
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    organization: '',
    role_type: 'REGULAR',
    invitation_code: '',
    agree_terms: false,
  })
  
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

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('请输入姓名')
      return false
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('请输入有效的邮箱地址')
      return false
    }
    if (!formData.phone.trim() || !/^1[3-9]\d{9}$/.test(formData.phone)) {
      setError('请输入有效的手机号码')
      return false
    }
    if (formData.password.length < 6) {
      setError('密码至少6位')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!formData.organization.trim()) {
      setError('请输入所属组织')
      return false
    }
    if (!formData.invitation_code.trim()) {
      setError('请输入邀请码')
      return false
    }
    if (!formData.agree_terms) {
      setError('请阅读并同意服务条款')
      return false
    }
    return true
  }

  const handleNext = () => {
    setError('')
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // 调用自助注册 API
      await authService.selfRegister({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        organization: formData.organization || undefined,
        role_type: formData.role_type,
        invitation_code: formData.invitation_code,
      })
      
      setStep(3)
      toast.success('注册成功！')
      
      // 3秒后跳转到登录页
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
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

        {/* 进度指示器 */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  step >= s ? 'bg-white text-black' : ''
                }`}
                style={{
                  border: `1px solid ${step >= s ? 'white' : colors.border}`,
                  color: step >= s ? 'black' : colors.textSecondary,
                }}
              >
                {step > s ? <Check size={16} /> : s}
              </div>
              {s < 3 && (
                <div
                  className="w-12 h-px mx-2"
                  style={{
                    background: step > s ? 'white' : colors.border,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* 步骤标题 */}
        <div className="text-center mb-8">
          <h2
            className="text-xl font-medium"
            style={{ color: colors.text }}
          >
            {step === 1 && '创建账户'}
            {step === 2 && '完善信息'}
            {step === 3 && '注册成功'}
          </h2>
          <p className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
            {step === 1 && '请填写您的基本信息'}
            {step === 2 && '请填写组织信息和邀请码'}
            {step === 3 && '欢迎加入元征合伙人网络'}
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
          {/* 步骤1: 基本信息 */}
          {step === 1 && (
            <div className="space-y-5">
              {/* 姓名 */}
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  姓名
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: colors.textSecondary }}
                  />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="请输入您的真实姓名"
                    className="w-full pl-12 pr-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              {/* 邮箱 */}
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  邮箱
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: colors.textSecondary }}
                  />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    placeholder="请输入邮箱地址"
                    className="w-full pl-12 pr-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              {/* 手机号 */}
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  手机号
                </label>
                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: colors.textSecondary }}
                  />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    placeholder="请输入手机号码"
                    className="w-full pl-12 pr-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              {/* 密码 */}
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    placeholder="请设置密码（至少6位）"
                    className="w-full pl-4 pr-12 py-3 rounded-lg outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                    style={{ color: colors.textSecondary }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* 确认密码 */}
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  确认密码
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => updateForm('confirmPassword', e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full pl-4 pr-12 py-3 rounded-lg outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                    style={{ color: colors.textSecondary }}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 步骤2: 组织信息 */}
          {step === 2 && (
            <div className="space-y-5">
              {/* 所属组织 */}
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  所属组织
                </label>
                <div className="relative">
                  <Building2
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: colors.textSecondary }}
                  />
                  <input
                    type="text"
                    value={formData.organization}
                    onChange={(e) => updateForm('organization', e.target.value)}
                    placeholder="请输入您所属的组织/公司"
                    className="w-full pl-12 pr-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                </div>
              </div>

              {/* 合伙人类型 */}
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  合伙人类型
                </label>
                <div className="space-y-2">
                  {roleOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        formData.role_type === option.value ? 'ring-1 ring-white' : ''
                      }`}
                      style={{
                        background: formData.role_type === option.value
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <input
                        type="radio"
                        name="role_type"
                        value={option.value}
                        checked={formData.role_type === option.value}
                        onChange={(e) => updateForm('role_type', e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          formData.role_type === option.value ? 'border-white' : ''
                        }`}
                        style={{
                          borderColor: formData.role_type === option.value ? 'white' : colors.border,
                        }}
                      >
                        {formData.role_type === option.value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div style={{ color: colors.text }}>{option.label}</div>
                        <div className="text-xs" style={{ color: colors.textSecondary }}>
                          {option.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 邀请码 */}
              <div>
                <label
                  className="block text-sm mb-2"
                  style={{ color: colors.textSecondary }}
                >
                  邀请码
                </label>
                <input
                  type="text"
                  value={formData.invitation_code}
                  onChange={(e) => updateForm('invitation_code', e.target.value)}
                  placeholder="请输入邀请码"
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
                <p className="mt-2 text-xs" style={{ color: colors.textSecondary }}>
                  邀请码由现有合伙人提供，用于验证您的身份
                </p>
              </div>

              {/* 服务条款 */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agree_terms}
                  onChange={(e) => updateForm('agree_terms', e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm" style={{ color: colors.textSecondary }}>
                  我已阅读并同意
                  <a href="#" className="underline hover:opacity-80" style={{ color: colors.text }}>
                    《服务条款》
                  </a>
                  和
                  <a href="#" className="underline hover:opacity-80" style={{ color: colors.text }}>
                    《隐私政策》
                  </a>
                </span>
              </label>
            </div>
          )}

          {/* 步骤3: 完成 */}
          {step === 3 && (
            <div className="text-center py-8">
              <div
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6"
                style={{ background: 'rgba(74, 222, 128, 0.1)' }}
              >
                <Check size={40} style={{ color: colors.success }} />
              </div>
              <h3
                className="text-xl font-medium mb-2"
                style={{ color: colors.text }}
              >
                注册成功！
              </h3>
              <p style={{ color: colors.textSecondary }}>
                您的账户已创建，正在跳转到登录页面...
              </p>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div
              className="mt-4 p-3 rounded-lg flex items-center gap-2"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: colors.error,
              }}
            >
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 按钮 */}
          {step < 3 && (
            <div className="mt-6 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                >
                  上一步
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="flex-1 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: colors.text,
                  color: colors.bg,
                }}
              >
                {isLoading ? (
                  <span className="animate-spin">◌</span>
                ) : (
                  <>
                    {step === 2 ? '提交注册' : '下一步'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 登录链接 */}
        <p
          className="mt-6 text-center text-sm"
          style={{ color: colors.textSecondary }}
        >
          已有账户？{' '}
          <Link
            href="/login"
            className="hover:underline"
            style={{ color: colors.text }}
          >
            立即登录
          </Link>
        </p>
      </div>
    </div>
  )
}

