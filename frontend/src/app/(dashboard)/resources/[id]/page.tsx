'use client'

/**
 * 元征 · 合伙人赋能平台 - 资源详情页
 * 高端简约现代艺术画廊风格
 */
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { gsap } from 'gsap'
import { 
  ArrowLeft,
  Building,
  MapPin,
  User,
  Tag,
  Calendar,
  Edit3,
  Trash2,
  Share2,
  Loader2,
  AlertCircle,
  Star,
  Clock,
  Eye,
  X,
  Link2
} from 'lucide-react'
import { resourceService, Resource } from '@/lib/services'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'

// 颜色常量 - 高端简约艺术画廊风格
const colors = {
  bg: '#000000',
  bgElevated: '#0a0a0a',
  bgCard: '#111111',
  text: '#faf9f6',
  textSecondary: '#888888',
  textMuted: '#555555',
  border: '#222222',
  borderLight: '#333333',
  accent: '#faf9f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
}

// 状态配置
const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  'ACTIVE': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '可用' },
  'PAUSED': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '暂停' },
  'EXPIRED': { bg: 'rgba(136, 136, 136, 0.1)', text: '#888888', label: '已过期' },
}

// 关系强度配置
const getStrengthConfig = (strength: number) => {
  if (strength >= 5) return { color: '#4ade80', label: '核心', description: '核心关系，可直接调用' }
  if (strength >= 4) return { color: '#4ade80', label: '强', description: '强关系，高度信任' }
  if (strength >= 3) return { color: '#60a5fa', label: '中', description: '中等关系，可靠' }
  if (strength >= 2) return { color: '#fbbf24', label: '弱', description: '弱关系，需加深' }
  return { color: '#888888', label: '待验证', description: '待验证关系' }
}

