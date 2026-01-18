import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

interface UseCourseAccessProps {
  isInternal: boolean;
  isEnrolled: boolean;
}

interface UseCourseAccessReturn {
  canAccessCourse: boolean;
  accessType: 'internal' | 'subscribed' | 'none';
  requiresSubscription: boolean;
  loading: boolean;
}

/**
 * Determines course access based on user type and subscription status.
 * 
 * Access rules:
 * - Internal courses: Available via enrollment (internal assignment)
 * - External courses: Require active subscription (Basic or Pro)
 */
export function useCourseAccess({ 
  isInternal, 
  isEnrolled 
}: UseCourseAccessProps): UseCourseAccessReturn {
  const { user, loading: authLoading } = useAuth();
  const { hasActiveSubscription, loading: subLoading } = useSubscription();

  const loading = authLoading || subLoading;

  // Not logged in - no access
  if (!user) {
    return {
      canAccessCourse: false,
      accessType: 'none',
      requiresSubscription: !isInternal,
      loading,
    };
  }

  // Internal course - access via enrollment
  if (isInternal) {
    return {
      canAccessCourse: isEnrolled,
      accessType: 'internal',
      requiresSubscription: false,
      loading,
    };
  }

  // External course - requires subscription
  if (hasActiveSubscription) {
    return {
      canAccessCourse: true,
      accessType: 'subscribed',
      requiresSubscription: false,
      loading,
    };
  }

  return {
    canAccessCourse: false,
    accessType: 'none',
    requiresSubscription: true,
    loading,
  };
}
