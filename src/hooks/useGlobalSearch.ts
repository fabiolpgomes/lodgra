import { useState, useCallback, useRef, useEffect } from 'react'

export interface SearchResult {
  id: string
  type: 'property' | 'reservation' | 'expense' | 'owner'
  title: string
  subtitle?: string
  href: string
  icon?: string
}

interface UseGlobalSearchState {
  query: string
  results: SearchResult[]
  isLoading: boolean
  isOpen: boolean
}

export function useGlobalSearch() {
  const [state, setState] = useState<UseGlobalSearchState>({
    query: '',
    results: [],
    isLoading: false,
    isOpen: false,
  })

  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setState(prev => ({ ...prev, results: [], query: q }))
      return
    }

    setState(prev => ({ ...prev, query: q, isLoading: true }))

    try {
      const res = await fetch(`/api/search/global?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      setState(prev => ({
        ...prev,
        results: data.results || [],
        isLoading: false,
      }))
    } catch (error) {
      console.error('[Global Search] Error:', error)
      setState(prev => ({ ...prev, results: [], isLoading: false }))
    }
  }, [])

  const handleInputChange = useCallback(
    (q: string) => {
      setState(prev => ({ ...prev, query: q, isOpen: true }))

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      debounceTimer.current = setTimeout(() => {
        search(q)
      }, 300)
    },
    [search]
  )

  const handleOpen = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: true }))
  }, [])

  const handleClose = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const handleClear = useCallback(() => {
    setState({
      query: '',
      results: [],
      isLoading: false,
      isOpen: false,
    })
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  return {
    query: state.query,
    results: state.results,
    isLoading: state.isLoading,
    isOpen: state.isOpen,
    handleInputChange,
    handleOpen,
    handleClose,
    handleClear,
  }
}
