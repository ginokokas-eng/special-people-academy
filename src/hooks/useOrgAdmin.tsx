import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OrgAdminOrganisation {
  id: string;
  name: string;
  slug: string;
  kind: string;
  logo_url: string | null;
  contact_email: string | null;
  is_active: boolean;
}

/**
 * Resolves the caller's ACTIVE org_admin membership.
 *
 * The organisation is never taken from the URL — it comes from the caller's own
 * membership row, so an org admin can only ever see their own organisation.
 * RLS ("Members view own membership") already scopes this read.
 */
export function useOrgAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [organisation, setOrganisation] = useState<OrgAdminOrganisation | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setOrganisation(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: membership } = await supabase
      .from('organisation_members')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('org_role', 'org_admin')
      .is('ended_at', null)
      .order('started_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership?.organisation_id) {
      setOrganisation(null);
      setLoading(false);
      return;
    }

    const { data: org } = await supabase
      .from('organisations')
      .select('id, name, slug, kind, logo_url, contact_email, is_active')
      .eq('id', membership.organisation_id)
      .maybeSingle();

    setOrganisation((org as OrgAdminOrganisation) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  return {
    organisation,
    isOrgAdmin: !!organisation,
    loading: authLoading || loading,
    reload: load,
  };
}
