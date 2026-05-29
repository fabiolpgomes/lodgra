'use client';

import Link from 'next/link';

export default function RequestLinkPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-100">
            <span className="text-2xl font-black text-brand-600">🏠</span>
          </div>
        </div>

        {/* Branding */}
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 mb-3">Portal de Limpeza</h2>
        <h1 className="text-3xl font-black text-brand-600 mb-6">Lodgra</h1>

        {/* Message */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-900 mb-2">Solicitar Novo Link</p>
          <p className="text-sm text-gray-600 mb-6">
            O seu link de acesso expirou ou foi revogado. Entre em contacto com o seu gestor para receber um novo link.
          </p>
        </div>

        {/* Help Text */}
        <div className="bg-brand-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-bold text-brand-900 mb-2">📞 Como contactar o seu gestor?</p>
          <ul className="text-xs text-brand-800 space-y-1">
            <li>• Envie uma mensagem pelo WhatsApp</li>
            <li>• Ligue ou envie um email</li>
            <li>• Peça um novo link de acesso</li>
          </ul>
        </div>

        {/* Button */}
        <Link
          href="/"
          className="block w-full px-6 py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors"
        >
          Voltar à Página Inicial
        </Link>

        {/* Footer */}
        <p className="text-xs text-gray-500 mt-6">Lodgra © 2026 — Portal de Gestão de Limpezas</p>
      </div>
    </div>
  );
}
