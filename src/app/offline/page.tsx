'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Sem ligacao
        </h1>
        <p className="text-gray-600 mb-6">
          Nao foi possivel ligar ao servidor. Verifique a sua ligacao a internet e tente novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
