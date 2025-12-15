'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ArrowRight } from 'lucide-react'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
}

export default function WelcomePage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 确保内容立即可见，然后执行动画
    if (containerRef.current) {
      const children = containerRef.current.children
      
      // 先设置初始状态为不可见
      gsap.set(children, { opacity: 0, y: 30 })
      
      // 然后动画到可见状态
      gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.2
      })
    }
  }, [])

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: colors.bg }}
    >
      {/* 背景效果 */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(80, 80, 80, 0.3) 0%, transparent 60%)',
        }}
      />

      {/* 顶部导航 */}
      <nav 
        className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-6 py-3 flex items-center gap-8"
        style={{ 
          background: 'rgba(30, 30, 30, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '50px',
          border: `1px solid ${colors.border}`
        }}
      >
        <div className="grid grid-cols-2 gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.text }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.text }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.text }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors.text }} />
        </div>
        <div className="flex items-center gap-6">
          <a 
            href="http://localhost:3847" 
            className="text-sm transition-colors duration-300 hover:opacity-80"
            style={{ color: colors.textSecondary }}
          >
            官网首页
          </a>
        </div>
        <Link 
          href="/login" 
          className="text-sm py-2 px-4 transition-all duration-300 hover:border-white"
          style={{ 
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '50px'
          }}
        >
          登录
        </Link>
      </nav>

      {/* 主内容 */}
      <div ref={containerRef} className="relative z-10 text-center px-8">
        {/* 标题 */}
        <h1 
          className="text-6xl mb-4"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 500,
            letterSpacing: '0.1em'
          }}
        >
          元征<sup className="text-2xl opacity-50">©</sup>
        </h1>
        
        {/* 副标题 */}
        <p 
          className="text-lg mb-12"
          style={{ color: colors.textSecondary }}
        >
          合伙人赋能平台 · 记录协作 · 量化贡献 · 可视化价值
        </p>

        {/* 按钮组 */}
        <div className="flex items-center justify-center gap-4">
          <Link 
            href="/login" 
            className="flex items-center gap-2 py-4 px-8 font-medium text-sm transition-all duration-300 hover:opacity-90 hover:scale-105"
            style={{ 
              background: colors.text,
              color: colors.bg,
              borderRadius: '50px'
            }}
          >
            <span>登录平台</span>
            <ArrowRight size={18} />
          </Link>
          <Link 
            href="/dashboard" 
            className="py-4 px-8 font-medium text-sm transition-all duration-300 hover:border-white hover:bg-white/5"
            style={{ 
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '50px'
            }}
          >
            进入仪表盘
          </Link>
        </div>
      </div>

      {/* 底部版本号 */}
      <div 
        className="absolute bottom-8 text-xs"
        style={{ color: colors.textSecondary }}
      >
        元征 · 合伙人赋能平台 v1.0.0
      </div>
    </div>
  )
}
