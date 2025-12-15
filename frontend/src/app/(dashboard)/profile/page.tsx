'use client'

import { useState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Camera, Edit2, Save, X, Loader2, AlertCircle, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { userService, authService, User } from '@/lib/services'
import { getRoleName } from '@/lib/utils'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'

// 颜色常量
const colors = {
  bg: '#000000',
  text: '#faf9f6',
  textSecondary: '#888888',
  border: '#333333',
  success: '#4ade80',
  error: '#ef4444',
}

// 性别选项
const genderOptions = [
  { value: 'MALE', label: '男' },
  { value: 'FEMALE', label: '女' },
  { value: 'OTHER', label: '其他' },
]

export default function ProfilePage() {
  const authUser = useAuthStore((state) => state.user)
  const { setUser } = useAuthStore()
  
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 编辑表单数据
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '',
    birth_date: '',
    organization: '',
    organization_public: true,
    title: '',
    intro: '',
    expertise: '',
    contact: '',
    contact_public: false,
    address: '',
    address_public: false,
    education: '',
    hobbies: '',
    signature: '',
  })
  
  // 修改密码
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordSaving, setPasswordSaving] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // 加载用户资料
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await userService.getMe()
        setProfile(data)
        // 初始化表单数据
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          gender: data.gender || '',
          birth_date: data.birth_date || '',
          organization: data.organization || '',
          organization_public: data.organization_public ?? true,
          title: data.title || '',
          intro: data.intro || '',
          expertise: data.expertise || '',
          contact: data.contact || '',
          contact_public: data.contact_public ?? false,
          address: data.address || '',
          address_public: data.address_public ?? false,
          education: data.education || '',
          hobbies: data.hobbies || '',
          signature: data.signature || '',
        })
      } catch (err) {
        console.error('Failed to fetch profile:', err)
        setError('无法加载个人资料')
        // 使用本地存储的用户信息作为后备
        if (authUser) {
          setProfile({
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            phone: authUser.phone || '',
            avatar_url: authUser.avatar_url,
            organization: authUser.organization,
            highest_role_level: authUser.role_level,
            is_admin: authUser.is_admin,
          } as User)
          setFormData({
            name: authUser.name || '',
            phone: authUser.phone || '',
            gender: '',
            birth_date: '',
            organization: authUser.organization || '',
            organization_public: true,
            title: '',
            intro: '',
            expertise: '',
            contact: '',
            contact_public: false,
            address: '',
            address_public: false,
            education: '',
            hobbies: '',
            signature: '',
          })
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [authUser])

  // 入场动画
  useEffect(() => {
    if (containerRef.current && !loading) {
      gsap.set(containerRef.current.children, { opacity: 0, y: 20 })
      gsap.to(containerRef.current.children, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out',
      })
    }
  }, [loading])

  // 保存资料
  const handleSave = async () => {
    setSaving(true)
    try {
      // 处理空字符串，将其转换为 null
      const cleanedData: Record<string, any> = {}
      for (const [key, value] of Object.entries(formData)) {
        if (value === '' || value === null || value === undefined) {
          // 跳过空值，不发送到后端
          continue
        }
        cleanedData[key] = value
      }
      const updatedProfile = await userService.updateProfile(cleanedData)
      setProfile(updatedProfile)
      setIsEditing(false)
      toast.success('个人资料已更新')
      
      // 更新全局用户状态
      if (authUser) {
        setUser({
          ...authUser,
          name: updatedProfile.name,
          phone: updatedProfile.phone,
          organization: updatedProfile.organization,
        })
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // 取消编辑
  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        gender: profile.gender || '',
        birth_date: profile.birth_date || '',
        organization: profile.organization || '',
        organization_public: profile.organization_public ?? true,
        title: profile.title || '',
        intro: profile.intro || '',
        expertise: profile.expertise || '',
        contact: profile.contact || '',
        contact_public: profile.contact_public ?? false,
        address: profile.address || '',
        address_public: profile.address_public ?? false,
        education: profile.education || '',
        hobbies: profile.hobbies || '',
        signature: profile.signature || '',
      })
    }
    setIsEditing(false)
  }

  // 修改密码
  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('两次输入的新密码不一致')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('新密码至少6位')
      return
    }
    
    setPasswordSaving(true)
    try {
      await authService.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
      toast.success('密码修改成功')
      setShowPasswordForm(false)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast.error(getErrorMessage(err))
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin" style={{ color: colors.textSecondary }} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={48} style={{ color: colors.error }} />
        <p style={{ color: colors.textSecondary }}>无法加载个人资料</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* 头部 */}
      <div
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-start gap-6">
          {/* 头像 */}
          <div className="relative">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
              }}
            >
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="font-serif font-bold text-3xl" style={{ color: colors.text }}>
                  {profile.name?.charAt(0) || '?'}
                </span>
              )}
            </div>
            <button 
              className="absolute bottom-0 right-0 p-2 rounded-full transition-colors"
              style={{
                background: 'rgba(30,30,30,0.9)',
                border: `1px solid ${colors.border}`,
              }}
            >
              <Camera size={14} style={{ color: colors.textSecondary }} />
            </button>
          </div>

          {/* 基本信息 */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="text-2xl font-semibold bg-transparent outline-none border-b-2 border-white/20 focus:border-white/50 transition-colors"
                    style={{ color: colors.text }}
                  />
                ) : (
                  <h1 className="text-2xl font-semibold" style={{ color: colors.text }}>
                    {profile.name}
                  </h1>
                )}
                <p className="mt-1" style={{ color: colors.textSecondary }}>
                  {getRoleName(profile.highest_role_level || 1)} · {profile.organization || '未设置组织'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:bg-white/5"
                      style={{
                        border: `1px solid ${colors.border}`,
                        color: colors.textSecondary,
                      }}
                    >
                      <X size={16} />
                      取消
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                      style={{
                        background: colors.text,
                        color: colors.bg,
                      }}
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      保存
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:bg-white/5"
                    style={{
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  >
                    <Edit2 size={16} />
                    编辑
                  </button>
                )}
              </div>
            </div>
            
            {/* 个人简介 */}
            {isEditing ? (
              <textarea
                value={formData.intro}
                onChange={(e) => setFormData({ ...formData, intro: e.target.value })}
                placeholder="介绍一下自己..."
                className="w-full mt-4 p-3 rounded-lg resize-none outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
                rows={2}
              />
            ) : (
              <p className="mt-4" style={{ color: colors.textSecondary }}>
                {profile.intro || '暂无简介'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 详细信息 */}
      <div
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <h2 className="text-lg font-semibold mb-6" style={{ color: colors.text }}>
          个人信息
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* 邮箱（不可编辑） */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              邮箱
            </label>
            <p style={{ color: colors.text }}>{profile.email}</p>
          </div>
          
          {/* 手机号 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              手机号
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            ) : (
              <p style={{ color: colors.text }}>{profile.phone || '未设置'}</p>
            )}
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              性别
            </label>
            {isEditing ? (
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              >
                <option value="">请选择</option>
                {genderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <p style={{ color: colors.text }}>
                {genderOptions.find(o => o.value === profile.gender)?.label || '未设置'}
              </p>
            )}
          </div>

          {/* 出生日期 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              出生日期
            </label>
            {isEditing ? (
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            ) : (
              <p style={{ color: colors.text }}>{profile.birth_date || '未设置'}</p>
            )}
          </div>

          {/* 所属组织 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              所属组织
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
                <label className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
                  <input
                    type="checkbox"
                    checked={formData.organization_public}
                    onChange={(e) => setFormData({ ...formData, organization_public: e.target.checked })}
                  />
                  公开显示
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p style={{ color: colors.text }}>{profile.organization || '未设置'}</p>
                <span className="text-xs" style={{ color: colors.textSecondary }}>
                  {profile.organization_public ? '(公开)' : '(仅自己可见)'}
                </span>
              </div>
            )}
          </div>

          {/* 职务 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              职务
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            ) : (
              <p style={{ color: colors.text }}>{profile.title || '未设置'}</p>
            )}
          </div>

          {/* 擅长领域 */}
          <div className="md:col-span-2">
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              擅长领域
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.expertise}
                onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                placeholder="多个领域用逗号分隔"
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            ) : (
              <p style={{ color: colors.text }}>{profile.expertise || '未设置'}</p>
            )}
          </div>

          {/* 联系方式 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              联系方式
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="微信/QQ等"
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
                <label className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
                  <input
                    type="checkbox"
                    checked={formData.contact_public}
                    onChange={(e) => setFormData({ ...formData, contact_public: e.target.checked })}
                  />
                  公开显示
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p style={{ color: colors.text }}>{profile.contact || '未设置'}</p>
                {profile.contact && (
                  <span className="text-xs" style={{ color: colors.textSecondary }}>
                    {profile.contact_public ? '(公开)' : '(仅自己可见)'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 地址 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              地址
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                  }}
                />
                <label className="flex items-center gap-2 text-sm" style={{ color: colors.textSecondary }}>
                  <input
                    type="checkbox"
                    checked={formData.address_public}
                    onChange={(e) => setFormData({ ...formData, address_public: e.target.checked })}
                  />
                  公开显示
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p style={{ color: colors.text }}>{profile.address || '未设置'}</p>
                {profile.address && (
                  <span className="text-xs" style={{ color: colors.textSecondary }}>
                    {profile.address_public ? '(公开)' : '(仅自己可见)'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 教育经历 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              教育经历
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            ) : (
              <p style={{ color: colors.text }}>{profile.education || '未设置'}</p>
            )}
          </div>

          {/* 爱好 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              爱好
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.hobbies}
                onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            ) : (
              <p style={{ color: colors.text }}>{profile.hobbies || '未设置'}</p>
            )}
          </div>

          {/* 个性签名 */}
          <div className="md:col-span-2">
            <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
              个性签名
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.signature}
                onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            ) : (
              <p style={{ color: colors.text }}>{profile.signature || '未设置'}</p>
            )}
          </div>
        </div>
      </div>

      {/* 账户安全 */}
      <div
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${colors.border}`,
        }}
      >
        <h2 className="text-lg font-semibold mb-6" style={{ color: colors.text }}>
          账户安全
        </h2>
        
        {showPasswordForm ? (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
                当前密码
              </label>
              <input
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
                新密码
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: colors.textSecondary }}>
                确认新密码
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 rounded-lg outline-none"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${colors.border}`,
                  color: colors.text,
                }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordForm(false)
                  setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="px-4 py-2 rounded-lg transition-colors hover:bg-white/5"
                style={{
                  border: `1px solid ${colors.border}`,
                  color: colors.textSecondary,
                }}
              >
                取消
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordSaving || !passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: colors.text,
                  color: colors.bg,
                }}
              >
                {passwordSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                确认修改
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors hover:bg-white/5"
            style={{
              border: `1px solid ${colors.border}`,
              color: colors.text,
            }}
          >
            <Lock size={16} />
            修改密码
          </button>
        )}
      </div>
    </div>
  )
}
