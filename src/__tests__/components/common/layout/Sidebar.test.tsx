import { render, screen, waitFor } from '@testing-library/react'
import { Sidebar } from '@/components/common/layout/Sidebar'

const pushMock = jest.fn()
const signOutMock = jest.fn().mockResolvedValue({ error: null })
const singleMock = jest.fn().mockResolvedValue({
  data: { plan: 'premium', subscription_plan: 'premium' },
  error: null,
})

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/pt-BR/dashboard'),
  useRouter: jest.fn(() => ({ push: pushMock })),
}))

jest.mock('next-themes', () => ({
  useTheme: jest.fn(() => ({ resolvedTheme: 'light', theme: 'light' })),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    profile: null,
    loading: false,
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
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: singleMock,
        })),
      })),
    })),
  })),
}))

jest.mock('@/components/common/ui/Logo', () => ({
  Logo: () => <div data-testid="logo" />,
}))

jest.mock('@/lib/navigation/module-shell', () => {
  const actual = jest.requireActual('@/lib/navigation/module-shell')

  return {
    ...actual,
    getModuleForPath: jest.fn(actual.getModuleForPath),
    getModuleNavLinks: jest.fn(actual.getModuleNavLinks),
  }
})

describe('Sidebar IA Native integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows IA Native as a visible module entry', async () => {
    render(
      <Sidebar
        serverProfile={{
          id: 'user-1',
          email: 'admin@example.com',
          full_name: 'Admin User',
          role: 'admin',
          avatar_url: null,
          access_all_properties: true,
          organization_id: 'org-1',
        }}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('IA Native')).toBeInTheDocument()
    })
  })
})
