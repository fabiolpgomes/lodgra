'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  role: string
  created_at: string
  user_properties: Array<{ property_id: string }>
}

interface Property {
  id: string
  name: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      // Load members
      const membersRes = await fetch('/api/organization/members')
      if (!membersRes.ok) throw new Error('Erro ao carregar membros')
      const membersData = await membersRes.json()

      setMembers(membersData.members || [])

      // Load properties
      const propsRes = await fetch('/api/properties')
      if (propsRes.ok) {
        const propsData = await propsRes.json()
        setProperties(propsData.properties || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  function handleSelectMember(memberId: string) {
    setSelectedMember(memberId)
    const member = members.find(m => m.id === memberId)
    if (member) {
      setSelectedProperties(new Set(member.user_properties.map(up => up.property_id)))
    }
  }

  function toggleProperty(propertyId: string) {
    const newSet = new Set(selectedProperties)
    if (newSet.has(propertyId)) {
      newSet.delete(propertyId)
    } else {
      newSet.add(propertyId)
    }
    setSelectedProperties(newSet)
  }

  async function saveAssignments() {
    if (!selectedMember) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/organization/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedMember,
          property_ids: Array.from(selectedProperties),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao salvar atribuições')
      }

      setError(null)
      loadData()
      setSelectedMember(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Membros</h1>
        <p className="text-sm text-gray-500 mt-1">Atribua propriedades aos membros da sua organização</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Members List */}
        <div className="col-span-1">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 text-sm">Membros</h2>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {members.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-500 text-center">Nenhum membro encontrado</p>
              ) : (
                members.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member.id)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selectedMember === member.id
                        ? 'bg-gray-900 text-white'
                        : 'hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <div className="font-medium">{member.user_id.slice(0, 8)}</div>
                    <div className={`text-xs mt-0.5 ${selectedMember === member.id ? 'text-gray-300' : 'text-gray-500'}`}>
                      {member.role} • {member.user_properties.length} propriedade(s)
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Properties Assignment */}
        {selectedMember && (
          <div className="col-span-2">
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 text-sm">
                  Propriedades
                </h2>
              </div>
              <div className="p-4">
                {properties.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">Nenhuma propriedade disponível</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {properties.map(property => (
                      <label
                        key={property.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProperties.has(property.id)}
                          onChange={() => toggleProperty(property.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900 font-medium">{property.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedMember(null)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveAssignments}
                    disabled={saving}
                    className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar Atribuições
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
