jest.mock('@/lib/supabase/properties')
jest.mock('next/og')

import { getPropertyBySlug } from '@/lib/supabase/properties'
import { ImageResponse } from 'next/og'

describe('opengraph-image route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate OG image for valid property slug', async () => {
    const mockProperty = {
      id: '1',
      name: 'Beach House Algarve',
      city: 'Faro',
      country: 'Portugal',
      location: 'Faro, Portugal',
      photo_url: 'https://example.com/beach.jpg',
      base_price: 150,
      currency: 'EUR',
    }

    ;(getPropertyBySlug as jest.Mock).mockResolvedValueOnce(mockProperty)
    ;(ImageResponse as jest.Mock).mockReturnValueOnce({
      status: 200,
      headers: new Map([['content-type', 'image/png']]),
    })

    const { default: Image } = await import('@/app/p/[slug]/opengraph-image')
    const response = await Image({ params: { slug: 'beach-house-algarve' } })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(getPropertyBySlug).toHaveBeenCalledWith('beach-house-algarve')
  })

  it('should return fallback image for non-existent property', async () => {
    ;(getPropertyBySlug as jest.Mock).mockResolvedValueOnce(null)
    ;(ImageResponse as jest.Mock).mockReturnValueOnce({
      status: 200,
      headers: new Map([['content-type', 'image/png']]),
    })

    const { default: Image } = await import('@/app/p/[slug]/opengraph-image')
    const response = await Image({ params: { slug: 'non-existent' } })

    expect(response.status).toBe(200)
  })

  it('should handle missing photo_url gracefully', async () => {
    const mockProperty = {
      id: '2',
      name: 'Apartment Lisboa',
      city: 'Lisbon',
      country: 'Portugal',
      location: 'Lisbon, Portugal',
      base_price: 100,
      currency: 'EUR',
    }

    ;(getPropertyBySlug as jest.Mock).mockResolvedValueOnce(mockProperty)
    ;(ImageResponse as jest.Mock).mockReturnValueOnce({
      status: 200,
      headers: new Map([['content-type', 'image/png']]),
    })

    const { default: Image } = await import('@/app/p/[slug]/opengraph-image')
    const response = await Image({ params: { slug: 'apartment-lisboa' } })

    expect(response.status).toBe(200)
  })

  it('should handle errors gracefully', async () => {
    ;(getPropertyBySlug as jest.Mock).mockRejectedValueOnce(new Error('DB error'))
    ;(ImageResponse as jest.Mock).mockReturnValueOnce({
      status: 200,
      headers: new Map([['content-type', 'image/png']]),
    })

    const { default: Image } = await import('@/app/p/[slug]/opengraph-image')
    const response = await Image({ params: { slug: 'error-test' } })

    expect(response.status).toBe(200)
  })
})
