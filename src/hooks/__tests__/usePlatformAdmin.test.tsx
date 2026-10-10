import { renderHook, waitFor } from '@testing-library/react'
import { usePlatformAdmin } from '../usePlatformAdmin'

const fetchMock = jest.fn()

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock as unknown as typeof fetch
})

// Cada teste usa um userId próprio porque a consulta fica em cache por utilizador.
describe('usePlatformAdmin', () => {
  it('sem utilizador: false e não consulta', () => {
    const { result } = renderHook(() => usePlatformAdmin(undefined))
    expect(result.current).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('operador: true', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ isPlatformAdmin: true }) })
    const { result } = renderHook(() => usePlatformAdmin('op-1'))
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('admin de tenant: false', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ isPlatformAdmin: false }) })
    const { result } = renderHook(() => usePlatformAdmin('tenant-1'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })

  it.each([
    ['resposta 403', () => Promise.resolve({ ok: false, json: async () => ({}) })],
    ['rede falha', () => Promise.reject(new Error('offline'))],
  ])('%s: esconde o item (false)', async (_name, outcome) => {
    fetchMock.mockImplementation(outcome)
    const { result } = renderHook(() => usePlatformAdmin(`falha-${_name}`))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(result.current).toBe(false)
  })

  it('Sidebar e BottomNav partilham uma só consulta por utilizador', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ isPlatformAdmin: true }) })
    renderHook(() => usePlatformAdmin('shared-1'))
    const second = renderHook(() => usePlatformAdmin('shared-1'))
    await waitFor(() => expect(second.result.current).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
