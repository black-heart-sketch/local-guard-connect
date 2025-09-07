-- This migration regenerates types by creating a dummy comment trigger
-- to force Supabase to update the generated types
CREATE OR REPLACE FUNCTION update_dummy_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Dummy function to trigger type regeneration
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;