'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import {
  Briefcase,
  Package,
  Users,
  Calendar,
  MessageSquare,
  Info,
  User,
  Menu,
  X,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  LayoutDashboard,
  Coins,
  Shield,
  Building,
  FileText,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { projectService, userService, resourceService } from '@/lib/services'

// Homepage URL - 使用环境变量或默认值
const HOMEPAGE_URL = process.env.NEXT_PUBLIC_HOMEPAGE_URL || 'http://localhost:3847'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
}

// 主导航项（3个常用）
const mainNavItems = [
  { name: '项目', href: '/projects', icon: Briefcase },
  { name: '资源', href: '/resources', icon: Package },
  { name: '合伙人', href: '/partners', icon: Users },
]

// 更多菜单项 - 与首页 (3847) 保持一致的顺序
const moreNavItems = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Token', href: '/token', icon: Coins },
  { name: '---divider1---', href: '', icon: null, divider: true },
  { name: '座谈会', href: '/meetings', icon: Calendar },
  { name: '时间表', href: '/schedule', icon: Calendar },
  { name: '信箱', href: '/inbox', icon: Bell },
  { name: '私信', href: '/messages', icon: MessageSquare },
  { name: '社群', href: '/community', icon: MessageSquare },
  { name: '需求中心', href: '/demands', icon: Briefcase },
  { name: '意见反馈', href: '/feedback', icon: MessageSquare },
  { name: '---divider2---', href: '', icon: null, divider: true },
  { name: '关于元征', href: `${HOMEPAGE_URL}#sectionExpression`, icon: Info, external: true },
]

// 搜索结果类型
interface SearchResult {
  id: number
  type: 'project' | 'partner' | 'resource'
  title: string
  subtitle?: string
  href: string
}

