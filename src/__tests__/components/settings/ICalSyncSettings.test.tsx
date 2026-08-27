import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ICalSyncSettings } from '@/components/features/settings/ICalSyncSettings'

describe('ICalSyncSettings', () => {
  const properties = [
    { id: 'property-a', name: 'Apartamento A' },
    { id: 'property-b', name: 'Apartamento B' },
  ]

  beforeEach(() => {
    jest.restoreAllMocks()
    jest.spyOn(window, 'alert').mockImplementation(() => undefined)
  })

  it('separa os canais por propriedade e evidencia propriedades sem anúncio', () => {
    render(
      <ICalSyncSettings
        locale="pt-BR"
        properties={properties}
        listings={[
          {
            id: 'listing-b',
            property_id: 'property-b',
            name: 'Airbnb B',
            ical_url: 'https://example.com/b.ics',
            sync_enabled: true,
            is_active: true,
            last_synced_at: null,
            platforms: { display_name: 'Airbnb' },
          },
        ]}
      />
    )

    expect(screen.getByText('Apartamento A')).toBeInTheDocument()
    expect(screen.getByText('Apartamento B')).toBeInTheDocument()
    expect(screen.getByText(/Nenhum canal associado/)).toBeInTheDocument()
    expect(screen.getByText('Airbnb')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Gerenciar anúncios' })[1]).toHaveAttribute(
      'href',
      '/pt-BR/properties/property-b'
    )
  })

  it('sincroniza a propriedade do anúncio selecionado, não a primeira propriedade', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(
      <ICalSyncSettings
        locale="pt-BR"
        properties={properties}
        listings={[
          {
            id: 'listing-b',
            property_id: 'property-b',
            name: 'Booking B',
            ical_url: 'https://example.com/b.ics',
            sync_enabled: true,
            is_active: true,
            last_synced_at: null,
            platforms: { display_name: 'Booking.com' },
          },
        ]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Sincronizar agora/ }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/sync/import',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ property_ids: ['property-b'] }),
        })
      )
    })
  })
})
