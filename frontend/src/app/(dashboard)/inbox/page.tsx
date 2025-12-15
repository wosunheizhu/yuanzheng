'use client'

/**
 * 元征 · 合伙人赋能平台 - 信箱页面
 * 公告/系统通知/私信
 */
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { 
  Mail,
  Bell,
  MessageCircle,
  Megaphone,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'

// 消息类型
type InboxCategory = 'ANNOUNCEMENT' | 'SYSTEM' | 'DM'

interface InboxItem {
  id: number
  category: InboxCategory
  title: string
  content: string
  related_object_type?: string
  related_object_id?: number
  is_read: boolean
  created_at: string
}

// Tab 配置
const tabs: { key: InboxCategory | 'ALL'; label: string; icon: React.ReactNode }[] = [
  { key: 'ALL', label: '全部', icon: <Mail className="w-4 h-4" /> },
  { key: 'ANNOUNCEMENT', label: '公告', icon: <Megaphone className="w-4 h-4" /> },
  { key: 'SYSTEM', label: '系统', icon: <Bell className="w-4 h-4" /> },
  { key: 'DM', label: '私信', icon: <MessageCircle className="w-4 h-4" /> },
]

// 类型颜色
const categoryColors: Record<string, string> = {
  ANNOUNCEMENT: 'bg-amber-500/10 text-amber-500',
  SYSTEM: 'bg-blue-500/10 text-blue-500',
  DM: 'bg-green-500/10 text-green-500',
  DEMAND: 'bg-blue-500/10 text-blue-500',  // 需求相关显示为系统类型
  PROJECT: 'bg-indigo-500/10 text-indigo-500',
}

// 类型标签
const categoryLabels: Record<string, string> = {
  ANNOUNCEMENT: '公告',
  SYSTEM: '系统',
  DM: '私信',
  DEMAND: '系统',  // 需求相关显示为系统类型
  PROJECT: '项目',
}

export default function InboxPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<InboxCategory | 'ALL'>('ALL')
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_unread: 0,
    announcement_unread: 0,
    system_unread: 0,
    vote_unread: 0,
    dm_unread: 0,
    mention_unread: 0,
  })
  
  const containerRef = useRef<HTMLDivElement>(null)

  // 加载消息
  useEffect(() => {
    const fetchInbox = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      
      try {
        setLoading(true)
        
        // 获取统计
        const statsResponse = await fetch(`${API_URL}/notifications/inbox/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        if (statsResponse.ok) {
          setStats(await statsResponse.json())
        }
        
        // 获取消息列表
        const params = new URLSearchParams()
        if (activeTab !== 'ALL') {
          params.append('category', activeTab)
        }
        params.append('limit', '50')
        
        const response = await fetch(`${API_URL}/notifications/inbox?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setItems(data.items || [])
        } else {
          // 使用模拟数据
          setItems(generateMockItems())
        }
      } catch (error) {
        console.error('Error fetching inbox:', error)
        setItems(generateMockItems())
      } finally {
        setLoading(false)
      }
    }
    
    fetchInbox()
  }, [activeTab])

  // 入场动画
  useEffect(() => {
    if (!containerRef.current || loading) return
    
    gsap.fromTo(
      containerRef.current.querySelectorAll('.animate-in'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power2.out' }
    )
  }, [loading, activeTab])

  // 生成模拟数据
  function generateMockItems(): InboxItem[] {
    const categories: InboxCategory[] = ['ANNOUNCEMENT', 'SYSTEM', 'DM']
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      category: categories[i % categories.length],
      title: ['新公告发布', '项目审核通过', '收到私信'][i % 3],
      content: '这是一条示例消息内容，点击查看详情...',
      related_object_type: ['ANNOUNCEMENT', 'PROJECT', 'DM_THREAD'][i % 3],
      related_object_id: i + 1,
      is_read: i > 3,
      created_at: new Date(Date.now() - i * 3600000).toISOString(),
    }))
  }

  // 标记已读
  async function markAsRead(id: number) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    
    // 立即更新UI（乐观更新）
    setItems(prevItems => prevItems.map(item => 
      item.id === id ? { ...item, is_read: true } : item
    ))
    setStats(prevStats => ({
      ...prevStats,
      total_unread: Math.max(0, prevStats.total_unread - 1)
    }))
    
    try {
      const response = await fetch(`${API_URL}/notifications/inbox/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (!response.ok) {
        console.error('Failed to mark as read:', response.status)
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  // 全部标记已读
  async function markAllAsRead() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    try {
      await fetch(`${API_URL}/notifications/inbox/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      setItems(items.map(item => ({ ...item, is_read: true })))
      setStats({ ...stats, total_unread: 0 })
      toast.success('已全部标记为已读')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('操作失败')
    }
  }

  // 格式化日期
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
    
    return date.toLocaleDateString('zh-CN')
  }

  // 获取跳转链接
  function getItemLink(item: InboxItem): string {
    switch (item.related_object_type) {
      case 'project':
      case 'PROJECT':
        return `/projects/${item.related_object_id}`
      case 'demand':
      case 'DEMAND':
      case 'demand_response':
        // 需求相关 - 跳转到需求详情页（带ID参数自动打开详情）
        return `/demands?id=${item.related_object_id}`
      case 'ANNOUNCEMENT':
        return `/inbox`
      case 'DM_THREAD':
        return `/messages`
      case 'POST':
        return `/community`
      case 'project_invitation':
        return `/inbox`
      default:
        return '#'
    }
  }

  const filteredItems = activeTab === 'ALL' 
    ? items 
    : items.filter(item => item.category === activeTab)

  return (
    <div ref={containerRef} className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题 */}
        <div className="animate-in mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/5">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">信箱</h1>
              <p className="text-white/60 text-sm">
                {stats.total_unread > 0 ? `${stats.total_unread} 条未读` : '没有未读消息'}
              </p>
            </div>
          </div>
          
          {stats.total_unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors
                       flex items-center gap-2 text-sm"
            >
              <CheckCheck className="w-4 h-4" />
              全部已读
            </button>
          )}
        </div>

        {/* Tab 切换 */}
        <div className="animate-in mb-6 flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => {
            const unreadCount = tab.key === 'ALL' 
              ? stats.total_unread 
              : stats[`${tab.key.toLowerCase()}_unread` as keyof typeof stats] || 0
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full flex items-center gap-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-black'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {tab.icon}
                {tab.label}
                {unreadCount > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-black/10' : 'bg-red-500 text-white'
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 消息列表 */}
        <div className="animate-in space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <Mail className="w-12 h-12 mb-4" />
              <p>暂无消息</p>
            </div>
          ) : (
            filteredItems.map(item => (
              <div
                key={item.id}
                className={`glass-card p-4 cursor-pointer transition-all hover:bg-white/5 ${
                  !item.is_read ? 'border-l-2 border-l-white' : ''
                }`}
                onClick={() => {
                  if (!item.is_read) markAsRead(item.id)
                }}
              >
                <div className="flex items-start gap-4">
                  {/* 类型标签 */}
                  <div className={`px-2 py-1 rounded text-xs ${categoryColors[item.category]}`}>
                    {categoryLabels[item.category]}
                  </div>
                  
                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${!item.is_read ? 'text-white' : 'text-white/80'}`}>
                        {item.title}
                      </h3>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-white/60 line-clamp-2">
                      {item.content}
                    </p>
                    <p className="text-xs text-white/40 mt-2">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  
                  {/* 跳转 */}
                  {item.related_object_id && (
                    <Link
                      href={getItemLink(item)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ChevronRight className="w-5 h-5 text-white/40" />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

