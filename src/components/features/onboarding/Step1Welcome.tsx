'use client'

import { Building2, ExternalLink, Globe2 } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Logo } from '@/components/common/ui/Logo'

interface Props {
  orgName: string
  onOrgNameChange: (v: string) => void
  onNext: () => void
  loading?: boolean
  error?: string | null
  buttonLabel?: string
  buttonDisabled?: boolean
  organizationCode?: string | null
}

function previewSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)

  return slug || 'sua-empresa'
}

export function Step1Welcome({
  orgName,
  onOrgNameChange,
  onNext,
  loading = false,
  error,
  buttonLabel,
  buttonDisabled = false,
  organizationCode,
}: Props) {
  const slug = previewSlug(orgName)

  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <Logo size="lg" />
      </div>

      <div className="flex justify-center mb-5">
        <div className="p-4 bg-brand-100 rounded-full">
          <Building2 className="h-9 w-9 text-brand-700" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-lodgra-blue mb-2" style={{ fontFamily: 'var(--font-poppins, Poppins, sans-serif)' }}>
        Configure a sua empresa
      </h1>
      <p className="text-gray-600 mb-8 max-w-sm mx-auto">
        Este nome cria o seu canal direto de reservas com subdomínio próprio.
      </p>

      {organizationCode && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-left mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Código da organização</p>
          <p className="font-mono text-sm text-gray-700 break-all mt-1">{organizationCode}</p>
        </div>
      )}

      <div className="text-left mb-6">
        <Label htmlFor="org-name" className="block text-sm font-medium text-gray-700 mb-1">
          Nome da organização ou empresa
        </Label>
        <Input
          id="org-name"
          type="text"
          value={orgName}
          onChange={e => onOrgNameChange(e.target.value)}
          placeholder="Ex: Alojamentos Silva"
        />
        <p className="text-xs text-gray-500 mt-1">
          Pode ser o nome da empresa, marca ou alojamento.
        </p>
      </div>

      <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-left mb-6">
        <div className="flex items-start gap-3">
          <Globe2 className="h-5 w-5 text-brand-700 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-950 mb-1">Link público da sua empresa</p>
            <p className="font-mono text-sm text-brand-800 break-all">
              https://{slug}.lodgra.io/booking
            </p>
            <p className="text-xs text-brand-700 mt-2">
              Se este subdomínio já existir, a Lodgra adiciona um sufixo automaticamente.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700 mb-5">
          {error}
        </div>
      )}

      <Button
        onClick={onNext}
        disabled={!orgName.trim() || loading || buttonDisabled}
        className="w-full max-w-sm"
      >
        {loading ? 'A guardar...' : buttonLabel || (
          <>
            Guardar empresa e continuar
            <ExternalLink className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}
