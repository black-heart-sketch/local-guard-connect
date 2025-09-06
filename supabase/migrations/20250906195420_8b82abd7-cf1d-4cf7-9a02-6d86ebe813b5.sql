-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general', 'registered', 'targeted')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications or general notifications" 
ON public.notifications 
FOR SELECT 
USING (
  type = 'general' OR 
  (type = 'registered' AND auth.uid() IS NOT NULL) OR 
  (type = 'targeted' AND target_user_id = auth.uid())
);

CREATE POLICY "Admins can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'police')
  )
);

CREATE POLICY "Users can update their own notification read status" 
ON public.notifications 
FOR UPDATE 
USING (
  type = 'general' OR 
  (type = 'registered' AND auth.uid() IS NOT NULL) OR 
  (type = 'targeted' AND target_user_id = auth.uid())
)
WITH CHECK (
  type = 'general' OR 
  (type = 'registered' AND auth.uid() IS NOT NULL) OR 
  (type = 'targeted' AND target_user_id = auth.uid())
);

CREATE POLICY "Admins can view all notifications" 
ON public.notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'police')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to send notification when crime is reported
CREATE OR REPLACE FUNCTION public.notify_crime_reported()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all admins
  INSERT INTO public.notifications (title, message, type, sender_id)
  SELECT 
    'New Crime Report Submitted',
    'A new ' || NEW.crime_type || ' report has been submitted at ' || NEW.location,
    'registered',
    COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid)
  FROM public.profiles 
  WHERE role IN ('admin', 'police')
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;