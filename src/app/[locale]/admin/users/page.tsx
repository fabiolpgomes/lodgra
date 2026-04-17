import Link from 'next/link'
import { Users, Plus, Shield, Edit } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DeleteUserButton } from '@/components/features/admin/DeleteUserButton'
import { ResendWelcomeEmailButton } from '@/components/features/admin/ResendWelcomeEmailButton'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { Button } from '@/components/common/ui/button'
import { Badge } from '@/components/common/ui/badge'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  access_all_properties: boolean
  guest_type?: string | null
  created_at: string
}

interface PropertyRef {
  id: string
  name: string
}

export default async function UsersPage() {
  const supabase = await createClient()

  // Verificar se é admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') {
    redirect('/')
  }

  // Buscar todos os utilizadores
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Buscar propriedades atribuídas
  const { data: userProperties } = await supabase
    .from('user_properties')
    .select('user_id, property_id, properties(id, name)')

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    viewer: 'Visualizador',
    guest: 'Convidado',
  }

  return (
    <AuthLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Utilizadores</h2>
            </div>
            <p className="text-gray-600">Gerencie os utilizadores e suas permissões</p>
          </div>
          <Button asChild>
            <Link href="/admin/users/new" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Utilizador
            </Link>
          </Button>
        </div>

        {!profiles || profiles.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum utilizador encontrado</h3>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propriedades</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profiles.map((profile: UserProfile) => {
                  const assignedProperties = (userProperties
                    ?.filter(up => up.user_id === profile.id)
                    .flatMap(up => up.properties as PropertyRef[]) || []) as PropertyRef[]

                  return (
                    <tr key={profile.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {profile.full_name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {profile.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              profile.role === 'admin'
                                ? 'bg-red-100 text-red-800 hover:bg-red-100'
                                : profile.role === 'gestor'
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                : profile.role === 'viewer'
                                ? 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                                : profile.role === 'guest'
                                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                            }
                          >
                            {roleLabels[profile.role] || profile.role}
                          </Badge>
                          {profile.role === 'guest' && profile.guest_type && (
                            <span className="text-xs text-gray-500 font-medium">
                              ({profile.guest_type === 'staff' ? 'Portaria' : 'Proprietário'})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {profile.access_all_properties ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 inline-flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Todas
                          </Badge>
                        ) : assignedProperties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedProperties.map((prop: PropertyRef) => (
                              <Badge key={prop.id} variant="secondary">
                                {prop.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Nenhuma</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Editar"
                          >
                            <Link href={`/admin/users/${profile.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <ResendWelcomeEmailButton userId={profile.id} userEmail={profile.email} />
                          {profile.id !== user.id && (
                            <DeleteUserButton userId={profile.id} userName={profile.full_name || profile.email} />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