export default function ResourceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  
  const resourceId = parseInt(params.id as string)
  
  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // 编辑状态
  const [showEditForm, setShowEditForm] = useState(false)
  const [editForm, setEditForm] = useState({
    org_name: '',
    description: '',
    relationship_strength: 3,
    industry: '',
    region: '',
    note: '',
    tag_names: [] as string[],
  })
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const heroRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // 加载资源详情
  useEffect(() => {
    const fetchResource = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await resourceService.get(resourceId)
        setResource(data)
      } catch (err: any) {
        console.error('Failed to fetch resource:', err)
        setError(err.response?.status === 404 ? '资源不存在或已被删除' : '无法加载资源详情')
      } finally {
        setLoading(false)
      }
    }
    
    if (resourceId) {
      fetchResource()
    }
  }, [resourceId])

  // 入场动画
  useEffect(() => {
    if (!loading && resource && heroRef.current) {
      gsap.fromTo(heroRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
      )
    }
    
    if (!loading && resource && contentRef.current) {
      gsap.fromTo(contentRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out', delay: 0.3 }
      )
    }
  }, [loading, resource])

  // 删除资源
  const handleDelete = async () => {
    if (!resource) return
    
    try {
      setDeleting(true)
      await resourceService.delete(resource.id)
      toast.success('资源已删除')
      router.push('/resources')
    } catch (err: any) {
      toast.error(err.message || '删除失败')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // 复制分享链接
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('链接已复制')
  }

  // 打开编辑弹窗
  const handleOpenEdit = () => {
    if (!resource) return
    setEditForm({
      org_name: resource.org_name,
      description: resource.description,
      relationship_strength: resource.relationship_strength,
      industry: resource.industry || '',
      region: resource.region || '',
      note: resource.note || '',
      tag_names: resource.tags?.map(t => t.name) || [],
    })
    setShowEditForm(true)
  }

  // 编辑资源
  const handleEditResource = async () => {
    if (!resource || !editForm.org_name || !editForm.description) return
    
    try {
      setSubmitting(true)
      const updated = await resourceService.update(resource.id, editForm)
      setResource(updated)
      setShowEditForm(false)
      toast.success('资源已更新')
    } catch (err: any) {
      toast.error(err.message || '更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !editForm.tag_names.includes(tagInput.trim())) {
      setEditForm(prev => ({
        ...prev,
        tag_names: [...prev.tag_names, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  // 移除标签
  const handleRemoveTag = (tag: string) => {
    setEditForm(prev => ({
      ...prev,
      tag_names: prev.tag_names.filter(t => t !== tag)
    }))
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 是否是资源所有者
  const isOwner = user?.id === resource?.owner_user_id

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <div className="text-center">
          <Loader2 
            size={32} 
            className="animate-spin mx-auto mb-4" 
            strokeWidth={1}
            style={{ color: colors.textMuted }} 
          />
          <p className="text-sm" style={{ color: colors.textMuted }}>加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !resource) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.bg }}>
        <div className="text-center max-w-md px-8">
          <AlertCircle 
            size={48} 
            className="mx-auto mb-6" 
            strokeWidth={1}
            style={{ color: colors.textMuted }} 
          />
          <h2 
            className="text-xl mb-4 font-light"
            style={{ color: colors.text }}
          >
            {error || '资源不存在'}
          </h2>
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm transition-all duration-300"
            style={{ 
              border: `1px solid ${colors.border}`,
              color: colors.textSecondary
            }}
          >
            <ArrowLeft size={16} strokeWidth={1} />
            返回资源列表
          </Link>
        </div>
      </div>
    )
  }

  const status = statusConfig[resource.status]
  const strength = getStrengthConfig(resource.relationship_strength)

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* Hero 区域 */}
      <section 
        ref={heroRef}
        className="min-h-[40vh] flex flex-col justify-center px-8 relative"
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(60, 60, 60, 0.12) 0%, transparent 60%)',
          }}
        />
        
        <div className="max-w-4xl mx-auto w-full">
          {/* 返回导航 */}
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 mb-8 text-xs uppercase tracking-widest transition-all duration-300 hover:gap-3"
            style={{ color: colors.textMuted, letterSpacing: '0.2em' }}
          >
            <ArrowLeft size={14} strokeWidth={1} />
            资源中心
          </Link>

          {/* 状态标签 */}
          <div className="flex items-center gap-3 mb-6">
            <span 
              className="px-3 py-1.5 text-xs uppercase tracking-widest"
              style={{ 
                background: status?.bg,
                color: status?.text,
                letterSpacing: '0.1em'
              }}
            >
              {status?.label}
            </span>
            <span 
              className="px-3 py-1.5 text-xs uppercase tracking-widest"
              style={{ 
                background: `${strength.color}15`,
                color: strength.color,
                letterSpacing: '0.1em'
              }}
            >
              关系强度: {strength.label}
            </span>
          </div>

          {/* 资源标题 */}
          <h1 
            className="text-4xl md:text-5xl mb-6 font-light tracking-wide"
            style={{ 
              color: colors.text,
              fontFamily: "'Noto Serif SC', serif",
            }}
          >
            {resource.org_name}
          </h1>

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-6 text-sm" style={{ color: colors.textSecondary }}>
            <span className="flex items-center gap-2">
              <User size={14} strokeWidth={1} />
              {resource.owner_name}
            </span>
            {resource.industry && (
              <span className="flex items-center gap-2">
                <Building size={14} strokeWidth={1} />
                {resource.industry}
              </span>
            )}
            {resource.region && (
              <span className="flex items-center gap-2">
                <MapPin size={14} strokeWidth={1} />
                {resource.region}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Calendar size={14} strokeWidth={1} />
              {formatDate(resource.created_at)}
            </span>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={handleShare}
              className="px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
              style={{ 
                border: `1px solid ${colors.border}`,
                color: colors.textSecondary,
                letterSpacing: '0.1em'
              }}
            >
              <Share2 size={14} strokeWidth={1} />
              分享
            </button>
            {isOwner && (
              <>
                <button
                  onClick={handleOpenEdit}
                  className="px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
                  style={{ 
                    border: `1px solid ${colors.border}`,
                    color: colors.textSecondary,
                    letterSpacing: '0.1em'
                  }}
                >
                  <Edit3 size={14} strokeWidth={1} />
                  编辑
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
                  style={{ 
                    border: `1px solid ${colors.error}30`,
                    color: colors.error,
                    letterSpacing: '0.1em'
                  }}
                >
                  <Trash2 size={14} strokeWidth={1} />
                  删除
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 主内容区 */}
      <section ref={contentRef} className="px-8 pb-24 max-w-4xl mx-auto">
        {/* 资源描述 */}
        <div 
          className="mb-12 p-8"
          style={{ 
            background: colors.bgCard,
            border: `1px solid ${colors.border}` 
          }}
        >
          <h2 
            className="text-xs uppercase tracking-widest mb-6"
            style={{ color: colors.textMuted, letterSpacing: '0.2em' }}
          >
            资源描述
          </h2>
          <p 
            className="text-base font-light leading-relaxed whitespace-pre-wrap"
            style={{ color: colors.text, lineHeight: '1.8' }}
          >
            {resource.description}
          </p>
        </div>

        {/* 详细信息网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* 关系强度 */}
          <div 
            className="p-6"
            style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.border}` 
            }}
          >
            <h3 
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: colors.textMuted, letterSpacing: '0.2em' }}
            >
              关系强度
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <Star
                    key={level}
                    size={20}
                    strokeWidth={1}
                    className={level <= resource.relationship_strength ? 'fill-current' : ''}
                    style={{ 
                      color: level <= resource.relationship_strength ? strength.color : colors.border 
                    }}
                  />
                ))}
              </div>
              <span 
                className="text-sm font-light"
                style={{ color: strength.color }}
              >
                {strength.label}
              </span>
            </div>
            <p 
              className="mt-3 text-sm font-light"
              style={{ color: colors.textSecondary }}
            >
              {strength.description}
            </p>
          </div>

          {/* 更新时间 */}
          <div 
            className="p-6"
            style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.border}` 
            }}
          >
            <h3 
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: colors.textMuted, letterSpacing: '0.2em' }}
            >
              更新时间
            </h3>
            <div className="flex items-center gap-3">
              <Clock size={18} strokeWidth={1} style={{ color: colors.textSecondary }} />
              <span 
                className="text-sm font-light"
                style={{ color: colors.text }}
              >
                {formatDate(resource.updated_at)}
              </span>
            </div>
          </div>

        </div>

        {/* 标签 */}
        {resource.tags && resource.tags.length > 0 && (
          <div 
            className="mb-12 p-6"
            style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.border}` 
            }}
          >
            <h3 
              className="text-xs uppercase tracking-widest mb-4"
              style={{ color: colors.textMuted, letterSpacing: '0.2em' }}
            >
              标签
            </h3>
            <div className="flex flex-wrap gap-2">
              {resource.tags.map((tag) => (
                <span 
                  key={tag.id}
                  className="px-3 py-1.5 text-xs font-light flex items-center gap-1.5"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${colors.border}`,
                    color: colors.textSecondary
                  }}
                >
                  <Tag size={12} strokeWidth={1} />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 私有备注（仅所有者可见） */}
        {isOwner && resource.note && (
          <div 
            className="mb-12 p-6"
            style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.warning}30` 
            }}
          >
            <h3 
              className="text-xs uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: colors.warning, letterSpacing: '0.2em' }}
            >
              <Eye size={12} strokeWidth={1} />
              私有备注（仅您可见）
            </h3>
            <p 
              className="text-sm font-light leading-relaxed whitespace-pre-wrap"
              style={{ color: colors.textSecondary }}
            >
              {resource.note}
            </p>
          </div>
        )}

        {/* 快捷操作 */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/resources"
            className="px-6 py-3 text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
            style={{ 
              border: `1px solid ${colors.border}`,
              color: colors.textSecondary,
              letterSpacing: '0.1em'
            }}
          >
            <ArrowLeft size={14} strokeWidth={1} />
            返回列表
          </Link>
          <Link
            href="/community"
            className="px-6 py-3 text-xs uppercase tracking-widest transition-all duration-300 flex items-center gap-2"
            style={{ 
              background: colors.text,
              color: colors.bg,
              letterSpacing: '0.1em'
            }}
          >
            <Link2 size={14} strokeWidth={1.5} />
            去社群分享
          </Link>
        </div>
      </section>

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="p-8 max-w-md w-full"
            style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.border}` 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-lg font-light"
                style={{ color: colors.text }}
              >
                确认删除
              </h2>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="p-2 transition-all duration-300"
                style={{ color: colors.textMuted }}
              >
                <X size={18} strokeWidth={1} />
              </button>
            </div>
            
            <p 
              className="mb-6 text-sm font-light"
              style={{ color: colors.textSecondary }}
            >
              确定要删除资源「{resource.org_name}」吗？此操作无法撤销。
            </p>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300"
                style={{ 
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                  letterSpacing: '0.1em'
                }}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-5 py-2.5 text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
                style={{ 
                  background: colors.error,
                  color: '#fff',
                  letterSpacing: '0.1em',
                  opacity: deleting ? 0.5 : 1
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" strokeWidth={1.5} />
                    删除中
                  </>
                ) : (
                  <>
                    <Trash2 size={14} strokeWidth={1.5} />
                    确认删除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑资源弹窗 */}
      {showEditForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowEditForm(false)}
        >
          <div 
            className="p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.border}` 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 
                className="text-lg font-light"
                style={{ color: colors.text }}
              >
                编辑资源
              </h2>
              <button 
                onClick={() => setShowEditForm(false)}
                className="p-2 transition-all duration-300"
                style={{ color: colors.textMuted }}
              >
                <X size={18} strokeWidth={1} />
              </button>
            </div>

            <div className="space-y-5">
              {/* 组织名称 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-2"
                  style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
                >
                  组织/机构名称 *
                </label>
                <input
                  type="text"
                  placeholder="如：某央企财务部"
                  value={editForm.org_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, org_name: e.target.value }))}
                  className="w-full px-4 py-3 text-sm font-light transition-all duration-300 outline-none"
                  style={{ 
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                />
              </div>

              {/* 描述 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-2"
                  style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
                >
                  资源描述 *
                </label>
                <textarea
                  placeholder="详细描述这个资源..."
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 text-sm font-light transition-all duration-300 outline-none resize-none"
                  style={{ 
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text
                  }}
                  rows={4}
                />
              </div>

              {/* 关系强度 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-2"
                  style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
                >
                  关系强度 (1-5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={editForm.relationship_strength}
                  onChange={(e) => setEditForm(prev => ({ ...prev, relationship_strength: Number(e.target.value) }))}
                  className="w-full"
                  style={{ accentColor: colors.text }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: colors.textMuted }}>
                  <span>待验证</span>
                  <span>弱</span>
                  <span>中</span>
                  <span>强</span>
                  <span>核心</span>
                </div>
              </div>

              {/* 行业和区域 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label 
                    className="block text-xs uppercase tracking-widest mb-2"
                    style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
                  >
                    行业
                  </label>
                  <input
                    type="text"
                    placeholder="如：金融"
                    value={editForm.industry}
                    onChange={(e) => setEditForm(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full px-4 py-3 text-sm font-light transition-all duration-300 outline-none"
                    style={{ 
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  />
                </div>
                <div>
                  <label 
                    className="block text-xs uppercase tracking-widest mb-2"
                    style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
                  >
                    区域
                  </label>
                  <input
                    type="text"
                    placeholder="如：华东"
                    value={editForm.region}
                    onChange={(e) => setEditForm(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-4 py-3 text-sm font-light transition-all duration-300 outline-none"
                    style={{ 
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  />
                </div>
              </div>

              {/* 标签 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-2"
                  style={{ color: colors.textMuted, letterSpacing: '0.15em' }}
                >
                  标签
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="输入标签后按回车"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-4 py-3 text-sm font-light transition-all duration-300 outline-none"
                    style={{ 
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      color: colors.text
                    }}
                  />
                  <button 
                    onClick={handleAddTag}
                    className="px-4 py-3 text-xs uppercase tracking-widest transition-all duration-300"
                    style={{ 
                      border: `1px solid ${colors.border}`,
                      color: colors.textSecondary,
                      letterSpacing: '0.1em'
                    }}
                  >
                    添加
                  </button>
                </div>
                {editForm.tag_names.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {editForm.tag_names.map((tag) => (
                      <span 
                        key={tag}
                        className="px-3 py-1.5 text-xs font-light flex items-center gap-2"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${colors.border}`,
                          color: colors.text
                        }}
                      >
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)}>
                          <X size={12} strokeWidth={1.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 私有备注 */}
              <div>
                <label 
                  className="block text-xs uppercase tracking-widest mb-2 flex items-center gap-2"
                  style={{ color: colors.warning, letterSpacing: '0.15em' }}
                >
                  <Eye size={12} strokeWidth={1} />
                  私有备注（仅您可见）
                </label>
                <textarea
                  placeholder="仅自己可见的备注..."
                  value={editForm.note}
                  onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full px-4 py-3 text-sm font-light transition-all duration-300 outline-none resize-none"
                  style={{ 
                    background: colors.bg,
                    border: `1px solid ${colors.warning}30`,
                    color: colors.text
                  }}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={() => setShowEditForm(false)}
                className="flex-1 px-5 py-3 text-xs uppercase tracking-widest transition-all duration-300"
                style={{ 
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                  letterSpacing: '0.1em'
                }}
              >
                取消
              </button>
              <button
                onClick={handleEditResource}
                disabled={!editForm.org_name || !editForm.description || submitting}
                className="flex-1 px-5 py-3 text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2"
                style={{ 
                  background: colors.text,
                  color: colors.bg,
                  letterSpacing: '0.1em',
                  opacity: (!editForm.org_name || !editForm.description || submitting) ? 0.5 : 1
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" strokeWidth={1.5} />
                    保存中
                  </>
                ) : (
                  <>
                    <Edit3 size={14} strokeWidth={1.5} />
                    保存修改
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

