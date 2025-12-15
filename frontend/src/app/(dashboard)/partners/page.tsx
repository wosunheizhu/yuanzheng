'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Search, LayoutGrid, AlertCircle, X, Mail, Phone, Building, ArrowLeft } from 'lucide-react'
import { userService, User } from '@/lib/services'
import Link from 'next/link'
import { gsap } from 'gsap'

// 颜色配置
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
  coFounder: '#f59e0b',
  corePartner: '#3b82f6',
  normalPartner: '#22c55e',
}

// 获取完整的头像 URL
const getAvatarUrl = (avatarUrl?: string): string | null => {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http')) return avatarUrl
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  return `${apiBase.replace('/api/v1', '')}${avatarUrl}`
}

// 合伙人数据
interface Partner {
  id: number
  name: string
  role: 'coFounder' | 'corePartner' | 'normalPartner'
  roleName: string
  organization: string
  email?: string
  phone?: string
  avatar?: string
  intro?: string
  roleLevel: number
  // 网格位置
  gridX: number
  gridY: number
}

// 根据用户列表生成蜂窝网格的合伙人数据（最多25个）
const generatePartnersFromUsers = (users: User[]): Partner[] => {
  const roles: Array<{ role: Partner['role'], name: string, minLevel: number }> = [
    { role: 'coFounder', name: '联合创始人', minLevel: 3 },
    { role: 'corePartner', name: '核心合伙人', minLevel: 2 },
    { role: 'normalPartner', name: '普通合伙人', minLevel: 1 },
  ]
  
  // 生成5x5的网格，最多显示25个用户
  const gridSize = 5
  const maxUsers = gridSize * gridSize // 25
  const result: Partner[] = []
  
  // 按角色级别排序，高级别优先，只取前25个
  const sortedUsers = [...users]
    .sort((a, b) => b.highest_role_level - a.highest_role_level)
    .slice(0, maxUsers)
  
  let index = 0
  
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (index >= sortedUsers.length) break
      const user = sortedUsers[index]
      
      // 根据角色级别确定角色类型
      let roleInfo = roles[2] // 默认普通合伙人
      if (user.highest_role_level >= 3) {
        roleInfo = roles[0]
      } else if (user.highest_role_level >= 2) {
        roleInfo = roles[1]
      }
      
      result.push({
        id: user.id,
        name: user.name,
        role: roleInfo.role,
        roleName: roleInfo.name,
        organization: user.organization || '-',
        email: user.email,
        phone: user.phone,
        avatar: user.avatar_url,
        intro: user.intro,
        roleLevel: user.highest_role_level,
        gridX: col - Math.floor(gridSize / 2), // -2 to 2
        gridY: row - Math.floor(gridSize / 2), // -2 to 2
      })
      index++
    }
  }
  
  return result
}

// 根据用户列表生成全部合伙人数据（用于总览，不限制数量）
const generateAllPartnersFromUsers = (users: User[]): Partner[] => {
  const roles: Array<{ role: Partner['role'], name: string, minLevel: number }> = [
    { role: 'coFounder', name: '联合创始人', minLevel: 3 },
    { role: 'corePartner', name: '核心合伙人', minLevel: 2 },
    { role: 'normalPartner', name: '普通合伙人', minLevel: 1 },
  ]
  
  // 按角色级别排序，高级别优先
  const sortedUsers = [...users].sort((a, b) => b.highest_role_level - a.highest_role_level)
  
  return sortedUsers.map((user, index) => {
    // 根据角色级别确定角色类型
    let roleInfo = roles[2] // 默认普通合伙人
    if (user.highest_role_level >= 3) {
      roleInfo = roles[0]
    } else if (user.highest_role_level >= 2) {
      roleInfo = roles[1]
    }
    
    return {
      id: user.id,
      name: user.name,
      role: roleInfo.role,
      roleName: roleInfo.name,
      organization: user.organization || '-',
      email: user.email,
      phone: user.phone,
      avatar: user.avatar_url,
      intro: user.intro,
      roleLevel: user.highest_role_level,
      gridX: 0, // 总览不需要网格位置
      gridY: 0,
    }
  })
}

