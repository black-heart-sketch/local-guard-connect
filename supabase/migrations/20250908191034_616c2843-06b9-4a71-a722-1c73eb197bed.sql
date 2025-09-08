-- Fix infinite recursion in RLS policies by using security definer functions
-- Create function to check if current user has admin/police role
CREATE OR REPLACE FUNCTION public.is_admin_or_police()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'police')
  );
END;
$$ LANGUAGE PLPGSQL SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE PLPGSQL SECURITY DEFINER STABLE SET search_path = public;

-- Fix profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or admins can update any" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view all" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin_or_police());

CREATE POLICY "Users can update their own profile or admins can update any" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (public.is_admin());

-- Fix emergency logs policy
DROP POLICY IF EXISTS "Admins can view all emergency logs" ON public.emergency_logs;

CREATE POLICY "Admins can view all emergency logs" 
ON public.emergency_logs 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin_or_police());

-- Fix notifications policy
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;

CREATE POLICY "Admins can delete notifications" 
ON public.notifications 
FOR DELETE 
USING (public.is_admin_or_police());