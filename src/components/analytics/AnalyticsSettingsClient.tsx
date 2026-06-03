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
          setError('Unauthorized. Please log in again.');
          return;
        }
        throw new Error('Failed to fetch config');
      }

      const data = await res.json();
      setConfig(data.data);
      setError(null);
    } catch (err) {
      console.error('[Analytics Settings] Fetch config error:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!gaId.trim()) {
      setError('Please enter your GA Measurement ID');
      return;
    }

    if (!isValidGAId(gaId)) {
      setError('Invalid GA Measurement ID format. Expected: G-XXXXXXXXXX');
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
        throw new Error(errorData.error || 'Failed to save GA ID');
      }

      const data = await res.json();
      setConfig(data.data);
      setGaId('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
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
        throw new Error(errorData.error || 'Test failed');
      }

      const data = await res.json();
      setSuccess(true);
      alert(
        `Test event fired!\n\nEvent ID: ${data.data.test_event_id}\n\n${data.data.instructions}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Test failed';
      console.error('[Analytics Settings] Test connection error:', err);
      setError(message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure? Your GA tracking will revert to Lodgra Analytics.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analytics/config', { method: 'DELETE' });

      if (!res.ok) {
        throw new Error('Failed to disconnect');
      }

      setConfig(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
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
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900">Success</h3>
            <p className="text-sm text-green-800">
              {config ? 'GA settings updated.' : 'GA settings cleared.'}
            </p>
          </div>
        </div>
      )}

      {/* Not Connected State */}
      {!config?.ga_configured ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Connect Google Analytics</h2>
            <p className="text-sm text-gray-600">
              Enter your Google Analytics Measurement ID to start tracking your property.
            </p>
          </div>

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label htmlFor="ga-id" className="block text-sm font-medium text-gray-700 mb-1">
                GA Measurement ID
              </label>
              <Input
                id="ga-id"
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={gaId}
                onChange={(e) => setGaId(e.target.value.toUpperCase())}
                disabled={loading}
                className="font-mono"
                aria-label="Google Analytics Measurement ID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: G- followed by 10 uppercase letters or numbers
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-sm text-blue-900 mb-2">How to find your GA ID</h3>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Go to Google Analytics</li>
                <li>Select your property</li>
                <li>Go to Admin → Data Streams</li>
                <li>Click your web stream</li>
                <li>Copy the Measurement ID (starts with G-)</li>
              </ol>
              <a
                href="https://support.google.com/analytics/answer/12270356"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Learn more →
              </a>
            </div>

            <Button
              type="submit"
              disabled={loading || !gaId.trim()}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? 'Connecting...' : 'Connect GA'}
            </Button>
          </form>
        </div>
      ) : (
        /* Connected State */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Connected ✓</h2>
              <p className="text-sm text-gray-600">
                Your Google Analytics account is active and tracking.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">GA Measurement ID:</span>{' '}
              <span className="font-mono text-gray-900">G-●●●●●●●●●●</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {new Date(config.updated_at).toLocaleDateString()}
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
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </Button>

            <p className="text-xs text-gray-500 px-1">
              A test event will be sent to your Google Analytics. Check your GA account in 5-10 seconds.
            </p>
          </div>

          <Button
            onClick={handleDisconnect}
            disabled={loading}
            variant="ghost"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {loading ? 'Disconnecting...' : 'Disconnect GA'}
          </Button>
        </div>
      )}
    </div>
  );
}
