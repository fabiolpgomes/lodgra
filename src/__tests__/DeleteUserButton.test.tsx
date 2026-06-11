import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteUserButton } from '@/components/features/admin/DeleteUserButton'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('DeleteUserButton', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
  })

  it('should redirect to locale path when locale is present in URL', async () => {
    // Mock pathname with /pt/ locale (development path)
    ;(usePathname as jest.Mock).mockReturnValue('/pt/admin/users')

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.Mock

    render(<DeleteUserButton userId="user-123" userName="John Doe" />)

    const deleteButton = screen.getByTitle('Eliminar utilizador')
    fireEvent.click(deleteButton)

    const confirmButton = screen.getByRole('button', { name: /Sim, Eliminar/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/pt/admin/users')
    })

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('should redirect to /admin/users when no locale is present (production path)', async () => {
    // Mock pathname without locale (production path)
    ;(usePathname as jest.Mock).mockReturnValue('/admin/users')

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.Mock

    render(<DeleteUserButton userId="user-789" userName="Jane Doe" />)

    const deleteButton = screen.getByTitle('Eliminar utilizador')
    fireEvent.click(deleteButton)

    const confirmButton = screen.getByRole('button', { name: /Sim, Eliminar/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/users')
    })

    expect(mockRefresh).toHaveBeenCalled()
  })

  it('should extract locale correctly from different locales', async () => {
    // Test with /en/ locale
    ;(usePathname as jest.Mock).mockReturnValue('/en/admin/users')

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.Mock

    render(<DeleteUserButton userId="user-456" userName="John Doe" />)

    const deleteButton = screen.getByTitle('Eliminar utilizador')
    fireEvent.click(deleteButton)

    const confirmButton = screen.getByRole('button', { name: /Sim, Eliminar/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/en/admin/users')
    })
  })

  it('should handle deletion errors gracefully', async () => {
    ;(usePathname as jest.Mock).mockReturnValue('/pt/admin/users')

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Falha na operação' }),
      })
    ) as jest.Mock

    render(<DeleteUserButton userId="user-999" userName="Test User" />)

    const deleteButton = screen.getByTitle('Eliminar utilizador')
    fireEvent.click(deleteButton)

    const confirmButton = screen.getByRole('button', { name: /Sim, Eliminar/i })
    fireEvent.click(confirmButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })
})
