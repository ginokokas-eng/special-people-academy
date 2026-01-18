-- Create user subscriptions table for tracking subscription status
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free', 'basic', 'pro'
  status VARCHAR(50) NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'cancelled'
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscription (for initial creation)
CREATE POLICY "Users can insert their own subscription"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any subscription (for manual assignment)
CREATE POLICY "Admins can update any subscription"
ON public.user_subscriptions
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert any subscription
CREATE POLICY "Admins can insert any subscription"
ON public.user_subscriptions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();