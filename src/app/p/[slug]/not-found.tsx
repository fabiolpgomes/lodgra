import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Propriedade não encontrada | Lodgra',
  description: 'Esta propriedade não existe ou não está disponível publicamente.',
  robots: { index: false, follow: false },
}

export default function PropertyNotFound() {
  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center px-4">
      <header className="absolute top-0 left-0 right-0 border-b border-brand-gold/15 bg-brand-white px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <span className="font-semibold text-brand-blue text-lg">lodgra.pt</span>
        </div>
      </header>

      <div className="max-w-md rounded-2xl border border-brand-gold/15 bg-brand-white p-8 text-center shadow-sm">
        <h1 className="text-6xl font-bold text-brand-gold mb-4">404</h1>
        <h2 className="text-xl font-semibold text-brand-text-dark mb-2">Propriedade não encontrada</h2>
        <p className="text-brand-text-medium mb-6">
          Esta propriedade não existe ou não está disponível publicamente.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-brand-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-gold transition-colors"
        >
          Ir para o início
        </Link>
      </div>
    </div>
  )
}
