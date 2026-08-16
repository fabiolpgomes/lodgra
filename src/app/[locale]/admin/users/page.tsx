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

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Utilizadores</h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600">Gerencie os utilizadores e suas permissões</p>
          </div>
          <Button asChild className="h-12 sm:h-11 px-4 bg-blue-600 text-white font-semibold hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors">
            <Link href={`/${locale}/admin/users/new`} className="flex items-center justify-center gap-2 w-full sm:w-auto">
              <Plus className="h-5 w-5" />
              <span>Novo Utilizador</span>
            </Link>
          </Button>
        </div>

        {!profiles || profiles.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-12 text-center">
            <Users className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Nenhum utilizador encontrado</h3>
            <p className="text-sm sm:text-base text-gray-600">Comece adicionando o primeiro utilizador</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Função</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Propriedades</th>
                  <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {profiles.map((profile: UserProfile) => {
                  const assignedProperties = (userProperties
                    ?.filter(up => up.user_id === profile.id)
                    .flatMap(up => up.properties as PropertyRef[]) || []) as PropertyRef[]

                  return (
                    <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {profile.full_name || '-'}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm text-gray-600 break-all">
                          {profile.email}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              profile.role === 'admin'
                                ? 'bg-red-100 text-red-800'
                                : profile.role === 'gestor'
                                ? 'bg-blue-100 text-blue-800'
                                : profile.role === 'viewer'
                                ? 'bg-gray-100 text-gray-800'
                                : profile.role === 'guest'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-800'
                            }
                          >
                            {roleLabels[profile.role] || profile.role}
                          </Badge>
                          {profile.role === 'guest' && profile.guest_type && (
                            <span className="text-xs text-gray-600 font-medium">
                              ({profile.guest_type === 'staff' ? 'Portaria' : 'Proprietário'})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {profile.access_all_properties ? (
                          <Badge className="bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Todas
                          </Badge>
                        ) : assignedProperties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedProperties.map((prop: PropertyRef) => (
                              <Badge key={prop.id} variant="secondary" className="text-xs">
                                {prop.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 min-h-[44px] min-w-[44px] p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Editar utilizador"
                          >
                            <Link href={`/${locale}/admin/users/${profile.id}/edit`} className="flex items-center justify-center">
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
