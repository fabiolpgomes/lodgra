import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type UserRole = 'admin' | 'manager' | 'guest' | 'cleaner'

export function createRequireRoleMiddleware(allowedRoles: UserRole[]) {
  return async (handler: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (request: NextRequest, context: any) => {
      try {
        // Get auth token from cookies
        const token = request.cookies.get('auth-token')?.value

        if (!token) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify token and get user
        const supabase = createAdminClient()
        const {
          data: { user },
          error,
        } = await supabase.auth.admin.getUserById(token)

        if (error || !user) {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        // Check user metadata for role
        const userRole = (user.user_metadata?.role as UserRole) || 'guest'

        if (!allowedRoles.includes(userRole)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Attach user to context for handler
        ;(context as any).user = user
        ;(context as any).userRole = userRole

        // Call handler
        return await handler(request, context)
      } catch (error) {
        console.error('[requireRole] middleware error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }
    }
  }
}

export async function requireRole(allowedRoles: UserRole[]) {
  return (handler: Function) => {
    return async (request: NextRequest, context: any) => {
      try {
        // Get session from Supabase
        const supabase = createAdminClient()

        // Extract JWT from Authorization header if present
        const authHeader = request.headers.get('authorization')
        let token: string | null = null

        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7)
        }

        // Fallback to cookies
        if (!token) {
          token = request.cookies.get('sb-auth-token')?.value || null
        }

        if (!token) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user from token
        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(token)

        if (!user) {
          return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        }

        // Check if user has required role
        const userRole = (user.user_metadata?.role as UserRole) || 'guest'

        if (!allowedRoles.includes(userRole)) {
          return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        // Attach user to context
        ;(context as any).user = user
        ;(context as any).userRole = userRole

        return await handler(request, context)
      } catch (error) {
        console.error('[requireRole] error:', error)
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
      }
    }
  }
}