// 生成模拟数据（当API无法加载时使用）
const generateMockPartners = (): Partner[] => {
  const names = [
    { name: '张伟', org: '元征资本' },
    { name: '李娜', org: '华创投资' },
    { name: '王强', org: '某律所' },
    { name: '刘洋', org: '产业基金' },
    { name: '陈明', org: '战略咨询' },
    { name: '杨芳', org: '并购顾问' },
    { name: '赵磊', org: '资产管理' },
    { name: '黄丽', org: '股权投资' },
    { name: '周杰', org: '法务中心' },
    { name: '吴婷', org: '市场部门' },
    { name: '郑涛', org: '技术研发' },
    { name: '孙燕', org: '人力资源' },
    { name: '马超', org: '财务管理' },
    { name: '朱军', org: '品牌运营' },
    { name: '胡蕾', org: '客户关系' },
    { name: '林峰', org: '投资银行' },
    { name: '徐静', org: '风险管理' },
    { name: '高远', org: '战略投资' },
    { name: '何晨', org: '业务拓展' },
    { name: '罗敏', org: '项目管理' },
    { name: '梁宇', org: '数据分析' },
    { name: '宋雨', org: '合规审计' },
    { name: '唐琳', org: '市场研究' },
    { name: '许凯', org: '产品设计' },
    { name: '韩冰', org: '运营管理' },
  ]
  
  const gridSize = 5
  const result: Partner[] = []
  let index = 0
  
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (index >= names.length) break
      const item = names[index]
      const roleLevel = index < 1 ? 3 : (index < 7 ? 2 : 1)
      const roleInfo = roleLevel >= 3 
        ? { role: 'coFounder' as const, name: '联合创始人' }
        : roleLevel >= 2 
          ? { role: 'corePartner' as const, name: '核心合伙人' }
          : { role: 'normalPartner' as const, name: '普通合伙人' }
      
      result.push({
        id: index + 1,
        name: item.name,
        role: roleInfo.role,
        roleName: roleInfo.name,
        organization: item.org,
        roleLevel,
        gridX: col - Math.floor(gridSize / 2),
        gridY: row - Math.floor(gridSize / 2),
      })
      index++
    }
  }
  
  return result
}

