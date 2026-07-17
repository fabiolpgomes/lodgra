'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'
import { toast } from 'sonner'
import { Logo } from '@/components/common/ui/Logo'

const DEFAULT_AUTH_REDIRECT = '/pt-BR/dashboard'
const LOCALE_PREFIX_RE = /^\/(pt-BR|en-US|es)(\/|$)/

function getSafeRedirect(redirectTo: string | null): string {
  if (
    redirectTo?.startsWith('/') &&
    !redirectTo.includes('landing-vp') &&
    !redirectTo.startsWith('/login') &&
    redirectTo !== '/'
  ) {
    return LOCALE_PREFIX_RE.test(redirectTo) ? redirectTo : `/pt-BR${redirectTo}`
  }

  return DEFAULT_AUTH_REDIRECT
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = createClient()

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Login successful!')
      const redirectTo = searchParams.get('redirectTo') || searchParams.get('next')
      const safeRedirect = getSafeRedirect(redirectTo)

      window.location.assign(safeRedirect)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Logo size="lg" />
          </div>
          <p className="text-gray-600">Global property management platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Login
          </h2>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <Input
                type="email"
                id="email"
                name="email"
                required
                className="py-3 h-14"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                required
                className="pr-12 py-3 h-14"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-600 transition-colors z-10"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link href="/auth/reset-password" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="be-primary"
              size="be-lg"
              disabled={loading}
              className="w-full rounded-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <SocialLoginButtons next="/dashboard" />

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-brand-600 hover:text-brand-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Help Link */}
        <div className="text-center mt-6">
          <a
            href="https://github.com/fabiolpgomes/lodgra/blob/main/docs/COLLABORATOR_ACCESS.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            Need help? → Collaborator Guide
          </a>
        </div>

        {/* Version */}
        <p className="text-center text-sm text-gray-600 mt-4">
          Lodgra v2.0 - Multi-tenant
        </p>
      </div>
    </div>
  )
}
