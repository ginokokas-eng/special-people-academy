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
 * Usage:
 * - No requiredRoles: Just requires authentication
 * - requiredRoles=['admin']: Requires admin or super_admin
 * - requiredRoles=['trainer']: Requires trainer, ops_training_admin, admin, or super_admin
 * - requiredRoles=['super_admin']: Requires super_admin only
 */
export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  redirectTo = '/access-denied' 
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isTrainer, isSuperAdmin, isOpsTrainingAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Not authenticated - redirect to auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // No role requirements - just needs to be authenticated
    if (requiredRoles.length === 0) {
      return;
    }

    // Check role requirements
    const hasRequiredRole = requiredRoles.some(role => {
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
          // Everyone authenticated has at least learner access
          return true;
        default:
          return false;
      }
    });

    if (!hasRequiredRole) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, isAdmin, isTrainer, isSuperAdmin, isOpsTrainingAdmin, requiredRoles, navigate, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Still checking or not authorized
  if (!user) {
    return null;
  }

  // Check roles inline for immediate feedback
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => {
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

    if (!hasRequiredRole) {
      return null;
    }
  }

  return <>{children}</>;
}
