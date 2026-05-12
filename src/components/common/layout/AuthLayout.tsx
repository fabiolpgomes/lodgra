'use client'

import { Sidebar } from '@/components/common/layout/Sidebar'
import { TopBar } from '@/components/common/layout/TopBar'
import { BottomNav } from '@/components/common/layout/BottomNav'
import type { UserProfile } from '@/lib/auth/getUserAccess'

interface AuthLayoutProps {
  children: React.ReactNode
  profile?: UserProfile // Server-provided profile (SSR) avoids race condition
}

export function AuthLayout({ children, profile }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      {/* Desktop: fixed sidebar */}
      <Sidebar serverProfile={profile} />

      {/* Desktop: content shifted right of sidebar */}
      <div className="md:ml-[260px] flex flex-col min-h-screen">
        <TopBar />
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile: bottom navigation */}
      <BottomNav />
    </div>
  )
}
