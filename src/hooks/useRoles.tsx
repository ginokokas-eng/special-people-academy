import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

type AppRole = 'admin' | 'learner' | 'trainer' | 'super_admin' | 'ops_training_admin';

interface UseRolesReturn {
  roles: AppRole[];
  isSuperAdmin: boolean;
  isOpsTrainingAdmin: boolean;
  isAdmin: boolean;
  isTrainer: boolean;
  canSignOffCompetency: boolean;
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
}

export function useRoles(): UseRolesReturn {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [canSignOffCompetency, setCanSignOffCompetency] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRolesAndPermissions() {
      if (!user) {
        setRoles([]);
        setCanSignOffCompetency(false);
        setLoading(false);
        return;
      }

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const userRoles = (rolesData?.map(r => r.role) || []) as AppRole[];
      setRoles(userRoles);

      // Fetch staff profile for can_sign_off_competency permission
      // Match by user_id if linked, otherwise we don't have permission
      const { data: staffProfile } = await supabase
        .from('staff_profiles')
        .select('can_sign_off_competency')
        .eq('user_id', user.id)
        .maybeSingle();

      setCanSignOffCompetency(staffProfile?.can_sign_off_competency ?? false);
      setLoading(false);
    }

    if (!authLoading) {
      fetchRolesAndPermissions();
    }
  }, [user, authLoading]);

  const hasRole = (role: AppRole) => roles.includes(role);
  
  const isSuperAdmin = hasRole('super_admin') || hasRole('admin');
  const isOpsTrainingAdmin = isSuperAdmin || hasRole('ops_training_admin') || hasRole('trainer');
  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const isTrainer = hasRole('trainer') || hasRole('ops_training_admin') || isSuperAdmin;

  return {
    roles,
    isSuperAdmin,
    isOpsTrainingAdmin,
    isAdmin,
    isTrainer,
    canSignOffCompetency,
    hasRole,
    loading: authLoading || loading,
  };
}
