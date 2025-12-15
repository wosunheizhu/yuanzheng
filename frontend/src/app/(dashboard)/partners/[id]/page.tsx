'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { gsap } from 'gsap'
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  MessageSquare,
  Tag,
  Edit3,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Star
} from 'lucide-react'
import { userService, User as UserType } from '@/lib/services'
import { useAuthStore } from '@/store/auth'
import { getRoleName } from '@/lib/utils'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'

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

// 角色颜色
const roleColors: Record<number, string> = {
  3: '#fbbf24', // 联合创始人 - 金色
  2: '#60a5fa', // 核心合伙人 - 蓝色
  1: '#a78bfa', // 普通合伙人 - 紫色
}

export default function PartnerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const partnerId = Number(params.id)
  const { user: currentUser } = useAuthStore()
  
  const [partner, setPartner] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 本地标签和备注
  const [myTags, setMyTags] = useState<string[]>([])
  const [myNote, setMyNote] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [editingNote, setEditingNote] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [savingTag, setSavingTag] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)

  // 加载合伙人信息
  useEffect(() => {
    const fetchPartner = async () => {
      if (!partnerId) return
      
      try {
        setLoading(true)
        setError(null)
        const data = await userService.get(partnerId)
        setPartner(data)
        
        // 加载我对此用户的标签和备注
        try {
          const tags = await userService.getMyTags(partnerId)
          setMyTags(tags.map((t: any) => t.tag))
        } catch {
          // 忽略标签加载错误
        }
        
        try {
          const notes = await userService.getMyNotes(partnerId)
          if (notes.length > 0) {
            setMyNote(notes[0].content)
            setNoteInput(notes[0].content)
          }
        } catch {
          // 忽略备注加载错误
        }
      } catch (err) {
        console.error('Failed to fetch partner:', err)
        setError('无法加载合伙人信息')
      } finally {
        setLoading(false)
      }
    }
    fetchPartner()
  }, [partnerId])

  // 入场动画
  useEffect(() => {
    if (containerRef.current && !loading && partner) {
      gsap.set(containerRef.current.children, { opacity: 0, y: 20 })
      gsap.to(containerRef.current.children, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }
  }, [loading, partner])

  // 添加标签
  const handleAddTag = async () => {
    if (!newTag.trim() || !partnerId) return
    
    setSavingTag(true)
    try {
      await userService.addTag(partnerId, newTag.trim())
      setMyTags([...myTags, newTag.trim()])
      setNewTag('')
      setShowTagInput(false)
      toast.success('标签已添加')
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setSavingTag(false)
    }
  }

  // 保存备注
  const handleSaveNote = async () => {
    if (!partnerId) return
    
    setSavingNote(true)
    try {
      await userService.addNote(partnerId, noteInput)
      setMyNote(noteInput)
      setEditingNote(false)
      toast.success('备注已保存')
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <Loader2 size={32} className="animate-spin" style={{ color: colors.textSecondary }} />
      </div>
    )
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: colors.bg }}>
        <AlertCircle size={48} style={{ color: colors.error }} />
        <p style={{ color: colors.textSecondary }}>{error || '合伙人不存在'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg"
          style={{ border: `1px solid ${colors.border}`, color: colors.text }}
        >
          返回
        </button>
      </div>
    )
  }

  const roleLevel = partner.highest_role_level || 1
  const roleColor = roleColors[roleLevel] || colors.text

  return (
    <div className="min-h-screen pb-20" style={{ background: '#0a0a0a' }}>
      {/* 返回按钮 */}
      <div className="px-8 pt-8 max-w-3xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-3 text-sm transition-all duration-300 group"
          style={{ color: 'rgba(255, 255, 255, 0.4)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span style={{ letterSpacing: '0.1em' }}>返回</span>
        </button>
      </div>

      <div ref={containerRef} className="px-8 pt-8 max-w-3xl mx-auto space-y-8">
        {/* 头部信息 */}
        <div
          className="p-8"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            position: 'relative',
          }}
        >
          {/* 顶部装饰线 */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-24"
            style={{ background: `linear-gradient(90deg, transparent, ${roleColor}60, transparent)` }}
          />
          
          <div className="flex items-start gap-8">
            {/* 头像 */}
            <div 
              className="w-28 h-28 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${roleColor}60`,
              }}
            >
              {partner.avatar_url ? (
                <img 
                  src={partner.avatar_url} 
                  alt={partner.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span style={{ 
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                  fontSize: '42px',
                  color: roleColor,
                }}>
                  {partner.name?.charAt(0) || '?'}
                </span>
              )}
            </div>

            {/* 基本信息 */}
            <div className="flex-1 pt-2">
              <div className="flex items-center gap-4 mb-3">
                <h1 style={{ 
                  color: colors.text,
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                  fontSize: '28px',
                  letterSpacing: '0.05em',
                }}>
                  {partner.name}
                </h1>
                <span 
                  className="text-xs px-3 py-1"
                  style={{ 
                    background: 'transparent',
                    border: `1px solid ${roleColor}60`,
                    color: roleColor,
                    letterSpacing: '0.1em',
                  }}
                >
                  {getRoleName(roleLevel)}
                </span>
              </div>
              
              {partner.organization && (
                <p className="flex items-center gap-2 mb-4" style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '14px' }}>
                  <Building2 size={14} strokeWidth={1.5} />
                  <span>{partner.organization}</span>
                  {partner.title && <span>· {partner.title}</span>}
                </p>
              )}
              
              {partner.intro && (
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '14px',
                  lineHeight: 1.8,
                  fontWeight: 300,
                }}>{partner.intro}</p>
              )}
            </div>
          </div>
        </div>

        {/* 详细信息 */}
        <div
          className="p-8"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ 
            color: colors.text,
            fontSize: '13px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 400,
            marginBottom: '32px',
          }}>
            个人信息
          </h2>
          
          <div className="grid gap-8 md:grid-cols-2">
            {partner.expertise && (
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '11px', letterSpacing: '0.15em' }}>
                  <Briefcase size={12} strokeWidth={1.5} />
                  擅长领域
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 300 }}>{partner.expertise}</p>
              </div>
            )}
            
            {partner.education && (
              <div>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '11px', letterSpacing: '0.15em' }}>
                  <GraduationCap size={12} strokeWidth={1.5} />
                  教育背景
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 300 }}>{partner.education}</p>
              </div>
            )}
            
            {partner.hobbies && (
              <div>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '11px', letterSpacing: '0.15em' }}>
                  <Heart size={12} strokeWidth={1.5} />
                  兴趣爱好
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 300 }}>{partner.hobbies}</p>
              </div>
            )}
            
            {partner.address_public && partner.address && (
              <div>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '11px', letterSpacing: '0.15em' }}>
                  <MapPin size={12} strokeWidth={1.5} />
                  所在地
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 300 }}>{partner.address}</p>
              </div>
            )}
            
            {partner.contact_public && partner.contact && (
              <div>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '11px', letterSpacing: '0.15em' }}>
                  <MessageSquare size={12} strokeWidth={1.5} />
                  联系方式
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', fontWeight: 300 }}>{partner.contact}</p>
              </div>
            )}

            {partner.signature && (
              <div className="md:col-span-2 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '11px', letterSpacing: '0.15em' }}>
                  <Edit3 size={12} strokeWidth={1.5} />
                  个性签名
                </div>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.5)', 
                  fontSize: '14px', 
                  fontStyle: 'italic',
                  fontWeight: 300,
                }}>"{partner.signature}"</p>
              </div>
            )}
          </div>
        </div>

        {/* 我的标签（只有非自己才显示） */}
        {currentUser?.id !== partnerId && (
          <div
            className="p-8"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-3" style={{ 
                color: colors.text,
                fontSize: '13px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 400,
              }}>
                <Tag size={14} strokeWidth={1.5} />
                我的标签
              </h2>
              <button
                onClick={() => setShowTagInput(!showTagInput)}
                className="w-8 h-8 flex items-center justify-center transition-all duration-300"
                style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'}
              >
                <Plus size={16} strokeWidth={1.5} />
              </button>
            </div>
            
            {/* 标签列表 */}
            <div className="flex flex-wrap gap-3 mb-4">
              {myTags.length === 0 ? (
                <p style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '13px', fontWeight: 300 }}>
                  暂无标签，点击 + 添加
                </p>
              ) : (
                myTags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-4 py-1.5 text-sm"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '12px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
            
            {/* 添加标签输入 */}
            {showTagInput && (
              <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="输入标签..."
                  className="flex-1 px-4 py-2.5 outline-none transition-all duration-300"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: colors.text,
                    fontSize: '13px',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <button
                  onClick={handleAddTag}
                  disabled={savingTag || !newTag.trim()}
                  className="px-5 py-2.5 disabled:opacity-30 transition-all duration-300"
                  style={{ 
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: colors.text,
                    fontSize: '12px',
                    letterSpacing: '0.1em',
                  }}
                >
                  {savingTag ? <Loader2 size={14} className="animate-spin" /> : '添加'}
                </button>
                <button
                  onClick={() => {
                    setShowTagInput(false)
                    setNewTag('')
                  }}
                  className="w-10 h-10 flex items-center justify-center transition-all duration-300"
                  style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'}
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* 我的备注（只有非自己才显示） */}
        {currentUser?.id !== partnerId && (
          <div
            className="p-8"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="flex items-center gap-3" style={{ 
                color: colors.text,
                fontSize: '13px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 400,
              }}>
                <MessageSquare size={14} strokeWidth={1.5} />
                我的备注
              </h2>
              {!editingNote && (
                <button
                  onClick={() => setEditingNote(true)}
                  className="w-8 h-8 flex items-center justify-center transition-all duration-300"
                  style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'}
                >
                  <Edit3 size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
            
            {editingNote ? (
              <div className="space-y-4">
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="添加备注..."
                  rows={4}
                  className="w-full px-4 py-3 outline-none resize-none transition-all duration-300"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: colors.text,
                    fontSize: '14px',
                    fontWeight: 300,
                    lineHeight: 1.8,
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="px-6 py-2.5 disabled:opacity-30 transition-all duration-300"
                    style={{ 
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: colors.text,
                      fontSize: '12px',
                      letterSpacing: '0.1em',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    {savingNote ? <Loader2 size={14} className="animate-spin" /> : '保存'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingNote(false)
                      setNoteInput(myNote)
                    }}
                    className="px-6 py-2.5 transition-all duration-300"
                    style={{ 
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontSize: '12px',
                      letterSpacing: '0.1em',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ 
                color: myNote ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.3)', 
                fontSize: '14px',
                fontWeight: 300,
                lineHeight: 1.8,
              }}>
                {myNote || '暂无备注，点击编辑添加'}
              </p>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-4 pt-4">
          <Link
            href={`/token?transfer=1&to=${partnerId}`}
            className="flex-1 py-4 flex items-center justify-center gap-3 transition-all duration-300"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: colors.text,
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <Star size={14} strokeWidth={1.5} />
            发起 Token 转账
          </Link>
          <Link
            href={`/messages?user=${partner.id}`}
            className="flex-1 py-4 flex items-center justify-center gap-3 transition-all duration-300"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: colors.text,
              fontSize: '12px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            }}
          >
            <MessageSquare size={14} strokeWidth={1.5} />
            发送私信
          </Link>
        </div>
      </div>
    </div>
  )
}

