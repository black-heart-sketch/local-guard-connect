-- Add session tracking fields to emergency_logs table
ALTER TABLE public.emergency_logs 
ADD COLUMN IF NOT EXISTS recording_session_id TEXT,
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 1;

-- Create index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_emergency_logs_session_id 
ON public.emergency_logs(recording_session_id);

-- Create index for user session lookups
CREATE INDEX IF NOT EXISTS idx_emergency_logs_user_session 
ON public.emergency_logs(user_id, recording_session_id);

-- Add comment to explain the new fields
COMMENT ON COLUMN public.emergency_logs.recording_session_id IS 'Unique identifier for grouping video chunks from the same recording session';
COMMENT ON COLUMN public.emergency_logs.chunk_count IS 'Number of video chunks concatenated in this recording session';
