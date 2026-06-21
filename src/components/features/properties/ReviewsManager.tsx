'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, Trash2, Plus, Pencil } from 'lucide-react'
import { RatingStars } from '@/components/ratings/RatingStars'
import { normalizeRating } from '@/lib/ratings/normalize'
import type { PropertyReview, ReviewSource } from '@/types/database'

const SOURCE_LABELS: Record<ReviewSource, string> = {
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  google: 'Google',
  tripadvisor: 'TripAdvisor',
  direct: 'Reserva Direta',
  other: 'Outra',
}

const SOURCES = Object.entries(SOURCE_LABELS) as [ReviewSource, string][]

type FormData = {
  source: ReviewSource
  rating: string
  reviewer_name: string
  review_date: string
  review_text: string
}

function emptyForm(): FormData {
  return { source: 'booking', rating: '', reviewer_name: '', review_date: '', review_text: '' }
}

function formFromReview(r: PropertyReview): FormData {
  return {
    source: r.source,
    rating: String(r.rating),
    reviewer_name: r.reviewer_name,
    review_date: r.review_date,
    review_text: r.review_text ?? '',
  }
}

function getRatingMax(source: ReviewSource): number {
  return source === 'booking' ? 10 : 5
}

function validateForm(f: FormData): string | null {
  if (!f.source) return 'Fonte é obrigatória.'
  const r = Number(f.rating)
  const max = getRatingMax(f.source)
  if (!f.rating || isNaN(r) || r < 1 || r > max) return `Nota deve estar entre 1 e ${max}.`
  if (!f.reviewer_name.trim()) return 'Nome do hóspede é obrigatório.'
  if (!f.review_date) return 'Data é obrigatória.'
  if (f.review_text.length > 500) return 'Texto não pode exceder 500 caracteres.'
  return null
}

interface ReviewsManagerProps {
  propertyId: string
}

