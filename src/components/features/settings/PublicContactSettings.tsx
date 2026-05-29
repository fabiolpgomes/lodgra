'use client'

import { useState } from 'react'
import { Mail, MessageCircle, Phone, Save } from 'lucide-react'

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
          <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <MessageCircle className="h-4 w-4 text-gray-600" />
            WhatsApp
          </span>
          <input
            value={form.whatsapp_number}
            onChange={(event) => updateField('whatsapp_number', event.target.value)}
            placeholder="+55 11 99999-9999"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Mail className="h-4 w-4 text-gray-600" />
            Email
          </span>
          <input
            value={form.contact_email}
            onChange={(event) => updateField('contact_email', event.target.value)}
            placeholder="reservas@empresa.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <Phone className="h-4 w-4 text-gray-600" />
            Telefone
          </span>
          <input
            value={form.contact_phone}
            onChange={(event) => updateField('contact_phone', event.target.value)}
            placeholder="+351 900 000 000"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700">Mensagem pública</span>
        <input
          value={form.public_contact_message}
          onChange={(event) => updateField('public_contact_message', event.target.value)}
          maxLength={180}
          placeholder="Fale connosco para reservas, dúvidas ou condições especiais."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Website</span>
          <input
            value={form.website_url}
            onChange={(event) => updateField('website_url', event.target.value)}
            placeholder="https://empresa.com"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Instagram</span>
          <input
            value={form.instagram_url}
            onChange={(event) => updateField('instagram_url', event.target.value)}
            placeholder="https://instagram.com/empresa"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block md:col-span-3">
          <span className="mb-1 block text-sm font-medium text-gray-700">Endereço</span>
          <input
            value={form.address_line}
            onChange={(event) => updateField('address_line', event.target.value)}
            placeholder="Rua, número, bairro"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Cidade</span>
          <input
            value={form.city}
            onChange={(event) => updateField('city', event.target.value)}
            placeholder="Lisboa"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">País</span>
          <input
            value={form.country}
            onChange={(event) => updateField('country', event.target.value)}
            placeholder="Portugal"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {message && <p className="text-sm font-medium text-green-700">{message}</p>}
      {error && <p className="text-sm font-medium text-red-700">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {saving ? 'A guardar...' : 'Guardar contatos públicos'}
      </button>
    </div>
  )
}
