
-- 1. Restrict orders UPDATE to owner only (was: USING true)
DROP POLICY IF EXISTS "System can update orders" ON public.orders;

CREATE POLICY "Users can update their own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Explicit admin-only insert/update/delete on user_roles to prevent privilege escalation
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict competency_signoffs visibility to trainers of the actual course
DROP POLICY IF EXISTS "Trainers can view signoffs for courses they train" ON public.competency_signoffs;

CREATE POLICY "Trainers can view signoffs for their courses"
  ON public.competency_signoffs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.course_trainers ct
      JOIN public.staff_profiles sp ON sp.id = ct.staff_id
      WHERE ct.course_id = competency_signoffs.course_id
        AND sp.user_id = auth.uid()
    )
    OR auth.uid() = assessor_id
  );

-- 4. Require authenticated user_id on bookings (remove guest checkout via NULL)
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
