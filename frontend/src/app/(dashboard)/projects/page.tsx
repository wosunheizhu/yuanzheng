'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { gsap } from 'gsap'
import { 
  Plus, 
  Search, 
  Filter,
  Briefcase,
  Clock,
  Users,
  ChevronRight,
  MoreHorizontal,
  AlertCircle,
  X
} from 'lucide-react'
import { projectService, Project } from '@/lib/services'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
}

// 占位卡片数据（当没有项目时使用）
const placeholderCards = [
  { name: '创建您的第一个项目', business_type: '点击新建按钮开始', business_status: 'ONGOING' },
  { name: '项目协作', business_type: '管理团队与资源', business_status: 'ONGOING' },
  { name: '追踪进度', business_type: '可视化时间线', business_status: 'COMPLETED' },
]

// 业务状态颜色映射
const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  'ONGOING': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '进行中' },
  'PAUSED': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '已暂停' },
  'COMPLETED': { bg: 'rgba(136, 136, 136, 0.1)', text: '#888888', label: '已完成' },
  'ABANDONED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '已废弃' },
}

// 审核状态颜色映射
const reviewStatusColors: Record<string, { bg: string; text: string; label: string }> = {
  'PENDING_REVIEW': { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', label: '待审核' },
  'APPROVED': { bg: 'rgba(74, 222, 128, 0.1)', text: '#4ade80', label: '已通过' },
  'REJECTED': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: '已拒绝' },
}

// 星空粒子接口
interface Star {
  x: number
  y: number
  z: number
  theta: number
  phi: number
  size: number
  brightness: number
  twinkleOffset: number
}

// 卡片位置配置 - 水平弧形分布（仿照Cosmos原版，整体下移80px）
const cardPositions = [
  { x: -550, y: 740, scale: 0.35, opacity: 0 },    // 左侧隐藏
  { x: -420, y: 720, scale: 0.5, opacity: 0.35 },  // 左侧远处
  { x: -260, y: 680, scale: 0.7, opacity: 0.6 },   // 左侧中间
  { x: -80, y: 640, scale: 0.9, opacity: 0.85 },   // 左侧近处
  { x: 100, y: 620, scale: 1.0, opacity: 1 },      // 中心（最大）
  { x: 280, y: 640, scale: 0.9, opacity: 0.85 },   // 右侧近处
  { x: 460, y: 680, scale: 0.7, opacity: 0.6 },    // 右侧中间
  { x: 620, y: 720, scale: 0.5, opacity: 0.35 },   // 右侧远处
  { x: 750, y: 740, scale: 0.35, opacity: 0 },     // 右侧隐藏
]