export default function FloatingNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 监听滚动
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 获取未读消息数量 - 优化刷新频率
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    try {
      const response = await fetch(`${API_URL}/notifications/inbox/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      if (response.ok) {
        const stats = await response.json()
        setUnreadCount(stats.total_unread || 0)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }, [user])

  // 定时轮询 - 每5秒刷新一次（提高响应速度）
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 5000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // 页面切换时立即刷新
  useEffect(() => {
    fetchUnreadCount()
  }, [pathname, fetchUnreadCount])

  // 用户回到页面时立即刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount()
      }
    }
    const handleFocus = () => {
      fetchUnreadCount()
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchUnreadCount])

  // 入场动画 - 使用 ref 防止动画重复执行
  const hasAnimated = useRef(false)
  
  useEffect(() => {
    if (navRef.current && !hasAnimated.current) {
      hasAnimated.current = true
      
      // 先设置初始状态
      gsap.set(navRef.current, { opacity: 0, y: -50 })
      
      // 然后动画到最终状态
      gsap.to(navRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.2
      })
    }
  }, [])

  // 点击外部关闭更多菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // 键盘快捷键打开搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 聚焦搜索框
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isSearchOpen])

  // 搜索功能
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    const results: SearchResult[] = []
    
    try {
      // 搜索项目
      const projects = await projectService.list({ search: query, limit: 5 })
      if (projects.items) {
        projects.items.forEach((p: any) => {
          results.push({
            id: p.id,
            type: 'project',
            title: p.name,
            subtitle: p.business_type || p.industry,
            href: `/projects/${p.id}`
          })
        })
      }

      // 搜索合伙人
      const usersResponse = await userService.list({ search: query, limit: 5 })
      const users = usersResponse.items || []
      users.forEach((u: any) => {
        results.push({
          id: u.id,
          type: 'partner',
          title: u.name,
          subtitle: u.organization || u.email,
          href: `/partners/${u.id}`
        })
      })

      // 搜索资源
      const resources = await resourceService.list({ search: query, limit: 5 })
      if (resources.items) {
        resources.items.forEach((r: any) => {
          results.push({
            id: r.id,
            type: 'resource',
            title: r.org_name,
            subtitle: r.description?.slice(0, 50),
            href: `/resources`
          })
        })
      }
    } catch (err) {
      console.error('Search error:', err)
    }
    
    setSearchResults(results)
    setIsSearching(false)
  }, [])

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  // 处理搜索结果点击
  const handleResultClick = (result: SearchResult) => {
    setIsSearchOpen(false)
    setSearchQuery('')
    router.push(result.href)
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* 浮动导航栏 - 与首页 (3847) 完全一致的样式 */}
      <nav
        ref={navRef}
        className="fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500"
        style={{
          top: '20px',
          padding: '12px 24px',
          background: isScrolled ? 'rgba(20, 20, 20, 0.98)' : 'rgba(30, 30, 30, 0.9)',
          backdropFilter: 'blur(20px)',
          borderRadius: '50px',
          border: `1px solid ${colors.border}`,
          boxShadow: isScrolled ? '0 10px 40px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        <div className="flex items-center" style={{ gap: '24px' }}>
          {/* Logo */}
          <a href={HOMEPAGE_URL} className="flex items-center gap-2">
            <img 
              src="/logo.png" 
              alt="元征" 
              className="object-contain opacity-90 hover:opacity-100 transition-opacity"
              style={{ 
                width: '36px', 
                height: '36px',
                filter: 'brightness(0) invert(1)' /* 将深色logo转为白色 */
              }}
            />
            <span 
              className="hidden sm:block text-sm"
              style={{ 
                color: colors.text,
                fontFamily: "'Noto Serif SC', serif",
                fontWeight: 500 
              }}
            >
              元征
            </span>
          </a>

          {/* 分隔线 */}
          <div className="hidden md:block w-px h-5" style={{ background: colors.border }} />

          {/* 主导航链接 - 3个常用 + 更多，与首页一致 */}
          <div className="hidden md:flex items-center" style={{ gap: '24px' }}>
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium transition-all duration-300 hover:opacity-80"
                style={{
                  color: isActive(item.href) ? colors.text : colors.textSecondary,
                }}
              >
                {item.name}
              </Link>
            ))}

            {/* 更多下拉菜单 */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMoreOpen(!isMoreOpen)
                }}
                className="flex items-center gap-1 text-sm font-medium transition-all duration-300 hover:opacity-80"
                style={{ color: colors.textSecondary }}
              >
                更多
                <ChevronDown 
                  size={14} 
                  className="transition-transform duration-300"
                  style={{ transform: isMoreOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {/* 下拉菜单 */}
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-4 min-w-[180px] p-2 transition-all duration-300"
                style={{
                  background: 'rgba(30, 30, 30, 0.98)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  opacity: isMoreOpen ? 1 : 0,
                  visibility: isMoreOpen ? 'visible' : 'hidden',
                  transform: `translateX(-50%) translateY(${isMoreOpen ? '0' : '-10px'})`,
                  pointerEvents: isMoreOpen ? 'auto' : 'none',
                }}
              >
                {moreNavItems.map((item, index) => {
                  // 处理分隔线
                  if (item.divider) {
                    // 第二个分隔线前插入管理员控制台
                    if (item.name === '---divider2---' && user?.is_admin) {
                      return (
                        <div key={item.name}>
                          <Link
                            href="/admin"
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 hover:bg-white/10"
                            style={{ 
                              color: isActive('/admin') ? colors.text : '#fbbf24',
                              background: isActive('/admin') ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
                            }}
                          >
                            <Shield size={18} />
                            管理员控制台
                          </Link>
                          <div className="my-2 h-px" style={{ background: colors.border }} />
                        </div>
                      )
                    }
                    return (
                      <div key={item.name} className="my-2 h-px" style={{ background: colors.border }} />
                    )
                  }
                  
                  const Icon = item.icon!
                  
                  return (
                    <div key={item.href}>
                      {item.external ? (
                        <a
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 hover:bg-white/10"
                          style={{ color: colors.textSecondary }}
                        >
                          <Icon size={18} />
                          {item.name}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setIsMoreOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 hover:bg-white/10"
                          style={{ 
                            color: isActive(item.href) ? colors.text : colors.textSecondary,
                            background: isActive(item.href) ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
                          }}
                        >
                          <Icon size={18} />
                          {item.name}
                        </Link>
                      )}
                    </div>
                  )
                })}
                
              </div>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="hidden md:block w-px h-5" style={{ background: colors.border }} />

          {/* 右侧操作区 - 与首页一致 */}
          <div className="flex items-center" style={{ gap: '12px' }}>
            {/* 搜索 */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-center rounded-full transition-all duration-300 hover:bg-white/10"
              style={{ 
                width: '36px', 
                height: '36px',
                color: colors.textSecondary 
              }}
              title="搜索 (⌘K)"
            >
              <Search size={18} />
            </button>

            {/* 通知 - 链接到信箱 */}
            <Link
              href="/inbox"
              className="relative flex items-center justify-center rounded-full transition-all duration-300 hover:bg-white/10"
              style={{ 
                width: '36px', 
                height: '36px',
                color: colors.textSecondary 
              }}
              title="信箱"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span 
                  className="absolute flex items-center justify-center rounded-full text-white font-medium"
                  style={{ 
                    top: '4px',
                    right: '2px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    fontSize: '10px',
                    background: '#ef4444',
                    lineHeight: 1
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* 用户头像 - 与首页一致 */}
            <Link
              href="/profile"
              className="flex items-center rounded-full transition-all duration-300 hover:bg-white/10"
              style={{ 
                gap: '8px',
                padding: '4px 12px 4px 4px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${colors.border}`
              }}
            >
              <div 
                className="flex items-center justify-center rounded-full font-medium"
                style={{ 
                  width: '28px',
                  height: '28px',
                  fontSize: '12px',
                  background: 'rgba(255, 255, 255, 0.15)', 
                  color: colors.text 
                }}
              >
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span 
                className="hidden sm:block"
                style={{ fontSize: '13px', color: colors.text }}
              >
                {user?.name || '用户'}
              </span>
            </Link>

            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-full transition-all duration-300 hover:bg-white/10"
              style={{ color: colors.text }}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* 移动端展开菜单 */}
      <div
        ref={mobileMenuRef}
        className={`
          fixed top-20 left-1/2 -translate-x-1/2 z-40
          w-[calc(100%-40px)] max-w-md
          p-4 transition-all duration-300
          ${isMenuOpen ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none -translate-y-4'}
        `}
        style={{
          background: 'rgba(30, 30, 30, 0.98)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
        }}
      >
        <div className="space-y-2">
          {/* 主导航项 */}
          {mainNavItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300"
                style={{
                  background: isActive(item.href) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: isActive(item.href) ? colors.text : colors.textSecondary,
                }}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            )
          })}

          <div className="my-2 h-px" style={{ background: colors.border }} />

          {/* 更多菜单项 */}
          {moreNavItems.map((item) => {
            // 处理分隔线
            if (item.divider) {
              // 第二个分隔线前插入管理员控制台
              if (item.name === '---divider2---' && user?.is_admin) {
                return (
                  <div key={item.name}>
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-white/5"
                      style={{ color: '#fbbf24' }}
                    >
                      <Shield size={20} />
                      <span>管理员控制台</span>
                    </Link>
                    <div className="my-2 h-px" style={{ background: colors.border }} />
                  </div>
                )
              }
              return (
                <div key={item.name} className="my-2 h-px" style={{ background: colors.border }} />
              )
            }
            
            const Icon = item.icon!
            return item.external ? (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-white/5"
                style={{ color: colors.textSecondary }}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300"
                style={{
                  background: isActive(item.href) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  color: isActive(item.href) ? colors.text : colors.textSecondary,
                }}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            )
          })}

          <div className="my-2 h-px" style={{ background: colors.border }} />

          <Link
            href="/profile"
            onClick={() => setIsMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-white/5"
            style={{ color: colors.textSecondary }}
          >
            <User size={20} />
            <span>个人中心</span>
          </Link>

          <button
            onClick={() => {
              logout()
              setIsMenuOpen(false)
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-red-500/10"
            style={{ color: colors.textSecondary }}
          >
            <LogOut size={20} />
            <span>退出登录</span>
          </button>
        </div>
      </div>

      {/* 点击外部关闭菜单 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* 全局搜索模态框 */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          style={{ background: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 搜索框 */}
            <div
              className="relative"
              style={{
                background: 'rgba(30, 30, 30, 0.98)',
                borderRadius: '16px',
                border: `1px solid ${colors.border}`,
                overflow: 'hidden',
              }}
            >
              <div className="flex items-center px-5 py-4 border-b" style={{ borderColor: colors.border }}>
                <Search size={20} style={{ color: colors.textSecondary }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="搜索项目、合伙人、资源..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-1 bg-transparent outline-none"
                  style={{ color: colors.text, fontSize: '16px' }}
                />
                {isSearching && (
                  <Loader2 size={18} className="animate-spin" style={{ color: colors.textSecondary }} />
                )}
                <kbd
                  className="ml-2 px-2 py-1 rounded text-xs"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: colors.textSecondary 
                  }}
                >
                  ESC
                </kbd>
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="max-h-[400px] overflow-y-auto p-2">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left transition-all hover:bg-white/10"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          background: result.type === 'project' 
                            ? 'rgba(245, 158, 11, 0.2)' 
                            : result.type === 'partner'
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(34, 197, 94, 0.2)',
                        }}
                      >
                        {result.type === 'project' && <Briefcase size={18} style={{ color: '#f59e0b' }} />}
                        {result.type === 'partner' && <Users size={18} style={{ color: '#3b82f6' }} />}
                        {result.type === 'resource' && <Building size={18} style={{ color: '#22c55e' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ color: colors.text, fontWeight: 500 }}>
                          {result.title}
                        </div>
                        {result.subtitle && (
                          <div className="truncate" style={{ color: colors.textSecondary, fontSize: '13px' }}>
                            {result.subtitle}
                          </div>
                        )}
                      </div>
                      <div
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: colors.textSecondary,
                        }}
                      >
                        {result.type === 'project' ? '项目' : result.type === 'partner' ? '合伙人' : '资源'}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* 无结果提示 */}
              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="py-12 text-center" style={{ color: colors.textSecondary }}>
                  <Search size={40} className="mx-auto mb-3 opacity-30" />
                  <p>未找到相关结果</p>
                </div>
              )}

              {/* 快捷键提示 */}
              {!searchQuery && (
                <div className="py-8 px-6" style={{ color: colors.textSecondary }}>
                  <p className="text-center text-sm mb-4">输入关键词搜索项目、合伙人或资源</p>
                  <div className="flex justify-center gap-6 text-xs">
                    <span className="flex items-center gap-2">
                      <Briefcase size={14} />
                      项目
                    </span>
                    <span className="flex items-center gap-2">
                      <Users size={14} />
                      合伙人
                    </span>
                    <span className="flex items-center gap-2">
                      <Building size={14} />
                      资源
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 底部提示 */}
            <div className="mt-4 text-center" style={{ color: colors.textSecondary, fontSize: '12px' }}>
              <span className="opacity-60">按</span>{' '}
              <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>⌘</kbd>
              <span className="opacity-60"> + </span>
              <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>K</kbd>
              <span className="opacity-60"> 快速打开搜索</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
