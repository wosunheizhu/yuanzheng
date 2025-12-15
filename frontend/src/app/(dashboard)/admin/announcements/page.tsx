'use client'

/**
 * 元征 · 合伙人赋能平台 - 公告管理页面
 * 管理员发布和管理公告
 */
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { 
  Megaphone,
  Plus,
  Edit3,
  Trash2,
  Eye,
  ChevronLeft,
  Loader2,
  X,
  Check,
  AlertCircle,
  Upload
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// 公告类型
interface Announcement {
  id: number
  title: string
  content: string
  attachments?: { name: string; url: string }[]
  visibility_scope_type: string
  visibility_min_role_level?: number
  created_by_user_id: number
  created_by_name?: string
  created_at: string
  updated_at: string
}

// 可见性选项
const visibilityOptions = [
  { value: 'ALL', label: '全部合伙人' },
  { value: 'ROLE_MIN_LEVEL', label: '按角色等级' },
  { value: 'CUSTOM', label: '自定义' },
]

const roleLevelOptions = [
  { value: 1, label: '普通合伙人及以上' },
  { value: 2, label: '核心合伙人及以上' },
  { value: 3, label: '仅联合创始人' },
]

export default function AnnouncementsAdminPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  
  // 编辑/新建
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '',
    content: '',
    visibility_scope_type: 'ALL',
    visibility_min_role_level: 1,
  })
  const [submitting, setSubmitting] = useState(false)
  
  // 预览
  const [previewAnnouncement, setPreviewAnnouncement] = useState<Announcement | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)

  // 权限检查
  useEffect(() => {
    if (!user?.is_admin) {
      router.replace('/dashboard')
      toast.error('您没有管理员权限')
    }
  }, [user, router])

  // 加载公告
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true)
        
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
        const response = await fetch(`${API_URL}/notifications/announcements?limit=100`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setAnnouncements(data.items || [])
          setTotal(data.total || 0)
        } else {
          setAnnouncements(generateMockAnnouncements())
        }
      } catch (error) {
        console.error('Error fetching announcements:', error)
        setAnnouncements(generateMockAnnouncements())
      } finally {
        setLoading(false)
      }
    }
    
    fetchAnnouncements()
  }, [])

  // 入场动画
  useEffect(() => {
    if (!containerRef.current || loading) return
    
    gsap.fromTo(
      containerRef.current.querySelectorAll('.animate-in'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power2.out' }
    )
  }, [loading])

  // 生成模拟数据
  function generateMockAnnouncements(): Announcement[] {
    return [
      {
        id: 1,
        title: '2024年终总结公告',
        content: '各位合伙人好，2024年即将结束，现就今年的工作进行总结...',
        visibility_scope_type: 'ALL',
        created_by_user_id: 1,
        created_by_name: '管理员',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: '新功能上线通知',
        content: '平台新增了资源探索AI功能，欢迎大家使用...',
        visibility_scope_type: 'ALL',
        created_by_user_id: 1,
        created_by_name: '管理员',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ]
  }

  // 打开新建表单
  function openCreateForm() {
    setEditingId(null)
    setForm({
      title: '',
      content: '',
      visibility_scope_type: 'ALL',
      visibility_min_role_level: 1,
    })
    setShowForm(true)
  }

  // 打开编辑表单
  function openEditForm(announcement: Announcement) {
    setEditingId(announcement.id)
    setForm({
      title: announcement.title,
      content: announcement.content,
      visibility_scope_type: announcement.visibility_scope_type,
      visibility_min_role_level: announcement.visibility_min_role_level || 1,
    })
    setShowForm(true)
  }

  // 提交表单
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    
    try {
      setSubmitting(true)
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const url = editingId 
        ? `${API_URL}/notifications/announcements/${editingId}`
        : `${API_URL}/notifications/announcements`
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...form,
          visibility_min_role_level: form.visibility_scope_type === 'ROLE_MIN_LEVEL' 
            ? form.visibility_min_role_level 
            : null,
        })
      })
      
      if (response.ok) {
        const announcement = await response.json()
        
        if (editingId) {
          setAnnouncements(announcements.map(a => 
            a.id === editingId ? announcement : a
          ))
          toast.success('公告已更新')
        } else {
          setAnnouncements([announcement, ...announcements])
          toast.success('公告已发布')
        }
        
        setShowForm(false)
      } else {
        toast.error(editingId ? '更新失败' : '发布失败')
      }
    } catch (error) {
      console.error('Error submitting announcement:', error)
      toast.error('操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 删除公告
  async function handleDelete(id: number) {
    if (!confirm('确定要删除这条公告吗？')) return
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      await fetch(`${API_URL}/notifications/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      setAnnouncements(announcements.filter(a => a.id !== id))
      toast.success('公告已删除')
    } catch (error) {
      console.error('Error deleting announcement:', error)
      toast.error('删除失败')
    }
  }

  // 格式化日期
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 获取可见性标签
  function getVisibilityLabel(announcement: Announcement): string {
    if (announcement.visibility_scope_type === 'ALL') {
      return '全部合伙人'
    } else if (announcement.visibility_scope_type === 'ROLE_MIN_LEVEL') {
      const level = announcement.visibility_min_role_level
      if (level === 3) return '仅联合创始人'
      if (level === 2) return '核心及以上'
      return '全部合伙人'
    }
    return '自定义范围'
  }

  if (!user?.is_admin) {
    return null
  }

  return (
    <div ref={containerRef} className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 标题 */}
        <div className="animate-in mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin" 
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Megaphone className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">公告管理</h1>
              <p className="text-white/60 text-sm">
                发布和管理平台公告，共 {total} 条
              </p>
            </div>
          </div>
          
          <button
            onClick={openCreateForm}
            className="px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90
                     flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            发布公告
          </button>
        </div>

        {/* 公告列表 */}
        <div className="animate-in space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <Megaphone className="w-12 h-12 mb-4" />
              <p>暂无公告</p>
            </div>
          ) : (
            announcements.map(announcement => (
              <div key={announcement.id} className="glass-card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium">{announcement.title}</h3>
                      <span className="px-2 py-0.5 rounded text-xs bg-white/10">
                        {getVisibilityLabel(announcement)}
                      </span>
                    </div>
                    <p className="text-white/60 line-clamp-2 mb-3">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-white/40">
                      <span>发布者: {announcement.created_by_name}</span>
                      <span>发布时间: {formatDate(announcement.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setPreviewAnnouncement(announcement)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="预览"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditForm(announcement)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      title="编辑"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 rounded-lg hover:bg-white/10 text-red-400 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 新建/编辑表单 */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium">
                  {editingId ? '编辑公告' : '发布公告'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">
                    公告标题 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="输入公告标题"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                             text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white/60 mb-1">
                    公告内容 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    required
                    rows={8}
                    placeholder="输入公告内容..."
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                             text-white placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white/60 mb-1">
                    可见范围 <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.visibility_scope_type}
                    onChange={(e) => setForm({ ...form, visibility_scope_type: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                             text-white focus:outline-none focus:border-white/30"
                  >
                    {visibilityOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                
                {form.visibility_scope_type === 'ROLE_MIN_LEVEL' && (
                  <div>
                    <label className="block text-sm text-white/60 mb-1">
                      最低角色等级
                    </label>
                    <select
                      value={form.visibility_min_role_level}
                      onChange={(e) => setForm({ ...form, visibility_min_role_level: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                               text-white focus:outline-none focus:border-white/30"
                    >
                      {roleLevelOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90
                             disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {editingId ? '保存修改' : '发布公告'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 预览弹窗 */}
        {previewAnnouncement && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium">公告预览</h3>
                <button
                  onClick={() => setPreviewAnnouncement(null)}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">{previewAnnouncement.title}</h2>
                <div className="flex items-center gap-4 text-sm text-white/40 mb-4">
                  <span>发布者: {previewAnnouncement.created_by_name}</span>
                  <span>发布时间: {formatDate(previewAnnouncement.created_at)}</span>
                </div>
              </div>
              
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{previewAnnouncement.content}</p>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={() => setPreviewAnnouncement(null)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