export function ReviewsManager({ propertyId }: ReviewsManagerProps) {
  const [reviews, setReviews] = useState<PropertyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<FormData>(emptyForm())
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormData>(emptyForm())
  const [editError, setEditError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [featureError, setFeatureError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/properties/${propertyId}/reviews`)
        if (!res.ok) throw new Error('Erro ao carregar reviews')
        setReviews(await res.json())
      } catch {
        setLoadError('Não foi possível carregar as avaliações.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [propertyId])

  const handleAdd = useCallback(async () => {
    const err = validateForm(addForm)
    if (err) { setAddError(err); return }
    setAdding(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/properties/${propertyId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, rating: Number(addForm.rating) }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error ?? 'Erro ao adicionar review'); return }
      setReviews(prev => [data, ...prev])
      setAddForm(emptyForm())
      setShowAddForm(false)
    } catch {
      setAddError('Erro de rede. Tente novamente.')
    } finally {
      setAdding(false)
    }
  }, [addForm, propertyId])

  const startEdit = useCallback((review: PropertyReview) => {
    setEditingId(review.id)
    setEditForm(formFromReview(review))
    setEditError(null)
    setFeatureError(null)
  }, [])

  const handleSaveEdit = useCallback(async (reviewId: string) => {
    const err = validateForm(editForm)
    if (err) { setEditError(err); return }
    setSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/properties/${propertyId}/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, rating: Number(editForm.rating) }),
      })
      const data = await res.json()
      if (!res.ok) { setEditError(data.error ?? 'Erro ao guardar'); return }
      setReviews(prev => prev.map(r => r.id === reviewId ? data : r))
      setEditingId(null)
      setSavedId(reviewId)
      setTimeout(() => setSavedId(null), 2500)
    } catch {
      setEditError('Erro de rede. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }, [editForm, propertyId])

  const handleDelete = useCallback(async (reviewId: string) => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/properties/${propertyId}/reviews/${reviewId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? 'Erro ao eliminar avaliação.')
        return
      }
      setReviews(prev => prev.filter(r => r.id !== reviewId))
      setConfirmingDeleteId(null)
    } catch {
      setDeleteError('Erro de rede. Tente novamente.')
    } finally {
      setDeleting(false)
    }
  }, [propertyId])

  const handleToggleFeatured = useCallback(async (review: PropertyReview) => {
    setFeatureError(null)
    const newFeatured = !review.is_featured
    try {
      const res = await fetch(`/api/properties/${propertyId}/reviews/${review.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: newFeatured }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFeatureError(data.error ?? 'Erro ao actualizar destaque')
        return
      }
      setReviews(prev => prev.map(r => r.id === review.id ? data : r))
    } catch {
      setFeatureError('Erro de rede.')
    }
  }, [propertyId])

  if (loading) return <p className="text-sm text-gray-600">A carregar avaliações…</p>
  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>

  return (
    <div className="space-y-4">
      {featureError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{featureError}</p>
      )}
      {deleteError && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{deleteError}</p>
      )}

      {reviews.length === 0 && !showAddForm && (
        <p className="text-sm text-gray-500 italic">Nenhuma avaliação adicionada.</p>
      )}

      {reviews.map(review => (
        <div key={review.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
          {editingId === review.id ? (
            <ReviewForm
              form={editForm}
              onChange={setEditForm}
              onSubmit={() => handleSaveEdit(review.id)}
              onCancel={() => setEditingId(null)}
              submitLabel={saving ? 'A guardar…' : 'Guardar'}
              disabled={saving}
              error={editError}
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{review.reviewer_name}</span>
                    <span className="text-xs text-gray-600">{SOURCE_LABELS[review.source]}</span>
                    <div className="flex items-center gap-1">
                      <RatingStars
                        rating={normalizeRating(SOURCE_LABELS[review.source], Number(review.rating))}
                        size="sm"
                        showText={false}
                      />
                      <span className="text-xs font-semibold text-brand-700">
                        {Number(review.rating).toFixed(1)}/{getRatingMax(review.source)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{review.review_date}</span>
                    {review.is_featured && (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        Em destaque
                      </span>
                    )}
                    {savedId === review.id && (
                      <span className="text-xs text-green-600 font-medium">✓ Guardado</span>
                    )}
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{review.review_text}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(review)}
                    title={review.is_featured ? 'Remover destaque' : 'Destacar'}
                    className={`p-1.5 rounded transition-colors ${review.is_featured ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-500 hover:text-yellow-500'}`}
                  >
                    <Star className={`h-4 w-4 ${review.is_featured ? 'fill-yellow-500' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(review)}
                    title="Editar"
                    className="p-1.5 text-gray-500 hover:text-brand-600 rounded transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  {confirmingDeleteId === review.id ? (
                    <div className="flex items-center gap-1 ml-1">
                      <span className="text-xs text-red-600">Eliminar?</span>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => handleDelete(review.id)}
                        className="px-2 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConfirmingDeleteId(null); setDeleteError(null) }}
                        className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setConfirmingDeleteId(review.id); setDeleteError(null) }}
                      title="Eliminar"
                      className="p-1.5 text-gray-500 hover:text-red-500 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {showAddForm ? (
        <div className="border border-brand-200 rounded-lg p-4 bg-brand-50 space-y-3">
          <p className="text-sm font-medium text-gray-800">Nova Avaliação</p>
          <ReviewForm
            form={addForm}
            onChange={setAddForm}
            onSubmit={handleAdd}
            onCancel={() => { setShowAddForm(false); setAddForm(emptyForm()); setAddError(null) }}
            submitLabel={adding ? 'A adicionar…' : 'Adicionar'}
            disabled={adding}
            error={addError}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setShowAddForm(true); setFeatureError(null) }}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar Avaliação
        </button>
      )}
    </div>
  )
}

interface ReviewFormProps {
  form: FormData
  onChange: (f: FormData) => void
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
  disabled: boolean
  error: string | null
}

function ReviewForm({ form, onChange, onSubmit, onCancel, submitLabel, disabled, error }: ReviewFormProps) {
  const set = (patch: Partial<FormData>) => onChange({ ...form, ...patch })

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Fonte OTA *</label>
          <select
            value={form.source}
            onChange={e => set({ source: e.target.value as ReviewSource })}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {SOURCES.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Nota (1–{getRatingMax(form.source)}) *
          </label>
          <input
            type="number"
            min={1}
            max={getRatingMax(form.source)}
            step={0.1}
            value={form.rating}
            onChange={e => set({ rating: e.target.value })}
            placeholder={`ex: ${getRatingMax(form.source) === 10 ? '8.5' : '4.5'}`}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Nome do Hóspede *</label>
          <input
            type="text"
            value={form.reviewer_name}
            onChange={e => set({ reviewer_name: e.target.value })}
            placeholder="ex: Maria S."
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Data *</label>
          <input
            type="date"
            value={form.review_date}
            onChange={e => set({ review_date: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">
          Texto da Avaliação (opcional)
          <span className={`ml-2 ${form.review_text.length > 500 ? 'text-red-500' : 'text-gray-500'}`}>
            {form.review_text.length}/500
          </span>
        </label>
        <textarea
          value={form.review_text}
          onChange={e => set({ review_text: e.target.value })}
          rows={3}
          maxLength={500}
          placeholder="Texto da avaliação…"
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
