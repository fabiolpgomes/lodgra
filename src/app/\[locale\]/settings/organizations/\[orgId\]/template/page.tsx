'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { TemplateHero } from '@/components/booking/TemplateHero'
import { TemplateProperties } from '@/components/booking/TemplateProperties'

interface Template {
  id?: string
  booking_headline: string
  booking_subtitle?: string | null
  booking_description?: string | null
  featured_property_ids?: string[] | null
  show_all_properties: boolean
  hero_image_url?: string | null
  cta_button_text: string
  template_type: 'standard' | 'luxury' | 'budget'
}

interface Property {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  price_per_night?: number
}

export default function TemplateSettingsPage() {
  const params = useParams() as { locale: string; orgId: string }
  const orgId = params.orgId

  const [template, setTemplate] = useState<Template>({
    booking_headline: 'Our Properties',
    booking_subtitle: '',
    booking_description: '',
    featured_property_ids: [],
    show_all_properties: true,
    hero_image_url: '',
    cta_button_text: 'Book Now',
    template_type: 'standard',
  })

  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  // Fetch current template and properties
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [templateRes, propertiesRes] = await Promise.all([
          fetch(`/api/organizations/${orgId}/template`),
          fetch(`/api/organizations/${orgId}/properties`),
        ])

        if (templateRes.ok) {
          const data = await templateRes.json()
          setTemplate(data)
        }

        if (propertiesRes.ok) {
          const data = await propertiesRes.json()
          setProperties(data)
        }
      } catch (err) {
        setError('Failed to load template settings')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [orgId])

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      // Upload hero image if provided
      if (heroFile) {
        const formData = new FormData()
        formData.append('type', 'hero')
        formData.append('file', heroFile)

        const uploadRes = await fetch(`/api/organizations/${orgId}/template/upload`, {
          method: 'POST',
          body: formData,
        })

        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          template.hero_image_url = url
        } else {
          setError('Failed to upload hero image')
          setSaving(false)
          return
        }
      }

      // Save template
      const res = await fetch(`/api/organizations/${orgId}/template`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      })

      if (res.ok) {
        setSuccess('Template settings saved successfully')
        setHeroFile(null)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const error = await res.json()
        setError(error.message || 'Failed to save template')
      }
    } catch (err) {
      setError('An error occurred while saving')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading template settings...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Booking Page Template</h1>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-700">
                {success}
              </div>
            )}

            <div className="space-y-6">
              {/* Headline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Headline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={template.booking_headline}
                  onChange={(e) =>
                    setTemplate({ ...template, booking_headline: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Our Beautiful Properties"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {template.booking_headline.length}/100 characters
                </p>
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle</label>
                <input
                  type="text"
                  value={template.booking_subtitle || ''}
                  onChange={(e) =>
                    setTemplate({ ...template, booking_subtitle: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional subtitle"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  maxLength={500}
                  value={template.booking_description || ''}
                  onChange={(e) =>
                    setTemplate({ ...template, booking_description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                  placeholder="Markdown supported"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(template.booking_description || '').length}/500 characters (Markdown)
                </p>
              </div>

              {/* Hero Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hero Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {template.hero_image_url && (
                  <p className="text-xs text-gray-500 mt-2">Current: {template.hero_image_url}</p>
                )}
              </div>

              {/* Template Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Style
                </label>
                <select
                  value={template.template_type}
                  onChange={(e) =>
                    setTemplate({
                      ...template,
                      template_type: e.target.value as 'standard' | 'luxury' | 'budget',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="standard">Standard (Cards Grid)</option>
                  <option value="luxury">Luxury (Premium Spacing)</option>
                  <option value="budget">Budget (Compact List)</option>
                </select>
              </div>

              {/* CTA Button Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={template.cta_button_text}
                  onChange={(e) =>
                    setTemplate({ ...template, cta_button_text: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Book Now"
                />
              </div>

              {/* Featured Properties Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Featured Properties
                </label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() =>
                      setTemplate({
                        ...template,
                        show_all_properties: true,
                        featured_property_ids: [],
                      })
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      template.show_all_properties
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Show All
                  </button>
                  <button
                    onClick={() =>
                      setTemplate({
                        ...template,
                        show_all_properties: false,
                      })
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      !template.show_all_properties
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Featured Only
                  </button>
                </div>
              </div>

              {/* Featured Properties Multi-Select */}
              {!template.show_all_properties && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Featured Properties
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                    {properties.map((prop) => (
                      <label key={prop.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(template.featured_property_ids || []).includes(prop.id)}
                          onChange={(e) => {
                            const ids = template.featured_property_ids || []
                            setTemplate({
                              ...template,
                              featured_property_ids: e.target.checked
                                ? [...ids, prop.id]
                                : ids.filter((id) => id !== prop.id),
                            })
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">{prop.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex space-x-4 pt-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors lg:hidden"
                >
                  Preview
                </button>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="hidden lg:block">
            <div className="sticky top-8 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 bg-gray-100 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Preview</h2>
              </div>
              <div className="max-h-96 overflow-y-auto bg-gray-50">
                <TemplateHero
                  headline={template.booking_headline}
                  subtitle={template.booking_subtitle}
                  description={template.booking_description}
                  heroImageUrl={template.hero_image_url}
                  templateType={template.template_type}
                />
                <TemplateProperties
                  properties={properties.slice(0, 3)} // Show first 3 in preview
                  featuredPropertyIds={template.featured_property_ids}
                  showAllProperties={template.show_all_properties}
                  templateType={template.template_type}
                  orgSlug="example"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
