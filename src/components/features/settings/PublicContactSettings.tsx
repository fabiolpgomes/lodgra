'use client'

import { useState } from 'react'
import { Mail, MessageCircle, Phone, Save } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'

export interface PublicContactProfile {
  organization_id: string
  contact_email: string | null
  contact_phone: string | null
  whatsapp_number: string | null
  website_url: string | null
  instagram_url: string | null
  public_contact_message: string | null
  address_line: string | null
  city: string | null
  country: string | null
}

interface Props {
  organizationId: string
  initialProfile: Partial<PublicContactProfile> | null
}

type PublicContactFormField =
  | 'contact_email'
  | 'contact_phone'
  | 'whatsapp_number'
  | 'website_url'
  | 'instagram_url'
  | 'public_contact_message'
  | 'address_line'
  | 'city'
  | 'country'

function toFormValue(value: string | null | undefined) {
  return value ?? ''
}

export function PublicContactSettings({ organizationId, initialProfile }: Props) {
  const [form, setForm] = useState({
    contact_email: toFormValue(initialProfile?.contact_email),
    contact_phone: toFormValue(initialProfile?.contact_phone),
    whatsapp_number: toFormValue(initialProfile?.whatsapp_number),
    website_url: toFormValue(initialProfile?.website_url),
    instagram_url: toFormValue(initialProfile?.instagram_url),
    public_contact_message: toFormValue(initialProfile?.public_contact_message),
    address_line: toFormValue(initialProfile?.address_line),
    city: toFormValue(initialProfile?.city),
    country: toFormValue(initialProfile?.country),
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateField = (field: PublicContactFormField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/public-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erro ao guardar contatos')

      setForm({
        contact_email: toFormValue(data.contact_email),
        contact_phone: toFormValue(data.contact_phone),
        whatsapp_number: toFormValue(data.whatsapp_number),
        website_url: toFormValue(data.website_url),
        instagram_url: toFormValue(data.instagram_url),
        public_contact_message: toFormValue(data.public_contact_message),
        address_line: toFormValue(data.address_line),
        city: toFormValue(data.city),
        country: toFormValue(data.country),
      })
      setMessage('Contatos públicos guardados com sucesso.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar contatos')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-text-dark">
            <MessageCircle className="h-4 w-4 text-brand-text-medium" />
            WhatsApp
          </span>
          <Input
            value={form.whatsapp_number}
            onChange={(event) => updateField('whatsapp_number', event.target.value)}
            placeholder="+55 11 99999-9999"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-text-dark">
            <Mail className="h-4 w-4 text-brand-text-medium" />
            Email
          </span>
          <Input
            value={form.contact_email}
            onChange={(event) => updateField('contact_email', event.target.value)}
            placeholder="reservas@empresa.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-text-dark">
            <Phone className="h-4 w-4 text-brand-text-medium" />
            Telefone
          </span>
          <Input
            value={form.contact_phone}
            onChange={(event) => updateField('contact_phone', event.target.value)}
            placeholder="+351 900 000 000"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-brand-text-dark">Mensagem pública</span>
        <Input
          value={form.public_contact_message}
          onChange={(event) => updateField('public_contact_message', event.target.value)}
          maxLength={180}
          placeholder="Fale connosco para reservas, dúvidas ou condições especiais."
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-brand-text-dark">Website</span>
          <Input
            value={form.website_url}
            onChange={(event) => updateField('website_url', event.target.value)}
            placeholder="https://empresa.com"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-brand-text-dark">Instagram</span>
          <Input
            value={form.instagram_url}
            onChange={(event) => updateField('instagram_url', event.target.value)}
            placeholder="https://instagram.com/empresa"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block md:col-span-3">
          <span className="mb-1 block text-sm font-medium text-brand-text-dark">Endereço</span>
          <Input
            value={form.address_line}
            onChange={(event) => updateField('address_line', event.target.value)}
            placeholder="Rua, número, bairro"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-brand-text-dark">Cidade</span>
          <Input
            value={form.city}
            onChange={(event) => updateField('city', event.target.value)}
            placeholder="Lisboa"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-brand-text-dark">País</span>
          <Input
            value={form.country}
            onChange={(event) => updateField('country', event.target.value)}
            placeholder="Portugal"
          />
        </label>
      </div>

      {message && <p className="text-sm font-medium text-emerald-800">{message}</p>}
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}

      <Button
        type="button"
        onClick={save}
        variant="premium-primary"
        size="premium-md"
        disabled={saving}
        className="w-full sm:w-auto"
      >
        <Save className="h-4 w-4" />
        {saving ? 'A guardar...' : 'Guardar contatos públicos'}
      </Button>
    </div>
  )
}
