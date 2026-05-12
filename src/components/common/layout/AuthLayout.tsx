'use client'

import { Sidebar } from '@/components/common/layout/Sidebar'
import { TopBar } from '@/components/common/layout/TopBar'
import { BottomNav } from '@/components/common/layout/BottomNav'
import { Logo } from '@/components/common/ui/Logo'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/routing'
import type { UserProfile } from '@/lib/auth/getUserAccess'

interface AuthLayoutProps {
  children: React.ReactNode
  profile?: UserProfile // Server-provided profile (SSR) avoids race condition
}

export function AuthLayout({ children, profile }: AuthLayoutProps) {
  const locale = useLocale()
  const prefix = locale ? `/${locale}` : ''

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-black/[0.06] px-4 h-16 flex items-center justify-between">
        <Link href={prefix || '/'} className="flex items-center">
          <Logo size="sm" />
        </Link>
        {/* You could add a user menu trigger here if needed, but the user only asked for the logo */}
      </header>

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
