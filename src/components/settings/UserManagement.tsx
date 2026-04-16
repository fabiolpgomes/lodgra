'use client'

import { useState } from 'react'
import { Trash2, Edit2, Check, X, Plus, Copy } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'gestor' | 'viewer'
  created_at: string
}

interface UserManagementProps {
  users: User[]
  onUserUpdated: () => void
}

export function UserManagement({ users, onUserUpdated }: UserManagementProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'gestor' | 'viewer' | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    role: 'viewer' as 'admin' | 'gestor' | 'viewer'
  })

  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [createdEmail, setCreatedEmail] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const handleEditStart = (user: User) => {
    setEditingId(user.id)
    setSelectedRole(user.role)
    setError(null)
  }

  const handleSaveRole = async (userId: string) => {
    if (!selectedRole) return

    setLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role: selectedRole
        })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Erro ao atualizar utilizador')
        return
      }

      setEditingId(null)
      setSelectedRole(null)
      onUserUpdated()
    } catch {
      setError('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem a certeza que deseja remover este utilizador?')) return

    setDeleting(userId)
    setError(null)
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Erro ao remover utilizador')
        return
      }

      onUserUpdated()
    } catch {
      setError('Erro ao conectar ao servidor')
    } finally {
      setDeleting(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.email || !formData.fullName) {
      setError('Email e nome são obrigatórios')
      return
    }

    setLoading(true)
    try {
      // Generate secure temporary password: 1 uppercase + 7 random + 1 number
      const tempPassword = `Temp${Math.random().toString(36).substring(2, 9)}${Math.floor(Math.random() * 10)}`

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          password: tempPassword
        })
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Erro ao criar utilizador')
        return
      }

      // Show password dialog instead of closing form immediately
      setCreatedEmail(formData.email)
      setCreatedPassword(tempPassword)
      setShowPasswordDialog(true)
    } catch {
      setError('Erro ao conectar ao servidor')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(createdPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Erro ao copiar para clipboard')
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Criar Novo Utilizador</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="utilizador@exemplo.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="João Silva"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'gestor' | 'viewer' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="gestor">Gestor</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
            </div>

            {/* Password Generation Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <p className="font-medium mb-1">Senha Temporária Gerada Automaticamente:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Começa com &quot;Temp&quot; (maiúsculas)</li>
                <li>Seguida de caracteres aleatórios</li>
                <li>Termina com um número</li>
                <li>Exemplo: <code className="bg-white px-1 rounded">Temp8a9b0c5</code></li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Utilizador'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Button */}
      {!showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo Utilizador
        </button>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Nome</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Função</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Data Criação</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Nenhum utilizador encontrado
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{user.email}</td>
                  <td className="py-3 px-4 text-gray-600">{user.full_name || '-'}</td>
                  <td className="py-3 px-4">
                    {editingId === user.id ? (
                      <select
                        value={selectedRole || ''}
                        onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'gestor' | 'viewer')}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="gestor">Gestor</option>
                        <option value="viewer">Visualizador</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'gestor' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'gestor' ? 'Gestor' : 'Visualizador'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">
                    {new Date(user.created_at).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === user.id ? (
                        <>
                          <button
                            onClick={() => handleSaveRole(user.id)}
                            disabled={loading}
                            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            disabled={loading}
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditStart(user)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={deleting === user.id}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Utilizador Criado com Sucesso</DialogTitle>
            <DialogDescription>
              Guarde a senha temporária abaixo. O utilizador pode alterá-la após fazer login.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900">
                {createdEmail}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Senha Temporária</label>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900 overflow-auto">
                  {createdPassword}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowPasswordDialog(false)
                setFormData({ email: '', fullName: '', role: 'viewer' })
                setShowCreateForm(false)
                onUserUpdated()
              }}
              className="w-full"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
