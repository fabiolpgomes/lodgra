'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/design-system/atoms/Button';
import { Input } from '@/design-system/atoms/Input';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { isValidGAId } from '@/lib/analytics/validation';

interface AnalyticsConfig {
  id: string;
  tenant_id: string;
  ga_enabled: boolean;
  ga_configured: boolean;
  created_at: string;
  updated_at: string;
}

export default function AnalyticsSettingsClient() {
  const [gaId, setGaId] = useState('');
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setIsInitialLoading(true);
      const res = await fetch('/api/analytics/config');

      if (!res.ok) {
        if (res.status === 401) {
          setError('Não autorizado. Faça login novamente.');
          return;
        }
        throw new Error('Falha ao obter a configuração');
      }

      const data = await res.json();
      setConfig(data.data);
      setError(null);
    } catch (err) {
      console.error('[Analytics Settings] Fetch config error:', err);
      setError('Falha ao carregar as definições. Tente novamente.');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!gaId.trim()) {
      setError('Introduza o seu ID de medição do GA');
      return;
    }

    if (!isValidGAId(gaId)) {
      setError('Formato inválido do ID de medição do GA. Esperado: G-XXXXXXXXXX');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/analytics/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ga_measurement_id: gaId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha ao guardar o ID do GA');
      }

      const data = await res.json();
      setConfig(data.data);
      setGaId('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro';
      console.error('[Analytics Settings] Connect error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setError(null);
    setTestingConnection(true);

    try {
      const res = await fetch('/api/analytics/test', { method: 'POST' });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Teste falhou');
      }

      const data = await res.json();
      setSuccess(true);
      alert(
        `Evento de teste enviado!\n\nID do evento: ${data.data.test_event_id}\n\n${data.data.instructions}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha no teste';
      console.error('[Analytics Settings] Test connection error:', err);
      setError(message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem a certeza? O rastreio do GA voltará para o Lodgra Analytics.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analytics/config', { method: 'DELETE' });

      if (!res.ok) {
        throw new Error('Falha ao desligar');
      }

      setConfig(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro';
      console.error('[Analytics Settings] Disconnect error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Erro</h3>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-emerald-900">Sucesso</h3>
            <p className="text-sm text-emerald-800">
              {config ? 'Definições do GA atualizadas.' : 'Definições do GA removidas.'}
            </p>
          </div>
        </div>
      )}

      {/* Not Connected State */}
      {!config?.ga_configured ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Ligar o Google Analytics</h2>
            <p className="text-sm text-gray-600">
              Introduza o ID de medição do Google Analytics para começar a acompanhar a sua propriedade.
            </p>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label htmlFor="ga-id" className="block text-sm font-medium text-gray-700 mb-1">
                ID de medição do GA
              </label>
              <Input
                id="ga-id"
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={gaId}
                onChange={(e) => setGaId(e.target.value.toUpperCase())}
                disabled={loading}
                className="font-mono"
                aria-label="ID de medição do Google Analytics"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: G- seguido de 10 letras maiúsculas ou números
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-sm text-blue-900 mb-2">Como encontrar o seu ID do GA</h3>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Aceda ao Google Analytics</li>
                <li>Selecione a sua propriedade</li>
                <li>Vá a Admin → Fluxos de dados</li>
                <li>Abra o seu fluxo web</li>
                <li>Copie o ID de medição (começa por G-)</li>
              </ol>
              <a
                href="https://support.google.com/analytics/answer/12270356"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Saber mais →
              </a>
            </div>

            <Button
              type="submit"
              disabled={loading || !gaId.trim()}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'A ligar...' : 'Ligar GA'}
            </Button>
          </form>
        </div>
      ) : (
        /* Connected State */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-700" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ligado ✓</h2>
              <p className="text-sm text-gray-600">
                A sua conta do Google Analytics está ativa e a acompanhar.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">ID de medição do GA:</span>{' '}
              <span className="font-mono text-gray-900">G-●●●●●●●●●●</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Última atualização: {new Date(config.updated_at).toLocaleDateString('pt-PT')}
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleTestConnection}
              disabled={testingConnection}
              variant="secondary"
              className="w-full"
            >
              {testingConnection && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {testingConnection ? 'A testar...' : 'Testar ligação'}
            </Button>

            <p className="text-xs text-gray-500 px-1">
              Será enviado um evento de teste para o seu Google Analytics. Verifique a conta GA dentro de 5 a 10 segundos.
            </p>
          </div>

          <Button
            onClick={handleDisconnect}
            disabled={loading}
            variant="ghost"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'A desligar...' : 'Desligar GA'}
          </Button>
        </div>
      )}
    </div>
  );
}
