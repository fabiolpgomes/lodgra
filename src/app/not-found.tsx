import Link from 'next/link'
import { Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <div className="flex items-center justify-center gap-2 -mt-6">
            <Search className="h-8 w-8 text-gray-400" />
            <h2 className="text-2xl font-semibold text-gray-900">
              Página não encontrada
            </h2>
          </div>
          <p className="text-gray-600 mt-4">
            A página que procura não existe ou foi movida.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link href="/">
              <Home className="h-5 w-5" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
