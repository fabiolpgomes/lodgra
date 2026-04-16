'use client'

import { useState } from 'react'
import { Home, Loader2, Info, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface Props {
  onNext: (propertyId: string) => void
  onSkip: () => void
}

export function Step2Property({ onNext, onSkip }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [limitReached, setLimitReached] = useState<{ limit: number; plan: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    setLimitReached(null)

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), address: address.trim() || null }),
      })
      const data = await res.json()

      if (res.status === 403 && data.error === 'property_limit_reached') {
        setLimitReached({ limit: data.limit, plan: data.plan })
        return
      }

      if (!res.ok) {
        setError(data.error || 'Erro ao criar imóvel')
        return
      }

      onNext(data.id)
    } catch {
      setError('Erro de ligação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-green-100 rounded-full">
          <Home className="h-10 w-10 text-green-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
        Adicione o seu primeiro imóvel
      </h2>
      <p className="text-gray-500 text-center text-sm mb-6">
        Pode adicionar mais imóveis a qualquer momento no painel de gestão.
      </p>

      {/* Dica */}
      <div className="flex gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Um imóvel pode ter vários anúncios — por exemplo o mesmo apartamento anunciado no Airbnb e no Booking ao mesmo tempo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="property-name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome do imóvel <span className="text-red-500">*</span>
          </Label>
          <Input
            id="property-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Apartamento Lisboa Centro"
            required
          />
          <p className="text-xs text-gray-400 mt-1">Use um nome que o ajude a identificar facilmente.</p>
        </div>

        <div>
          <Label htmlFor="property-address" className="block text-sm font-medium text-gray-700 mb-1">
            Endereço <span className="text-gray-400">(opcional)</span>
          </Label>
          <Input
            id="property-address"
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Ex: Rua Augusta, 100, Lisboa"
          />
        </div>

        {limitReached && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Limite de {limitReached.limit} {limitReached.limit === 1 ? 'propriedade' : 'propriedades'} atingido.
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                Faça upgrade do plano para adicionar mais propriedades.{' '}
                <Link href="/#pricing" className="font-medium underline hover:text-amber-900">Ver planos</Link>
              </p>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar imóvel e continuar →
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          className="w-full text-sm text-gray-400"
        >
          Saltar por agora
        </Button>
      </form>
    </div>
  )
}
