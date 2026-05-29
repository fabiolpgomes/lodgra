'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface AuthContext {
  property?: string;
  taskDate?: string;
  companyName?: string;
  companyLogo?: string;
}

export default function CleanerAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<AuthContext | null>(null);

  useEffect(() => {
    const authenticate = async () => {
      if (!token) {
        setError('Token não fornecido');
        setLoading(false);
        return;
      }

      try {
        // Fetch context (company info) first
        const contextResponse = await fetch('/api/cleaners/auth/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          setContext(contextData);
        }

        // Authenticate
        const response = await fetch('/api/cleaners/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Falha na autenticação');
        }

        // Redirect to dashboard with locale
        router.push('/pt-BR/cleaner/dashboard');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(message);
        setLoading(false);
      }
    };

    authenticate();
  }, [token, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold text-gray-800">A validar o seu acesso...</h1>
          <p className="text-gray-600 mt-2">Por favor aguarde.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
              <span className="text-2xl font-black text-blue-600">
                {typeof context?.companyLogo === 'string' && context.companyLogo.startsWith('http')
                  ? <img src={context.companyLogo} alt="Logo" className="w-8 h-8" />
                  : context?.companyLogo || '🏠'}
              </span>
            </div>
          </div>

          {/* Branding */}
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-3">Portal de Limpeza</h2>
          <h1 className="text-3xl font-black text-blue-600 mb-6">{context?.companyName || 'Lodgra'}</h1>

          {/* Error */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-2">Erro na Autenticação</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-blue-900 mb-2">💡 O que fazer?</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Verifique se o link está completo</li>
              <li>• Copie o link exato do WhatsApp</li>
              <li>• Solicite um novo link ao seu gestor</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <Link
              href="/cleaner/request-link"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              Solicitar Novo Link
            </Link>
            <a
              href="mailto:support@lodgra.io?subject=Erro%20ao%20acessar%20Portal%20de%20Limpeza"
              className="block w-full px-6 py-3 bg-gray-100 text-gray-800 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              Contactar Suporte
            </a>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-500 mt-6">Lodgra © 2026 — Portal de Gestão de Limpezas</p>
        </div>
      </div>
    );
  }

  return null;
}
