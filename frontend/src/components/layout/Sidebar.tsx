'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  Package,
  Calendar,
  Users,
  MessageSquare,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Inbox
} from 'lucide-react'
import { useAuthStore, usePermissions } from '@/store/auth'

// 导航项配置
const navItems = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '项目', href: '/projects', icon: Briefcase },
  { name: '资源', href: '/resources', icon: Package },
  { name: '座谈会', href: '/meetings', icon: Calendar },
  { name: '社群', href: '/community', icon: MessageSquare },
  { name: '合伙人', href: '/partners', icon: Users },
]

const bottomNavItems = [
  { name: '信箱', href: '/inbox', icon: Inbox },
  { name: '个人中心', href: '/profile', icon: User },
  { name: '设置', href: '/settings', icon: Settings, adminOnly: true },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { isAdmin } = usePermissions()
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 h-screen
        transition-all duration-500 ease-smooth
        ${collapsed ? 'w-20' : 'w-64'}
      `}
      style={{
        background: 'var(--color-bg-secondary)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div 
        className="h-16 flex items-center justify-between px-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* Logo 标记 - 与营销首页一致的四点网格 */}
          <div className="grid grid-cols-2 gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-text)' }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-text)' }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-text)' }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-text)' }} />
          </div>
          {!collapsed && (
            <span className="title-serif-cn text-lg" style={{ color: 'var(--color-text)' }}>
              元征
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg transition-colors duration-300"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* 主导航 */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto" style={{ height: 'calc(100% - 64px - 200px)' }}>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-button
                    transition-all duration-300
                    ${active ? 'active-nav-item' : 'inactive-nav-item'}
                  `}
                  style={{
                    background: active ? 'rgba(250, 249, 246, 0.08)' : 'transparent',
                    color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  }}
                >
                  <Icon size={20} />
                  {!collapsed && (
                    <span className="font-medium text-sm">{item.name}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 底部导航 */}
      <div 
        className="absolute bottom-0 left-0 right-0 px-3 py-4"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <ul className="space-y-1">
          {bottomNavItems
            .filter(item => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-button
                      transition-all duration-300
                    `}
                    style={{
                      background: active ? 'rgba(250, 249, 246, 0.08)' : 'transparent',
                      color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
                    }}
                  >
                    <Icon size={20} />
                    {!collapsed && (
                      <span className="font-medium text-sm">{item.name}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          
          {/* 退出登录 */}
          <li>
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-button transition-all duration-300"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <LogOut size={20} />
              {!collapsed && <span className="font-medium text-sm">退出登录</span>}
            </button>
          </li>
        </ul>

        {/* 用户信息 */}
        {!collapsed && user && (
          <div 
            className="mt-4 p-3 rounded-button"
            style={{ 
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--color-border)'
            }}
          >
            <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
              {user.name}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
              {user.organization || '元征合伙人'}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
