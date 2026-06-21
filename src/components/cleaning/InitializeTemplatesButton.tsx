'use client';

import { useState } from 'react';
import { Wand2, Check, AlertCircle } from 'lucide-react';

interface InitializeTemplatesButtonProps {
  onComplete?: () => void;
}

export default function InitializeTemplatesButton({ onComplete }: InitializeTemplatesButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleInitialize = async () => {
    if (!confirm('Isso vai criar 3 templates padrão (Padrão, Profunda, Rápida). Continuar?')) {
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch('/api/cleaning/templates/initialize', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao inicializar templates');
      }

      setStatus('success');
      setMessage('✅ Templates padrão criados com sucesso!');
      onComplete?.();

      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Erro ao inicializar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleInitialize}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        <Wand2 className="h-4 w-4" />
        {loading ? 'Criando...' : 'Criar Templates Padrão'}
      </button>

      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 items-start">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-green-900">{message}</p>
            <p className="text-green-800 text-xs mt-1">
              3 templates foram adicionados: Limpeza Padrão, Profunda e Rápida
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-900">Erro</p>
            <p className="text-red-800 text-xs mt-1">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
