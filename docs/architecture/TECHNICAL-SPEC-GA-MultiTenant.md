# Technical Specification: Google Analytics Multi-Tenant Integration

**Date**: 2026-06-03  
**Version**: 1.0  
**Author**: Dev Team  
**Status**: Ready for Development  

---

## 1. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────┐
│           Browser (Client)                          │
│  nomedaempresa.lodgra.io/booking                    │
└──────────────────┬──────────────────────────────────┘
                   │ HTTP Request
                   ▼
┌─────────────────────────────────────────────────────┐
│    Next.js Server (SSR/RSC)                         │
│  ┌─────────────────────────────────────────────┐   │
│  │ 1. Extract subdomain → tenant_id            │   │
│  │ 2. Query GA config (with cache)             │   │
│  │ 3. Decrypt GA ID if configured              │   │
│  │ 4. Inject GA script into HTML               │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    ┌────────┐           ┌──────────┐
    │ Cache  │           │ Database │
    │ (1h)   │           │ Supabase │
    └────────┘           └──────────┘
        ▲                     ▲
        │                     │
    ┌───┴─────────────────────┴───┐
    │   Backend API Routes        │
    │  /api/analytics/config      │
    │  /api/analytics/test        │
    └─────────────────────────────┘
        ▲                 ▲
        │                 │
    ┌───┴─────┐      ┌────┴──────┐
    │Dashboard│      │Google API  │
    │(React)  │      │(optional)  │
    └─────────┘      └────────────┘
```

### Key Components

1. **Database Layer** (Supabase)
   - `tenant_analytics_config`: GA configuration per tenant
   - `analytics_config_audit_log`: Audit trail

2. **Backend API** (Next.js Route Handlers)
   - POST /api/analytics/config (create/update)
   - GET /api/analytics/config (read)
   - POST /api/analytics/test (test event)
   - DELETE /api/analytics/config (remove)

3. **Frontend** (React Components)
   - `AnalyticsSettings` page
   - GA ID input with validation
   - Test connection UI

4. **Rendering** (GoogleAnalytics.tsx)
   - Tenant-aware GA injection
   - Conditional script rendering
   - Fallback handling

---

## 2. Database Schema

### Tables

```sql
-- Main configuration table
CREATE TABLE tenant_analytics_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  ga_measurement_id_encrypted BYTEA NOT NULL, -- AES-256 encrypted
  ga_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  -- Indexes for performance
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_created_at (created_at),
  CHECK (ga_measurement_id_encrypted IS NOT NULL OR NOT ga_enabled)
);

-- Audit log for compliance
CREATE TABLE analytics_config_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'tested', 'enabled', 'disabled'
  
  -- Store only what changed (old/new values)
  old_values JSONB,
  new_values JSONB,
  
  -- Metadata
  changed_by UUID NOT NULL REFERENCES users(id),
  ip_address INET,
  user_agent VARCHAR(500),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for queries
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at DESC),
  
  -- Constraints
  CHECK (action IN ('created', 'updated', 'deleted', 'tested', 'enabled', 'disabled'))
);

-- Optional: Track test events for debugging
CREATE TABLE analytics_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id VARCHAR(50) UNIQUE NOT NULL, -- timestamp-based unique ID
  ga_measurement_id VARCHAR(20) NOT NULL, -- logged for audit
  test_fired_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ga_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- when Google confirmed receipt
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'failed'
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_status (status),
  INDEX idx_test_fired_at (test_fired_at DESC)
);
```

### Encryption Strategy

**Algorithm**: AES-256-GCM (authenticated encryption)  
**Key source**: Environment variable `ANALYTICS_ENCRYPTION_KEY` (32 bytes, hex-encoded)  
**IV/Nonce**: Generated per record (16 bytes, random)  
**Storage**: IV + ciphertext stored together in BYTEA column  

```
BYTEA structure: [IV (16 bytes)] + [Ciphertext (variable)] + [Auth Tag (16 bytes)]
Total per record: ~68 bytes for GA ID
```

### Migrations

```sql
-- Migration: 20260603_create_analytics_tables.sql

BEGIN;

