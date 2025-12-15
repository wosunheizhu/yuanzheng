'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search, Plus, User } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const user = useAuthStore((state) => state.user)

  // 获取当前页面标题
  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/dashboard': '仪表盘',
      '/projects': '项目管理',
      '/resources': '资源中心',
      '/meetings': '日常座谈会',
      '/community': '交流社群',
      '/partners': '合伙人',
      '/profile': '个人中心',
      '/inbox': '信箱',
    }
    for (const [path, title] of Object.entries(titles)) {
      if (pathname.startsWith(path)) return title
    }
    return '元征'
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`
        fixed top-0 right-0 z-30
        transition-all duration-500 ease-smooth
        ${scrolled ? 'py-3' : 'py-5'}
      `}
      style={{
        left: '256px', // 与侧边栏宽度对应
        background: scrolled ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--color-border)' : 'none',
      }}
    >
      <div className="px-8 flex items-center justify-between">
        {/* 左侧 - 页面标题 */}
        <div className="flex items-center gap-4">
          <h1 
            className="text-xl font-medium"
            style={{ color: 'var(--color-text)' }}
          >
            {getPageTitle()}
          </h1>
        </div>

        {/* 右侧 - 操作区 */}
        <div className="flex items-center gap-3">
          {/* 搜索按钮 */}
          <button
            className="p-2.5 rounded-full transition-all duration-300"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <Search size={18} />
          </button>

          {/* 新建按钮 */}
          <button
            className="p-2.5 rounded-full transition-all duration-300"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <Plus size={18} />
          </button>

          {/* 通知按钮 */}
          <button
            className="relative p-2.5 rounded-full transition-all duration-300"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)'
            }}
          >
            <Bell size={18} />
            {/* 未读红点 */}
            <span 
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ background: '#ef4444' }}
            />
          </button>

          {/* 分隔线 */}
          <div 
            className="w-px h-8 mx-2"
            style={{ background: 'var(--color-border)' }}
          />

          {/* 用户头像 */}
          <Link
            href="/profile"
            className="flex items-center gap-3 p-1.5 pr-4 rounded-pill transition-all duration-300"
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ 
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--color-text)'
              }}
            >
              {user?.name?.charAt(0) || <User size={16} />}
            </div>
            <span 
              className="text-sm font-medium"
              style={{ color: 'var(--color-text)' }}
            >
              {user?.name || '用户'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  )
}
