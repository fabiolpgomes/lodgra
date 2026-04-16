'use client'

import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import type { UserProfile } from '@/lib/auth/getUserAccess'

interface AuthLayoutProps {
  children: React.ReactNode
  profile?: UserProfile // Server-provided profile (SSR) avoids race condition
}

export function AuthLayout({ children, profile }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-100">
      <Header serverProfile={profile} />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
