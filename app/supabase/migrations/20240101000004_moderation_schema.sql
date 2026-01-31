-- Add moderation columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_agreed_to_rules BOOLEAN DEFAULT FALSE;

-- Create Reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    screenshot_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, resolved, dismissed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Appeals table
CREATE TABLE IF NOT EXISTS public.appeals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    screenshot_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Reporters can view their own reports
CREATE POLICY "Users can view their own reports" 
ON public.reports FOR SELECT 
USING (auth.uid() = reporter_id);

-- Reporters can create reports
CREATE POLICY "Users can create reports" 
ON public.reports FOR INSERT 
WITH CHECK (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" 
ON public.reports FOR SELECT 
USING (public.is_admin());

-- Admins can update reports (status)
CREATE POLICY "Admins can update reports" 
ON public.reports FOR UPDATE 
USING (public.is_admin());

-- RLS for Appeals
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

-- Users can view their own appeals
CREATE POLICY "Users can view their own appeals" 
ON public.appeals FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create appeals
CREATE POLICY "Users can create appeals" 
ON public.appeals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all appeals
CREATE POLICY "Admins can view all appeals" 
ON public.appeals FOR SELECT 
USING (public.is_admin());

-- Admins can update appeals
CREATE POLICY "Admins can update appeals" 
ON public.appeals FOR UPDATE 
USING (public.is_admin());

-- Allow Admins to update profiles (for banning)
CREATE POLICY "Admins can update profiles" 
ON public.profiles FOR UPDATE 
USING (public.is_admin());
