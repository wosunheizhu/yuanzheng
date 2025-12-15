'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// 重定向到 Token 页面并打开转账表单
export default function TokenTransferPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // 获取可能的查询参数
    const toUserId = searchParams.get('to')
    const projectId = searchParams.get('project')
    
    // 构建重定向 URL
    let url = '/token?transfer=1'
    if (toUserId) url += `&to=${toUserId}`
    if (projectId) url += `&project=${projectId}`
    
    // 重定向到 Token 页面
    router.replace(url)
  }, [router, searchParams])

  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#000000' }}
    >
      <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
    </div>
  )
}

