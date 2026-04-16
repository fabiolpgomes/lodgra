'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, Users, Plus, Eye, Edit, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DeleteOwnerButton } from './DeleteOwnerButton'
import { PaginationNav } from '@/components/ui/PaginationNav'

interface Owner {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  tax_id?: string | null
  city?: string | null
  country?: string | null
  is_active?: boolean | null
}

interface OwnersFilterProps {
  owners: Owner[]
  countMap: Record<string, number>
  canEdit: boolean
  canDelete: boolean
  pagination?: { page: number; total: number; pageSize: number }
}

type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' },
]

export function OwnersFilter({ owners, countMap, canEdit, canDelete, pagination }: OwnersFilterProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    return owners.filter(o => {
      if (statusFilter === 'active' && !o.is_active) return false
      if (statusFilter === 'inactive' && o.is_active) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const name = (o.full_name || '').toLowerCase()
        const email = (o.email || '').toLowerCase()
        if (!name.includes(q) && !email.includes(q)) return false
      }
      return true
    })
  }, [owners, search, statusFilter])

  const emptyState = (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {owners.length === 0 ? 'Nenhum proprietário encontrado' : 'Nenhum resultado encontrado'}
      </h3>
      <p className="text-gray-600 mb-6">
        {owners.length === 0
          ? 'Comece adicionando o primeiro proprietário.'
          : 'Tente ajustar os filtros ou o termo de pesquisa.'}
      </p>
      {owners.length === 0 && canEdit && (
        <Button asChild>
          <Link href="/owners/new" className="inline-flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Proprietário
          </Link>
        </Button>
      )}
    </div>
  )

  return (
    <>
      {/* Search + Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pesquisar por nome ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400 shrink-0" />
            {STATUS_FILTERS.map(f => (
              <Button
                key={f.value}
                size="sm"
                variant={statusFilter === f.value ? 'default' : 'ghost'}
                className={statusFilter === f.value ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-600'}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? emptyState : (
        <>
          {/* Mobile: cards */}
          <div className="block sm:hidden space-y-3">
            {filtered.map(owner => (
              <div key={owner.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900 text-sm truncate">{owner.full_name}</p>
                      {owner.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs shrink-0">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs shrink-0">Inativo</Badge>
                      )}
                    </div>
                    {owner.email && <p className="text-gray-500 text-xs truncate">{owner.email}</p>}
                    {owner.city && <p className="text-gray-400 text-xs">{owner.city}, {owner.country}</p>}
                  </div>
                  <Badge variant="secondary" className="ml-2 shrink-0">
                    {countMap[owner.id] || 0} imóveis
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-100">
                  <Button asChild variant="ghost" size="sm" className="h-9 px-3 text-gray-500">
                    <Link href={`/owners/${owner.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  {canEdit && (
                    <Button asChild variant="ghost" size="sm" className="h-9 px-3 text-gray-500">
                      <Link href={`/owners/${owner.id}/edit`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {canDelete && (
                    <DeleteOwnerButton ownerId={owner.id} ownerName={owner.full_name} />
                  )}
                  <Button asChild variant="ghost" size="sm" className="h-9 px-3 text-blue-600 ml-auto">
                    <Link href={`/owners/${owner.id}`}>
                      Ver <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length < owners.length && (
              <p className="text-center text-sm text-gray-500 py-2">
                Mostrando {filtered.length} de {owners.length} proprietários
              </p>
            )}
          </div>

          {/* Tablet+: tabela */}
          <div className="hidden sm:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIF/CPF</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propriedades</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(owner => (
                  <tr key={owner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{owner.full_name}</div>
                      {owner.city && (
                        <div className="text-xs text-gray-500">{owner.city}, {owner.country}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {owner.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {owner.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {owner.tax_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="secondary">
                        {countMap[owner.id] || 0} imóveis
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {owner.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Inativo</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="sm" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Ver detalhes">
                          <Link href={`/owners/${owner.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        {canEdit && (
                          <Button asChild variant="ghost" size="sm" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50" title="Editar">
                            <Link href={`/owners/${owner.id}/edit`}><Edit className="h-4 w-4" /></Link>
                          </Button>
                        )}
                        {canDelete && (
                          <DeleteOwnerButton ownerId={owner.id} ownerName={owner.full_name} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length < owners.length && (
              <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 border-t">
                Mostrando {filtered.length} de {owners.length} proprietários nesta página
              </div>
            )}
            {pagination && <PaginationNav {...pagination} />}
          </div>
        </>
      )}
    </>
  )
}
