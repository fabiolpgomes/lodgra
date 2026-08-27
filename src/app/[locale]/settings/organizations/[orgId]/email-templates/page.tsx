"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize from "rehype-sanitize"
import { LayoutDashboard, Mail, Send, Sparkles, SquarePen, Wand2 } from "lucide-react"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Input } from "@/components/common/ui/input"
import { Label } from "@/components/common/ui/label"
import { Switch } from "@/components/common/ui/switch"
import { Textarea } from "@/components/common/ui/textarea"
import { getBookingConfirmationSubject } from "@/lib/email/booking-locale"

interface EmailTemplateData {
  id: string | null
  organization_id: string
  organization_name: string
  confirmation_subject: string
  confirmation_message: string | null
  from_email: string
  from_name: string
  reply_to_email: string | null
  include_company_logo: boolean
  footer_text: string | null
  created_at: string | null
  updated_at: string | null
  branding: {
    logo_url: string | null
    primary_color: string
    secondary_color: string
    accent_color: string
  }
  defaults?: {
    confirmation_subject: string
    confirmation_message: string | null
    from_email: string
    from_name: string
    reply_to_email: string | null
    include_company_logo: boolean
    footer_text: string | null
    organization_id: string
    id: string | null
    created_at: string | null
    updated_at: string | null
  }
}

const emptyForm = {
  confirmation_subject: '',
  confirmation_message: '',
  from_email: '',
  from_name: '',
  reply_to_email: '',
  include_company_logo: true,
  footer_text: '',
}

