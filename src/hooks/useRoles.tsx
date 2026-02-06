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
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
}

export function useRoles(): UseRolesReturn {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoles() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const userRoles = (data?.map(r => r.role) || []) as AppRole[];
      setRoles(userRoles);
      setLoading(false);
    }

    if (!authLoading) {
      fetchRoles();
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
    hasRole,
    loading: authLoading || loading,
  };
}