export default function PartnersPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const honeycombRef = useRef<HTMLDivElement>(null)
  const [partners, setPartners] = useState<Partner[]>([]) // 蜂窝网格用（25个）
  const [allPartners, setAllPartners] = useState<Partner[]>([]) // 总览用（全部）
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 800 })
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const velocityRef = useRef({ x: 0, y: 0 })
  const lastMouseRef = useRef({ x: 0, y: 0, time: 0 })
  const animationRef = useRef<number>(0)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [showOverview, setShowOverview] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [animationReady, setAnimationReady] = useState(false)

  // 加载合伙人数据
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true)
        setError(null)
        // 获取全部用户
        const response = await userService.list({ limit: 100 })
        const users = Array.isArray(response) ? response : (response.items || [])
        
        // 蜂窝网格只用前25个
        const partnerData = generatePartnersFromUsers(users)
        setPartners(partnerData.length > 0 ? partnerData : generateMockPartners())
        
        // 总览显示全部用户
        const allPartnerData = generateAllPartnersFromUsers(users)
        setAllPartners(allPartnerData)
      } catch (err) {
        console.error('Failed to fetch partners:', err)
        setError('无法加载合伙人列表')
        setPartners(generateMockPartners())
        setAllPartners(generateMockPartners())
      } finally {
        setLoading(false)
      }
    }
    fetchPartners()
  }, [])

  // 入场动画 - 第一步：设置初始状态
  useEffect(() => {
    if (titleRef.current) {
      gsap.set(titleRef.current.children, { opacity: 0, y: 30 })
    }
    if (honeycombRef.current) {
      gsap.set(honeycombRef.current, { opacity: 0, scale: 0.9 })
    }
  }, [])

  // 入场动画 - 第二步：数据加载后执行动画
  useEffect(() => {
    if (loading) return

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    
    // 标题区域淡入
    if (titleRef.current) {
      tl.to(titleRef.current.children, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
      })
    }

    // 蜂窝网格整体淡入并放大
    if (honeycombRef.current) {
      tl.to(honeycombRef.current, {
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: 'power2.out',
      }, '-=0.5')
    }

    setAnimationReady(true)
  }, [loading])

  // 基础尺寸
  const baseRadius = 38 // 基础圆半径
  const spacing = baseRadius * 3.2 // 圆心间距（略微缩小）
  
  // 网格尺寸（用于循环）
  const gridSize = 5
  const gridWidth = gridSize * spacing
  const gridHeight = gridSize * spacing * 0.866 // 蜂窝网格高度比例
  
  // 可见区域
  const visibleRadius = 320

  // 更新容器尺寸
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // 计算蜂窝位置（带循环）
  const verticalOffset = 80 // 整体向下偏移
  
  const getDisplayPosition = useCallback((gridX: number, gridY: number) => {
    // 基础位置
    let baseX = gridX * spacing + (gridY % 2 !== 0 ? spacing * 0.5 : 0)
    let baseY = gridY * spacing * 0.866
    
    // 应用偏移（包括整体向下偏移）
    let displayX = containerSize.width / 2 + baseX + offset.x
    let displayY = containerSize.height / 2 + baseY + offset.y + verticalOffset
    
    // 循环处理 - 当超出范围时从另一侧出现
    const centerX = containerSize.width / 2
    // 重要：使用视觉中心（包含 verticalOffset）进行循环检查
    // 这样循环边界和衰减计算使用相同的参考点
    const visualCenterY = containerSize.height / 2 + verticalOffset
    
    // 水平循环
    while (displayX - centerX > gridWidth / 2) {
      displayX -= gridWidth
    }
    while (displayX - centerX < -gridWidth / 2) {
      displayX += gridWidth
    }
    
    // 垂直循环 - 相对于视觉中心
    while (displayY - visualCenterY > gridHeight / 2) {
      displayY -= gridHeight
    }
    while (displayY - visualCenterY < -gridHeight / 2) {
      displayY += gridHeight
    }
    
    return { displayX, displayY }
  }, [containerSize, offset, spacing, gridWidth, gridHeight])

  // 计算卡片大小和透明度
  // 可见区域以容器视觉中心（偏移后的位置）为圆心
  const getCardSizeAndOpacity = useCallback((displayX: number, displayY: number) => {
    const centerX = containerSize.width / 2
    // 视觉中心（卡片显示的中心位置）
    const visualCenterY = containerSize.height / 2 + verticalOffset
    
    const dx = displayX - centerX
    const dy = displayY - visualCenterY
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    const minSize = baseRadius * 0.15 // 最小尺寸
    const maxSize = baseRadius * 1.1  // 最大尺寸
    
    // 计算在当前方向上到边界的距离
    // 这确保每个方向的衰减都在到达边界时完成
    let directionRadius = visibleRadius
    
    if (dist > 1) {
      // 计算方向向量
      const dirX = dx / dist
      const dirY = dy / dist
      
      // 计算到各边界的距离（沿当前方向）
      // 添加边距以确保衰减在边界内完成
      const margin = 40
      
      let distToBoundary = visibleRadius
      
      // 右边界
      if (dirX > 0.01) {
        const d = (containerSize.width - margin - centerX) / dirX
        distToBoundary = Math.min(distToBoundary, d)
      }
      // 左边界
      if (dirX < -0.01) {
        const d = (margin - centerX) / dirX
        distToBoundary = Math.min(distToBoundary, d)
      }
      // 下边界
      if (dirY > 0.01) {
        const d = (containerSize.height - margin - visualCenterY) / dirY
        distToBoundary = Math.min(distToBoundary, d)
      }
      // 上边界
      if (dirY < -0.01) {
        const d = (margin - visualCenterY) / dirY
        distToBoundary = Math.min(distToBoundary, d)
      }
      
      directionRadius = Math.max(distToBoundary, visibleRadius * 0.4)
    }
    
    const innerRadius = directionRadius * 0.3 // 内部区域
    
    if (dist <= innerRadius) {
      // 中心区域保持最大
      return { size: maxSize, opacity: 1 }
    } else if (dist >= directionRadius) {
      // 超出范围，消失
      return { size: minSize, opacity: 0 }
    } else {
      // 平滑过渡
      const t = (dist - innerRadius) / (directionRadius - innerRadius)
      const ease = t * t // 二次缓动
      const ratio = 1 - ease
      const size = minSize + (maxSize - minSize) * ratio
      const opacity = ratio
      return { size, opacity }
    }
  }, [containerSize, baseRadius, visibleRadius])

  // 获取角色边框颜色
  const getRoleBorderColor = (role: Partner['role']) => {
    switch (role) {
      case 'coFounder': return colors.coFounder
      case 'corePartner': return colors.corePartner
      case 'normalPartner': return colors.normalPartner
    }
  }

  // 惯性动画
  useEffect(() => {
    const animate = () => {
      if (!isDragging) {
        velocityRef.current.x *= 0.94
        velocityRef.current.y *= 0.94
        
        if (Math.abs(velocityRef.current.x) > 0.3 || Math.abs(velocityRef.current.y) > 0.3) {
          setOffset(prev => ({
            x: prev.x + velocityRef.current.x,
            y: prev.y + velocityRef.current.y,
          }))
        }
      }
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationRef.current)
  }, [isDragging])

  // 鼠标/触摸事件
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleStart = (clientX: number, clientY: number) => {
      setIsDragging(true)
      dragStartRef.current = { x: clientX, y: clientY, offsetX: offset.x, offsetY: offset.y }
      lastMouseRef.current = { x: clientX, y: clientY, time: Date.now() }
      container.style.cursor = 'grabbing'
    }

    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging) return
      
      const dx = clientX - dragStartRef.current.x
      const dy = clientY - dragStartRef.current.y
      
      setOffset({
        x: dragStartRef.current.offsetX + dx,
        y: dragStartRef.current.offsetY + dy,
      })
      
      const now = Date.now()
      const dt = now - lastMouseRef.current.time
      if (dt > 0) {
        velocityRef.current.x = (clientX - lastMouseRef.current.x) / dt * 16
        velocityRef.current.y = (clientY - lastMouseRef.current.y) / dt * 16
      }
      lastMouseRef.current = { x: clientX, y: clientY, time: now }
    }

    const handleEnd = () => {
      setIsDragging(false)
      container.style.cursor = 'grab'
    }

    const handleMouseDown = (e: MouseEvent) => handleStart(e.clientX, e.clientY)
    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY)
    const handleTouchStart = (e: TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY)
    const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY)

    container.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleEnd)
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleEnd)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleEnd)
      container.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, offset.x, offset.y])

  // 点击卡片
  const handleCardClick = (partner: Partner, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDragging) {
      setSelectedPartner(partner)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: colors.bg }}>
      {/* 标题区域 */}
      <div 
        ref={titleRef}
        className="absolute top-24 left-1/2 -translate-x-1/2 z-20 text-center"
      >
        <h1 
          className="text-4xl md:text-5xl mb-4"
          style={{ 
            fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
            fontWeight: 300,
            fontStyle: 'italic',
            letterSpacing: '0.05em',
            color: colors.text,
          }}
        >
          合伙人网络
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
          拖拽探索 · 点击查看详情
        </p>
        
        {/* 操作按钮 */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 hover:bg-white/10"
            style={{ 
              border: `1px solid ${showSearch ? colors.text : colors.border}`,
              color: colors.text,
              fontSize: '14px',
              background: showSearch ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            }}
          >
            <Search size={16} />
            <span>搜索</span>
          </button>
          <button
            onClick={() => setShowOverview(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 hover:bg-white/10"
            style={{ 
              border: `1px solid ${colors.border}`,
              color: colors.text,
              fontSize: '14px',
            }}
          >
            <LayoutGrid size={16} />
            <span>总览</span>
          </button>
        </div>

        {/* 搜索框 */}
        {showSearch && (
          <div className="mt-4 w-full max-w-md mx-auto">
            <div className="relative">
              <Search 
                size={18} 
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: colors.textSecondary }}
              />
              <input
                type="text"
                placeholder="搜索合伙人..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-12 pr-4 py-3 rounded-full"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: colors.textSecondary }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 蜂窝网格画布 */}
      <div 
        ref={containerRef}
        className="absolute inset-0 z-10"
        style={{ cursor: 'grab' }}
      >
        <div ref={honeycombRef} className="absolute inset-0">
          {partners.map((partner) => {
            // 计算显示位置（带循环）
            const { displayX, displayY } = getDisplayPosition(partner.gridX, partner.gridY)
            
            // 计算大小和透明度
            const { size, opacity } = getCardSizeAndOpacity(displayX, displayY)
            
            // 透明度太低时不渲染
            if (opacity < 0.03) {
              return null
            }

            const borderColor = getRoleBorderColor(partner.role)
            const diameter = size * 2
            const fontSize = Math.max(9, diameter * 0.14)
            const showRole = diameter > 60

            return (
              <div
                key={partner.id}
                className="absolute rounded-full flex flex-col items-center justify-center select-none"
                style={{
                  left: displayX,
                  top: displayY,
                  width: diameter,
                  height: diameter,
                  transform: 'translate(-50%, -50%)',
                  background: `radial-gradient(circle at 35% 35%, rgba(55, 55, 60, 0.92), rgba(22, 22, 26, 0.96))`,
                  border: `1.5px solid ${borderColor}`,
                  boxShadow: `0 2px 12px rgba(0, 0, 0, 0.3)`,
                  opacity,
                  cursor: 'pointer',
                  pointerEvents: opacity > 0.2 ? 'auto' : 'none',
                }}
                onClick={(e) => handleCardClick(partner, e)}
              >
                <span 
                  style={{ 
                    color: colors.text, 
                    fontSize: fontSize,
                    fontWeight: 500,
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {partner.name}
                </span>
                {showRole && (
                  <span 
                    style={{ 
                      color: borderColor, 
                      fontSize: fontSize * 0.7,
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                      marginTop: 2,
                      opacity: 0.85,
                    }}
                  >
                    {partner.roleName.slice(0, 2)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 详情弹窗 - 高端简约现代艺术画廊风格 */}
      {selectedPartner && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ 
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(20px) brightness(0.8)',
          }}
          onClick={() => setSelectedPartner(null)}
        >
          <div 
            className="relative max-w-sm w-full"
            style={{ 
              background: 'rgba(12, 12, 12, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部装饰线 */}
            <div 
              className="h-[1px] w-full"
              style={{ background: `linear-gradient(90deg, transparent, ${getRoleBorderColor(selectedPartner.role)}60, transparent)` }}
            />
            
            <div className="p-10">
              {/* 头像 */}
              <div 
                className="w-28 h-28 mx-auto mb-8 flex items-center justify-center"
                style={{ 
                  background: getAvatarUrl(selectedPartner.avatar) 
                    ? `url(${getAvatarUrl(selectedPartner.avatar)})` 
                    : 'rgba(255, 255, 255, 0.03)',
                  backgroundSize: 'cover',
                  border: `1px solid ${getRoleBorderColor(selectedPartner.role)}`,
                  borderRadius: '50%',
                }}
              >
                {!getAvatarUrl(selectedPartner.avatar) && (
                  <span style={{ 
                    fontSize: '42px', 
                    fontWeight: 300, 
                    color: colors.text,
                    fontFamily: "'Cormorant Garamond', serif",
                  }}>
                    {selectedPartner.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* 信息区 */}
              <div className="text-center mb-8">
                <h2 style={{ 
                  color: colors.text, 
                  fontSize: '26px', 
                  fontWeight: 300, 
                  marginBottom: '12px',
                  fontFamily: "'Cormorant Garamond', serif",
                  letterSpacing: '0.05em',
                }}>
                  {selectedPartner.name}
                </h2>
                <p style={{ 
                  color: getRoleBorderColor(selectedPartner.role), 
                  fontSize: '12px', 
                  fontWeight: 400, 
                  marginBottom: '8px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}>
                  {selectedPartner.roleName}
                </p>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.4)', 
                  fontSize: '13px',
                  fontWeight: 300,
                }}>
                  {selectedPartner.organization}
                </p>
              </div>

              {/* 简介 */}
              {selectedPartner.intro && (
                <div className="mb-8 py-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <p style={{ 
                    color: 'rgba(255, 255, 255, 0.5)', 
                    fontSize: '13px', 
                    lineHeight: 1.8,
                    fontWeight: 300,
                    textAlign: 'center',
                  }}>
                    {selectedPartner.intro}
                  </p>
                </div>
              )}

              {/* 联系方式 */}
              {(selectedPartner.email || selectedPartner.phone) && (
                <div className="space-y-3 mb-8">
                  {selectedPartner.email && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px', letterSpacing: '0.1em' }}>EMAIL</span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: 300 }}>{selectedPartner.email}</span>
                    </div>
                  )}
                  {selectedPartner.phone && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '12px', letterSpacing: '0.1em' }}>TEL</span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px', fontWeight: 300 }}>{selectedPartner.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 查看详情按钮 */}
              <a
                href={`/partners/${selectedPartner.id}`}
                className="block w-full py-4 text-center transition-all duration-300"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: colors.text,
                  fontSize: '12px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontWeight: 400,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                }}
              >
                查看详细资料
              </a>
            </div>

            {/* 关闭按钮 */}
            <button
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center transition-all duration-300"
              style={{ color: 'rgba(255, 255, 255, 0.3)' }}
              onClick={() => setSelectedPartner(null)}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)'}
            >
              <X size={18} strokeWidth={1} />
            </button>
          </div>
        </div>
      )}

      {/* 总览界面 - 高端简约现代艺术画廊风格 */}
      {showOverview && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: '#0a0a0a' }}
        >
          {/* 顶部导航 */}
          <div 
            className="sticky top-0 z-10"
            style={{ 
              background: 'rgba(10, 10, 10, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
              <button
                onClick={() => setShowOverview(false)}
                className="flex items-center gap-3 transition-all duration-300 group"
                style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
              >
                <ArrowLeft size={16} strokeWidth={1.5} />
                <span style={{ fontSize: '13px', letterSpacing: '0.1em' }}>返回网络视图</span>
              </button>
              
              <h2 
                style={{ 
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 300,
                  fontSize: '20px',
                  color: colors.text,
                  letterSpacing: '0.15em',
                }}
              >
                合伙人总览
              </h2>
              
              <div className="relative w-56">
                <Search 
                  size={14} 
                  strokeWidth={1.5}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                />
                <input
                  type="text"
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 text-sm transition-all duration-300"
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: colors.text,
                    outline: 'none',
                    fontSize: '13px',
                    letterSpacing: '0.05em',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
              </div>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="max-w-6xl mx-auto px-8 py-12">
            <div className="grid grid-cols-3 gap-6 mb-16">
              {[
                { 
                  color: colors.coFounder, 
                  label: '联合创始人',
                  count: allPartners.filter(p => p.role === 'coFounder').length
                },
                { 
                  color: colors.corePartner, 
                  label: '核心合伙人',
                  count: allPartners.filter(p => p.role === 'corePartner').length
                },
                { 
                  color: colors.normalPartner, 
                  label: '普通合伙人',
                  count: allPartners.filter(p => p.role === 'normalPartner').length
                },
              ].map(item => (
                <div 
                  key={item.label}
                  className="py-10 text-center transition-all duration-300"
                  style={{ 
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    position: 'relative',
                  }}
                >
                  {/* 顶部装饰线 */}
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-16"
                    style={{ background: `linear-gradient(90deg, transparent, ${item.color}80, transparent)` }}
                  />
                  <div 
                    className="text-5xl mb-4"
                    style={{ 
                      color: item.color,
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 300,
                    }}
                  >
                    {item.count}
                  </div>
                  <div style={{ 
                    color: 'rgba(255, 255, 255, 0.4)', 
                    fontSize: '12px',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                  }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* 合伙人列表 */}
            <div className="space-y-12">
              {/* 联合创始人 */}
              {allPartners.filter(p => p.role === 'coFounder' && (
                !searchQuery || 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.organization.toLowerCase().includes(searchQuery.toLowerCase())
              )).length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ background: colors.coFounder }}
                    />
                    <h3 
                      style={{ 
                        color: colors.coFounder,
                        fontSize: '13px',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        fontWeight: 400,
                      }}
                    >
                      联合创始人
                    </h3>
                    <div className="flex-1 h-[1px]" style={{ background: `linear-gradient(90deg, ${colors.coFounder}30, transparent)` }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allPartners.filter(p => p.role === 'coFounder' && (
                      !searchQuery || 
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.organization.toLowerCase().includes(searchQuery.toLowerCase())
                    )).map(partner => (
                      <Link
                        key={partner.id}
                        href={`/partners/${partner.id}`}
                        className="p-5 transition-all duration-300 group"
                        style={{ 
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = `${colors.coFounder}50`
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <div className="flex items-center gap-5">
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                            style={{ 
                              background: getAvatarUrl(partner.avatar) 
                                ? `url(${getAvatarUrl(partner.avatar)})` 
                                : 'rgba(255, 255, 255, 0.03)',
                              backgroundSize: 'cover',
                              border: `1px solid ${colors.coFounder}60`,
                            }}
                          >
                            {!getAvatarUrl(partner.avatar) && (
                              <span style={{ 
                                color: colors.text, 
                                fontSize: '20px', 
                                fontWeight: 300,
                                fontFamily: "'Cormorant Garamond', serif",
                              }}>
                                {partner.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div style={{ 
                              color: colors.text, 
                              fontWeight: 400, 
                              marginBottom: '6px',
                              fontSize: '15px',
                              letterSpacing: '0.02em',
                            }}>
                              {partner.name}
                            </div>
                            <div className="flex items-center gap-2" style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                              <Building size={11} strokeWidth={1.5} />
                              <span className="truncate">{partner.organization}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 核心合伙人 */}
              {allPartners.filter(p => p.role === 'corePartner' && (
                !searchQuery || 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.organization.toLowerCase().includes(searchQuery.toLowerCase())
              )).length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ background: colors.corePartner }}
                    />
                    <h3 
                      style={{ 
                        color: colors.corePartner,
                        fontSize: '13px',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        fontWeight: 400,
                      }}
                    >
                      核心合伙人
                    </h3>
                    <div className="flex-1 h-[1px]" style={{ background: `linear-gradient(90deg, ${colors.corePartner}30, transparent)` }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allPartners.filter(p => p.role === 'corePartner' && (
                      !searchQuery || 
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.organization.toLowerCase().includes(searchQuery.toLowerCase())
                    )).map(partner => (
                      <Link
                        key={partner.id}
                        href={`/partners/${partner.id}`}
                        className="p-5 transition-all duration-300 group"
                        style={{ 
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = `${colors.corePartner}50`
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <div className="flex items-center gap-5">
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                            style={{ 
                              background: getAvatarUrl(partner.avatar) 
                                ? `url(${getAvatarUrl(partner.avatar)})` 
                                : 'rgba(255, 255, 255, 0.03)',
                              backgroundSize: 'cover',
                              border: `1px solid ${colors.corePartner}60`,
                            }}
                          >
                            {!getAvatarUrl(partner.avatar) && (
                              <span style={{ 
                                color: colors.text, 
                                fontSize: '20px', 
                                fontWeight: 300,
                                fontFamily: "'Cormorant Garamond', serif",
                              }}>
                                {partner.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div style={{ 
                              color: colors.text, 
                              fontWeight: 400, 
                              marginBottom: '6px',
                              fontSize: '15px',
                              letterSpacing: '0.02em',
                            }}>
                              {partner.name}
                            </div>
                            <div className="flex items-center gap-2" style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                              <Building size={11} strokeWidth={1.5} />
                              <span className="truncate">{partner.organization}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 普通合伙人 */}
              {allPartners.filter(p => p.role === 'normalPartner' && (
                !searchQuery || 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.organization.toLowerCase().includes(searchQuery.toLowerCase())
              )).length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ background: colors.normalPartner }}
                    />
                    <h3 
                      style={{ 
                        color: colors.normalPartner,
                        fontSize: '13px',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        fontWeight: 400,
                      }}
                    >
                      普通合伙人
                    </h3>
                    <div className="flex-1 h-[1px]" style={{ background: `linear-gradient(90deg, ${colors.normalPartner}30, transparent)` }} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allPartners.filter(p => p.role === 'normalPartner' && (
                      !searchQuery || 
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      p.organization.toLowerCase().includes(searchQuery.toLowerCase())
                    )).map(partner => (
                      <Link
                        key={partner.id}
                        href={`/partners/${partner.id}`}
                        className="p-5 transition-all duration-300 group"
                        style={{ 
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = `${colors.normalPartner}50`
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <div className="flex items-center gap-5">
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                            style={{ 
                              background: getAvatarUrl(partner.avatar) 
                                ? `url(${getAvatarUrl(partner.avatar)})` 
                                : 'rgba(255, 255, 255, 0.03)',
                              backgroundSize: 'cover',
                              border: `1px solid ${colors.normalPartner}60`,
                            }}
                          >
                            {!getAvatarUrl(partner.avatar) && (
                              <span style={{ 
                                color: colors.text, 
                                fontSize: '20px', 
                                fontWeight: 300,
                                fontFamily: "'Cormorant Garamond', serif",
                              }}>
                                {partner.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div style={{ 
                              color: colors.text, 
                              fontWeight: 400, 
                              marginBottom: '6px',
                              fontSize: '15px',
                              letterSpacing: '0.02em',
                            }}>
                              {partner.name}
                            </div>
                            <div className="flex items-center gap-2" style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '12px' }}>
                              <Building size={11} strokeWidth={1.5} />
                              <span className="truncate">{partner.organization}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 无搜索结果 */}
              {searchQuery && allPartners.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.organization.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && (
                <div className="text-center py-24">
                  <div 
                    className="w-16 h-16 mx-auto mb-6 flex items-center justify-center"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <AlertCircle size={24} strokeWidth={1} style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
                  </div>
                  <p style={{ 
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '13px',
                    letterSpacing: '0.1em',
                  }}>未找到匹配的合伙人</p>
                </div>
              )}
            </div>
          </div>

          {/* 底部版权 */}
          <footer 
            className="text-center py-12 mt-12"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.25)',
              fontSize: '11px',
              letterSpacing: '0.2em',
            }}>© 2024 元征 · 合伙人赋能平台</p>
          </footer>
        </div>
      )}

      <footer 
        className="absolute bottom-0 left-0 right-0 text-center py-4 z-10"
        style={{ color: colors.textSecondary, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
      >
        <p className="text-xs">© 2024 元征 · 合伙人赋能平台</p>
      </footer>
    </div>
  )
}