export default function ProjectsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showIntroSearch, setShowIntroSearch] = useState(false)
  const [introSearchQuery, setIntroSearchQuery] = useState('')
  const introSearchRef = useRef<HTMLInputElement>(null)
  const listSearchRef = useRef<HTMLInputElement>(null) // 列表视图搜索框 ref
  
  // Refs
  const galaxyRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardsContainerRef = useRef<HTMLDivElement>(null)
  const expressionRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  
  // Animation state refs
  const starsRef = useRef<Star[]>([])
  const animationRef = useRef<number>(0)
  const rotationXRef = useRef(0)
  const rotationYRef = useRef(0)
  const targetRotationXRef = useRef(0)
  const targetRotationYRef = useRef(0)
  const cardOffsetRef = useRef(0)
  const cardTargetOffsetRef = useRef(0)
  const isDraggingRef = useRef(false)
  const expandProgressRef = useRef(1) // 从1开始（粒子扩散状态），动画到0（聚拢状态）
  const hasEnteredRef = useRef(false) // 是否已完成进场动画
  const isExitingRef = useRef(false) // 是否正在播放离场动画
  const pendingNavigationRef = useRef<string | null>(null) // 待跳转的URL

  // 3D rotation function
  const rotatePoint = (x: number, y: number, z: number, rotX: number, rotY: number) => {
    // Rotate around Y axis (horizontal drag)
    const x1 = x * Math.cos(rotY) - z * Math.sin(rotY)
    const z1 = x * Math.sin(rotY) + z * Math.cos(rotY)
    
    // Rotate around X axis (vertical drag)
    const y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX)
    const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX)
    
    return { x: x1, y: y1, z: z2 }
  }

  // Project 3D to 2D with perspective
  const project = (x: number, y: number, z: number, centerX: number, centerY: number, domeRadius: number) => {
    const fov = 600
    const scale = fov / (fov + z + domeRadius)
    return {
      x: centerX + x * scale,
      y: centerY + y * scale,
      scale: scale
    }
  }

  // 初始化星空
  const initStarfield = useCallback(() => {
    const canvas = canvasRef.current
    const galaxyContainer = galaxyRef.current
    const cardsContainer = cardsContainerRef.current
    
    if (!canvas || !galaxyContainer) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Hemisphere dome parameters
    const domeRadius = 900
    const numStars = 600
    const autoRotateSpeed = 0.0003

    // Set canvas size
    const resize = () => {
      canvas.width = galaxyContainer.offsetWidth
      canvas.height = galaxyContainer.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Create stars on hemisphere surface
    starsRef.current = []
    for (let i = 0; i < numStars; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.55
      
      const x = domeRadius * Math.sin(phi) * Math.cos(theta)
      const y = -domeRadius * Math.cos(phi)
      const z = domeRadius * Math.sin(phi) * Math.sin(theta)

      starsRef.current.push({
        x, y, z, theta, phi,
        size: Math.random() * 2.0 + 1.0,
        brightness: 1.0,
        twinkleOffset: Math.random() * 5,
      })
    }

    // Mouse/Touch handlers
    let dragStartX = 0
    let dragStartY = 0
    let dragRotationX = 0
    let dragRotationY = 0
    let cardDragStartX = 0
    let cardDragStartOffset = 0

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      dragStartX = e.clientX
      dragStartY = e.clientY
      dragRotationX = targetRotationXRef.current
      dragRotationY = targetRotationYRef.current
      cardDragStartX = e.clientX
      cardDragStartOffset = cardTargetOffsetRef.current
      galaxyContainer.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dx = (e.clientX - dragStartX) * 0.003
      const dy = (e.clientY - dragStartY) * 0.002
      targetRotationYRef.current = dragRotationY + dx
      targetRotationXRef.current = Math.max(-0.3, Math.min(0.3, dragRotationX - dy))
      
      const cardDx = (e.clientX - cardDragStartX) * 0.015
      cardTargetOffsetRef.current = cardDragStartOffset + cardDx
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      galaxyContainer.style.cursor = 'grab'
    }

    const handleTouchStart = (e: TouchEvent) => {
      isDraggingRef.current = true
      dragStartX = e.touches[0].clientX
      dragStartY = e.touches[0].clientY
      dragRotationX = targetRotationXRef.current
      dragRotationY = targetRotationYRef.current
      cardDragStartX = e.touches[0].clientX
      cardDragStartOffset = cardTargetOffsetRef.current
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return
      const dx = (e.touches[0].clientX - dragStartX) * 0.003
      const dy = (e.touches[0].clientY - dragStartY) * 0.002
      targetRotationYRef.current = dragRotationY + dx
      targetRotationXRef.current = Math.max(-0.3, Math.min(0.3, dragRotationX - dy))
      
      const cardDx = (e.touches[0].clientX - cardDragStartX) * 0.015
      cardTargetOffsetRef.current = cardDragStartOffset + cardDx
    }

    const handleTouchEnd = () => {
      isDraggingRef.current = false
    }

    galaxyContainer.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    galaxyContainer.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)

    // Animation loop
    const animate = () => {
      // Get card elements dynamically (to handle React state updates)
      const cards = cardsContainer ? cardsContainer.querySelectorAll('.cluster-card') : []
      // Auto rotate when not dragging
      if (!isDraggingRef.current && expandProgressRef.current < 0.5) {
        targetRotationYRef.current += autoRotateSpeed
      }

      // Smooth interpolation
      rotationXRef.current += (targetRotationXRef.current - rotationXRef.current) * 0.06
      rotationYRef.current += (targetRotationYRef.current - rotationYRef.current) * 0.06
      cardOffsetRef.current += (cardTargetOffsetRef.current - cardOffsetRef.current) * 0.08

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const centerX = canvas.width / 2
      const centerY = canvas.height * 0.6
      const time = Date.now() * 0.001
      const expandProgress = expandProgressRef.current

      // Sort and draw stars
      const sortedStars = starsRef.current.map((star) => {
        const rotated = rotatePoint(star.x, star.y, star.z, rotationXRef.current, rotationYRef.current)
        return { ...star, rotated }
      }).sort((a, b) => b.rotated.z - a.rotated.z)

      sortedStars.forEach(star => {
        const { x, y, z } = star.rotated

        // Expand effect - particles move outward
        const expandedX = x * (1 + expandProgress * 3)
        const expandedY = y * (1 + expandProgress * 3)
        const expandedZ = z * (1 + expandProgress * 3)

        if (expandedZ < domeRadius * 0.8) {
          const projected = project(expandedX, expandedY, expandedZ, centerX, centerY, domeRadius)
          
          // Twinkle effect
          const cycle = 5
          const blinkDuration = 2
          const t = (time + star.twinkleOffset) % cycle
          const twinkle = t < blinkDuration ? Math.sin((t / blinkDuration) * Math.PI) : 0
          
          const depthFade = Math.max(0.5, 1 - (z + domeRadius) / (domeRadius * 3))
          const opacity = Math.min(1, star.brightness * twinkle * depthFade * 2.0 * (1 - expandProgress))

          if (opacity > 0.02 && projected.x > -10 && projected.x < canvas.width + 10 && 
              projected.y > -10 && projected.y < canvas.height + 10) {
            const size = star.size * projected.scale
            
            ctx.beginPath()
            ctx.arc(projected.x, projected.y, Math.max(0.5, size), 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
            ctx.fill()
          }
        }
      })

      // Update card positions - 支持少量卡片和无限循环
      if (cards.length > 0) {
        const numPositions = cardPositions.length
        const numCards = cards.length
        const centerIndex = (numPositions - 1) / 2
        const visibleRange = numPositions - 1
        
        // 根据卡片数量决定布局模式
        const minCardsForLoop = 5
        const useLoopMode = numCards >= minCardsForLoop
        
        // 每张卡片之间的固定间距
        const cardSpacing = useLoopMode ? 1.4 : visibleRange / (numCards + 1)
        // 循环周期（仅在循环模式下使用）
        const loopPeriod = numCards * cardSpacing

        cards.forEach((card, i) => {
          const cardEl = card as HTMLElement
          
          let t: number
          
          if (useLoopMode) {
            // 无限循环模式：适用于5个以上卡片
            const rawPos = i * cardSpacing + cardOffsetRef.current
            let loopedPos = ((rawPos % loopPeriod) + loopPeriod) % loopPeriod
            
            if (loopedPos > loopPeriod / 2) {
              loopedPos = loopedPos - loopPeriod
            }
            
            t = loopedPos + centerIndex
          } else {
            // 固定分布模式：少量卡片居中均匀分布在轨道上
            // 计算起始位置，使卡片组整体居中
            const totalSpan = (numCards - 1) * 1.5 // 总跨度
            const startPos = centerIndex - totalSpan / 2 // 起始位置
            
            // 基础位置 + 拖拽偏移（拖拽效果减弱）
            t = startPos + i * 1.5 + cardOffsetRef.current * 0.3
            
            // 限制在可见范围内（带一点外延）
            if (t < -2) t = -2
            if (t > visibleRange + 2) t = visibleRange + 2
          }
          
          // 插值计算位置
          let x, y, scale, opacity
          
          if (t >= 0 && t <= visibleRange) {
            // 在可见范围内，使用预定义的位置进行插值
            const lowIndex = Math.floor(t)
            const highIndex = Math.min(numPositions - 1, lowIndex + 1)
            const fraction = t - lowIndex

            const pos1 = cardPositions[lowIndex]
            const pos2 = cardPositions[highIndex]

            x = pos1.x + (pos2.x - pos1.x) * fraction
            y = pos1.y + (pos2.y - pos1.y) * fraction
            scale = pos1.scale + (pos2.scale - pos1.scale) * fraction
            opacity = pos1.opacity + (pos2.opacity - pos1.opacity) * fraction
          } else if (t < 0) {
            // 左侧外，平滑延伸
            const pos0 = cardPositions[0]
            x = pos0.x + t * 150
            y = pos0.y + t * 8
            scale = Math.max(0.2, pos0.scale + t * 0.08)
            opacity = Math.max(0, pos0.opacity + t * 0.15)
          } else {
            // 右侧外，平滑延伸
            const posLast = cardPositions[numPositions - 1]
            const excess = t - visibleRange
            x = posLast.x + excess * 150
            y = posLast.y + excess * 8
            scale = Math.max(0.2, posLast.scale - excess * 0.08)
            opacity = Math.max(0, posLast.opacity - excess * 0.15)
          }
          
          // 扩散时卡片整体缩小并淡出
          if (expandProgress > 0) {
            scale *= (1 - expandProgress * 0.5)
            opacity *= (1 - expandProgress)
          }

          const distFromCenter = Math.abs(t - centerIndex)
          const zIndex = Math.floor(100 - distFromCenter * 15)

          cardEl.style.position = 'absolute'
          cardEl.style.left = `${canvas.width / 2 + x}px`
          cardEl.style.top = `${y}px`
          cardEl.style.transform = `translate(-50%, -50%) scale(${scale})`
          cardEl.style.opacity = String(Math.max(0, opacity))
          cardEl.style.zIndex = String(Math.max(1, zIndex))
          cardEl.style.transition = 'none' // 禁用CSS过渡，避免闪烁
        })
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      galaxyContainer.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      galaxyContainer.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  // 初始化星空
  useEffect(() => {
    const cleanup = initStarfield()
    return cleanup
  }, [initStarfield])

  // 进场动画 - 粒子聚拢，文字打字机，卡片从左滚入
  useEffect(() => {
    if (hasEnteredRef.current) return
    hasEnteredRef.current = true
    
    // 初始状态：按钮隐藏，卡片队列在左侧外
    if (expressionRef.current) {
      const buttons = expressionRef.current.querySelector('.expression-buttons')
      if (buttons) {
        gsap.set(buttons, { opacity: 0, y: 20 })
      }
    }
    
    // 卡片初始偏移量（从左侧外进场）
    cardTargetOffsetRef.current = -10 // 初始在左侧外
    cardOffsetRef.current = -10
    
    // 延迟一帧后开始进场动画
    requestAnimationFrame(() => {
      // 粒子从周围向穹顶聚拢
      const progressObj = { value: 1 }
      gsap.to(progressObj, {
        value: 0,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: () => {
          expandProgressRef.current = progressObj.value
        }
      })
      
      // 打字机效果 - 文字逐字出现
      if (expressionRef.current) {
        const chars = expressionRef.current.querySelectorAll('.typewriter-char')
        gsap.to(chars, {
          opacity: 1,
          duration: 0.15,
          stagger: 0.12, // 每个字间隔
          delay: 0.5,
          ease: 'power1.out',
        })
        
        // 按钮淡入
        const buttons = expressionRef.current.querySelector('.expression-buttons')
        if (buttons) {
          gsap.to(buttons, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 1.2,
            ease: 'power3.out',
          })
        }
      }
      
      // 卡片从左侧滚入
      gsap.to(cardTargetOffsetRef, {
        current: 0,
        duration: 2,
        delay: 0.8,
        ease: 'power2.out',
      })
    })
  }, [])

  // 离场动画 - 粒子扩散，文字消失，卡片淡出
  const triggerExitAnimation = useCallback((targetUrl: string) => {
    if (isExitingRef.current) return
    isExitingRef.current = true
    pendingNavigationRef.current = targetUrl
    
    // 锁定滚动
    document.body.style.overflow = 'hidden'
    
    const timeline = gsap.timeline({
      onComplete: () => {
        // 动画完成后导航
        if (pendingNavigationRef.current) {
          router.push(pendingNavigationRef.current)
        }
      }
    })
    
    // 1. 文字逆向消失（从后向前）
    if (expressionRef.current) {
      const chars = expressionRef.current.querySelectorAll('.typewriter-char')
      const charArray = Array.from(chars).reverse() // 反转顺序
      
      timeline.to(charArray, {
        opacity: 0,
        y: -20,
        duration: 0.1,
        stagger: 0.05,
        ease: 'power2.in',
      }, 0)
      
      // 按钮淡出
      const buttons = expressionRef.current.querySelector('.expression-buttons')
      if (buttons) {
        timeline.to(buttons, {
          opacity: 0,
          y: -20,
          duration: 0.4,
          ease: 'power2.in',
        }, 0)
      }
      
      // 搜索框淡出（如果打开的话）
      if (showIntroSearch) {
        setShowIntroSearch(false)
      }
    }
    
    // 2. 卡片淡出并向右移动
    timeline.to(cardTargetOffsetRef, {
      current: cardTargetOffsetRef.current + 15, // 向右飘出
      duration: 1.2,
      ease: 'power2.in',
    }, 0.2)
    
    // 3. 粒子从穹顶向四周扩散
    const progressObj = { value: expandProgressRef.current }
    timeline.to(progressObj, {
      value: 2, // 扩散到更远的距离
      duration: 1.5,
      ease: 'power2.in',
      onUpdate: () => {
        expandProgressRef.current = progressObj.value
      }
    }, 0.3)
    
    // 4. 整体淡出
    if (galaxyRef.current) {
      timeline.to(galaxyRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
      }, 1.2)
    }
    
  }, [router, showIntroSearch])

  // 拦截页面内的导航链接
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (link && !isExitingRef.current && !isExpanded) {
        const href = link.getAttribute('href')
        // 排除外部链接和锚点链接
        if (href && !href.startsWith('http') && !href.startsWith('#') && href !== '/projects') {
          e.preventDefault()
          e.stopPropagation()
          triggerExitAnimation(href)
        }
      }
    }
    
    // 监听整个文档的点击事件
    document.addEventListener('click', handleLinkClick, true)
    
    return () => {
      document.removeEventListener('click', handleLinkClick, true)
    }
  }, [triggerExitAnimation, isExpanded])

  // 转场到列表并聚焦搜索框
  const triggerExpandToListWithSearch = useCallback(() => {
    if (isTransitioningRef.current || isExpanded) return
    isTransitioningRef.current = true
    
    // 锁定滚动
    document.body.style.overflow = 'hidden'
    
    // 重置滚动位置到顶部
    window.scrollTo(0, 0)
    
    // 粒子向外扩散动画
    const progressObj = { value: 0 }
    gsap.to(progressObj, {
      value: 1,
      duration: 1.2,
      ease: 'power3.in',
      onUpdate: () => {
        expandProgressRef.current = progressObj.value
      },
      onComplete: () => {
        // 粒子扩散完成后，隐藏 Galaxy 区域
        if (galaxyRef.current) {
          galaxyRef.current.style.display = 'none'
        }
        // 恢复滚动
        document.body.style.overflow = ''
        // 标记转场完成
        isTransitioningRef.current = false
        setIsExpanded(true)
        // 确保滚动位置在顶部
        window.scrollTo(0, 0)
        
        // 聚焦到搜索框
        setTimeout(() => {
          listSearchRef.current?.focus()
        }, 100)
      }
    })

    // 文字淡出
    if (expressionRef.current) {
      const chars = expressionRef.current.querySelectorAll('.typewriter-char')
      const buttons = expressionRef.current.querySelector('.expression-buttons')
      
      // 文字逐字淡出（从后往前）
      gsap.to(Array.from(chars).reverse(), {
        opacity: 0,
        duration: 0.1,
        stagger: 0.05,
        ease: 'power2.in',
      })
      
      // 按钮淡出
      if (buttons) {
        gsap.to(buttons, {
          opacity: 0,
          y: -20,
          duration: 0.4,
          ease: 'power2.in',
        })
      }
    }

    // 卡片向右侧滚出
    gsap.to(cardTargetOffsetRef, {
      current: 15,
      duration: 1,
      ease: 'power2.in',
    })

    // 项目列表入场
    if (listRef.current) {
      gsap.set(listRef.current, { display: 'block', opacity: 0, y: 80 })
      gsap.to(listRef.current, {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.6,
        ease: 'power3.out',
      })
    }
  }, [isExpanded])

  // 返回银河动画（从项目列表返回）
  const triggerCollapseToGalaxy = useCallback(() => {
    isTransitioningRef.current = true
    
    // 锁定滚动
    document.body.style.overflow = 'hidden'
    
    // 显示银河区域
    if (galaxyRef.current) {
      galaxyRef.current.style.display = 'flex'
      gsap.set(galaxyRef.current, { opacity: 1 })
    }
    
    // 重置文字和按钮状态
    if (expressionRef.current) {
      const chars = expressionRef.current.querySelectorAll('.typewriter-char')
      const buttons = expressionRef.current.querySelector('.expression-buttons')
      gsap.set(chars, { opacity: 0 })
      if (buttons) {
        gsap.set(buttons, { opacity: 0, y: 20 })
      }
    }
    
    // 卡片队列重置到左侧外
    cardTargetOffsetRef.current = -10
    cardOffsetRef.current = -10
    
    // 项目列表淡出
    if (listRef.current) {
      gsap.to(listRef.current, {
        opacity: 0,
        y: 80,
        duration: 0.6,
        ease: 'power2.in',
        onComplete: () => {
          if (listRef.current) {
            listRef.current.style.display = 'none'
          }
        }
      })
    }
    
    // 粒子从周围向穹顶聚拢
    const progressObj = { value: 1 }
    expandProgressRef.current = 1
    gsap.to(progressObj, {
      value: 0,
      duration: 1.5,
      delay: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        expandProgressRef.current = progressObj.value
      },
      onComplete: () => {
        document.body.style.overflow = ''
        isTransitioningRef.current = false
        setIsExpanded(false)
        scrollAccumulatorRef.current = 0
      }
    })
    
    // 打字机效果 - 文字逐字出现
    if (expressionRef.current) {
      const chars = expressionRef.current.querySelectorAll('.typewriter-char')
      gsap.to(chars, {
        opacity: 1,
        duration: 0.15,
        stagger: 0.12,
        delay: 0.6,
        ease: 'power1.out',
      })
      
      // 按钮淡入
      const buttons = expressionRef.current.querySelector('.expression-buttons')
      if (buttons) {
        gsap.to(buttons, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 1.3,
          ease: 'power3.out',
        })
      }
    }
    
    // 卡片从左侧滚入
    gsap.to(cardTargetOffsetRef, {
      current: 0,
      duration: 2,
      delay: 0.8,
      ease: 'power2.out',
    })
  }, [])

  // 监听滚动
  const scrollAccumulatorRef = useRef(0)
  const scrollUpAccumulatorRef = useRef(0)
  const scrollThreshold = 150 // 需要累积滚动150px才触发
  const isTransitioningRef = useRef(false) // 转场中标记
  
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 转场中，阻止滚动
      if (isTransitioningRef.current) {
        e.preventDefault()
        return
      }
      
      // 如果已展开（在项目列表），检测向上滚动返回银河
      if (isExpanded) {
        // 只在页面顶部才允许返回银河
        if (window.scrollY <= 0 && e.deltaY < 0) {
          scrollUpAccumulatorRef.current += Math.abs(e.deltaY)
          e.preventDefault()
          
          // 累积足够的向上滚动
          if (scrollUpAccumulatorRef.current >= scrollThreshold) {
            // 触发返回银河动画
            triggerCollapseToGalaxy()
            scrollUpAccumulatorRef.current = 0
          }
        } else {
          scrollUpAccumulatorRef.current = 0
        }
        return
      }
      
      // 未展开状态，累积向下滚动距离
      if (e.deltaY > 0) {
        scrollAccumulatorRef.current += e.deltaY
      } else {
        scrollAccumulatorRef.current = Math.max(0, scrollAccumulatorRef.current + e.deltaY)
      }
      
      // 达到阈值后触发转场
      if (scrollAccumulatorRef.current >= scrollThreshold) {
        // 标记为转场中（防止重复触发）
        isTransitioningRef.current = true
        
        // 阻止滚动
        e.preventDefault()
        
        // 重置滚动位置到顶部
        window.scrollTo(0, 0)
        
        // 锁定body滚动
        document.body.style.overflow = 'hidden'
        
        // 粒子向外扩散动画 - 1.2秒完成
        const progressObj = { value: 0 }
        gsap.to(progressObj, {
          value: 1,
          duration: 1.2,
          ease: 'power3.in', // 先慢后快
          onUpdate: () => {
            expandProgressRef.current = progressObj.value
          },
          onComplete: () => {
            // 粒子扩散完成后，隐藏 Galaxy 区域
            if (galaxyRef.current) {
              galaxyRef.current.style.display = 'none'
            }
            // 恢复滚动
            document.body.style.overflow = ''
            // 标记转场完成
            isTransitioningRef.current = false
            setIsExpanded(true)
            // 确保滚动位置在顶部
            window.scrollTo(0, 0)
          }
        })

        // 文字淡出
        if (expressionRef.current) {
          const chars = expressionRef.current.querySelectorAll('.typewriter-char')
          const buttons = expressionRef.current.querySelector('.expression-buttons')
          
          // 文字逐字淡出（从后往前）
          gsap.to(Array.from(chars).reverse(), {
            opacity: 0,
            duration: 0.1,
            stagger: 0.05,
            ease: 'power2.in',
          })
          
          // 按钮淡出
          if (buttons) {
            gsap.to(buttons, {
              opacity: 0,
              y: -20,
              duration: 0.4,
              ease: 'power2.in',
            })
          }
        }

        // 卡片向右侧滚出
        gsap.to(cardTargetOffsetRef, {
          current: 15, // 向右滚动到屏幕外
          duration: 1,
          ease: 'power2.in',
        })

        // 项目列表入场 - 等粒子扩散到一半时开始
        if (listRef.current) {
          gsap.set(listRef.current, { display: 'block', opacity: 0, y: 80 })
          gsap.to(listRef.current, {
            opacity: 1,
            y: 0,
            duration: 1,
            delay: 0.6, // 等粒子扩散一半后开始
            ease: 'power3.out',
          })
        }
      }
    }

    // 使用 passive: false 以便能够阻止滚动
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [isExpanded])

  // 加载项目数据
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await projectService.list({ page: 1, page_size: 50 })
        setProjects(response.items || [])
      } catch (err) {
        console.error('Failed to fetch projects:', err)
        setError('无法加载项目列表，请稍后重试')
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  // 过滤项目
  const filteredProjects = projects.filter(p => {
    // 搜索过滤
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.business_type.toLowerCase().includes(searchQuery.toLowerCase())
    
    // 状态过滤
    const matchesStatus = statusFilter === 'all' || p.business_status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* 星空穹顶区域 - 复刻首页 section--expression */}
      <section
        ref={galaxyRef}
        className="fixed inset-0 z-10 flex"
        style={{ 
          background: colors.bg 
        }}
      >
        {/* 中央文字区域 */}
        <div 
          ref={expressionRef}
          className="absolute z-20"
          style={{
            left: '50%',
            top: '38%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="text-center">
            <h2 
              className="mb-6 typewriter-title"
              style={{ 
                fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
                fontSize: 'clamp(32px, 5vw, 56px)',
                fontWeight: 300,
                fontStyle: 'italic',
                letterSpacing: '0.05em',
                color: colors.text,
              }}
            >
              {'项目管理'.split('').map((char, i) => (
                <span 
                  key={i} 
                  className="typewriter-char"
                  style={{ 
                    opacity: 0,
                    display: 'inline-block',
                  }}
                >
                  {char}
                </span>
              ))}
            </h2>
            
            {/* 操作按钮 */}
            <div className="expression-buttons flex items-center justify-center gap-4">
              <button
                onClick={() => router.push('/projects/new')}
                className="flex items-center justify-center rounded-full transition-all duration-300 hover:bg-white/10"
                style={{ 
                  width: '48px', 
                  height: '48px',
                  border: `1px solid ${colors.border}`
                }}
                title="新建项目"
              >
                <Plus size={22} style={{ color: colors.text }} />
              </button>
              <button
                onClick={() => triggerExpandToListWithSearch()}
                className="flex items-center justify-center rounded-full transition-all duration-300 hover:bg-white/10"
                style={{ 
                  width: '48px', 
                  height: '48px',
                  border: `1px solid ${colors.border}`
                }}
                title="搜索项目"
              >
                <Search size={22} style={{ color: colors.text }} />
              </button>
            </div>

            {/* 介绍区搜索框 */}
            {showIntroSearch && (
              <div 
                className="mt-6 w-full max-w-md mx-auto"
                style={{ 
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                <div className="relative">
                  <Search 
                    size={18} 
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: colors.textSecondary }}
                  />
                  <input
                    ref={introSearchRef}
                    type="text"
                    placeholder="搜索项目..."
                    value={introSearchQuery}
                    onChange={(e) => {
                      setIntroSearchQuery(e.target.value)
                      setSearchQuery(e.target.value)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && introSearchQuery.trim()) {
                        // 触发滚动到列表并搜索
                        setIsExpanded(true)
                        setShowIntroSearch(false)
                      }
                      if (e.key === 'Escape') {
                        setShowIntroSearch(false)
                        setIntroSearchQuery('')
                      }
                    }}
                    className="w-full pl-12 pr-12 py-3 rounded-full"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => {
                      setShowIntroSearch(false)
                      setIntroSearchQuery('')
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
                  >
                    <X size={16} style={{ color: colors.textSecondary }} />
                  </button>
                </div>
                <p 
                  className="text-center text-xs mt-2"
                  style={{ color: colors.textSecondary }}
                >
                  按 Enter 搜索 · ESC 关闭
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 3D银河半球穹顶容器 */}
        <div 
          className="absolute inset-0"
          style={{ cursor: 'grab' }}
        >
          {/* 星空Canvas */}
          <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
          
          {/* 卡片层 - 使用真实项目数据 */}
          <div ref={cardsContainerRef} className="absolute inset-0">
            {(projects.length > 0 ? projects : placeholderCards).map((project, index) => {
              const isRealProject = projects.length > 0 && 'id' in project
              const statusInfo = statusColors[project.business_status as string] || statusColors['ONGOING']
              const projectId = isRealProject ? (project as typeof projects[0]).id : null
              
              return (
                <div
                  key={projectId ?? `placeholder-${index}`}
                  className="cluster-card"
                  onClick={() => {
                    if (isRealProject && projectId) {
                      window.location.href = `/projects/${projectId}`
                    }
                  }}
                  style={{
                    position: 'absolute',
                    width: '160px',
                    background: 'rgba(30, 30, 35, 0.9)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
                    cursor: isRealProject ? 'pointer' : 'default',
                    pointerEvents: 'auto',
                  }}
                >
                  {/* 卡片顶部 - 状态指示 */}
                  <div 
                    style={{ 
                      width: '100%',
                      aspectRatio: '4 / 5',
                      background: `linear-gradient(135deg, ${statusInfo.text}15 0%, #1a1a20 100%)`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px',
                    }}
                  >
                    {/* 状态徽章 */}
                    <div 
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        background: statusInfo.bg,
                        color: statusInfo.text,
                        fontSize: '11px',
                        fontWeight: 500,
                        marginBottom: '12px',
                      }}
                    >
                      {statusInfo.label}
                    </div>
                    {/* 业务类型图标 */}
                    <Briefcase 
                      size={32} 
                      style={{ 
                        color: statusInfo.text, 
                        opacity: 0.6,
                        marginBottom: '8px'
                      }} 
                    />
                    {/* 业务类型 */}
                    <p style={{ 
                      fontSize: '11px', 
                      color: colors.textSecondary,
                      textAlign: 'center',
                    }}>
                      {project.business_type || '项目'}
                    </p>
                  </div>
                  {/* 卡片信息 */}
                  <div style={{ padding: '14px' }}>
                    <p 
                      style={{ 
                        fontSize: '14px',
                        fontWeight: 600,
                        color: colors.text,
                        marginBottom: '6px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {project.name}
                    </p>
                    <p style={{ 
                      fontSize: '12px', 
                      color: colors.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {isRealProject && 'industry' in project && project.industry ? (project as typeof projects[0]).industry : '元征项目'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 滚动提示 */}
        <div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30"
          style={{ color: colors.textSecondary }}
        >
          <span className="text-xs animate-pulse">向下滚动探索</span>
          <svg 
            className="animate-bounce" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </section>

      {/* 项目列表区域（初始隐藏） */}
      <div 
        ref={listRef}
        className="pt-24"
        style={{ display: 'none', opacity: 0 }}
      >
        {/* Hero 区域 */}
        <section className="min-h-[30vh] flex flex-col items-center justify-center text-center px-8 relative">
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, rgba(60, 60, 60, 0.15) 0%, transparent 60%)',
            }}
          />

          <h1 
            className="title-serif-cn text-4xl md:text-5xl mb-6"
            style={{ color: 'var(--color-text)' }}
          >
            项目管理
          </h1>

          <p 
            className="text-lg max-w-xl mb-8"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            管理您参与的所有项目，追踪进度与贡献
          </p>

          {/* 搜索和操作栏 */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-2xl">
            <div className="relative flex-1 w-full">
              <Search 
                size={18} 
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-secondary)' }}
              />
              <input
                ref={listSearchRef}
                type="text"
                placeholder="搜索项目..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-12 w-full"
              />
            </div>

            <div className="relative">
              <button 
                className="btn-outline py-3 px-5 flex items-center gap-2"
                onClick={() => setShowFilter(!showFilter)}
              >
                <Filter size={18} />
                <span>筛选</span>
                {statusFilter !== 'all' && (
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                )}
              </button>
              
              {showFilter && (
                <div 
                  className="absolute top-full right-0 mt-2 w-48 py-2 rounded-xl z-50"
                  style={{ 
                    background: 'rgba(30, 30, 30, 0.98)',
                    border: '1px solid var(--color-border)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <p className="px-4 py-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    项目状态
                  </p>
                  {[
                    { value: 'all', label: '全部' },
                    { value: 'ONGOING', label: '进行中' },
                    { value: 'PAUSED', label: '已暂停' },
                    { value: 'COMPLETED', label: '已完成' },
                    { value: 'ABANDONED', label: '已废弃' },
                  ].map(option => (
                    <button
                      key={option.value}
                      className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-white/5"
                      style={{ 
                        color: statusFilter === option.value ? 'var(--color-text)' : 'var(--color-text-secondary)'
                      }}
                      onClick={() => {
                        setStatusFilter(option.value)
                        setShowFilter(false)
                      }}
                    >
                      {statusFilter === option.value && '✓ '}{option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/projects/new" className="btn-primary py-3 px-5 flex items-center gap-2">
              <Plus size={18} />
              <span>新建</span>
            </Link>
          </div>
        </section>

        {/* 项目列表 */}
        <section className="px-8 pb-24 max-w-5xl mx-auto">
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="project-card block glass-card p-6 transition-all duration-300 group"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <Briefcase size={20} style={{ color: 'var(--color-text-secondary)' }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 
                          className="text-lg font-medium group-hover:underline truncate"
                          style={{ color: 'var(--color-text)' }}
                        >
                          {project.name}
                        </h3>
                        <span 
                          className="text-xs px-3 py-1 rounded-full shrink-0"
                          style={{
                            background: statusColors[project.business_status]?.bg || 'rgba(136, 136, 136, 0.1)',
                            color: statusColors[project.business_status]?.text || '#888',
                          }}
                        >
                          {statusColors[project.business_status]?.label || project.business_status}
                        </span>
                        {project.review_status === 'PENDING_REVIEW' && (
                          <span 
                            className="text-xs px-3 py-1 rounded-full shrink-0"
                            style={{
                              background: reviewStatusColors['PENDING_REVIEW'].bg,
                              color: reviewStatusColors['PENDING_REVIEW'].text,
                            }}
                          >
                            待审核
                          </span>
                        )}
                      </div>

                      <p 
                        className="text-sm mb-3 line-clamp-1"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {project.description || '暂无描述'}
                      </p>

                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {project.members?.length || 0} 人
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(project.updated_at).toLocaleDateString('zh-CN')}
                        </span>
                        <span className="tag py-1 px-2">{project.business_type}</span>
                        {project.industry && (
                          <span className="tag py-1 px-2">{project.industry}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                        创建者
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                        {project.creator_name}
                      </p>
                    </div>

                    <button 
                      className="p-2 rounded-full transition-colors duration-300"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    <ChevronRight 
                      size={20} 
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ color: 'var(--color-text-secondary)' }}
                    />
                  </div>
                </div>
              </Link>
            ))}

            {/* 加载状态 */}
            {loading && (
              <div 
                className="text-center py-20"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p>加载项目中...</p>
              </div>
            )}

            {/* 错误状态 */}
            {error && !loading && (
              <div 
                className="text-center py-20"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <AlertCircle size={48} className="mx-auto mb-4 opacity-50" style={{ color: '#ef4444' }} />
                <p className="mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="btn-outline py-2 px-4 text-sm"
                >
                  重试
                </button>
              </div>
            )}

            {/* 空状态 */}
            {!loading && !error && filteredProjects.length === 0 && (
              <div 
                className="text-center py-20"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
                <p>{searchQuery ? '没有找到匹配的项目' : '暂无项目'}</p>
                <Link 
                  href="/projects/new"
                  className="btn-primary py-2 px-4 mt-4 inline-flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  创建第一个项目
                </Link>
              </div>
            )}
          </div>
        </section>

        <footer 
          className="text-center py-8"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <p className="text-xs">
            © 2024 元征 · 合伙人赋能平台
          </p>
        </footer>
      </div>
    </div>
  )
}
