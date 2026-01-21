-- Fix profiles table security issues

-- 1. Add INSERT policy so users can create their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 2. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 3. Add restrictive SELECT policy - users can only view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- 4. Allow admins to view all profiles for administrative purposes
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));