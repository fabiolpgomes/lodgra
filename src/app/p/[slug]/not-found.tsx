import Link from 'next/link'

export default function PropertyNotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <header className="absolute top-0 left-0 right-0 border-b border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <span className="font-semibold text-gray-900 text-lg">homestay.pt</span>
        </div>
      </header>

      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Propriedade não encontrada</h2>
        <p className="text-gray-500 mb-6">
          Esta propriedade não existe ou não está disponível publicamente.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          Ir para o início
        </Link>
      </div>
    </div>
  )
}