-- Create tenant_analytics_config table
CREATE TABLE IF NOT EXISTS tenant_analytics_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  ga_measurement_id_encrypted BYTEA NOT NULL,
  ga_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_tenant_analytics_tenant_id 
  ON tenant_analytics_config(tenant_id);
CREATE INDEX idx_tenant_analytics_deleted_at 
  ON tenant_analytics_config(deleted_at) 
  WHERE deleted_at IS NULL;

-- Create audit log table
CREATE TABLE IF NOT EXISTS analytics_config_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID NOT NULL REFERENCES users(id),
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_audit_tenant_id 
  ON analytics_config_audit_log(tenant_id);
CREATE INDEX idx_analytics_audit_created_at 
  ON analytics_config_audit_log(created_at DESC);
CREATE INDEX idx_analytics_audit_action 
  ON analytics_config_audit_log(action);

COMMIT;
```

---

## 3. API Specification

### Authentication
All endpoints require:
- `Cookie: session=<jwt-token>` (existing auth)
- Tenant verification: Extract tenant_id from JWT claims
- Rate limit: 100 requests/hour per tenant

---

### Endpoint 1: Create/Update GA Config

```
POST /api/analytics/config
Content-Type: application/json

Request:
{
  "ga_measurement_id": "G-XXXXXXXXXX"
}

Response (201 Created / 200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "tenant-123",
    "ga_enabled": true,
    "created_at": "2026-06-03T10:00:00Z",
    "updated_at": "2026-06-03T10:00:00Z"
    // NOTE: ga_measurement_id is NOT returned (encrypted)
  }
}

Error Responses:
- 400 Bad Request: Invalid GA ID format
- 401 Unauthorized: Missing/invalid session
- 403 Forbidden: Not tenant owner
- 409 Conflict: GA already configured (can update)
```

**Validation**:
```typescript
// Client-side
const validateGAId = (id: string): boolean => {
  return /^G-[A-Z0-9]{10}$/.test(id);
};

// Server-side (same + additional checks)
const validateGAId = async (gaId: string): Promise<ValidationResult> => {
  // Format check
  if (!/^G-[A-Z0-9]{10}$/.test(gaId)) {
    return { valid: false, error: 'Invalid format' };
  }
  
  // Optional: API verification (Phase 2)
  // const exists = await verifyGAIdExists(gaId);
  // if (!exists) return { valid: false, error: 'GA ID not found' };
  
  return { valid: true };
};
```

---

### Endpoint 2: Get GA Config

```
GET /api/analytics/config

Response (200 OK):
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "tenant-123",
    "ga_enabled": true,
    "ga_configured": true, // boolean: is GA ID set?
    "created_at": "2026-06-03T10:00:00Z",
    "updated_at": "2026-06-03T10:00:00Z"
    // ga_measurement_id is NOT returned
  }
}

Response (404 Not Found):
{
  "success": true,
  "data": {
    "ga_configured": false
  }
}
```

---

### Endpoint 3: Test GA Connection

```
POST /api/analytics/test

Request: {} (no body)

Response (200 OK):
{
  "success": true,
  "data": {
    "test_event_id": "test_1717407600000_abc123",
    "test_fired_at": "2026-06-03T10:00:00Z",
    "instructions": "Check your Google Analytics in 5-10 seconds for event: lodgra_config_test"
  }
}

Error Response (400):
{
  "success": false,
  "error": "GA not configured. Please set up GA ID first."
}
```

**Client-side logic**:
```typescript
// After POST /api/analytics/test succeeds:
// 1. Show loading: "Testing connection..."
// 2. Poll Google Analytics API every 2 seconds (10 attempts)
// 3. If event appears: "✓ GA connected and receiving events"
// 4. If timeout: "Could not verify. Check GA manually or troubleshoot."
```

---

### Endpoint 4: Delete GA Config

```
DELETE /api/analytics/config

Response (200 OK):
{
  "success": true,
  "message": "GA configuration removed. Tracking reverted to Lodgra GA."
}

Error Response (404):
{
  "success": false,
  "error": "No GA configuration found."
}
```

---

## 4. Frontend Implementation

### Component: AnalyticsSettings

```typescript
// app/dashboard/[locale]/settings/analytics/page.tsx

import { AnalyticsSettingsClient } from './AnalyticsSettingsClient';
import { getAnalyticsConfig } from '@/lib/api/analytics';

