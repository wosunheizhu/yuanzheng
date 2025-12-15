'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { gsap } from 'gsap'
import { 
  ArrowLeft,
  Plus,
  X,
  Search,
  Users,
  Percent,
  Loader2,
  AlertCircle,
  ChevronDown,
  Info
} from 'lucide-react'
import { projectService, userService, User } from '@/lib/services'
import { useAuthStore } from '@/store/auth'
import { toast } from 'sonner'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
}

// 业务类型选项
const businessTypes = [
  '协议转让',
  '并购重组',
  '产业赋能',
  '债权业务',
  '其他',
]

// 可见性选项
const visibilityOptions = [
  { value: 'ALL', label: '全部合伙人' },
  { value: 'ROLE_MIN_LEVEL', label: '按角色层级' },
  { value: 'CUSTOM', label: '自定义' },
]

// 项目状态选项
const statusOptions = [
  { value: 'ONGOING', label: '进行中' },
  { value: 'PAUSED', label: '暂停' },
]

interface ShareHolder {
  user_id: number
  user_name: string
  percentage: number
}

export default function NewProjectPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showGuide, setShowGuide] = useState(true)
  
  // 表单状态
  const [form, setForm] = useState({
    name: '',
    description: '',
    business_type: '',
    industry: '',
    region: '',
    business_status: 'ONGOING',
    visibility_scope_type: 'ALL',
    visibility_min_role_level: 1,
    note: '',
  })
  
  // 负责人
  const [owners, setOwners] = useState<number[]>([])
  // 普通成员
  const [members, setMembers] = useState<number[]>([])
  // 股权结构
  const [shareholders, setShareholders] = useState<ShareHolder[]>([
    { user_id: 0, user_name: '元征', percentage: 51 }
  ])
  
  // 搜索状态
  const [ownerSearch, setOwnerSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false)
  const [showMemberDropdown, setShowMemberDropdown] = useState(false)
  
  const heroRef = useRef<HTMLDivElement>(null)

  // 加载用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await userService.list({ limit: 100 })
        setAllUsers(Array.isArray(response) ? response : response.items || [])
      } catch (err) {
        console.error('Failed to fetch users:', err)
        toast.error('无法加载用户列表')
      } finally {
        setUsersLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // 入场动画
  useEffect(() => {
    if (heroRef.current) {
      gsap.set(heroRef.current.children, { opacity: 0, y: 30 })
      gsap.to(heroRef.current.children, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }
  }, [showGuide])
  
  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.owner-dropdown-container')) {
        setShowOwnerDropdown(false)
      }
      if (!target.closest('.member-dropdown-container')) {
        setShowMemberDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // 计算剩余股权
  const remainingEquity = 49 - shareholders
    .filter(s => s.user_id !== 0)
    .reduce((sum, s) => sum + (s.percentage || 0), 0)

  // 添加股东
  const handleAddShareholder = () => {
    if (remainingEquity <= 0) {
      toast.error('剩余股权已分配完毕')
      return
    }
    setShareholders([...shareholders, { user_id: -1, user_name: '', percentage: 0 }])
  }

  // 移除股东
  const handleRemoveShareholder = (index: number) => {
    if (shareholders[index].user_id === 0) return // 不能移除元征
    setShareholders(shareholders.filter((_, i) => i !== index))
  }

  // 更新股东
  const handleUpdateShareholder = (index: number, field: 'user_id' | 'percentage', value: number) => {
    const updated = [...shareholders]
    if (field === 'user_id') {
      const selectedUser = allUsers.find(u => u.id === value)
      updated[index] = {
        ...updated[index],
        user_id: value,
        user_name: selectedUser?.name || ''
      }
    } else {
      updated[index] = { ...updated[index], percentage: Math.min(value, remainingEquity + updated[index].percentage) }
    }
    setShareholders(updated)
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 验证
    if (!form.name.trim()) {
      toast.error('请填写项目名称')
      return
    }
    if (!form.business_type) {
      toast.error('请选择业务类型')
      return
    }
    if (owners.length === 0) {
      toast.error('请至少选择一位负责人')
      return
    }
    
    // 验证股权是否分配完毕
    const totalEquity = shareholders.reduce((sum, s) => sum + (s.percentage || 0), 0)
    if (totalEquity !== 100) {
      toast.error(`股权结构必须为100%，当前为${totalEquity}%`)
      return
    }
    
    try {
      setLoading(true)
      
      // 准备数据
      const projectData = {
        name: form.name,
        description: form.description || undefined,
        business_type: form.business_type,
        industry: form.industry || undefined,
        region: form.region || undefined,
        business_status: form.business_status,
        visibility_scope_type: form.visibility_scope_type,
        visibility_min_role_level: form.visibility_scope_type === 'ROLE_MIN_LEVEL' ? form.visibility_min_role_level : undefined,
        owner_ids: owners,
        member_ids: members.filter(m => !owners.includes(m)),
        shares: shareholders
          .filter(s => s.percentage > 0 && s.user_id !== 0) // 排除元征，后端会自动添加
          .map(s => ({
            owner_type: 'USER' as const,
          owner_id: s.user_id,
          percentage: s.percentage,
        })),
      }
      
      await projectService.create(projectData)
      toast.success('项目创建成功，待管理员审核')
      router.push('/projects')
    } catch (err: any) {
      console.error('Failed to create project:', err)
      toast.error(err.message || '创建项目失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 须知页面
  if (showGuide) {
    return (
      <div className="min-h-screen" style={{ background: colors.bg }}>
        <section 
          ref={heroRef}
          className="min-h-screen flex flex-col items-center justify-center text-center px-8 relative"
        >
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 30%, rgba(60, 60, 60, 0.15) 0%, transparent 60%)',
            }}
          />

          <div className="max-w-2xl mx-auto relative z-10">
            <h1 
              className="text-4xl md:text-5xl mb-8"
              style={{ 
                color: colors.text,
                fontFamily: "'Noto Serif SC', serif",
                fontWeight: 500,
              }}
            >
              发布项目须知
            </h1>

            <div 
              className="glass-card p-8 text-left mb-8"
              style={{ border: `1px solid ${colors.border}` }}
            >
              <div className="space-y-4 text-sm" style={{ color: colors.text }}>
                <div className="flex items-start gap-3">
                  <Info size={18} className="shrink-0 mt-0.5" style={{ color: colors.textSecondary }} />
                  <p>只有<span className="font-medium">联合创始人</span>可以发起项目（管理员可代发，仍需指定联合创始人为发起人）。</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <Info size={18} className="shrink-0 mt-0.5" style={{ color: colors.textSecondary }} />
                  <p>发布项目必须明确<span className="font-medium">业务类型、行业和地区</span>，指定至少一位负责人。</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <Info size={18} className="shrink-0 mt-0.5" style={{ color: colors.textSecondary }} />
                  <p>初始股权结构：<span className="font-medium">51% 固定为元征</span>，其余 49% 需在合伙人中完全分配。</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <Info size={18} className="shrink-0 mt-0.5" style={{ color: colors.textSecondary }} />
                  <p>项目发布后会进入"<span className="font-medium">待管理员审核</span>"阶段，其他成员可见项目概要并提交加入申请。</p>
                </div>
                
                <div className="flex items-start gap-3">
                  <Info size={18} className="shrink-0 mt-0.5" style={{ color: colors.textSecondary }} />
                  <p>项目负责人职责：对需求的审核、响应方案选择与交易条款负责；负责确认资源是否实际被使用。</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Link 
                href="/projects"
                className="btn-outline py-3 px-6"
              >
                返回项目列表
              </Link>
              <button 
                onClick={() => setShowGuide(false)}
                className="btn-primary py-3 px-6 flex items-center gap-2"
              >
                我已阅读并理解
                <ArrowLeft size={18} className="rotate-180" />
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: colors.bg }}>
      {/* 顶部导航 */}
      <div 
        className="fixed top-24 left-8 z-30"
      >
        <Link 
          href="/projects"
          className="flex items-center gap-2 text-sm transition-colors duration-300 hover:opacity-80"
          style={{ color: colors.textSecondary }}
        >
          <ArrowLeft size={18} />
          返回项目列表
        </Link>
      </div>

      {/* Hero 区域 */}
      <section 
        ref={heroRef}
        className="min-h-[25vh] flex flex-col items-center justify-center text-center px-8 relative pt-20"
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, rgba(60, 60, 60, 0.15) 0%, transparent 60%)',
          }}
        />

        <h1 
          className="text-4xl md:text-5xl mb-4"
          style={{ 
            color: colors.text,
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 500,
          }}
        >
          新建项目
        </h1>

        <p 
          className="text-lg max-w-xl"
          style={{ color: colors.textSecondary }}
        >
          填写项目信息，发起新的协作项目
        </p>
      </section>

      {/* 表单区域 */}
      <form onSubmit={handleSubmit} className="px-8 pb-24 max-w-3xl mx-auto">
        <div className="space-y-8">
          {/* 基本信息 */}
          <div 
            className="glass-card p-6"
            style={{ border: `1px solid ${colors.border}` }}
          >
            <h2 className="text-lg font-medium mb-6" style={{ color: colors.text }}>
              基本信息
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="输入项目名称"
                  className="input-field w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  业务类型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.business_type}
                  onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                  className="input-field w-full"
                  required
                >
                  <option value="">选择业务类型</option>
                  {businessTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    行业
                  </label>
                  <input
                    type="text"
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    placeholder="如：新能源"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    地区
                  </label>
                  <input
                    type="text"
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                    placeholder="如：华东"
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                  项目描述
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="简要描述项目背景和目标..."
                  className="input-field w-full resize-none"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    项目状态
                  </label>
                  <select
                    value={form.business_status}
                    onChange={(e) => setForm({ ...form, business_status: e.target.value })}
                    className="input-field w-full"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    可见范围
                  </label>
                  <select
                    value={form.visibility_scope_type}
                    onChange={(e) => setForm({ ...form, visibility_scope_type: e.target.value })}
                    className="input-field w-full"
                  >
                    {visibilityOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 团队成员 */}
          <div 
            className="glass-card p-6 overflow-visible relative z-20"
            style={{ border: `1px solid ${colors.border}` }}
          >
            <h2 className="text-lg font-medium mb-6" style={{ color: colors.text }}>
              团队成员
            </h2>
            
            {usersLoading ? (
              <div className="text-center py-8">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" style={{ color: colors.textSecondary }} />
                <p className="text-sm" style={{ color: colors.textSecondary }}>加载用户列表...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 项目负责人 */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    项目负责人 <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs opacity-60">只有联合创始人可担任负责人</span>
                  </label>
                  
                  {/* 已选择的负责人列表 */}
                  {owners.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {owners.map(ownerId => {
                        const ownerUser = allUsers.find(u => u.id === ownerId)
                        return (
                          <div
                            key={ownerId}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                            style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}
                          >
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                              style={{ background: 'rgba(74, 222, 128, 0.2)' }}
                            >
                              {ownerUser?.name?.charAt(0) || '?'}
                            </div>
                            <span>{ownerUser?.name || '未知用户'}</span>
                            <button
                              type="button"
                              onClick={() => setOwners(owners.filter(id => id !== ownerId))}
                              className="ml-1 hover:opacity-70"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* 搜索输入框 */}
                  <div className="relative owner-dropdown-container">
                    <div className="flex items-center gap-2">
                      <Search size={16} style={{ color: colors.textSecondary }} className="absolute left-3" />
                      <input
                        type="text"
                        value={ownerSearch}
                        onChange={(e) => {
                          setOwnerSearch(e.target.value)
                          setShowOwnerDropdown(true)
                        }}
                        onFocus={() => setShowOwnerDropdown(true)}
                        placeholder={owners.length > 0 ? "继续添加负责人..." : "搜索并添加负责人..."}
                        className="input-field w-full pl-10"
                      />
                    </div>
                    
                    {showOwnerDropdown && (
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl z-50 shadow-2xl"
                        style={{ background: '#0a0a0a', border: `1px solid ${colors.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                  >
                        {allUsers
                          .filter(u => 
                            u.highest_role_level >= 3 && 
                            !owners.includes(u.id) &&
                            (u.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
                             (u.email && u.email.toLowerCase().includes(ownerSearch.toLowerCase())))
                          )
                          .slice(0, 10)
                          .map(u => (
                            <div
                              key={u.id}
                              className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5"
                              onClick={() => {
                                setOwners([...owners, u.id])
                                setOwnerSearch('')
                                setShowOwnerDropdown(false)
                              }}
                            >
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                                style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}
                              >
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm" style={{ color: colors.text }}>{u.name}</p>
                                <p className="text-xs" style={{ color: colors.textSecondary }}>联合创始人</p>
                              </div>
                            </div>
                          ))
                        }
                        {allUsers.filter(u => 
                          u.highest_role_level >= 3 && 
                          !owners.includes(u.id) &&
                          (u.name.toLowerCase().includes(ownerSearch.toLowerCase()) ||
                           (u.email && u.email.toLowerCase().includes(ownerSearch.toLowerCase())))
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm" style={{ color: colors.textSecondary }}>
                            {ownerSearch ? '未找到匹配的联合创始人' : '没有可选的联合创始人'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 普通成员 */}
                <div>
                  <label className="block text-sm mb-2" style={{ color: colors.textSecondary }}>
                    普通成员（可选）
                  </label>
                  
                  {/* 已选择的成员列表 */}
                  {members.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {members.map(memberId => {
                        const memberUser = allUsers.find(u => u.id === memberId)
                        const roleLabel = memberUser?.highest_role_level === 3 ? '联合创始人' : 
                                         memberUser?.highest_role_level === 2 ? '核心合伙人' : '普通合伙人'
                        return (
                          <div
                            key={memberId}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                            style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
                          >
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium"
                              style={{ background: 'rgba(59, 130, 246, 0.2)' }}
                            >
                              {memberUser?.name?.charAt(0) || '?'}
                            </div>
                            <span>{memberUser?.name || '未知用户'}</span>
                            <span className="text-xs opacity-60">({roleLabel})</span>
                            <button
                              type="button"
                              onClick={() => setMembers(members.filter(id => id !== memberId))}
                              className="ml-1 hover:opacity-70"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* 搜索输入框 */}
                  <div className="relative member-dropdown-container">
                    <div className="flex items-center gap-2">
                      <Search size={16} style={{ color: colors.textSecondary }} className="absolute left-3" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value)
                          setShowMemberDropdown(true)
                        }}
                        onFocus={() => setShowMemberDropdown(true)}
                        placeholder={members.length > 0 ? "继续添加成员..." : "搜索并添加成员..."}
                        className="input-field w-full pl-10"
                      />
                    </div>
                    
                    {showMemberDropdown && (
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl z-50 shadow-2xl"
                        style={{ background: '#0a0a0a', border: `1px solid ${colors.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                  >
                        {allUsers
                          .filter(u => 
                            !owners.includes(u.id) && 
                            !members.includes(u.id) &&
                            (u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                             (u.email && u.email.toLowerCase().includes(memberSearch.toLowerCase())))
                          )
                          .slice(0, 10)
                          .map(u => {
                            const roleLabel = u.highest_role_level === 3 ? '联合创始人' : 
                                             u.highest_role_level === 2 ? '核心合伙人' : '普通合伙人'
                            const roleColor = u.highest_role_level === 3 ? '#4ade80' : 
                                             u.highest_role_level === 2 ? '#3b82f6' : '#888888'
                            return (
                              <div
                                key={u.id}
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5"
                                onClick={() => {
                                  setMembers([...members, u.id])
                                  setMemberSearch('')
                                  setShowMemberDropdown(false)
                                }}
                              >
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                                  style={{ background: `${roleColor}15`, color: roleColor }}
                                >
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm" style={{ color: colors.text }}>{u.name}</p>
                                  <p className="text-xs" style={{ color: roleColor }}>{roleLabel}</p>
                                </div>
                              </div>
                            )
                          })
                        }
                        {allUsers.filter(u => 
                          !owners.includes(u.id) && 
                          !members.includes(u.id) &&
                          (u.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                           (u.email && u.email.toLowerCase().includes(memberSearch.toLowerCase())))
                        ).length === 0 && (
                          <div className="px-4 py-3 text-sm" style={{ color: colors.textSecondary }}>
                            {memberSearch ? '未找到匹配用户' : '没有可选的成员'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 股权结构 */}
          <div 
            className="glass-card p-6 relative z-10"
            style={{ border: `1px solid ${colors.border}` }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium" style={{ color: colors.text }}>
                股权结构
              </h2>
              <span 
                className="text-sm px-3 py-1 rounded-full"
                style={{ 
                  background: remainingEquity === 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                  color: remainingEquity === 0 ? '#4ade80' : '#fbbf24'
                }}
              >
                剩余可分配：{remainingEquity}%
              </span>
            </div>
            
            <div className="space-y-3">
              {shareholders.map((shareholder, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                >
                  {shareholder.user_id === 0 ? (
                    <div className="flex-1 text-sm" style={{ color: colors.text }}>
                      元征（平台）
                    </div>
                  ) : (
                    <select
                      value={shareholder.user_id}
                      onChange={(e) => handleUpdateShareholder(index, 'user_id', parseInt(e.target.value))}
                      className="input-field flex-1 py-2 text-sm"
                    >
                      <option value={-1}>选择股东</option>
                      {allUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={shareholder.percentage}
                      onChange={(e) => handleUpdateShareholder(index, 'percentage', parseFloat(e.target.value) || 0)}
                      className="input-field w-20 py-2 text-sm text-center"
                      min="0"
                      max={shareholder.user_id === 0 ? 51 : remainingEquity + shareholder.percentage}
                      step="0.1"
                      disabled={shareholder.user_id === 0}
                    />
                    <Percent size={14} style={{ color: colors.textSecondary }} />
                  </div>

                  {shareholder.user_id !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveShareholder(index)}
                      className="p-1.5 rounded-full transition-colors hover:bg-white/10"
                      style={{ color: colors.textSecondary }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddShareholder}
                disabled={remainingEquity <= 0}
                className="w-full p-3 rounded-lg border border-dashed flex items-center justify-center gap-2 text-sm transition-colors hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: colors.border, color: colors.textSecondary }}
              >
                <Plus size={16} />
                添加股东
              </button>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex items-center justify-end gap-4">
            <Link 
              href="/projects"
              className="btn-outline py-3 px-6"
            >
              取消
            </Link>
            <button 
              type="submit"
              disabled={loading}
              className="btn-primary py-3 px-6 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  创建项目
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Footer */}
      <footer 
        className="text-center py-8"
        style={{ color: colors.textSecondary }}
      >
        <p className="text-xs">
          © 2024 元征 · 合伙人赋能平台
        </p>
      </footer>
    </div>
  )
}

