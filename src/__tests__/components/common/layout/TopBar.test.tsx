import { render, screen } from '@testing-library/react'
import { TopBar } from '@/components/common/layout/TopBar'

const handleInputChangeMock = jest.fn()
const handleOpenMock = jest.fn()
const handleCloseMock = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/pt-BR/properties'),
}))

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => function SearchModalMock() {
    return null
  },
}))

jest.mock('@/components/common/header/LocaleSelector', () => ({
  LocaleSelector: () => <div data-testid="locale-selector" />,
}))

jest.mock('@/components/common/header/ThemeToggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}))

jest.mock('@/hooks/useGlobalSearch', () => ({
  useGlobalSearch: jest.fn(() => ({
    query: '',
    results: [],
    isLoading: false,
    isOpen: false,
    handleInputChange: handleInputChangeMock,
    handleOpen: handleOpenMock,
    handleClose: handleCloseMock,
  })),
}))

describe('TopBar module shell', () => {
  it('shows the current module context and page title', () => {
    render(<TopBar />)

    expect(screen.getByText('Operação do portfólio')).toBeInTheDocument()
    expect(screen.getByText('Operação')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Propriedades' })).toBeInTheDocument()
    expect(screen.getByTestId('locale-selector')).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })
})