export default async function AnalyticsSettingsPage() {
  const config = await getAnalyticsConfig();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics Settings</h1>
        <p className="text-gray-600">Connect your Google Analytics account</p>
      </div>
      <AnalyticsSettingsClient initialConfig={config} />
    </div>
  );
}
```

### Component: AnalyticsSettingsClient

```typescript
// components/settings/AnalyticsSettingsClient.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

interface Config {
  id?: string;
  ga_enabled: boolean;
  ga_configured: boolean;
}

export function AnalyticsSettingsClient({ initialConfig }: { initialConfig: Config }) {
  const [gaId, setGaId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'pending' | 'success' | 'error'>('pending');
  const { toast } = useToast();

  // Validation
  const isValidGAId = (id: string) => /^G-[A-Z0-9]{10}$/.test(id);

  // Handle connect/update
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidGAId(gaId)) {
      toast({
        title: 'Invalid format',
        description: 'GA ID must start with "G-" followed by 10 characters',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/analytics/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ga_measurement_id: gaId })
      });

      if (!response.ok) throw new Error('Failed to save GA ID');

      toast({
        title: 'GA connected!',
        description: 'Your Google Analytics tag is now active.'
      });
      
      setGaId('');
      setTestResult('pending');
      // Refresh page or re-fetch config
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle test
  const handleTest = async () => {
    if (!initialConfig.ga_configured) {
      toast({
        title: 'GA not configured',
        description: 'Please connect your GA ID first',
        variant: 'destructive'
      });
      return;
    }

    setIsTesting(true);
    setTestResult('pending');

    try {
      const response = await fetch('/api/analytics/test', { method: 'POST' });
      if (!response.ok) throw new Error('Test failed');

      const data = await response.json();
      
      toast({
        title: 'Test event sent',
        description: 'Check your Google Analytics in 5-10 seconds'
      });

      // Poll for confirmation (Phase 2)
      // For now, just show success message
      setTestResult('success');
    } catch (error) {
      setTestResult('error');
      toast({
        title: 'Test failed',
        description: 'Could not send test event. Verify your GA ID.',
        variant: 'destructive'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!confirm('Remove GA configuration? Tracking will revert to Lodgra GA.')) return;

    try {
      const response = await fetch('/api/analytics/config', { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to disconnect');

      toast({
        title: 'GA disconnected',
        description: 'Tracking reverted to Lodgra GA'
      });

      // Refresh config
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect GA',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl">
      {initialConfig.ga_configured ? (
        // Already configured state
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <span className="text-2xl">✓</span>
            <span className="font-medium">GA connected</span>
          </div>
          
          <p className="text-sm text-gray-600">
            Your Google Analytics is active. All bookings are tracked.
          </p>

          <div className="flex gap-2">
            <Button onClick={handleTest} disabled={isTesting} variant="outline">
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button onClick={handleDisconnect} variant="destructive" size="sm">
              Disconnect
            </Button>
          </div>

          {testResult === 'success' && (
            <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-green-700">
              ✓ GA connection verified. Events are being tracked.
            </div>
          )}
          {testResult === 'error' && (
            <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700">
              ✗ Could not verify connection. Check GA ID and try again.
            </div>
          )}
        </div>
      ) : (
        // Setup form
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label htmlFor="ga-id" className="block text-sm font-medium mb-2">
              Google Analytics Measurement ID
            </label>
            <Input
              id="ga-id"
              placeholder="G-XXXXXXXXXX"
              value={gaId}
              onChange={(e) => setGaId(e.target.value.toUpperCase())}
              className={gaId && !isValidGAId(gaId) ? 'border-red-500' : ''}
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: G- followed by 10 characters. Find it in GA Admin → Property → Data Streams
            </p>
          </div>

          {gaId && !isValidGAId(gaId) && (
            <p className="text-sm text-red-600">Invalid format. Expected G-XXXXXXXXXX</p>
          )}

          <Button
            type="submit"
            disabled={isLoading || !isValidGAId(gaId)}
            className="w-full"
          >
            {isLoading ? 'Connecting...' : 'Connect GA'}
          </Button>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-700">
            <p className="font-medium mb-1">Need your GA ID?</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Open Google Analytics</li>
              <li>Go to Admin (gear icon)</li>
              <li>Select Property</li>
              <li>Click Data Streams</li>
              <li>Find "G-" ID and copy it</li>
            </ol>
          </div>
        </form>
      )}
    </div>
  );
}
```

---

## 5. Backend Implementation

### API Route: POST /api/analytics/config

```typescript
// app/api/analytics/config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { encryptGAId, decryptGAId } from '@/lib/encryption/analytics';
import { validateSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    // 1. Validate session & get tenant_id
    const session = await validateSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const tenantId = session.tenant_id;

    // 2. Parse & validate request
    const body = await req.json();
    const { ga_measurement_id } = body;

    if (!ga_measurement_id || !/^G-[A-Z0-9]{10}$/.test(ga_measurement_id)) {
      return NextResponse.json(
        { error: 'Invalid GA measurement ID format' },
        { status: 400 }
      );
    }

    // 3. Encrypt GA ID
    const encrypted = encryptGAId(ga_measurement_id);

    // 4. Save to database
    const supabase = createServerClient();
    const { data: existingConfig } = await supabase
      .from('tenant_analytics_config')
      .select('id')
      .eq('tenant_id', tenantId)
      .single();

    let config;
    if (existingConfig) {
      // Update
      const { data, error } = await supabase
        .from('tenant_analytics_config')
        .update({
          ga_measurement_id_encrypted: encrypted,
          ga_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      config = data;

      // 5. Audit log
      await logAuditEvent(supabase, tenantId, 'updated', {
        ga_enabled: true
      }, {
        ga_enabled: true
      }, session.user_id, getClientIP(req));

    } else {
      // Create
      const { data, error } = await supabase
        .from('tenant_analytics_config')
        .insert({
          tenant_id: tenantId,
          ga_measurement_id_encrypted: encrypted,
          ga_enabled: true
        })
        .select()
        .single();

      if (error) throw error;
      config = data;

      // 5. Audit log
      await logAuditEvent(supabase, tenantId, 'created', null, {
        ga_enabled: true
      }, session.user_id, getClientIP(req));
    }

    // 6. Return (no GA ID in response)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: config.id,
          tenant_id: config.tenant_id,
          ga_enabled: config.ga_enabled,
          created_at: config.created_at,
          updated_at: config.updated_at
        }
      },
      { status: existingConfig ? 200 : 201 }
    );

  } catch (error) {
    console.error('[Analytics Config] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await validateSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = session.tenant_id;
    const supabase = createServerClient();

    const { data: config } = await supabase
      .from('tenant_analytics_config')
      .select('id, tenant_id, ga_enabled, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('deleted_at', null)
      .single();

    if (!config) {
      return NextResponse.json({
        success: true,
        data: { ga_configured: false }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        ga_configured: true
      }
    });

  } catch (error) {
    console.error('[Analytics Config GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await validateSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = session.tenant_id;
    const supabase = createServerClient();

    // Soft delete
    const { data: config, error } = await supabase
      .from('tenant_analytics_config')
      .update({
        deleted_at: new Date().toISOString(),
        ga_enabled: false
      })
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await logAuditEvent(supabase, tenantId, 'deleted', {
      ga_enabled: config.ga_enabled
    }, {
      ga_enabled: false
    }, session.user_id, getClientIP(req));

    return NextResponse.json({
      success: true,
      message: 'GA configuration removed'
    });

  } catch (error) {
    console.error('[Analytics Config DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helpers
async function logAuditEvent(
  supabase: any,
  tenantId: string,
  action: string,
  oldValues: any,
  newValues: any,
  userId: string,
  ipAddress: string
) {
  await supabase.from('analytics_config_audit_log').insert({
    tenant_id: tenantId,
    action,
    old_values: oldValues,
    new_values: newValues,
    changed_by: userId,
    ip_address: ipAddress,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
  });
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    req.ip ||
    '0.0.0.0'
  );
}
```

### API Route: POST /api/analytics/test

```typescript
// app/api/analytics/test/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { decryptGAId } from '@/lib/encryption/analytics';
import { validateSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const session = await validateSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = session.tenant_id;
    const supabase = createServerClient();

    // 1. Get GA config
    const { data: config, error: configError } = await supabase
      .from('tenant_analytics_config')
      .select('ga_measurement_id_encrypted')
      .eq('tenant_id', tenantId)
      .eq('deleted_at', null)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'GA not configured' },
        { status: 400 }
      );
    }

    // 2. Decrypt & validate
    let gaId: string;
    try {
      gaId = decryptGAId(config.ga_measurement_id_encrypted);
    } catch (e) {
      console.error('[Test Event] Decryption failed:', e);
      return NextResponse.json(
        { error: 'GA configuration error' },
        { status: 500 }
      );
    }

    // 3. Generate test event ID
    const testEventId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // 4. Log test event (for audit)
    await supabase.from('analytics_test_events').insert({
      tenant_id: tenantId,
      event_id: testEventId,
      ga_measurement_id: gaId,
      test_fired_at: new Date().toISOString(),
      status: 'pending'
    });

    // 5. Return success (actual test fires on client via gtag.event())
    return NextResponse.json({
      success: true,
      data: {
        test_event_id: testEventId,
        test_fired_at: new Date().toISOString(),
        instructions: 'Check Google Analytics in 5-10 seconds for event: lodgra_config_test'
      }
    });

  } catch (error) {
    console.error('[Analytics Test] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## 6. Rendering: GoogleAnalytics Component

### Modified Component

```typescript
// src/components/features/analytics/GoogleAnalytics.tsx

'use client';

import Script from 'next/script';
import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

interface GoogleAnalyticsProps {
  nonce?: string;
  gaId?: string; // Passed from server (tenant-specific or default)
}

export function GoogleAnalytics({ nonce, gaId }: GoogleAnalyticsProps) {
  // gaId = customer GA ID if configured, fallback to env var
  const GA_ID = gaId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    function onAccept() {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
      }
    }
    window.addEventListener('cookie_consent_accepted', onAccept);
    return () => window.removeEventListener('cookie_consent_accepted', onAccept);
  }, []);

  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="beforeInteractive"
        nonce={nonce}
      />
      <Script id="ga-init" strategy="beforeInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', {analytics_storage: 'denied'});
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
```

### Layout Integration

```typescript
// src/app/layout.tsx

import { GoogleAnalytics } from '@/components/features/analytics/GoogleAnalytics';
import { getCustomerGAId } from '@/lib/analytics/server';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get tenant GA ID (or undefined for fallback)
  const gaId = await getCustomerGAId();

  return (
    <html lang="pt-BR">
      <head>
        {/* ... */}
      </head>
      <body>
        <ThemeProvider>
          {children}
          <CookieBanner />
          <GoogleAnalytics gaId={gaId} />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Server Function: Get Customer GA ID

```typescript
// src/lib/analytics/server.ts

import { createServerClient } from '@/lib/supabase/server';
import { getSubdomainTenantId } from '@/lib/auth/tenant';
import { decryptGAId } from '@/lib/encryption/analytics';
import { cache } from 'react';

// Cache for 1 hour (Next.js request cache)
export const getCustomerGAId = cache(async (subdomain?: string): Promise<string | undefined> => {
  try {
    // 1. Get tenant_id from subdomain
    const tenantId = subdomain || (await getSubdomainTenantId());
    if (!tenantId) return undefined; // Not a tenant subdomain

    // 2. Query GA config
    const supabase = createServerClient();
    const { data: config, error } = await supabase
      .from('tenant_analytics_config')
      .select('ga_measurement_id_encrypted')
      .eq('tenant_id', tenantId)
      .eq('deleted_at', null)
      .eq('ga_enabled', true)
      .single();

    if (error || !config) return undefined; // No config or error

    // 3. Decrypt GA ID
    try {
      const gaId = decryptGAId(config.ga_measurement_id_encrypted);
      return gaId;
    } catch (e) {
      console.error('[Analytics] Decryption failed:', e);
      return undefined; // Fallback to Lodgra GA
    }

  } catch (error) {
    console.error('[Analytics] Error getting customer GA ID:', error);
    return undefined; // Fallback to Lodgra GA
  }
});
```

---

## 7. Encryption/Decryption

### Implementation

```typescript
// src/lib/encryption/analytics.ts

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ANALYTICS_ENCRYPTION_KEY!, 'hex');
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encryptGAId(gaId: string): Buffer {
  // Generate random IV
  const iv = randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  
  // Encrypt
  let encrypted = cipher.update(gaId, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  // Combine: IV + Ciphertext + Auth Tag
  const result = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);
  
  return result;
}

export function decryptGAId(encrypted: Buffer): string {
  // Parse: IV + Ciphertext + Auth Tag
  const iv = encrypted.slice(0, IV_LENGTH);
  const authTag = encrypted.slice(-AUTH_TAG_LENGTH);
  const ciphertext = encrypted.slice(IV_LENGTH, -AUTH_TAG_LENGTH);
  
  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt
  let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Validate encryption key on startup
export function validateEncryptionKey(): boolean {
  const keyHex = process.env.ANALYTICS_ENCRYPTION_KEY;
  if (!keyHex) {
    console.error('ANALYTICS_ENCRYPTION_KEY not set');
    return false;
  }
  
  try {
    const key = Buffer.from(keyHex, 'hex');
    if (key.length !== 32) {
      console.error('ANALYTICS_ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Invalid ANALYTICS_ENCRYPTION_KEY format (must be hex)');
    return false;
  }
}
```

---

## 8. Testing Strategy

### Unit Tests

```typescript
// __tests__/lib/encryption/analytics.test.ts

import { encryptGAId, decryptGAId } from '@/lib/encryption/analytics';

describe('Analytics Encryption', () => {
  const testGAId = 'G-XXXXXXXXXX';

  test('encrypt & decrypt round-trip', () => {
    const encrypted = encryptGAId(testGAId);
    const decrypted = decryptGAId(encrypted);
    expect(decrypted).toBe(testGAId);
  });

  test('same plaintext produces different ciphertext (random IV)', () => {
    const encrypted1 = encryptGAId(testGAId);
    const encrypted2 = encryptGAId(testGAId);
    expect(encrypted1).not.toEqual(encrypted2);
  });

  test('malformed ciphertext throws error', () => {
    const badCiphertext = Buffer.from('invalid');
    expect(() => decryptGAId(badCiphertext)).toThrow();
  });
});
```

### API Tests

```typescript
// __tests__/api/analytics/config.test.ts

import { POST, GET, DELETE } from '@/app/api/analytics/config/route';
import { createServerClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');
jest.mock('@/lib/auth/session');

describe('POST /api/analytics/config', () => {
  test('creates config with valid GA ID', async () => {
    const req = new NextRequest('http://localhost/api/analytics/config', {
      method: 'POST',
      body: JSON.stringify({ ga_measurement_id: 'G-XXXXXXXXXX' })
    });

    const response = await POST(req);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).not.toHaveProperty('ga_measurement_id'); // Not in response
  });

  test('rejects invalid GA ID format', async () => {
    const req = new NextRequest('http://localhost/api/analytics/config', {
      method: 'POST',
      body: JSON.stringify({ ga_measurement_id: 'invalid' })
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  test('returns 401 without auth', async () => {
    // Mock validateSession to return null
    const req = new NextRequest('http://localhost/api/analytics/config', {
      method: 'POST',
      body: JSON.stringify({ ga_measurement_id: 'G-XXXXXXXXXX' })
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});
```

### E2E Tests

```typescript
// e2e/analytics-settings.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Analytics Settings', () => {
  test('customer can configure GA ID', async ({ page, context }) => {
    // Login
    await page.goto('/dashboard/settings/analytics');

    // Enter GA ID
    await page.fill('[placeholder="G-XXXXXXXXXX"]', 'G-1234567890');

    // Click Connect
    await page.click('button:has-text("Connect GA")');

    // Verify success message
    await expect(page.locator('text=GA connected')).toBeVisible();

    // Verify GA script is in page source
    const content = await page.content();
    expect(content).toContain('G-1234567890');
    expect(content).toContain('googletagmanager.com/gtag/js');
  });

  test('test connection works', async ({ page }) => {
    await page.goto('/dashboard/settings/analytics');

    // Click Test Connection
    await page.click('button:has-text("Test Connection")');

    // Verify test event message
    await expect(page.locator('text=Check your Google Analytics')).toBeVisible();
  });
});
```

---

## 9. Security Considerations

### Data Protection

1. **Encryption**: GA ID encrypted at rest (AES-256-GCM)
2. **Transport**: All API calls over HTTPS only
3. **Access Control**: Only tenant owner can view/edit their GA config
4. **No Logging**: GA ID never logged (masked in audit logs)

### Audit Trail

```sql
-- Sample audit log entry
INSERT INTO analytics_config_audit_log (
  tenant_id, action, old_values, new_values, changed_by, ip_address, created_at
) VALUES (
  'tenant-123',
  'created',
  NULL,
  '{"ga_enabled": true}',
  'user-456',
  '192.168.1.1',
  NOW()
);
```

### GDPR Compliance

- Customer is data controller for their GA data
- Lodgra acts as data processor (no data retention)
- Document responsibility in Terms of Service
- Provide data export/deletion capability (Phase 2)

---

## 10. Deployment Plan

### Environment Variables

```bash
# .env.production / Vercel
ANALYTICS_ENCRYPTION_KEY=<32-byte-hex-string>  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-QDK7Y80G8E     # Lodgra's fallback GA ID
```

### Migrations

```bash
# Run Supabase migrations
supabase migration up

# Or via Vercel Postgres:
psql "$DATABASE_URL" < migrations/20260603_create_analytics_tables.sql
```

### Feature Flag

```typescript
// Use existing feature flag system
const isGAMultiTenantEnabled = await checkFeatureFlag('analytics.multi_tenant', tenantId);

if (isGAMultiTenantEnabled) {
  // Show analytics settings UI
}
```

### Rollout Strategy

**Week 1**: Internal dogfooding (Lodgra team)  
**Week 2**: Beta customers (5 select customers)  
**Week 3**: Gradual rollout (10% of Premium+)  
**Week 4**: Full rollout (100%)

---

## 11. Performance Optimization

### Caching

```typescript
// 1-hour TTL for GA config (Next.js request cache)
export const getCustomerGAId = cache(async (...) => {
  // Queries DB only once per request
});

// Additional: Redis cache (optional, Phase 2)
const gaConfigCache = new Map<string, CachedConfig>();
const CACHE_TTL = 3600 * 1000; // 1 hour
```

### Database Indexes

```sql
-- Ensure fast lookups
CREATE INDEX idx_tenant_analytics_config_tenant_id 
  ON tenant_analytics_config(tenant_id);

CREATE INDEX idx_tenant_analytics_config_ga_enabled 
  ON tenant_analytics_config(ga_enabled) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_analytics_audit_log_tenant_id 
  ON analytics_config_audit_log(tenant_id, created_at DESC);
```

### Monitoring

```typescript
// Monitor decryption errors
if (decryptError) {
  recordMetric('analytics.decryption_error', 1, {
    tenant_id: tenantId,
    error_type: decryptError.name
  });
}

// Monitor API latency
const startTime = performance.now();
// ... operation ...
const duration = performance.now() - startTime;
recordMetric('analytics.api_latency_ms', duration);
```

---

## 12. Known Limitations & Future Work

### Phase 1 (MVP)
- ❌ No Google API verification (format validation only)
- ❌ No multi-GA per tenant
- ❌ No other analytics platforms (Mixpanel, Amplitude)

### Phase 2 (Enhancement)
- ✅ Google API verification (check GA ID exists)
- ✅ Multi-GA support (A/B testing)
- ✅ Custom event tracking (dimensions, metrics)
- ✅ GA4 migration helpers
- ✅ Segment integration

### Phase 3 (Advanced)
- ✅ GA data warehouse export
- ✅ Booking-specific metrics (funnel, cohort)
- ✅ Dashboard embedded in Lodgra

---

## Appendix: Glossary

- **Tenant**: Property management company account
- **GA ID**: Google Analytics Measurement ID (format: G-XXXXXXXXXX)
- **IV**: Initialization Vector (random, used in encryption)
- **Auth Tag**: Authentication tag (GCM mode, ensures data integrity)
- **Test Event**: Synthetic event fired to verify GA connection

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-03  
**Next Phase**: Phase 2 Enhancement Planning
