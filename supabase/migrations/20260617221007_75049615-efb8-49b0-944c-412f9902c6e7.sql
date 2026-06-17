-- 1. course_trainers: restrict SELECT to authenticated users (was public/true)
DROP POLICY IF EXISTS "Anyone can view course trainers" ON public.course_trainers;
CREATE POLICY "Authenticated users can view course trainers"
ON public.course_trainers
FOR SELECT
TO authenticated
USING (true);

-- 2. payments: remove open INSERT/UPDATE policies.
-- Writes are performed by the Stripe webhook handler under the service role,
-- which bypasses RLS. Users keep read access via existing SELECT policies.
DROP POLICY IF EXISTS "System can insert payments" ON public.payments;
DROP POLICY IF EXISTS "System can update payments" ON public.payments;

-- 3. stripe_webhook_logs: remove open INSERT/UPDATE policies.
-- Only the webhook handler (service role) should write these rows.
DROP POLICY IF EXISTS "System can insert webhook logs" ON public.stripe_webhook_logs;
DROP POLICY IF EXISTS "System can update webhook logs" ON public.stripe_webhook_logs;