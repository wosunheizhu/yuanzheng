'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { 
  Plus, 
  Search, 
  Package,
  Tag,
  Eye,
  Star,
  Grid,
  List,
  MapPin,
  Building,
  User,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react'
import { resourceService, Resource } from '@/lib/services'
import { useAuthStore } from '@/store/auth'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
}

// 状态颜色
const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  'ACTIVE': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '可用' },
  'PAUSED': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '暂停' },
  'EXPIRED': { bg: 'rgba(136, 136, 136, 0.1)', text: '#888888', label: '已过期' },
}

// 关系强度颜色
const strengthColors = (strength: number) => {
  if (strength >= 4) return { color: '#4ade80', label: '强' }
  if (strength >= 3) return { color: '#60a5fa', label: '中' }
  if (strength >= 2) return { color: '#fbbf24', label: '弱' }
  return { color: '#888888', label: '待验证' }
}

export default function ResourcesPage() {
  const { user } = useAuthStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [resources, setResources] = useState<Resource[]>([])
  const [myResources, setMyResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMyResources, setShowMyResources] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // 新建资源表单
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
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
  const [refreshKey, setRefreshKey] = useState(0)
  
  const heroRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // 加载资源列表
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const pageSize = 20
        const skip = (page - 1) * pageSize
        
        const response = showMyResources 
          ? await resourceService.getMyResources({ skip, limit: pageSize })
          : await resourceService.list({ skip, limit: pageSize })
        
        if (page === 1) {
          setResources(response.items || [])
        } else {
          setResources(prev => [...prev, ...(response.items || [])])
        }
        setHasMore((response.items?.length || 0) === 20)
      } catch (err) {
        console.error('Failed to fetch resources:', err)
        setError('无法加载资源列表')
      } finally {
        setLoading(false)
      }
    }
    fetchResources()
  }, [page, showMyResources, refreshKey])

  // 入场动画 - 使用 fromTo 避免闪烁
  useEffect(() => {
    if (loading) return
    
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    
    if (heroRef.current) {
      tl.fromTo(heroRef.current.children,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }
      )
    }

    if (gridRef.current && gridRef.current.children.length > 0) {
      tl.fromTo(gridRef.current.children,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.08 },
        '-=0.4'
      )
    }
  }, [loading, resources])

  // 过滤资源
  const filteredResources = resources.filter(r => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      r.org_name.toLowerCase().includes(search) ||
      r.description.toLowerCase().includes(search) ||
      r.industry?.toLowerCase().includes(search) ||
      r.region?.toLowerCase().includes(search) ||
      r.tags?.some(t => t.name.toLowerCase().includes(search))
    )
  })

  // 创建资源
  const handleCreateResource = async () => {
    if (!createForm.org_name || !createForm.description) return
    
    try {
      setSubmitting(true)
      await resourceService.create(createForm)
      
      // 关闭表单并重置
      setShowCreateForm(false)
      setCreateForm({
        org_name: '',
        description: '',
        relationship_strength: 3,
        industry: '',
        region: '',
        note: '',
        tag_names: [],
      })
      
      // 强制刷新列表 - 重置到第一页并触发重新加载
      setPage(1)
      setRefreshKey(prev => prev + 1)
    } catch (err: any) {
      alert(err.message || '创建资源失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !createForm.tag_names.includes(tagInput.trim())) {
      setCreateForm(prev => ({
        ...prev,
        tag_names: [...prev.tag_names, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  // 移除标签
  const handleRemoveTag = (tag: string) => {
    setCreateForm(prev => ({
      ...prev,
      tag_names: prev.tag_names.filter(t => t !== tag)
    }))
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* Hero 区域 */}
      <section 
        ref={heroRef}
        className="min-h-[40vh] flex flex-col items-center justify-center text-center px-8 relative gsap-hero"
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(60, 60, 60, 0.15) 0%, transparent 60%)',
          }}
        />

        <p 
          className="text-sm mb-4"
          style={{ color: colors.textSecondary }}
        >
          共享 · 协作 · 共创价值
        </p>

        <h1 
          className="text-5xl md:text-6xl mb-6"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 500,
          }}
        >
          资源中心
        </h1>

        <p 
          className="text-lg max-w-xl mb-10"
          style={{ color: colors.textSecondary }}
        >
          浏览和分享合伙人网络中的优质资源
        </p>

        {/* 搜索和操作栏 */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-3xl">
          {/* Tab 切换 */}
          <div 
            className="flex items-center rounded-full p-1"
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: `1px solid ${colors.border}` }}
          >
            <button
              onClick={() => { setShowMyResources(false); setPage(1) }}
              className="px-4 py-2 rounded-full text-sm transition-all duration-300"
              style={{ 
                background: !showMyResources ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: !showMyResources ? colors.text : colors.textSecondary
              }}
            >
              全部资源
            </button>
            <button
              onClick={() => { setShowMyResources(true); setPage(1) }}
              className="px-4 py-2 rounded-full text-sm transition-all duration-300"
              style={{ 
                background: showMyResources ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: showMyResources ? colors.text : colors.textSecondary
              }}
            >
              我的资源
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative flex-1 w-full">
            <Search 
              size={18} 
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: colors.textSecondary }}
            />
            <input
              type="text"
              placeholder="搜索资源..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12 w-full"
            />
          </div>

          {/* 视图切换 */}
          <div 
            className="flex items-center rounded-full p-1"
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: `1px solid ${colors.border}` }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded-full transition-all duration-300"
              style={{ 
                background: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: viewMode === 'grid' ? colors.text : colors.textSecondary
              }}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-full transition-all duration-300"
              style={{ 
                background: viewMode === 'list' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                color: viewMode === 'list' ? colors.text : colors.textSecondary
              }}
            >
              <List size={18} />
            </button>
          </div>

          {/* 发布资源 */}
          <button 
            onClick={() => setShowCreateForm(true)}
            className="btn-primary py-3 px-5 flex items-center gap-2"
          >
            <Plus size={18} />
            <span>发布</span>
          </button>
        </div>
      </section>

      {/* 资源列表 */}
      <section className="px-8 pb-24 max-w-6xl mx-auto">
        {loading && resources.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p style={{ color: colors.textSecondary }}>加载资源中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <AlertCircle size={48} className="mx-auto mb-4" style={{ color: '#ef4444' }} />
            <p className="mb-4" style={{ color: colors.textSecondary }}>{error}</p>
            <button onClick={() => window.location.reload()} className="btn-outline py-2 px-4 text-sm">
              重试
            </button>
          </div>
        ) : (
          <>
            <div 
              ref={gridRef}
              className={`gsap-grid
                ${viewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
                  : 'space-y-4'
                }
              `}
            >
              {filteredResources.map((resource) => {
                const strength = strengthColors(resource.relationship_strength)
                const status = statusColors[resource.status]
                
                return (
                  <Link
                    key={resource.id}
                    href={`/resources/${resource.id}`}
                    className="glass-card p-6 transition-all duration-300 cursor-pointer group hover:bg-white/5 block"
                    style={{ border: `1px solid ${colors.border}` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* 图标 */}
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                      >
                        <Building size={20} style={{ color: colors.textSecondary }} />
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: status?.bg, color: status?.text }}
                          >
                            {status?.label}
                          </span>
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${strength.color}20`, color: strength.color }}
                          >
                            关系强度: {strength.label}
                          </span>
                        </div>

                        <h3 
                          className="text-lg font-medium mb-2 group-hover:underline"
                          style={{ color: colors.text }}
                        >
                          {resource.org_name}
                        </h3>

                        <p 
                          className="text-sm mb-3 line-clamp-2"
                          style={{ color: colors.textSecondary }}
                        >
                          {resource.description}
                        </p>

                        {/* 标签 */}
                        {resource.tags && resource.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {resource.tags.slice(0, 4).map((tag) => (
                              <span 
                                key={tag.id} 
                                className="text-xs px-2 py-1 rounded"
                                style={{ 
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: colors.textSecondary
                                }}
                              >
                                <Tag size={10} className="inline mr-1" />
                                {tag.name}
                              </span>
                            ))}
                            {resource.tags.length > 4 && (
                              <span className="text-xs" style={{ color: colors.textSecondary }}>
                                +{resource.tags.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 元信息 */}
                        <div className="flex items-center gap-4 text-xs" style={{ color: colors.textSecondary }}>
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {resource.owner_name}
                          </span>
                          {resource.industry && (
                            <span className="flex items-center gap-1">
                              <Building size={12} />
                              {resource.industry}
                            </span>
                          )}
                          {resource.region && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {resource.region}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}

              {filteredResources.length === 0 && !loading && (
                <div 
                  className="col-span-2 text-center py-20"
                  style={{ color: colors.textSecondary }}
                >
                  <Package size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="mb-4">{searchQuery ? '没有找到匹配的资源' : '暂无资源'}</p>
                  <button 
                    onClick={() => setShowCreateForm(true)}
                    className="btn-primary py-2 px-4 text-sm flex items-center gap-2 mx-auto"
                  >
                    <Plus size={16} />
                    发布第一个资源
                  </button>
                </div>
              )}
            </div>

            {/* 加载更多 */}
            {hasMore && filteredResources.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loading}
                  className="btn-outline py-2 px-6 text-sm flex items-center gap-2 mx-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      加载中...
                    </>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* 创建资源弹窗 */}
      {showCreateForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowCreateForm(false)}
        >
          <div 
            className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={{ border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium" style={{ color: colors.text }}>
                发布资源
              </h2>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="p-2 rounded-full hover:bg-white/10"
              >
                <X size={20} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 组织名称 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  组织/机构名称 *
                </label>
                <input
                  type="text"
                  placeholder="如：某央企财务部"
                  value={createForm.org_name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, org_name: e.target.value }))}
                  className="input-field w-full"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  资源描述 *
                </label>
                <textarea
                  placeholder="详细描述这个资源..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field w-full resize-none"
                  rows={4}
                />
              </div>

              {/* 关系强度 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  关系强度 (1-5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={createForm.relationship_strength}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, relationship_strength: Number(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: colors.textSecondary }}>
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
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    行业
                  </label>
                  <input
                    type="text"
                    placeholder="如：金融"
                    value={createForm.industry}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, industry: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    区域
                  </label>
                  <input
                    type="text"
                    placeholder="如：华东"
                    value={createForm.region}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, region: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* 标签 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  标签
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="输入标签后按回车"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="input-field flex-1"
                  />
                  <button onClick={handleAddTag} className="btn-outline py-2 px-4">
                    添加
                  </button>
                </div>
                {createForm.tag_names.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {createForm.tag_names.map((tag) => (
                      <span 
                        key={tag}
                        className="text-xs px-2 py-1 rounded flex items-center gap-1"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: colors.text
                        }}
                      >
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  私有备注
                </label>
                <textarea
                  placeholder="仅自己可见的备注..."
                  value={createForm.note}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, note: e.target.value }))}
                  className="input-field w-full resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn-outline flex-1 py-3"
              >
                取消
              </button>
              <button
                onClick={handleCreateResource}
                disabled={!createForm.org_name || !createForm.description || submitting}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    发布资源
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部版权 */}
      <footer 
        className="text-center py-8"
        style={{ color: colors.textSecondary }}
      >
        <p className="text-xs">
          © 2024 元征 · 合伙人赋能平台
        </p>
      </footer>
    </div>
  )
}
