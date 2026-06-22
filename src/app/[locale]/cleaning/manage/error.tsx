'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Cleaning Manage Error:', error.message, error.stack);
  }, [error]);

  return (
    <div className="container mx-auto py-16">
      <div className="text-center">
        <div className="inline-block p-4 bg-red-100 rounded-full mb-4">
          <div className="text-3xl">⚠️</div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Algo correu mal</h1>
        <p className="text-gray-600 mb-2">Erro ao carregar o gerenciador de limpezas</p>
        <p className="text-sm text-red-600 font-mono bg-red-50 p-3 rounded mb-6 text-left max-w-2xl mx-auto">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
