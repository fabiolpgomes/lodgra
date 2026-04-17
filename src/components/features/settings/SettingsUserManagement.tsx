'use client'

import { useState } from 'react'
import { UserManagement } from './UserManagement'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'gestor' | 'viewer'
  created_at: string
}

interface SettingsUserManagementProps {
  users: User[]
}

export function SettingsUserManagement({ users: initialUsers }: SettingsUserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)

  const handleUserUpdated = async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) return

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error refreshing users:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <UserManagement users={users} onUserUpdated={handleUserUpdated} />
    </div>
  )
}
