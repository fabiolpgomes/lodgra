-- Add block_type column to calendar_blocks table
-- This column tracks whether a block is manual or synced from a platform

ALTER TABLE calendar_blocks ADD COLUMN IF NOT EXISTS block_type TEXT DEFAULT 'manual' CHECK (block_type IN ('manual', 'platform_sync'));

-- Create index for filtering by block_type
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_block_type ON calendar_blocks(block_type);

-- Comment for documentation
COMMENT ON COLUMN calendar_blocks.block_type IS 'Type of block: manual (created by user) or platform_sync (synced from Airbnb, Booking, etc)';
