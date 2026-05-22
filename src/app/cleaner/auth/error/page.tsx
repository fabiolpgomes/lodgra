'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const errorMessages: Record<string, { title: string; message: string }> = {
  no_session: {
    title: 'Sessão não encontrada',
    message: 'Não há uma sessão ativa. Por favor, solicit um novo link de acesso.',
  },
  invalid_session: {
    title: 'Sessão inválida',
    message: 'A sua sessão é inválida ou foi comprometida. Por favor, solicite um novo link.',
  },
  session_expired: {
    title: 'Sessão expirada',
    message: 'O seu acesso expirou após 8 horas. Por favor, solicite um novo link.',
  },
  token_expired: {
    title: 'Link expirado',
    message: 'Este link de acesso expirou após 24 horas. Solicite um novo link ao seu gestor.',
  },
  invalid_token: {
    title: 'Link inválido',
    message: 'Este link de acesso não é válido. Verifique o URL e tente novamente.',
  },
  token_revoked: {
    title: 'Acesso revogado',
    message: 'O seu acesso foi revogado. Entre em contacto com o seu gestor.',
  },
};

export default function CleanerAuthErrorPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'unknown';

  const error = errorMessages[reason] || {
    title: 'Erro desconhecido',
    message: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-800 mb-4">{error.title}</h1>
        <p className="text-gray-600 mb-8">{error.message}</p>

        <div className="space-y-3">
          <button
            onClick={() => {
              // Open contact form or email
              window.location.href = 'mailto:support@lodgra.io?subject=Solicitar%20novo%20link%20de%20acesso';
            }}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            Contactar Suporte
          </button>
          <Link
            href="/"
            className="w-full block px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-center"
          >
            Voltar para Home
          </Link>
        </div>
      </div>
    </div>
  );
}
