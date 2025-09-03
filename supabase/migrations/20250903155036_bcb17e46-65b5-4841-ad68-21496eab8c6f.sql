-- Create edge function for real-time video streaming
CREATE OR REPLACE FUNCTION send_emergency_video(
  video_data BYTEA,
  user_id UUID,
  location_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'status', 'received',
    'timestamp', NOW(),
    'user_id', user_id,
    'data_size', LENGTH(video_data),
    'location', location_data
  );
$$;