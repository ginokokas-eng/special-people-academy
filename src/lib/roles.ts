/**
 * Centralised role logic for the academy.
 *
 * This is the single source of truth for how application roles map to
 * capabilities. Both `useAuth` and `useRoles` derive their boolean flags
 * from here so role behaviour stays consistent everywhere.
 *
 * Role hierarchy (capability-based):
 *   super_admin  > admin  > ops_training_admin  > trainer  > learner
 *
 * IMPORTANT:
 *  - `isSuperAdmin` is STRICT: it is true ONLY for the `super_admin` role.
 *  - `isAdmin` is the "admin-level" helper: true for `admin` OR `super_admin`.
 *    Use `isAdmin` (not `isSuperAdmin`) whenever you mean "admin-level access".
 *  - The remaining flags are hierarchical: a higher role always satisfies a
 *    lower-role capability check.
 */

export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'ops_training_admin'
  | 'trainer'
  | 'learner';

export interface RoleFlags {
  /** STRICT: only the `super_admin` role. */
  isSuperAdmin: boolean;
  /** Admin-level access: `admin` OR `super_admin`. */
  isAdmin: boolean;
  /** Ops/training management: `ops_training_admin` or any admin-level role. */
  isOpsTrainingAdmin: boolean;
  /** Trainer capabilities: `trainer`, ops/training, or any admin-level role. */
  isTrainer: boolean;
  /** Any authenticated user can act as a learner. */
  isLearner: boolean;
}

/**
 * Derive capability flags from a user's raw role list.
 */
export function computeRoleFlags(roles: readonly AppRole[] | readonly string[]): RoleFlags {
  const has = (role: AppRole) => roles.includes(role as never);

  const isSuperAdmin = has('super_admin');
  const isAdmin = isSuperAdmin || has('admin');
  const isOpsTrainingAdmin = isAdmin || has('ops_training_admin');
  const isTrainer = isOpsTrainingAdmin || has('trainer');

  return {
    isSuperAdmin,
    isAdmin,
    isOpsTrainingAdmin,
    isTrainer,
    isLearner: true,
  };
}

/** The role requirement vocabulary used by route guards and portal navigation. */
export type RequiredRole = 'admin' | 'trainer' | 'super_admin' | 'ops_training_admin' | 'learner';

/**
 * Single answer to "may this person open that page?".
 *
 * Both `ProtectedRoute` and the admin portal navigation call this, so a visible
 * nav item can never lead to Access Denied.
 */
export function satisfiesRoles(flags: RoleFlags, requiredRoles: readonly RequiredRole[]): boolean {
  if (requiredRoles.length === 0) return true;
  return requiredRoles.some((role) => {
    switch (role) {
      case 'super_admin':
        return flags.isSuperAdmin;
      case 'admin':
        return flags.isAdmin;
      case 'ops_training_admin':
        return flags.isOpsTrainingAdmin;
      case 'trainer':
        return flags.isTrainer;
      case 'learner':
        return true;
      default:
        return false;
    }
  });
}
