'use client'

import ImmersiveLayout from '@/components/layout/ImmersiveLayout'
import { AuthGuard } from '@/components/guards/AuthGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <ImmersiveLayout>{children}</ImmersiveLayout>
    </AuthGuard>
  )
}
