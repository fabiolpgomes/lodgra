'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/landing/atoms/Logo'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#F3F4F6' }}>
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        {/* Ícone de sucesso */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
            <svg className="w-10 h-10" fill="none" stroke="#059669" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1E3A8A', fontFamily: 'var(--font-poppins, Poppins, sans-serif)' }}>
          Pagamento confirmado!
        </h1>
        <p className="text-base mb-8" style={{ color: '#374151' }}>
          Bem-vindo à Lodgra. A sua subscrição está ativa.
        </p>

        {/* Instrução principal */}
        <div className="rounded-xl p-6 mb-8 text-left" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-6 h-6" fill="none" stroke="#1E3A8A" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: '#1E3A8A' }}>Verifique o seu email</p>
              <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
                Enviámos um email com um link para <strong>criar a sua senha</strong> e aceder ao painel.
                Clique no botão do email para ativar a conta.
              </p>
              <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                O email é enviado por <strong>noreply@mail.app.supabase.io</strong>.
                Verifique também a pasta de Spam.
              </p>
            </div>
          </div>
        </div>

        {/* Passos */}
        <ol className="text-left space-y-3 mb-8">
          {[
            'Abra o email de convite da Lodgra',
            'Clique em "Criar minha senha"',
            'Defina uma senha segura',
            'Aceda ao seu painel e configure as suas propriedades',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#374151' }}>
              <span className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold mt-0.5" style={{ backgroundColor: '#059669' }}>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {/* Garantia */}
        <div className="text-xs py-3 px-4 rounded-lg mb-8" style={{ backgroundColor: '#F0FDF4', color: '#166534' }}>
          ✓ Garantia de 7 dias · Se não ficar satisfeito, reembolsamos 100%
        </div>

        {/* CTA secundário */}
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Já configurou a senha?{' '}
          <Link href="/login" className="font-bold hover:underline" style={{ color: '#1E3A8A' }}>
            Fazer login
          </Link>
        </p>

        {sessionId && (
          <p className="text-xs mt-4" style={{ color: '#9CA3AF' }}>
            Ref: {sessionId.slice(-8).toUpperCase()}
          </p>
        )}
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
        <div className="animate-spin h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
