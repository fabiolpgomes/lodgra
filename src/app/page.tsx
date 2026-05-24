import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lodgra — Gestão Profissional de Aluguel por Temporada',
  robots: { index: true, follow: true },
}

export default function RootPage() {
  redirect('/pt-BR/landing-vp')
}

