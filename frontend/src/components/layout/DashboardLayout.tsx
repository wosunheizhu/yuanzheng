'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import Sidebar from './Sidebar'
import Header from './Header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, setLoading } = useAuthStore()

  useEffect(() => {
    // 模拟检查认证状态
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [setLoading])

  // 暂时禁用认证检查，方便开发调试
  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     router.push('/login')
  //   }
  // }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        {/* 加载动画 - 三点脉动 */}
        <div className="flex items-center gap-2">
          <div className="loader-dot" />
          <div className="loader-dot" />
          <div className="loader-dot" />
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* 侧边导航 */}
      <Sidebar />
      
      {/* 顶部导航 */}
      <Header />
      
      {/* 主内容区域 */}
      <main 
        className="ml-64 pt-20 min-h-screen"
        style={{ 
          background: 'var(--color-bg)',
        }}
      >
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
