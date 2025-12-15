'use client'

/**
 * 元征 · 合伙人赋能平台 - 时间表页面
 * 用户可用时间管理 & 座谈会时间查看
 */
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { 
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Check,
  Users
} from 'lucide-react'
import { useAuthStore, usePermissions } from '@/store/auth'
import { toast } from 'sonner'

// 可用时间
interface Availability {
  id: number
  user_id: number
  user_name?: string
  start_time: string
  end_time: string
  note?: string
  visibility_scope_type?: string
  visibility_min_role_level?: number
}

// 会议
interface Meeting {
  id: number
  title: string
  start_time: string
  end_time: string
  location?: string
}

// 时间槽
const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8
  const minute = i % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minute}`
})

export default function SchedulePage() {
  const { user } = useAuthStore()
  const { isAdmin } = usePermissions()
  
  // 当前周的起始日期
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.setDate(diff))
  })
  
  const [myAvailabilities, setMyAvailabilities] = useState<Availability[]>([])
  const [allAvailabilities, setAllAvailabilities] = useState<Availability[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  
  // 添加可用时间
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    note: '',
    visibility: 'ALL' as 'ADMIN_ONLY' | 'FOUNDING' | 'CORE' | 'ALL',
  })
  const [submitting, setSubmitting] = useState(false)
  
  // 可见权限配置
  const visibilityOptions = [
    { value: 'ADMIN_ONLY', label: '仅管理员', level: null },
    { value: 'FOUNDING', label: '联创及以上', level: 3 },
    { value: 'CORE', label: '核心及以上', level: 2 },
    { value: 'ALL', label: '普通及以上', level: 1 },
  ]
  
  // 选择模式
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ day: number; slot: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ day: number; slot: number } | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)

  // 获取一周的日期
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        const startDate = weekStart.toISOString().split('T')[0]
        const endDate = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
        
        // 获取我的可用时间
        const myResponse = await fetch(
          `${API_URL}/meetings/availability/me?start_date=${startDate}&end_date=${endDate}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          }
        )
        if (myResponse.ok) {
          setMyAvailabilities(await myResponse.json())
        }
        
        // 获取对我可见的其他用户可用时间
        const visibleResponse = await fetch(
          `${API_URL}/meetings/availability/visible?start_date=${startDate}&end_date=${endDate}`,
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
              }
            }
          )
        if (visibleResponse.ok) {
          setAllAvailabilities(await visibleResponse.json())
        }
        
        // 获取会议
        const meetingsResponse = await fetch(
          `${API_URL}/meetings?start_date=${startDate}&end_date=${endDate}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
          }
        )
        if (meetingsResponse.ok) {
          const data = await meetingsResponse.json()
          setMeetings(data.items || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [weekStart])

  // 入场动画
  useEffect(() => {
    if (!containerRef.current || loading) return
    
    gsap.fromTo(
      containerRef.current.querySelectorAll('.animate-in'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power2.out' }
    )
  }, [loading])

  // 上一周/下一周
  function changeWeek(delta: number) {
    const newStart = new Date(weekStart)
    newStart.setDate(newStart.getDate() + delta * 7)
    setWeekStart(newStart)
  }

  // 格式化日期
  function formatDateShort(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 格式化星期
  function formatWeekday(date: Date): string {
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  }

  // 检查时间槽是否有可用时间
  function isSlotAvailable(date: Date, slotIndex: number): boolean {
    const slot = TIME_SLOTS[slotIndex]
    const [hour, minute] = slot.split(':').map(Number)
    
    const slotStart = new Date(date)
    slotStart.setHours(hour, minute, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
    
    return myAvailabilities.some(a => {
      const aStart = new Date(a.start_time)
      const aEnd = new Date(a.end_time)
      return aStart <= slotStart && aEnd >= slotEnd
    })
  }

  // 检查时间槽是否有会议
  function getSlotMeeting(date: Date, slotIndex: number): Meeting | undefined {
    const slot = TIME_SLOTS[slotIndex]
    const [hour, minute] = slot.split(':').map(Number)
    
    const slotStart = new Date(date)
    slotStart.setHours(hour, minute, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
    
    return meetings.find(m => {
      const mStart = new Date(m.start_time)
      const mEnd = new Date(m.end_time)
      return mStart <= slotStart && mEnd > slotStart
    })
  }

  // 获取时间槽的热力度（他人可用时间数量）
  function getSlotHeatLevel(date: Date, slotIndex: number): number {
    const slot = TIME_SLOTS[slotIndex]
    const [hour, minute] = slot.split(':').map(Number)
    
    const slotStart = new Date(date)
    slotStart.setHours(hour, minute, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
    
    const count = allAvailabilities.filter(a => {
      const aStart = new Date(a.start_time)
      const aEnd = new Date(a.end_time)
      return aStart <= slotStart && aEnd >= slotEnd
    }).length
    
    return count
  }

  // 获取时间槽可用的用户列表（对我可见的，去重）
  function getSlotAvailableUsers(date: Date, slotIndex: number): Availability[] {
    const slot = TIME_SLOTS[slotIndex]
    const [hour, minute] = slot.split(':').map(Number)
    
    const slotStart = new Date(date)
    slotStart.setHours(hour, minute, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
    
    const availabilities = allAvailabilities.filter(a => {
      const aStart = new Date(a.start_time)
      const aEnd = new Date(a.end_time)
      return aStart <= slotStart && aEnd >= slotEnd
    })
    
    // 按用户去重，只保留每个用户的第一个记录
    const uniqueUsers = new Map<number, Availability>()
    availabilities.forEach(a => {
      if (!uniqueUsers.has(a.user_id)) {
        uniqueUsers.set(a.user_id, a)
      }
    })
    
    return Array.from(uniqueUsers.values())
  }

  // Hover tooltip 状态
  const [hoveredSlot, setHoveredSlot] = useState<{
    date: Date
    slotIndex: number
    x: number
    y: number
    isMySlot: boolean  // 是否是自己的时间
  } | null>(null)

  // 获取我在某个时间槽的可用时间（含备注）
  function getMySlotAvailability(date: Date, slotIndex: number): Availability | null {
    const slot = TIME_SLOTS[slotIndex]
    const [hour, minute] = slot.split(':').map(Number)
    
    const slotStart = new Date(date)
    slotStart.setHours(hour, minute, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
    
    return myAvailabilities.find(a => {
      const aStart = new Date(a.start_time)
      const aEnd = new Date(a.end_time)
      return aStart <= slotStart && aEnd >= slotEnd
    }) || null
  }

  // 处理鼠标进入时间槽
  function handleSlotMouseEnter(
    e: React.MouseEvent,
    date: Date,
    slotIndex: number,
    heatLevel: number,
    isMySlot: boolean
  ) {
    // 自己的时间槽或者有其他人可用时间时显示tooltip
    if (!isMySlot && heatLevel === 0) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredSlot({
      date,
      slotIndex,
      x: rect.left + rect.width / 2,
      y: rect.top,
      isMySlot
    })
  }

  function handleSlotMouseLeave() {
    setHoveredSlot(null)
  }

  // 添加可用时间
  async function handleAddAvailability(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    
    try {
      setSubmitting(true)
      
      const startTime = new Date(`${addForm.date}T${addForm.startTime}:00`)
      const endTime = new Date(`${addForm.date}T${addForm.endTime}:00`)
      
      if (endTime <= startTime) {
        toast.error('结束时间必须晚于开始时间')
        return
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      
      // 根据可见权限设置对应的参数
      const visibilityConfig = visibilityOptions.find(v => v.value === addForm.visibility)
      const visibilityParams: any = {}
      
      if (addForm.visibility === 'ADMIN_ONLY') {
        // 仅管理员可见 - 使用自定义可见范围，设置空的user_ids（实际管理员会通过其他方式查看）
        visibilityParams.visibility_scope_type = 'ROLE_MIN_LEVEL'
        visibilityParams.visibility_min_role_level = 999 // 超高级别，只有管理员能查看所有
      } else {
        visibilityParams.visibility_scope_type = 'ROLE_MIN_LEVEL'
        visibilityParams.visibility_min_role_level = visibilityConfig?.level || 1
      }
      
      const response = await fetch(`${API_URL}/meetings/availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          note: addForm.note || null,
          ...visibilityParams,
        })
      })
      
      if (response.ok) {
        const newAvail = await response.json()
        // 同时更新我的可用时间和所有人可用时间（管理员视角）
        setMyAvailabilities([...myAvailabilities, newAvail])
        if (isAdmin) {
          setAllAvailabilities([...allAvailabilities, newAvail])
        }
        setShowAddForm(false)
        setAddForm({ date: '', startTime: '09:00', endTime: '17:00', note: '', visibility: 'ALL' })
        toast.success('已添加可用时间')
      } else {
        toast.error('添加失败')
      }
    } catch (error) {
      console.error('Error adding availability:', error)
      toast.error('添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 删除可用时间
  async function handleDeleteAvailability(id: number) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      await fetch(`${API_URL}/meetings/availability/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      // 同时从我的可用时间和所有人可用时间中移除
      setMyAvailabilities(myAvailabilities.filter(a => a.id !== id))
      setAllAvailabilities(allAvailabilities.filter(a => a.id !== id))
      toast.success('已删除')
    } catch (error) {
      console.error('Error deleting availability:', error)
      toast.error('删除失败')
    }
  }

  return (
    <div ref={containerRef} className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 标题 */}
        <div className="animate-in mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/5">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">时间表</h1>
              <p className="text-white/60 text-sm">
                管理你的可参加座谈会时间
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90
                     flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加可用时间
          </button>
        </div>

        {/* 周导航 */}
        <div className="animate-in mb-6 flex items-center justify-between">
          <button
            onClick={() => changeWeek(-1)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <p className="font-medium">
              {weekDates[0].toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
            </p>
            <p className="text-sm text-white/60">
              {formatDateShort(weekDates[0])} - {formatDateShort(weekDates[6])}
            </p>
          </div>
          
          <button
            onClick={() => changeWeek(1)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 时间表网格 */}
        <div className="animate-in glass-card p-4 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-white/40" />
            </div>
          ) : (
            <div className="min-w-[800px]">
              {/* 日期头部 */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="p-2 text-center text-sm text-white/40">时间</div>
                {weekDates.map((date, i) => {
                  const isToday = date.toDateString() === new Date().toDateString()
                  return (
                    <div
                      key={i}
                      className={`p-2 text-center rounded-lg ${isToday ? 'bg-white/10' : ''}`}
                    >
                      <p className="text-sm font-medium">{formatWeekday(date)}</p>
                      <p className={`text-xs ${isToday ? 'text-blue-400' : 'text-white/40'}`}>
                        {formatDateShort(date)}
                      </p>
                    </div>
                  )
                })}
              </div>
              
              {/* 时间槽 */}
              <div className="space-y-1">
                {TIME_SLOTS.map((slot, slotIndex) => (
                  <div key={slot} className="grid grid-cols-8 gap-1">
                    <div className="p-2 text-xs text-white/40 text-right">
                      {slot}
                    </div>
                    {weekDates.map((date, dayIndex) => {
                      const available = isSlotAvailable(date, slotIndex)
                      const meeting = getSlotMeeting(date, slotIndex)
                      const heatLevel = getSlotHeatLevel(date, slotIndex)
                      
                      return (
                        <div
                          key={dayIndex}
                          className={`p-1 rounded cursor-pointer transition-colors relative ${
                            meeting
                              ? 'bg-purple-500/30 border border-purple-500/50'
                              : available
                              ? 'bg-green-500/30 border border-green-500/50'
                              : heatLevel > 0
                              ? `bg-blue-500/${Math.min(heatLevel * 10, 50)}`
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                          title={
                            meeting
                              ? `会议: ${meeting.title}`
                              : available
                              ? '已标记可用'
                              : ''
                          }
                          onMouseEnter={(e) => handleSlotMouseEnter(e, date, slotIndex, heatLevel, available)}
                          onMouseLeave={handleSlotMouseLeave}
                        >
                          {meeting && slotIndex === TIME_SLOTS.findIndex(s => {
                            const [h] = s.split(':').map(Number)
                            const mh = new Date(meeting.start_time).getHours()
                            return h === mh
                          }) && (
                            <p className="text-xs truncate">{meeting.title}</p>
                          )}
                          {heatLevel > 0 && !meeting && !available && (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-xs text-white/60">{heatLevel}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 我的可用时间列表 */}
        <div className="animate-in mt-8">
          <h2 className="text-lg font-medium mb-4">我的可用时间</h2>
          {myAvailabilities.length === 0 ? (
            <p className="text-white/40">暂无设置的可用时间</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {myAvailabilities.map(a => {
                // 解析可见权限显示
                const getVisibilityLabel = () => {
                  if (a.visibility_min_role_level === 999) return { label: '仅管理员', color: 'text-red-400 bg-red-500/10' }
                  if (a.visibility_min_role_level === 3) return { label: '联创及以上', color: 'text-amber-400 bg-amber-500/10' }
                  if (a.visibility_min_role_level === 2) return { label: '核心及以上', color: 'text-blue-400 bg-blue-500/10' }
                  return { label: '所有人可见', color: 'text-green-400 bg-green-500/10' }
                }
                const visibility = getVisibilityLabel()
                
                return (
                <div key={a.id} className="glass-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">
                        {new Date(a.start_time).toLocaleDateString('zh-CN', {
                          month: 'short', day: 'numeric', weekday: 'short'
                        })}
                      </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${visibility.color}`}>
                            {visibility.label}
                          </span>
                        </div>
                      <p className="text-sm text-white/60">
                        {new Date(a.start_time).toLocaleTimeString('zh-CN', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                        {' - '}
                        {new Date(a.end_time).toLocaleTimeString('zh-CN', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      {a.note && (
                        <p className="text-xs text-white/40 mt-1">{a.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteAvailability(a.id)}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 图例 */}
        <div className="animate-in mt-8 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/30 border border-green-500/50" />
            <span className="text-white/60">我的可用时间</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500/30 border border-purple-500/50" />
            <span className="text-white/60">已安排会议</span>
          </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500/30" />
              <span className="text-white/60">他人可用（热力图）</span>
            </div>
        </div>

        {/* 可用时间 Tooltip */}
        {hoveredSlot && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: hoveredSlot.x,
              top: hoveredSlot.y - 10,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div 
              className="rounded-xl shadow-2xl px-5 py-4 min-w-[200px] max-w-[280px]"
              style={{ 
                background: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
              }}
            >
              {/* 自己的时间备注 */}
              {hoveredSlot.isMySlot && (
                <>
                  {(() => {
                    const myAvail = getMySlotAvailability(hoveredSlot.date, hoveredSlot.slotIndex)
                    const visibilityLabel = (() => {
                      if (myAvail?.visibility_min_role_level === 999) return '仅管理员'
                      if (myAvail?.visibility_min_role_level === 3) return '联创及以上'
                      if (myAvail?.visibility_min_role_level === 2) return '核心及以上'
                      return '所有人'
                    })()
                    return (
                      <div className="mb-3 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-5 h-5 rounded-md flex items-center justify-center"
                            style={{ background: 'rgba(74, 222, 128, 0.15)' }}
                          >
                            <Check className="w-3 h-3 text-green-400" />
                          </div>
                          <span className="text-xs font-medium text-white/90">我的空闲时间</span>
                        </div>
                        {myAvail?.note ? (
                          <p className="text-sm text-white/70 leading-relaxed pl-7">{myAvail.note}</p>
                        ) : (
                          <p className="text-sm text-white/40 italic pl-7">无备注</p>
                        )}
                        <p className="text-xs text-white/40 mt-1.5 pl-7">可见: {visibilityLabel}</p>
              </div>
                    )
                  })()}
                </>
              )}
              
              {/* 查看他人可用时间 */}
              {getSlotAvailableUsers(hoveredSlot.date, hoveredSlot.slotIndex).length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ background: 'rgba(96, 165, 250, 0.15)' }}
                    >
                      <Users className="w-3 h-3 text-blue-400" />
                    </div>
                    <span className="text-xs font-medium text-white/90">
                      可用成员 ({getSlotAvailableUsers(hoveredSlot.date, hoveredSlot.slotIndex).length})
                    </span>
                  </div>
                  <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                    {getSlotAvailableUsers(hoveredSlot.date, hoveredSlot.slotIndex).map((avail, idx) => (
                      <div key={idx} className="group">
                        <div className="flex items-center gap-2.5">
                          {/* 高端简约头像 - 细线描边风格 */}
                          <div 
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-light tracking-wider"
                            style={{ 
                              background: 'transparent',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: 'rgba(255,255,255,0.8)'
                            }}
                          >
                            {(avail.user_name || '用户').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 truncate">
                              {avail.user_name || `用户 ${avail.user_id}`}
                            </p>
                            {avail.note && (
                              <p className="text-xs text-white/40 truncate mt-0.5">
                                {avail.note}
                              </p>
                            )}
                          </div>
                        </div>
                  </div>
                ))}
              </div>
                </>
              )}
              
              {/* 小箭头 */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-2.5 h-2.5 rotate-45"
                style={{ 
                  background: '#0a0a0a',
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)'
                }} 
              />
            </div>
          </div>
        )}

        {/* 添加可用时间弹窗 */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium">添加可用时间</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddAvailability} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">日期</label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                             text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">开始时间</label>
                    <input
                      type="time"
                      value={addForm.startTime}
                      onChange={(e) => setAddForm({ ...addForm, startTime: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                               text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">结束时间</label>
                    <input
                      type="time"
                      value={addForm.endTime}
                      onChange={(e) => setAddForm({ ...addForm, endTime: e.target.value })}
                      required
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                               text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-white/60 mb-1">备注（可选）</label>
                  <input
                    type="text"
                    placeholder="如：只接受线上会议"
                    value={addForm.note}
                    onChange={(e) => setAddForm({ ...addForm, note: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                             text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white/60 mb-2">可见权限</label>
                  <div className="grid grid-cols-2 gap-2">
                    {visibilityOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAddForm({ ...addForm, visibility: option.value as any })}
                        className={`px-3 py-2.5 rounded-lg text-sm transition-all ${
                          addForm.visibility === option.value
                            ? 'bg-white text-black'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    {addForm.visibility === 'ADMIN_ONLY' && '只有管理员可以看到这个时间段'}
                    {addForm.visibility === 'FOUNDING' && '联合创始人及以上角色可以看到'}
                    {addForm.visibility === 'CORE' && '核心合伙人及以上角色可以看到'}
                    {addForm.visibility === 'ALL' && '所有合伙人都可以看到'}
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
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
                    确认
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

