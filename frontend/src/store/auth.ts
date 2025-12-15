/**
 * 元征 · 合伙人赋能平台 - 认证状态管理
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 用户信息类型
export interface User {
  id: number
  name: string
  email?: string
  phone?: string
  avatar_url?: string
  organization?: string
  role_level: number
  is_admin: boolean
}

// 认证状态接口
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User) => void
  setToken: (token: string) => void
  login: (user: User, token: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      
      setUser: (user) => set({ user, isAuthenticated: true }),
      
      setToken: (token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token)
        }
        set({ token })
      },
      
      login: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token)
        }
        set({ user, token, isAuthenticated: true, isLoading: false })
      },
      
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token')
        }
        set({ user: null, token: null, isAuthenticated: false })
      },
      
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'yuanzheng-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // 当 hydration 完成后，将 isLoading 设置为 false
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false)
        }
      },
    }
  )
)

// 权限检查工具
export function usePermissions() {
  const user = useAuthStore((state) => state.user)
  
  return {
    isAdmin: user?.is_admin ?? false,
    isFounding: (user?.role_level ?? 0) >= 3,
    isCoreOrAbove: (user?.role_level ?? 0) >= 2,
    roleLevel: user?.role_level ?? 0,
    
    // 检查是否可以发起项目（只有联合创始人和管理员）
    canCreateProject: user?.is_admin || (user?.role_level ?? 0) >= 3,
    
    // 检查最低角色等级
    hasMinRoleLevel: (minLevel: number) => (user?.role_level ?? 0) >= minLevel,
  }
}

