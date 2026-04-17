'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PricingRule {
  id: string
  name: string
  start_date: string
  end_date: string
  price_per_night: number
  min_nights: number
}

interface Props {
  propertyId: string
  organizationId: string
  initialRules: PricingRule[]
}

const EMPTY_FORM = {
  name: '',
  start_date: '',
  end_date: '',
  price_per_night: '',
  min_nights: '1',
}

export function PricingRulesManager({ propertyId, organizationId, initialRules }: Props) {
  const supabase = createClient()
  const [rules, setRules] = useState<PricingRule[]>(initialRules)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function fmtDate(d: string) {
    return format(parseISO(d), 'd MMM yyyy', { locale: ptBR })
  }

  function startAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError(null)
  }

  function startEdit(rule: PricingRule) {
    setEditingId(rule.id)
    setForm({
      name: rule.name,
      start_date: rule.start_date,
      end_date: rule.end_date,
      price_per_night: String(rule.price_per_night),
      min_nights: String(rule.min_nights),
    })
    setShowForm(true)
    setError(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  async function handleSave() {
    const price = parseFloat(form.price_per_night)
    const minN = parseInt(form.min_nights, 10)

    if (!form.name.trim() || !form.start_date || !form.end_date || isNaN(price) || isNaN(minN)) {
      setError('Preencha todos os campos correctamente.')
      return
    }
    if (form.end_date < form.start_date) {
      setError('Data de fim deve ser após a data de início.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      property_id: propertyId,
      organization_id: organizationId,
      name: form.name.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      price_per_night: price,
      min_nights: minN,
    }

    if (editingId) {
      const { data, error: err } = await supabase
        .from('pricing_rules')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()

      if (err) {
        setError(err.message)
      } else {
        setRules((prev) => prev.map((r) => (r.id === editingId ? (data as PricingRule) : r)))
        cancelForm()
      }
    } else {
      const { data, error: err } = await supabase
        .from('pricing_rules')
        .insert(payload)
        .select()
        .single()

      if (err) {
        setError(err.message)
      } else {
        setRules((prev) => [...prev, data as PricingRule])
        cancelForm()
      }
    }

    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta regra de preço?')) return
    const { error: err } = await supabase.from('pricing_rules').delete().eq('id', id)
    if (err) {
      alert(err.message)
    } else {
      setRules((prev) => prev.filter((r) => r.id !== id))
    }
  }

  return (
    <div className="space-y-4">
      {/* Rules list */}
      {rules.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          Sem regras de preço configuradas. O preço base da propriedade será sempre utilizado.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-left">
                <th className="pb-2 pr-4 font-medium">Nome</th>
                <th className="pb-2 pr-4 font-medium">Início</th>
                <th className="pb-2 pr-4 font-medium">Fim</th>
                <th className="pb-2 pr-4 font-medium text-right">€/noite</th>
                <th className="pb-2 pr-4 font-medium text-right">Mín. noites</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium text-gray-900">{rule.name}</td>
                  <td className="py-3 pr-4 text-gray-600">{fmtDate(rule.start_date)}</td>
                  <td className="py-3 pr-4 text-gray-600">{fmtDate(rule.end_date)}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{rule.price_per_night.toFixed(2)} €</td>
                  <td className="py-3 pr-4 text-right text-gray-600">{rule.min_nights}</td>
                  <td className="py-3 flex gap-2 justify-end">
                    <button
                      onClick={() => startEdit(rule)}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId ? 'Editar regra' : 'Nova regra de preço'}
          </h3>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ex: Época Alta Verão 2026"
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data início</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data fim</label>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preço / noite (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price_per_night}
                onChange={(e) => setForm({ ...form, price_per_night: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mínimo de noites</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.min_nights}
                onChange={(e) => setForm({ ...form, min_nights: e.target.value })}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 disabled:opacity-60 transition-colors"
            >
              <Check size={14} />
              {saving ? 'A guardar…' : 'Guardar'}
            </button>
            <button
              onClick={cancelForm}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button
          onClick={startAdd}
          className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg px-4 py-2.5 hover:border-gray-400 hover:text-gray-900 transition-colors w-full justify-center"
        >
          <Plus size={15} />
          Adicionar regra de preço
        </button>
      )}
    </div>
  )
}
