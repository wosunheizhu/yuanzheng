'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { 
  Send, 
  Loader2, 
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { communityService } from '@/lib/services'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'

// 反馈类型（需与后端 schema 匹配：PRODUCT|BUG|POLICY|OTHER）
const feedbackTypes = [
  { value: 'BUG', label: 'BUG' },
  { value: 'PRODUCT', label: '功能' },
  { value: 'POLICY', label: '内容' },
  { value: 'OTHER', label: '其他' },
]

export default function FeedbackPage() {
  const { user } = useAuthStore()
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: 'PRODUCT',
    title: '',
    content: '',
    contact: '',
  })

  const containerRef = useRef<HTMLDivElement>(null)

  // 入场动画
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: 'power2.out' }
      )
    }
  }, [])

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error('请填写标题和内容')
      return
    }

    setSubmitting(true)
    try {
      await communityService.createFeedback({
        category: formData.type,
        title: formData.title,
        content: formData.content,
        contact: formData.contact || undefined,
        allow_contact: !!formData.contact,
      })
      setSubmitted(true)
      toast.success('感谢您的反馈！')
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSubmitted(false)
    setFormData({
      type: 'PRODUCT',
      title: '',
      content: '',
      contact: '',
    })
  }

  return (
    <div 
      ref={containerRef} 
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: '#000' }}
    >
      <div className="w-full max-w-2xl">
        {submitted ? (
          // 提交成功 - 极简风格
          <div className="text-center py-20">
            <div
              className="w-16 h-16 mx-auto flex items-center justify-center mb-10"
              style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
            >
              <CheckCircle size={24} strokeWidth={1} style={{ color: '#fff' }} />
            </div>
            <h2 
              className="text-3xl font-extralight tracking-widest uppercase mb-6"
              style={{ color: '#fff', letterSpacing: '0.3em' }}
            >
              已收到
            </h2>
            <p 
              className="text-sm font-light mb-12"
              style={{ color: 'rgba(255, 255, 255, 0.4)' }}
            >
              感谢您的宝贵意见
            </p>
            <button
              onClick={resetForm}
              className="text-xs uppercase tracking-widest py-4 px-8 transition-all duration-300"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.6)',
                letterSpacing: '0.2em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'
              }}
            >
              继续反馈
            </button>
          </div>
        ) : (
          // 反馈表单 - 艺术画廊风格
          <div>
            {/* 标题 */}
            <div className="mb-16 text-center">
              <h1 
                className="text-4xl font-extralight tracking-widest uppercase"
                style={{ color: '#fff', letterSpacing: '0.4em' }}
              >
                反馈
              </h1>
            </div>

            <div className="space-y-12">
              {/* 反馈类型 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-6"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  类型
                </label>
                <div className="flex gap-0">
                  {feedbackTypes.map((type, index) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className="flex-1 py-4 text-xs uppercase tracking-widest transition-all duration-300"
                      style={{
                        background: formData.type === type.value
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'transparent',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        borderBottom: formData.type === type.value 
                          ? '1px solid rgba(255, 255, 255, 0.8)' 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderLeft: index === 0 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                        color: formData.type === type.value 
                          ? '#fff' 
                          : 'rgba(255, 255, 255, 0.35)',
                        letterSpacing: '0.15em'
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 标题 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  标题 <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full py-3 text-lg font-light tracking-wide transition-all duration-300 focus:outline-none"
                  style={{ 
                    background: 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    letterSpacing: '0.05em'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>

              {/* 详细内容 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  详细描述 <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="w-full py-3 text-sm font-light tracking-wide resize-none transition-all duration-300 focus:outline-none"
                  style={{ 
                    background: 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    lineHeight: '1.8'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>

              {/* 联系方式 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.2em' }}
                >
                  联系方式
                </label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full py-3 text-sm font-light tracking-wide transition-all duration-300 focus:outline-none"
                  style={{ 
                    background: 'transparent',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.5)'}
                  onBlur={(e) => e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.15)'}
                />
              </div>

              {/* 提交按钮 */}
              <div className="pt-8">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !formData.title || !formData.content}
                  className="w-full py-5 text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3"
                  style={{
                    background: '#fff',
                    color: '#000',
                    opacity: (submitting || !formData.title || !formData.content) ? 0.3 : 1,
                    letterSpacing: '0.2em'
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting && formData.title && formData.content) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                  }}
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" strokeWidth={1} />
                  ) : (
                    <>
                      提交
                      <ArrowRight size={14} strokeWidth={1} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
