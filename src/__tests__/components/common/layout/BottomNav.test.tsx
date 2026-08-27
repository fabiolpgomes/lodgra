import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/components/common/layout/BottomNav'

const pushMock = jest.fn()
const signOutMock = jest.fn().mockResolvedValue({ error: null })

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/pt-BR/dashboard'),
  useRouter: jest.fn(() => ({ push: pushMock, refresh: jest.fn() })),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    profile: {
      id: 'user-1',
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin',
      avatar_url: null,
      access_all_properties: true,
      organization_id: 'org-1',
    },
  })),
}))

jest.mock('@/lib/i18n/routing', () => ({
  useLocale: jest.fn(() => 'pt-BR'),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: signOutMock,
    },
  })),
}))

jest.mock('@/components/common/ui/sheet', () => {
  const actual = jest.requireActual('@/components/common/ui/sheet')
  return {
    ...actual,
    Sheet: ({ open, children }: { open?: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
    SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  }
})

describe('BottomNav module shell', () => {
  it('renders the published modules including IA Native', () => {
    render(<BottomNav />)

    expect(screen.getByText('Core')).toBeInTheDocument()
    expect(screen.getByText('Operação')).toBeInTheDocument()
    expect(screen.getByText('Empresa')).toBeInTheDocument()
    expect(screen.getByText('Proprietário')).toBeInTheDocument()
    expect(screen.getByText('IA Native')).toBeInTheDocument()
  })
})
