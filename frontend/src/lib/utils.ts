/**
 * 元征 · 合伙人赋能平台 - 工具函数
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并 className，支持条件类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date, format: 'full' | 'short' | 'time' = 'short'): string {
  const d = new Date(date)
  
  switch (format) {
    case 'full':
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    case 'time':
      return d.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    case 'short':
    default:
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
  }
}

/**
 * 格式化数字（添加千分位）
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-CN').format(num)
}

/**
 * 格式化 Token 数量
 */
export function formatToken(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}万`
  }
  return formatNumber(amount)
}

/**
 * 角色层级映射
 */
export const roleLevelMap: Record<number, string> = {
  3: '联合创始人',
  2: '核心合伙人',
  1: '普通合伙人'
}

/**
 * 获取角色名称
 */
export function getRoleName(level: number): string {
  return roleLevelMap[level] || '合伙人'
}

/**
 * 项目状态映射
 */
export const projectStatusMap: Record<string, { label: string; color: string }> = {
  ONGOING: { label: '进行中', color: 'text-green-400' },
  PAUSED: { label: '暂停', color: 'text-yellow-400' },
  COMPLETED: { label: '已完成', color: 'text-blue-400' },
  ABANDONED: { label: '已废弃', color: 'text-dark-500' }
}

/**
 * Token 交易状态映射
 */
export const tokenStatusMap: Record<string, { label: string; color: string }> = {
  PENDING_ADMIN_APPROVAL: { label: '待审核', color: 'text-yellow-400' },
  PENDING_RECEIVER_CONFIRM: { label: '待确认', color: 'text-blue-400' },
  COMPLETED: { label: '已完成', color: 'text-green-400' },
  REJECTED: { label: '已拒绝', color: 'text-red-400' },
  CANCELLED: { label: '已取消', color: 'text-dark-500' }
}

