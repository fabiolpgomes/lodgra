-- Migration: Create webhook_events table for tracking and retry logic
-- Story 36.3: Booking & Airbnb Webhooks

BEGIN;

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type VARCHAR(50) NOT NULL,
  event_id VARCHAR(255) NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,

  CONSTRAINT webhook_events_status_check CHECK (status IN ('pending', 'processed', 'failed'))
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_webhook_events_status
ON webhook_events(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_events_type
ON webhook_events(webhook_type, status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id
ON webhook_events(event_id);

-- Comentários descritivos
COMMENT ON TABLE webhook_events IS 'Track incoming webhook events for retry and audit purposes';
COMMENT ON COLUMN webhook_events.webhook_type IS 'Platform: booking, airbnb, vrbo, flatio';
COMMENT ON COLUMN webhook_events.event_id IS 'Unique event ID from platform (prevents duplicates)';
COMMENT ON COLUMN webhook_events.status IS 'pending|processed|failed';
COMMENT ON COLUMN webhook_events.retry_count IS 'Number of retry attempts (max 3)';

COMMIT;
