import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type RequiredRole = 'admin' | 'trainer' | 'super_admin' | 'ops_training_admin' | 'learner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: RequiredRole[];
  redirectTo?: string;
}

/**
 * Protects routes based on authentication and role requirements.
 *
 * Role flags come from the centralised helper (src/lib/roles.ts). The check is
 * capability-based: a higher role satisfies a lower-role requirement.
 *
 * Usage:
 * - No requiredRoles: just requires authentication.
 * - requiredRoles=['learner']: any authenticated user.
 * - requiredRoles=['trainer']: trainer, ops_training_admin, admin, or super_admin.
 * - requiredRoles=['ops_training_admin']: ops_training_admin, admin, or super_admin.
 * - requiredRoles=['admin']: admin or super_admin (admin-level access).
 * - requiredRoles=['super_admin']: super_admin ONLY (isSuperAdmin is strict).
 */
export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  redirectTo = '/access-denied' 
}: ProtectedRouteProps) {
  const { user, loading, rolesLoading, isAdmin, isTrainer, isSuperAdmin, isOpsTrainingAdmin } = useAuth();
  const navigate = useNavigate();

  const checkHasRequiredRole = () => {
    if (requiredRoles.length === 0) return true;
    
    return requiredRoles.some(role => {
      switch (role) {
        case 'super_admin':
          return isSuperAdmin;
        case 'admin':
          return isAdmin;
        case 'ops_training_admin':
          return isOpsTrainingAdmin;
        case 'trainer':
          return isTrainer;
        case 'learner':
          return true;
        default:
          return false;
      }
    });
  };

  useEffect(() => {
    // Wait for both auth and roles to be fully loaded
    if (loading || rolesLoading) return;

    // Not authenticated - redirect to auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Check role requirements after roles are loaded
    if (!checkHasRequiredRole()) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, rolesLoading, isAdmin, isTrainer, isSuperAdmin, isOpsTrainingAdmin, requiredRoles, navigate, redirectTo]);

  // Show loading while auth or roles are being determined
  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Check roles - don't render if not authorized
  if (!checkHasRequiredRole()) {
    return null;
  }

  return <>{children}</>;
}
