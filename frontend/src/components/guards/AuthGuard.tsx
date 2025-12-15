'use client'

/**
 * 元征 · 合伙人赋能平台 - 认证守卫组件
 * Phase 4: 前端权限守卫完善
 */
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * 认证守卫
 * 确保用户已登录才能访问被包裹的内容
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, token } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  
  useEffect(() => {
    const checkAuth = async () => {
      // 等待 hydration 完成
      if (isLoading) {
        return
      }
      
      // 检查是否已登录
      if (!isAuthenticated || !token) {
        // 保存当前路径用于登录后重定向
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('redirect_after_login', pathname)
        }
        router.replace('/login')
        return
      }
      
      setIsChecking(false)
    }
    
    checkAuth()
  }, [isAuthenticated, isLoading, token, router, pathname])
  
  // 加载中或检查中显示 fallback
  if (isLoading || isChecking) {
    return fallback || <AuthLoadingFallback />
  }
  
  // 未登录不渲染内容（等待重定向）
  if (!isAuthenticated) {
    return fallback || <AuthLoadingFallback />
  }
  
  return <>{children}</>
}

/**
 * 管理员守卫
 * 确保用户是管理员才能访问被包裹的内容
 */
interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

export function AdminGuard({ 
  children, 
  fallback,
  redirectTo = '/dashboard'
}: AdminGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  
  useEffect(() => {
    if (isLoading) return
    
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    
    if (!user?.is_admin) {
      router.replace(redirectTo)
      return
    }
    
    setIsChecking(false)
  }, [user, isAuthenticated, isLoading, router, redirectTo])
  
  if (isLoading || isChecking) {
    return fallback || <AuthLoadingFallback />
  }
  
  if (!user?.is_admin) {
    return null
  }
  
  return <>{children}</>
}

/**
 * 角色等级守卫
 * 确保用户达到最低角色等级才能访问被包裹的内容
 */
interface RoleLevelGuardProps {
  children: React.ReactNode
  minLevel: number
  fallback?: React.ReactNode
  redirectTo?: string
}

export function RoleLevelGuard({
  children,
  minLevel,
  fallback,
  redirectTo = '/dashboard'
}: RoleLevelGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  
  useEffect(() => {
    if (isLoading) return
    
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    
    // 管理员始终通过
    if (user?.is_admin) {
      setIsChecking(false)
      return
    }
    
    // 检查角色等级
    if ((user?.role_level ?? 0) < minLevel) {
      router.replace(redirectTo)
      return
    }
    
    setIsChecking(false)
  }, [user, isAuthenticated, isLoading, router, minLevel, redirectTo])
  
  if (isLoading || isChecking) {
    return fallback || <AuthLoadingFallback />
  }
  
  // 管理员或满足角色等级
  const hasAccess = user?.is_admin || (user?.role_level ?? 0) >= minLevel
  
  if (!hasAccess) {
    return null
  }
  
  return <>{children}</>
}

/**
 * 联合创始人或管理员守卫
 * 用于发起项目等需要高级权限的操作
 */
export function FoundingOrAdminGuard({
  children,
  fallback,
  redirectTo = '/dashboard'
}: AdminGuardProps) {
  return (
    <RoleLevelGuard minLevel={3} fallback={fallback} redirectTo={redirectTo}>
      {children}
    </RoleLevelGuard>
  )
}

/**
 * 访客守卫
 * 确保用户未登录才能访问（如登录页、注册页）
 */
interface GuestGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

export function GuestGuard({
  children,
  redirectTo = 'http://localhost:3847'
}: GuestGuardProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  
  useEffect(() => {
    if (isLoading) return
    
    if (isAuthenticated) {
      // 已登录，重定向到首页或保存的路径
      const savedPath = typeof window !== 'undefined' 
        ? sessionStorage.getItem('redirect_after_login') 
        : null
      
      if (savedPath) {
        sessionStorage.removeItem('redirect_after_login')
        router.replace(savedPath)
      } else {
        window.location.href = redirectTo
      }
      return
    }
    
    setIsChecking(false)
  }, [isAuthenticated, isLoading, router, redirectTo])
  
  if (isLoading || isChecking) {
    return <AuthLoadingFallback />
  }
  
  return <>{children}</>
}

/**
 * 加载中 fallback 组件
 */
function AuthLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/60 text-sm">正在验证身份...</p>
      </div>
    </div>
  )
}

/**
 * 权限检查 Hook
 * 用于在组件内检查用户权限
 */
export function useAuthGuard() {
  const { user, isAuthenticated, isLoading, token } = useAuthStore()
  
  return {
    isAuthenticated,
    isLoading,
    user,
    token,
    
    // 权限检查方法
    isAdmin: user?.is_admin ?? false,
    isFounding: (user?.role_level ?? 0) >= 3,
    isCoreOrAbove: (user?.role_level ?? 0) >= 2,
    roleLevel: user?.role_level ?? 0,
    
    // 检查是否可以执行特定操作
    canCreateProject: () => user?.is_admin || (user?.role_level ?? 0) >= 3,
    canManageToken: () => user?.is_admin ?? false,
    canApproveProject: () => user?.is_admin ?? false,
    canDeleteResource: (ownerId: number) => user?.is_admin || user?.id === ownerId,
    canEditObject: (ownerId: number) => user?.is_admin || user?.id === ownerId,
    
    // 检查可见性
    canSeeVisibility: (visibility: {
      visibility_all?: boolean
      visibility_founding?: boolean
      visibility_core?: boolean
      visibility_normal?: boolean
      owner_id?: number
    }) => {
      if (!user) return false
      if (user.is_admin) return true
      if (visibility.owner_id === user.id) return true
      if (visibility.visibility_all) return true
      
      const level = user.role_level ?? 0
      if (level >= 3 && visibility.visibility_founding) return true
      if (level >= 2 && visibility.visibility_core) return true
      if (level >= 1 && visibility.visibility_normal) return true
      
      return false
    },
    
    // 检查最低角色等级
    hasMinRoleLevel: (minLevel: number) => 
      user?.is_admin || (user?.role_level ?? 0) >= minLevel,
  }
}

export default AuthGuard