export default function EmailTemplatesPage(props: { params: Promise<{ orgId: string; locale: string }> }) {
  const [orgId, setOrgId] = useState('')
  const [locale, setLocale] = useState('pt-BR')
  const [template, setTemplate] = useState<EmailTemplateData | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const params = await props.params
      if (!mounted) return
      setOrgId(params.orgId)
      setLocale(params.locale)

      try {
        const response = await fetch(`/api/organizations/${params.orgId}/email-templates`)
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || 'Falha ao carregar template')
        }

        const data = await response.json() as EmailTemplateData
        if (!mounted) return
        setTemplate(data)
        setForm({
          confirmation_subject: data.confirmation_subject || data.defaults?.confirmation_subject || '',
          confirmation_message: data.confirmation_message || '',
          from_email: data.from_email || data.defaults?.from_email || '',
          from_name: data.from_name || data.organization_name || '',
          reply_to_email: data.reply_to_email || '',
          include_company_logo: data.include_company_logo ?? true,
          footer_text: data.footer_text || '',
        })
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Falha ao carregar template')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [props.params])

  const subjectCount = form.confirmation_subject.length
  const messageCount = form.confirmation_message.length
  const previewMessage = form.confirmation_message || 'Obrigado por reservar connosco. A sua mensagem personalizada aparece aqui.'

  const colorPreview = useMemo(() => {
    return template?.branding || {
      logo_url: null,
      primary_color: '#1E40AF',
      secondary_color: '#6B7280',
      accent_color: '#FFC000',
    }
  }, [template])

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/email-templates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Falha ao guardar template')
      }

      setTemplate(payload)
      setSuccess('Template de email guardado com sucesso')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao guardar template')
    } finally {
      setSaving(false)
    }
  }

  const handleSendTest = async () => {
    if (!orgId) return
    setSendingTest(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/email-templates/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Falha ao enviar email de teste')
      }

      setSuccess(`Email de teste enviado para ${payload.recipient}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar email de teste')
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-[#717171]">Carregando templates de email...</div>
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E5DFD2] bg-[#FBFAF6] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#4D5566]">
            <Mail className="h-3.5 w-3.5" />
            Marca do email
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#1B2430]">
            Templates de confirmação
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#4D5566]">
            Personalize o assunto, o remetente e a mensagem para que os emails saiam com a marca da empresa.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href={`/${locale}/settings/organizations/${orgId}/branding`}>
              <Sparkles className="h-4 w-4" />
              Marca
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href={`/${locale}/dashboard`}>
              <LayoutDashboard className="h-4 w-4" />
              Painel
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-[#E5DFD2] bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1B2430]">
              <SquarePen className="h-5 w-5 text-[#10203E]" />
              Configuração do template
            </CardTitle>
            <CardDescription>
              Defina o conteúdo e o remetente usado nas confirmações de reserva.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirmation_subject">Assunto</Label>
                <Input
                  id="confirmation_subject"
                  value={form.confirmation_subject}
                  onChange={(event) => updateForm('confirmation_subject', event.target.value)}
                  placeholder={template?.defaults?.confirmation_subject || getBookingConfirmationSubject(template?.organization_name || 'Empresa', locale)}
                  maxLength={100}
                />
                <p className="text-xs text-[#717171]">{subjectCount}/100 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_email">Email de envio</Label>
                <Input
                  id="from_email"
                  value={form.from_email}
                  onChange={(event) => updateForm('from_email', event.target.value)}
                  placeholder="noreply@lodgra.io"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from_name">Nome do remetente</Label>
                <Input
                  id="from_name"
                  value={form.from_name}
                  onChange={(event) => updateForm('from_name', event.target.value)}
                  placeholder={template?.organization_name || 'Nome da empresa'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reply_to_email">Email de resposta</Label>
                <Input
                  id="reply_to_email"
                  value={form.reply_to_email}
                  onChange={(event) => updateForm('reply_to_email', event.target.value)}
                  placeholder="support@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="include_company_logo" className="mb-2 block">Incluir logotipo da empresa</Label>
                <div className="flex items-center justify-between rounded-md border border-[#E5DFD2] bg-[#FBFAF6] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1B2430]">Marca no cabeçalho</p>
                    <p className="text-xs text-[#717171]">Use o logotipo da organização no cabeçalho do email.</p>
                  </div>
                  <Switch
                    id="include_company_logo"
                    checked={form.include_company_logo}
                    onCheckedChange={(checked) => updateForm('include_company_logo', checked)}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirmation_message">Mensagem de confirmação</Label>
                <Textarea
                  id="confirmation_message"
                  value={form.confirmation_message}
                  onChange={(event) => updateForm('confirmation_message', event.target.value)}
                  rows={8}
                  placeholder="Escreva aqui a mensagem personalizada em markdown..."
                />
                <p className="text-xs text-[#717171]">{messageCount}/5000 caracteres</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="footer_text">Texto do rodapé</Label>
                <Input
                  id="footer_text"
                  value={form.footer_text}
                  onChange={(event) => updateForm('footer_text', event.target.value)}
                  placeholder="Obrigado por reservar connosco"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
              <Button onClick={handleSave} disabled={saving} className="w-full bg-[#10203E] hover:bg-[#0c1830] sm:w-auto">
                <Wand2 className="h-4 w-4" />
                {saving ? 'A guardar...' : 'Guardar'}
              </Button>
              <Button variant="outline" onClick={handleSendTest} disabled={sendingTest} className="w-full sm:w-auto">
                <Send className="h-4 w-4" />
                {sendingTest ? 'A enviar...' : 'Enviar email de teste'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E5DFD2] bg-[#FBFAF6]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1B2430]">
              <Mail className="h-5 w-5 text-[#C9A227]" />
              Pré-visualização
            </CardTitle>
            <CardDescription>
              Como o template fica com a mensagem atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="rounded-2xl border border-[#E5DFD2] bg-white p-5 shadow-sm"
              style={{
                borderColor: colorPreview.secondary_color,
                borderWidth: '1px',
                boxShadow: '0 8px 24px rgba(16, 32, 62, 0.08)',
              }}
            >
              <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: colorPreview.secondary_color }}>
                {form.include_company_logo && colorPreview.logo_url ? (
                  <img src={colorPreview.logo_url} alt={template?.organization_name || 'Logo'} className="h-12 w-12 rounded-md object-contain" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md text-white" style={{ backgroundColor: colorPreview.primary_color }}>
                    <Mail className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: colorPreview.primary_color }}>
                    {template?.organization_name || 'Organization'}
                  </p>
                  <p className="text-lg font-semibold text-[#1B2430]">
                    {form.confirmation_subject || template?.defaults?.confirmation_subject || getBookingConfirmationSubject(template?.organization_name || 'Empresa', locale)}
                  </p>
                </div>
              </div>

              <div className="space-y-4 py-4">
                  <p className="text-sm text-[#4D5566]">
                  Olá <strong>John Doe</strong>,
                </p>
                <div className="prose prose-sm max-w-none text-[#1B2430]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                    {previewMessage}
                  </ReactMarkdown>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(201, 162, 39, 0.12)' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: colorPreview.primary_color }}>
                    Detalhes da reserva
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[#1B2430]">
                    <li>Propriedade: Demo Property</li>
                    <li>Check-in: 12 de setembro de 2026</li>
                    <li>Check-out: 15 de setembro de 2026</li>
                    <li>Total: EUR 1250.00</li>
                  </ul>
                </div>
                <button
                  className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: colorPreview.primary_color }}
                >
                  Ver reserva
                </button>
              </div>

              {form.footer_text && (
                <div className="border-t pt-4 text-center text-xs text-[#717171]" style={{ borderColor: colorPreview.secondary_color }}>
                  {form.footer_text}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#E5DFD2] bg-white p-4">
              <p className="text-sm font-semibold text-[#1B2430]">Variáveis do template</p>
              <p className="mt-2 text-xs text-[#4D5566]">
                Use <code>{'{{customerName}}'}</code>, <code>{'{{propertyName}}'}</code>, <code>{'{{checkInDate}}'}</code>, <code>{'{{checkOutDate}}'}</code>, <code>{'{{totalPrice}}'}</code> e <code>{'{{currency}}'}</code>.
              </p>
            </div>

            <div className="rounded-xl border border-[#E5DFD2] bg-white p-4">
              <p className="text-sm font-semibold text-[#1B2430]">Ação administrativa</p>
              <p className="mt-2 text-xs text-[#4D5566]">
                O email de teste será enviado para o teu endereço autenticado, ou para `EMAIL_ADMIN` se não estiver disponível.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
