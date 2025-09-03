-- Create storage bucket for emergency videos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('emergency-videos', 'emergency-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Create emergency logs table
CREATE TABLE IF NOT EXISTS public.emergency_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  emergency_type TEXT NOT NULL DEFAULT 'general',
  video_path TEXT,
  location_data JSONB,
  chunk_size INTEGER,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.emergency_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency logs
CREATE POLICY "Users can view their own emergency logs" 
ON public.emergency_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emergency logs" 
ON public.emergency_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins and police can view all emergency logs
CREATE POLICY "Admins can view all emergency logs" 
ON public.emergency_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'police')
  )
);

-- Create storage policies for emergency videos
CREATE POLICY "Users can upload their own emergency videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'emergency-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own emergency videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'emergency-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins and police can view all emergency videos
CREATE POLICY "Admins can view all emergency videos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'emergency-videos' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'police')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_emergency_logs_updated_at
BEFORE UPDATE ON public.emergency_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fix the search path issue for the send_emergency_video function
CREATE OR REPLACE FUNCTION public.send_emergency_video(
  video_data BYTEA,
  user_id UUID,
  location_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'status', 'received',
    'timestamp', NOW(),
    'user_id', user_id,
    'data_size', LENGTH(video_data),
    'location', location_data
  );
$$;