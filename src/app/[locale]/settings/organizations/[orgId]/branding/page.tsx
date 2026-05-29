"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { LayoutDashboard } from "lucide-react"

interface BrandingData {
  id: string | null
  organization_id: string
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  secondary_color: string
  accent_color: string
  created_at: string | null
  updated_at: string | null
}

export default function BrandingPage(props: { params: Promise<{ orgId: string; locale: string }> }) {
  const [branding, setBranding] = useState<BrandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [orgId, setOrgId] = useState<string>("")
  const [locale, setLocale] = useState<string>("pt-BR")

  const [formData, setFormData] = useState({
    primary_color: "#1E40AF",
    secondary_color: "#6B7280",
    accent_color: "#FFC000",
  })

  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const resolveParams = async () => {
      const params = await props.params
      setOrgId(params.orgId)
      setLocale(params.locale)

      try {
        const response = await fetch(`/api/organizations/${params.orgId}/branding-admin`)
        if (!response.ok) throw new Error("Failed to load branding")
        const data = await response.json()
        setBranding(data)
        setFormData({
          primary_color: data.primary_color || "#1E40AF",
          secondary_color: data.secondary_color || "#6B7280",
          accent_color: data.accent_color || "#FFC000",
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load branding")
      } finally {
        setLoading(false)
      }
    }

    resolveParams()
  }, [props.params])

  const handleColorChange = (field: "primary_color" | "secondary_color" | "accent_color", value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveColors = async () => {
    if (!orgId) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/branding/colors`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save colors")
      }

      const data = await response.json()
      setBranding(data)
      setSuccess("Cores atualizadas com sucesso")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save colors")
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File, type: "logo" | "favicon") => {
    if (!orgId) return
    const formDataToSend = new FormData()
    formDataToSend.append(type, file)

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/organizations/${orgId}/branding/upload`, {
        method: "POST",
        body: formDataToSend,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Upload failed")
      }

      const data = await response.json()
      setBranding(data)
      setSuccess(`${type === "logo" ? "Logotipo" : "Ícone"} enviado com sucesso`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Logo e marca da empresa</h1>
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <LayoutDashboard className="h-4 w-4" />
          Voltar ao Dashboard
        </Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded">{success}</div>}

      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Logotipo</h2>
        <div className="flex items-center gap-4 mb-4">
          {branding?.logo_url && <img src={branding.logo_url} alt="Logotipo da empresa" className="h-[100px] w-[100px] object-contain" />}
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={saving}
            className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
          >
            {branding?.logo_url ? "Alterar logotipo" : "Enviar logotipo"}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={e => {
              const file = e.currentTarget.files?.[0]
              if (file) handleFileUpload(file, "logo")
            }}
            hidden
          />
          <p className="text-sm text-gray-600">PNG ou JPEG, até 2MB</p>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Ícone do site</h2>
        <button
          onClick={() => faviconInputRef.current?.click()}
          disabled={saving}
          className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50"
        >
          {branding?.favicon_url ? "Alterar ícone" : "Enviar ícone"}
        </button>
        <input
          ref={faviconInputRef}
          type="file"
          accept="image/png,image/x-icon"
          onChange={e => {
            const file = e.currentTarget.files?.[0]
            if (file) handleFileUpload(file, "favicon")
          }}
          hidden
        />
        <p className="text-sm text-gray-600 mt-2">PNG ou ICO, até 512KB</p>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Cores da marca</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Cor principal</label>
            <div className="flex items-center gap-2">
              <input type="color" value={formData.primary_color} onChange={e => handleColorChange("primary_color", e.target.value)} className="w-16 h-16 border rounded cursor-pointer" />
              <input type="text" value={formData.primary_color} onChange={e => handleColorChange("primary_color", e.target.value)} className="flex-1 px-3 py-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cor secundária</label>
            <div className="flex items-center gap-2">
              <input type="color" value={formData.secondary_color} onChange={e => handleColorChange("secondary_color", e.target.value)} className="w-16 h-16 border rounded cursor-pointer" />
              <input type="text" value={formData.secondary_color} onChange={e => handleColorChange("secondary_color", e.target.value)} className="flex-1 px-3 py-2 border rounded" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cor de destaque</label>
            <div className="flex items-center gap-2">
              <input type="color" value={formData.accent_color} onChange={e => handleColorChange("accent_color", e.target.value)} className="w-16 h-16 border rounded cursor-pointer" />
              <input type="text" value={formData.accent_color} onChange={e => handleColorChange("accent_color", e.target.value)} className="flex-1 px-3 py-2 border rounded" />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSaveColors} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            Guardar cores
          </button>
          <button onClick={() => setShowPreview(!showPreview)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
            {showPreview ? "Fechar prévia" : "Prévia"}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Prévia</h2>
          <div className="border rounded p-4 bg-white" style={{ "--color-primary": formData.primary_color, "--color-secondary": formData.secondary_color, "--color-accent": formData.accent_color } as React.CSSProperties}>
            <div className="flex items-center gap-4 mb-4">
              {branding?.logo_url && <img src={branding.logo_url} alt="Prévia do logotipo" className="h-[60px] w-[60px] object-contain" />}
              <h3 className="text-xl font-semibold" style={{ color: formData.primary_color }}>
                Reservar agora
              </h3>
            </div>
            <button style={{ backgroundColor: formData.primary_color }} className="px-6 py-2 text-white rounded hover:opacity-90">
              Procurar propriedades
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
