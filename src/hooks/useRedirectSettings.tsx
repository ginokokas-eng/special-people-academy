import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RedirectSettings {
  loginRedirectUrl: string;
  logoutRedirectUrl: string;
}

const DEFAULTS: RedirectSettings = {
  loginRedirectUrl: '/dashboard',
  logoutRedirectUrl: '/',
};

/**
 * Fetches login/logout redirect URLs from platform_settings.
 * Falls back to defaults if not available (e.g. unauthenticated users).
 */
export function useRedirectSettings() {
  const query = useQuery({
    queryKey: ['platform-settings', 'security', 'redirects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('settings')
        .eq('section', 'security')
        .maybeSingle();

      if (error || !data) return DEFAULTS;

      const s = data.settings as Record<string, unknown>;
      return {
        loginRedirectUrl: (s.loginRedirectUrl as string) || DEFAULTS.loginRedirectUrl,
        logoutRedirectUrl: (s.logoutRedirectUrl as string) || DEFAULTS.logoutRedirectUrl,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return query.data ?? DEFAULTS;
}
