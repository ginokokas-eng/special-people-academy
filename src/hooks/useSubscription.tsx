import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  hasActiveSubscription: boolean;
  plan: string | null;
  refreshSubscription: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      // Entitlement is read from Stripe via the edge function. The local
      // user_subscriptions mirror was removed in favour of organisation licences.
      const { data: checkData, error: checkError } = await supabase.functions.invoke(
        'check-subscription',
      );
      if (!checkError && checkData?.subscribed) {
        setSubscription({
          id: 'stripe-synced',
          plan: checkData.plan || 'basic',
          status: 'active',
          current_period_end: checkData.subscription_end ?? null,
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);


  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const hasActiveSubscription = 
    subscription?.status === 'active' && 
    ['basic', 'pro', 'individual', 'team', 'organization'].includes(subscription?.plan || '');

  return {
    subscription,
    loading,
    hasActiveSubscription,
    plan: subscription?.plan || null,
    refreshSubscription: fetchSubscription,
  };
}
