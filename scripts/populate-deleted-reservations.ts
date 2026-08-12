#!/usr/bin/env npx tsx
/**
 * Repopulate reservations extracted from saved reports (AHS properties).
 * Source: /private/tmp/populate_deleted_reservations.sql
 *
 * Usage: npx tsx scripts/populate-deleted-reservations.ts [--dry-run]
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const dryRun = process.argv.includes('--dry-run')

type ReservationSeed = {
  propertyPattern: string
  channel: 'booking' | 'airbnb'
  checkIn: string
  checkOut: string
  guestName: string
  adults: number
  children: number
  totalPrice: number
}

const RESERVATIONS: ReservationSeed[] = [
  // AHS T1 Portimão
  { propertyPattern: 'AHS T1 Portimão', channel: 'booking', checkIn: '2026-07-25', checkOut: '2026-08-01', guestName: 'Joao Mata', adults: 2, children: 0, totalPrice: 600 },
  { propertyPattern: 'AHS T1 Portimão', channel: 'booking', checkIn: '2026-08-01', checkOut: '2026-08-09', guestName: 'Joana Tapada', adults: 2, children: 2, totalPrice: 700 },
  { propertyPattern: 'AHS T1 Portimão', channel: 'booking', checkIn: '2026-08-09', checkOut: '2026-08-16', guestName: 'Tierri Nora', adults: 2, children: 0, totalPrice: 646 },
  { propertyPattern: 'AHS T1 Portimão', channel: 'booking', checkIn: '2026-08-16', checkOut: '2026-08-23', guestName: 'Jose Ricardo Machado Pereira', adults: 3, children: 0, totalPrice: 680 },
  { propertyPattern: 'AHS T1 Portimão', channel: 'booking', checkIn: '2026-08-24', checkOut: '2026-08-30', guestName: 'Salvador Pinedo', adults: 2, children: 0, totalPrice: 624 },
  // AHS T2 Armação de Pêra
  { propertyPattern: 'AHS T2%Armação', channel: 'booking', checkIn: '2026-07-09', checkOut: '2026-07-12', guestName: 'Vania Huguinin', adults: 3, children: 1, totalPrice: 175 },
  { propertyPattern: 'AHS T2%Armação', channel: 'booking', checkIn: '2026-07-12', checkOut: '2026-07-21', guestName: 'Cidalia Silva', adults: 4, children: 2, totalPrice: 1085 },
  { propertyPattern: 'AHS T2%Armação', channel: 'booking', checkIn: '2026-07-22', checkOut: '2026-07-25', guestName: 'Miguel Loro', adults: 4, children: 0, totalPrice: 280 },
  { propertyPattern: 'AHS T2%Armação', channel: 'airbnb', checkIn: '2026-07-27', checkOut: '2026-07-30', guestName: 'Alexandre Cardoso', adults: 3, children: 3, totalPrice: 350 },
  // AHS Premium Apart 2 Pools
  { propertyPattern: 'AHS Premium Apart 2 Pools', channel: 'airbnb', checkIn: '2026-07-26', checkOut: '2026-07-31', guestName: 'Victor Ponte', adults: 1, children: 0, totalPrice: 866.81 },
  { propertyPattern: 'AHS Premium Apart 2 Pools', channel: 'booking', checkIn: '2026-08-01', checkOut: '2026-08-07', guestName: 'Carlos Guerra', adults: 3, children: 1, totalPrice: 987 },
  { propertyPattern: 'AHS Premium Apart 2 Pools', channel: 'booking', checkIn: '2026-08-07', checkOut: '2026-08-10', guestName: 'Adriano Nascimento', adults: 2, children: 0, totalPrice: 433 },
  { propertyPattern: 'AHS Premium Apart 2 Pools', channel: 'booking', checkIn: '2026-08-11', checkOut: '2026-08-15', guestName: 'Yoan Osorio', adults: 2, children: 2, totalPrice: 555.63 },
  { propertyPattern: 'AHS Premium Apart 2 Pools', channel: 'booking', checkIn: '2026-08-15', checkOut: '2026-08-22', guestName: 'Jorge Brandão', adults: 3, children: 1, totalPrice: 1203.84 },
  { propertyPattern: 'AHS Premium Apart 2 Pools', channel: 'booking', checkIn: '2026-08-22', checkOut: '2026-08-29', guestName: 'Tiago Pereira', adults: 4, children: 0, totalPrice: 790 },
  { propertyPattern: 'AHS Premium Apart 2 Pools', channel: 'booking', checkIn: '2026-08-31', checkOut: '2026-09-04', guestName: 'Cátia Santos', adults: 4, children: 0, totalPrice: 556 },
  { propertyPattern: 'AHS Premium Apart 2 Pools', channel: 'airbnb', checkIn: '2026-09-10', checkOut: '2026-09-17', guestName: 'Paulo Souza', adults: 3, children: 1, totalPrice: 891.9 },
  { propertyPattern: 'AHS Premium Apart 2 Pools', channel: 'airbnb', checkIn: '2026-09-01', checkOut: '2026-09-06', guestName: 'Marcos Ibanez', adults: 2, children: 0, totalPrice: 300 },
  // AHS T1 Armação de Pêra (Piscina)
  { propertyPattern: 'AHS T1 Armação de Pêra%Piscina', channel: 'booking', checkIn: '2026-07-20', checkOut: '2026-07-28', guestName: 'Silvia Pirata', adults: 3, children: 1, totalPrice: 840 },
  { propertyPattern: 'AHS T1 Armação de Pêra%Piscina', channel: 'booking', checkIn: '2026-07-28', checkOut: '2026-07-31', guestName: 'Rute Moraes', adults: 2, children: 0, totalPrice: 250 },
  { propertyPattern: 'AHS T1 Armação de Pêra%Piscina', channel: 'airbnb', checkIn: '2026-08-01', checkOut: '2026-08-15', guestName: 'Familia Proprietário', adults: 1, children: 0, totalPrice: 0 },
  { propertyPattern: 'AHS T1 Armação de Pêra%Piscina', channel: 'booking', checkIn: '2026-08-15', checkOut: '2026-08-20', guestName: 'Paula Carqueija', adults: 4, children: 0, totalPrice: 556 },
  { propertyPattern: 'AHS T1 Armação de Pêra%Piscina', channel: 'booking', checkIn: '2026-08-20', checkOut: '2026-08-23', guestName: 'Marta Pereira', adults: 2, children: 0, totalPrice: 330 },
  { propertyPattern: 'AHS T1 Armação de Pêra%Piscina', channel: 'booking', checkIn: '2026-08-23', checkOut: '2026-08-29', guestName: 'Lilian Martins', adults: 2, children: 2, totalPrice: 615 },
  { propertyPattern: 'AHS T1 Armação de Pêra%Piscina', channel: 'booking', checkIn: '2026-08-29', checkOut: '2026-09-04', guestName: 'Miguel Ginja', adults: 2, children: 2, totalPrice: 570 },
  { propertyPattern: 'AHS T1 Armação de Pêra%Piscina', channel: 'booking', checkIn: '2026-09-05', checkOut: '2026-09-12', guestName: 'Katia Martins', adults: 2, children: 0, totalPrice: 470 },
]

function matchProperty(name: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/%/g, '.*') + '.*$', 'i')
  return regex.test(name)
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const sb = createClient(supabaseUrl, supabaseKey)

  const { data: properties, error: propsError } = await sb
    .from('properties')
    .select('id, name')
    .eq('organization_id', ORG_ID)
    .ilike('name', '%AHS%')

  if (propsError || !properties?.length) {
    console.error('Failed to load AHS properties:', propsError)
    process.exit(1)
  }

  const { data: channels, error: channelsError } = await sb
    .from('channel_connections')
    .select('id, channel, organization_id, status')
    .eq('organization_id', ORG_ID)

  if (channelsError) {
    console.error('Failed to load channel connections:', channelsError)
    process.exit(1)
  }

  const channelByName = new Map<string, string>()
  for (const ch of channels ?? []) {
    channelByName.set(ch.channel.toLowerCase(), ch.id)
  }

  // Fallback: any active channel in the system (matches new reservation page behavior)
  if (!channelByName.has('booking') || !channelByName.has('airbnb')) {
    const { data: fallbackChannels } = await sb
      .from('channel_connections')
      .select('id, channel')
      .eq('status', 'active')

    for (const ch of fallbackChannels ?? []) {
      const key = ch.channel.toLowerCase()
      if (!channelByName.has(key)) channelByName.set(key, ch.id)
    }
  }

  const createdAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  const rows: Record<string, unknown>[] = []
  const missing: string[] = []

  for (let i = 0; i < RESERVATIONS.length; i++) {
    const r = RESERVATIONS[i]
    const property = properties.find(p => matchProperty(p.name, r.propertyPattern))
    const channelId = channelByName.get(r.channel)

    if (!property) {
      missing.push(`property:${r.propertyPattern}`)
      continue
    }
    if (!channelId) {
      missing.push(`channel:${r.channel}`)
      continue
    }

    rows.push({
      organization_id: ORG_ID,
      property_id: property.id,
      channel_connection_id: channelId,
      check_in: r.checkIn,
      check_out: r.checkOut,
      reservation_status: 'confirmed',
      guest_name: r.guestName,
      guest_email: null,
      guest_phone: null,
      adults: r.adults,
      children: r.children,
      number_of_guests: r.adults + r.children,
      total_price: r.totalPrice,
      currency: 'EUR',
      external_reservation_id: `${r.channel}-restore-${r.checkIn}-${i + 1}`,
      created_at: createdAt,
      updated_at: createdAt,
    })
  }

  console.log(`Prepared ${rows.length}/${RESERVATIONS.length} reservations`)
  if (missing.length) {
    console.warn('Missing lookups:', [...new Set(missing)])
  }

  if (dryRun) {
    console.log('Dry run — no inserts performed.')
    console.log('Sample row:', rows[0])
    return
  }

  const { data, error } = await sb.from('reservations').insert(rows).select('id, guest_name, check_in, check_out, total_price')

  if (error) {
    console.error('Insert failed:', error)
    process.exit(1)
  }

  const totalRevenue = (data ?? []).reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)
  console.log(`Inserted ${data?.length ?? 0} reservations — total revenue: €${totalRevenue.toFixed(2)}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
