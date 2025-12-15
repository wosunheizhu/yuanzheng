'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import FloatingNav from './FloatingNav'

interface ImmersiveLayoutProps {
  children: React.ReactNode
}

export default function ImmersiveLayout({ children }: ImmersiveLayoutProps) {
  const router = useRouter()
  const { isLoading, setLoading } = useAuthStore()

  useEffect(() => {
    // 模拟检查认证状态
    const timer = setTimeout(() => {
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [setLoading])

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        {/* 加载动画 - 与营销首页一致的脉动点 */}
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
      {/* 浮动导航 */}
      <FloatingNav />
      
      {/* 主内容区域 - 全屏沉浸式，带顶部padding避开导航 */}
      <main className="min-h-screen pt-24 pb-12">
        {children}
      </main>
    </div>
  )
}

