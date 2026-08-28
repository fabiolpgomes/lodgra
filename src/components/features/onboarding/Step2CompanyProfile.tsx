'use client'

import { useEffect, useRef, useState } from 'react'
import { Globe2, Mail, MessageCircle, Palette, Phone, Sparkles, Upload } from 'lucide-react'

import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'

interface Props {
  organizationId: string | null
  initialOrgName: string
}

function normalizeValue(value: string | null | undefined) {
  return value ?? ''
}

function normalizeWebsite(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function safeColor(value: string, fallback: string) {
  return /^#([0-9a-f]{6})$/i.test(value) ? value : fallback
}

export function Step2CompanyProfile({ organizationId, initialOrgName }: Props) {
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [orgName, setOrgName] = useState(initialOrgName)
  const [form, setForm] = useState({
    primary_color: '#10203E',
    secondary_color: '#C9A227',
    contact_email: '',
    contact_phone: '',
    whatsapp_number: '',
    website_url: '',
  })

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }

    const objectUrl = URL.createObjectURL(logoFile)
    setLogoPreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [logoFile])

  useEffect(() => {
    setOrgName(initialOrgName)
  }, [initialOrgName])

  useEffect(() => {
    let active = true

    async function load() {
      if (!organizationId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const [brandingRes, profileRes] = await Promise.all([
          fetch(`/api/organizations/${organizationId}/branding-admin`, { cache: 'no-store' }),
          fetch(`/api/organizations/${organizationId}/public-profile`, { cache: 'no-store' }),
        ])

        const branding = brandingRes.ok ? await brandingRes.json() : null
        const profile = profileRes.ok ? await profileRes.json() : null

        if (!active) return

        setCurrentLogoUrl(branding?.logo_url ?? null)
        setForm({
          primary_color: safeColor(branding?.primary_color ?? '', '#10203E'),
          secondary_color: safeColor(branding?.secondary_color ?? '', '#C9A227'),
          contact_email: normalizeValue(profile?.contact_email),
          contact_phone: normalizeValue(profile?.contact_phone),
          whatsapp_number: normalizeValue(profile?.whatsapp_number),
          website_url: normalizeValue(profile?.website_url),
        })
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar dados da empresa')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [organizationId])

  const logoSource = logoPreview || currentLogoUrl
  const previewCompanyName = orgName || 'A sua empresa'

  async function handleSave() {
    if (!organizationId) {
      setError('Ainda não foi possível identificar a organização.')
      return
    }

    if (!orgName.trim()) {
      setError('O nome da empresa é obrigatório.')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const orgRes = await fetch('/api/organization/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: orgName.trim() }),
      })

      if (!orgRes.ok) {
        const data = await orgRes.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao atualizar o nome da empresa')
      }

      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)

        const uploadRes = await fetch(`/api/organizations/${organizationId}/branding/upload`, {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => ({}))
          throw new Error(data.error || 'Erro ao enviar logotipo')
        }
      }

      const colorsRes = await fetch(`/api/organizations/${organizationId}/branding/colors`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_color: form.primary_color,
          secondary_color: form.secondary_color,
        }),
      })

      if (!colorsRes.ok) {
        const data = await colorsRes.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao guardar cores')
      }

      const profileRes = await fetch(`/api/organizations/${organizationId}/public-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          whatsapp_number: form.whatsapp_number,
          website_url: normalizeWebsite(form.website_url),
        }),
      })

      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao guardar contactos')
      }

      setSuccess('Dados da empresa guardados com sucesso.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Erro ao guardar dados da empresa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-brand-blue/10 bg-brand-blue/5 p-3 text-brand-blue">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brand-text-medium">
              Configuração da empresa
            </p>
            <h2 className="mt-1 text-xl font-semibold text-brand-text-dark sm:text-2xl">
              Dados da empresa
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-brand-text-medium">
              Estes campos alimentam o rodapé do PDF, os contactos públicos e a apresentação da sua marca.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200/60 bg-brand-bg/60 p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-neutral-200/60 bg-brand-white shadow-sm">
            {logoSource ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSource} alt="Pré-visualização do logotipo" className="h-full w-full object-contain p-1" />
            ) : (
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
                {previewCompanyName.slice(0, 2)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brand-text-medium">Prévia rápida</p>
            <p className="mt-1 text-sm font-semibold text-brand-text-dark">{previewCompanyName}</p>
            <p className="text-xs text-brand-text-medium">O PDF vai herdar estes dados quando estiverem preenchidos.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 text-left">
        <section className="rounded-2xl border border-neutral-200/60 bg-brand-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-text-medium" />
            <h3 className="text-sm font-semibold text-brand-text-dark">Identidade da empresa</h3>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-brand-text-dark">Nome da empresa</span>
            <Input
              value={orgName}
              onChange={event => setOrgName(event.target.value)}
              placeholder="Ex: Algarve Home Stay"
              className="h-11"
            />
            <p className="mt-2 text-xs text-brand-text-medium">
              Este nome aparece no dashboard, no PDF e nas páginas da marca.
            </p>
          </label>
        </section>

        <section className="rounded-2xl border border-neutral-200/60 bg-brand-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center gap-2">
            <Upload className="h-4 w-4 text-brand-text-medium" />
            <h3 className="text-sm font-semibold text-brand-text-dark">Logotipo</h3>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="premium-secondary"
              size="premium-sm"
              onClick={() => logoInputRef.current?.click()}
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              {logoFile || currentLogoUrl ? 'Alterar logotipo' : 'Enviar logotipo'}
            </Button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={event => {
                const file = event.currentTarget.files?.[0]
                setLogoFile(file || null)
              }}
            />
            <p className="text-xs text-brand-text-medium">
              PNG, JPEG ou WebP. Fica no PDF e nas páginas da marca.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200/60 bg-brand-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-4 w-4 text-brand-text-medium" />
            <h3 className="text-sm font-semibold text-brand-text-dark">Cores padrão</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-brand-text-dark">Cor principal</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={event => setForm(current => ({ ...current, primary_color: event.target.value }))}
                  className="h-11 w-11 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                />
                <Input
                  value={form.primary_color}
                  onChange={event => setForm(current => ({ ...current, primary_color: event.target.value }))}
                  placeholder="#10203E"
                  className="h-11"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-brand-text-dark">Cor secundária</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={event => setForm(current => ({ ...current, secondary_color: event.target.value }))}
                  className="h-11 w-11 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                />
                <Input
                  value={form.secondary_color}
                  onChange={event => setForm(current => ({ ...current, secondary_color: event.target.value }))}
                  placeholder="#C9A227"
                  className="h-11"
                />
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200/60 bg-brand-white p-5 shadow-2xs">
          <div className="mb-4 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-brand-text-medium" />
            <h3 className="text-sm font-semibold text-brand-text-dark">Contactos públicos</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-text-dark">
                <Mail className="h-4 w-4 text-brand-text-medium" />
                Email
              </span>
              <Input
                value={form.contact_email}
                onChange={event => setForm(current => ({ ...current, contact_email: event.target.value }))}
                placeholder="reservas@empresa.com"
                className="h-11"
              />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-text-dark">
                <Phone className="h-4 w-4 text-brand-text-medium" />
                Telefone
              </span>
              <Input
                value={form.contact_phone}
                onChange={event => setForm(current => ({ ...current, contact_phone: event.target.value }))}
                placeholder="+351 900 000 000"
                className="h-11"
              />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-text-dark">
                <MessageCircle className="h-4 w-4 text-brand-text-medium" />
                WhatsApp
              </span>
              <Input
                value={form.whatsapp_number}
                onChange={event => setForm(current => ({ ...current, whatsapp_number: event.target.value }))}
                placeholder="+351 900 000 000"
                className="h-11"
              />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-brand-text-dark">
                <Globe2 className="h-4 w-4 text-brand-text-medium" />
                Website
              </span>
              <Input
                value={form.website_url}
                onChange={event => setForm(current => ({ ...current, website_url: event.target.value }))}
                placeholder="www.empresa.com"
                className="h-11"
              />
            </label>
          </div>
        </section>
      </div>

      {loading && (
        <div className="mt-5 rounded-xl border border-dashed border-brand-border bg-brand-bg px-4 py-3 text-sm text-brand-text-medium">
          A carregar dados guardados...
        </div>
      )}

      {success && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!organizationId || saving || !orgName.trim()}
          variant="premium-primary"
          size="premium-md"
          className="w-full"
        >
          {saving ? 'A guardar dados...' : 'Guardar alterações'}
        </Button>
        <p className="mt-3 text-center text-xs text-brand-text-medium">
          Os dados guardados aqui alimentam a análise, o PDF e os contactos públicos.
        </p>
      </div>
    </div>
  )
}
