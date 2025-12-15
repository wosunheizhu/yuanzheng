'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { 
  Plus, 
  Search, 
  ExternalLink, 
  Filter,
  Calendar,
  User,
  Tag,
  ChevronDown,
  AlertCircle,
  X,
  Loader2,
  Link2,
  Newspaper
} from 'lucide-react'
import { newsService, News, projectService, Project } from '@/lib/services'
import { useAuthStore } from '@/store/auth'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
}

export default function NewsPage() {
  const { user } = useAuthStore()
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // 所有项目列表（用于筛选）
  const [projects, setProjects] = useState<Project[]>([])
  const [showProjectFilter, setShowProjectFilter] = useState(false)
  
  // 新建新闻表单
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    summary: '',
    source_name: '',
    source_url: '',
    author: '',
    tags: [] as string[],
    project_ids: [] as number[],
  })
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  // 详情弹窗
  const [selectedNews, setSelectedNews] = useState<News | null>(null)
  
  const heroRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 加载新闻列表
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const params: any = { page, page_size: 20 }
        if (filterTag) params.tag = filterTag
        if (filterProjectId) params.project_id = filterProjectId
        
        const response = await newsService.list(params)
        
        if (page === 1) {
          setNews(response.items || [])
        } else {
          setNews(prev => [...prev, ...(response.items || [])])
        }
        setHasMore((response.items?.length || 0) === 20)
      } catch (err) {
        console.error('Failed to fetch news:', err)
        setError('无法加载新闻列表')
      } finally {
        setLoading(false)
      }
    }
    fetchNews()
  }, [page, filterTag, filterProjectId])

  // 加载项目列表（用于筛选）
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectService.list({ page: 1, page_size: 100 })
        setProjects(response.items || [])
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [])

  // 入场动画 - 使用 fromTo 避免闪烁
  useEffect(() => {
    if (loading || !heroRef.current) return
    
    gsap.fromTo(heroRef.current.children,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    )
  }, [loading])

  // 过滤新闻
  const filteredNews = news.filter(n => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      n.title.toLowerCase().includes(search) ||
      n.summary?.toLowerCase().includes(search) ||
      n.source_name?.toLowerCase().includes(search) ||
      n.tags.some(t => t.toLowerCase().includes(search))
    )
  })

  // 创建新闻
  const handleCreateNews = async () => {
    if (!createForm.title) return
    
    try {
      setSubmitting(true)
      await newsService.create({
        ...createForm,
        publish_time: new Date().toISOString(),
      })
      
      setShowCreateForm(false)
      setCreateForm({
        title: '',
        content: '',
        summary: '',
        source_name: '',
        source_url: '',
        author: '',
        tags: [],
        project_ids: [],
      })
      setPage(1)
    } catch (err: any) {
      alert(err.message || '创建新闻失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !createForm.tags.includes(tagInput.trim())) {
      setCreateForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* Hero 区域 */}
      <section 
        ref={heroRef}
        className="min-h-[35vh] flex flex-col items-center justify-center text-center px-8 relative gsap-hero"
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
          关注动态 · 把握机遇
        </p>

        <h1 
          className="text-5xl md:text-6xl mb-6"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 500,
          }}
        >
          新闻资讯
        </h1>

        <p 
          className="text-lg max-w-xl mb-10"
          style={{ color: colors.textSecondary }}
        >
          关注行业动态，追踪项目进展
        </p>

        {/* 搜索和操作栏 */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-3xl">
          {/* 搜索框 */}
          <div className="relative flex-1 w-full">
            <Search 
              size={18} 
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: colors.textSecondary }}
            />
            <input
              type="text"
              placeholder="搜索新闻..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12 w-full"
            />
          </div>

          {/* 项目筛选 */}
          <div className="relative">
            <button 
              onClick={() => setShowProjectFilter(!showProjectFilter)}
              className="btn-outline py-3 px-4 flex items-center gap-2"
            >
              <Filter size={18} />
              {filterProjectId 
                ? projects.find(p => p.id === filterProjectId)?.name?.slice(0, 10) || '项目筛选'
                : '项目筛选'
              }
              <ChevronDown 
                size={16} 
                className="transition-transform duration-300"
                style={{ transform: showProjectFilter ? 'rotate(180deg)' : 'rotate(0)' }}
              />
            </button>
            
            {showProjectFilter && (
              <div 
                className="absolute top-full left-0 mt-2 min-w-[200px] p-2 rounded-xl z-50"
                style={{ 
                  background: 'rgba(30, 30, 30, 0.98)',
                  border: `1px solid ${colors.border}`,
                  backdropFilter: 'blur(20px)'
                }}
              >
                <button
                  onClick={() => { setFilterProjectId(null); setShowProjectFilter(false); setPage(1) }}
                  className="w-full px-3 py-2 text-left text-sm rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: !filterProjectId ? colors.text : colors.textSecondary }}
                >
                  全部新闻
                </button>
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => { setFilterProjectId(project.id); setShowProjectFilter(false); setPage(1) }}
                    className="w-full px-3 py-2 text-left text-sm rounded-lg transition-colors hover:bg-white/10 truncate"
                    style={{ color: filterProjectId === project.id ? colors.text : colors.textSecondary }}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 添加新闻 */}
          {user?.is_admin && (
            <button 
              onClick={() => setShowCreateForm(true)}
              className="btn-primary py-3 px-5 flex items-center gap-2"
            >
              <Plus size={18} />
              <span>添加</span>
            </button>
          )}
        </div>
      </section>

      {/* 新闻列表 */}
      <section className="px-8 pb-24 max-w-4xl mx-auto">
        {loading && news.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p style={{ color: colors.textSecondary }}>加载新闻中...</p>
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
            <div ref={listRef} className="space-y-4">
              {filteredNews.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedNews(item)}
                  className="glass-card p-6 transition-all duration-300 cursor-pointer hover:bg-white/5"
                  style={{ border: `1px solid ${colors.border}` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* 来源和时间 */}
                      <div className="flex items-center gap-3 mb-2 text-xs" style={{ color: colors.textSecondary }}>
                        {item.source_name && (
                          <span className="flex items-center gap-1">
                            <Link2 size={12} />
                            {item.source_name}
                          </span>
                        )}
                        {item.publish_time && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(item.publish_time)}
                          </span>
                        )}
                        {item.author && (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {item.author}
                          </span>
                        )}
                      </div>
                      
                      {/* 标题 */}
                      <h3 
                        className="text-lg font-medium mb-2 hover:underline"
                        style={{ color: colors.text }}
                      >
                        {item.title}
                      </h3>
                      
                      {/* 摘要 */}
                      {item.summary && (
                        <p 
                          className="text-sm mb-3 line-clamp-2"
                          style={{ color: colors.textSecondary }}
                        >
                          {item.summary}
                        </p>
                      )}
                      
                      {/* 标签 */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <span 
                              key={tag}
                              className="text-xs px-2 py-1 rounded"
                              style={{ 
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: colors.textSecondary
                              }}
                            >
                              <Tag size={10} className="inline mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* 外链 */}
                    {item.source_url && (
                      <a 
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-full transition-colors hover:bg-white/10"
                        style={{ color: colors.textSecondary }}
                      >
                        <ExternalLink size={20} />
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {filteredNews.length === 0 && !loading && (
                <div 
                  className="text-center py-20"
                  style={{ color: colors.textSecondary }}
                >
                  <Newspaper size={48} className="mx-auto mb-4 opacity-30" />
                  <p>{searchQuery ? '没有找到匹配的新闻' : '暂无新闻'}</p>
                </div>
              )}
            </div>

            {/* 加载更多 */}
            {hasMore && filteredNews.length > 0 && (
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

      {/* 新闻详情弹窗 */}
      {selectedNews && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setSelectedNews(null)}
        >
          <div 
            className="glass-card p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ border: `1px solid ${colors.border}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2 text-xs" style={{ color: colors.textSecondary }}>
                  {selectedNews.source_name && (
                    <span>{selectedNews.source_name}</span>
                  )}
                  {selectedNews.publish_time && (
                    <span>{formatDate(selectedNews.publish_time)}</span>
                  )}
                </div>
                <h2 className="text-2xl font-medium" style={{ color: colors.text }}>
                  {selectedNews.title}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedNews(null)}
                className="p-2 rounded-full hover:bg-white/10"
              >
                <X size={20} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            {selectedNews.summary && (
              <p 
                className="text-sm mb-4 italic"
                style={{ color: colors.textSecondary }}
              >
                {selectedNews.summary}
              </p>
            )}

            {selectedNews.content && (
              <div 
                className="prose prose-invert max-w-none mb-6"
                style={{ color: colors.text }}
              >
                <p className="whitespace-pre-wrap">{selectedNews.content}</p>
              </div>
            )}

            {selectedNews.tags && selectedNews.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedNews.tags.map((tag) => (
                  <span 
                    key={tag}
                    className="text-xs px-2 py-1 rounded"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: colors.text
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {selectedNews.source_url && (
              <a 
                href={selectedNews.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline py-2 px-4 text-sm inline-flex items-center gap-2"
              >
                <ExternalLink size={16} />
                查看原文
              </a>
            )}
          </div>
        </div>
      )}

      {/* 创建新闻弹窗 */}
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
                添加新闻
              </h2>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="p-2 rounded-full hover:bg-white/10"
              >
                <X size={20} style={{ color: colors.textSecondary }} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 标题 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  标题 *
                </label>
                <input
                  type="text"
                  placeholder="新闻标题"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field w-full"
                />
              </div>

              {/* 摘要 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  摘要
                </label>
                <textarea
                  placeholder="新闻摘要..."
                  value={createForm.summary}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, summary: e.target.value }))}
                  className="input-field w-full resize-none"
                  rows={2}
                />
              </div>

              {/* 内容 */}
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  正文
                </label>
                <textarea
                  placeholder="新闻正文..."
                  value={createForm.content}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, content: e.target.value }))}
                  className="input-field w-full resize-none"
                  rows={6}
                />
              </div>

              {/* 来源信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    来源名称
                  </label>
                  <input
                    type="text"
                    placeholder="如：财经网"
                    value={createForm.source_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, source_name: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    来源链接
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={createForm.source_url}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, source_url: e.target.value }))}
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
                {createForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {createForm.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="text-xs px-2 py-1 rounded flex items-center gap-1"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: colors.text
                        }}
                      >
                        {tag}
                        <button onClick={() => setCreateForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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
                onClick={handleCreateNews}
                disabled={!createForm.title || submitting}
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
                    发布新闻
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
