import {
  LayoutDashboard,
  BookOpen,
  Building2,
  GraduationCap,
  Trophy,
  PenTool,
  ClipboardList,
  HelpCircle,
  ClipboardCheck,

  Ticket,
  Users,
  Settings,
  Settings2,
  User,
  type LucideIcon,
} from '@/components/icons';
import type { RequiredRole } from '@/lib/roles';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Roles that may open the page. MUST match the `requiredRoles` on the route
   * in App.tsx — PortalLayout filters with the same `satisfiesRoles` helper the
   * route guard uses, so a visible item never leads to Access Denied.
   */
  requiredRoles?: RequiredRole[];
}

/** Learner sidebar & dropdown items */
export const learnerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Courses', href: '/my-courses', icon: BookOpen },
  
  { label: 'Certificates', href: '/certificates', icon: Trophy },
];

/** Admin portal top-bar items (visible based on role) */
export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin-portal/dashboard', icon: LayoutDashboard, requiredRoles: ['admin'] },
  { label: 'Courses', href: '/admin-portal/courses', icon: PenTool, requiredRoles: ['ops_training_admin'] },
  { label: 'Question bank', href: '/admin-portal/question-bank', icon: HelpCircle, requiredRoles: ['ops_training_admin'] },
  { label: 'Standards', href: '/admin-portal/standards', icon: ClipboardCheck, requiredRoles: ['ops_training_admin'] },
  { label: 'Training', href: '/admin-portal/trainer', icon: ClipboardList, requiredRoles: ['trainer'] },
  { label: 'Learners', href: '/admin-portal/learners', icon: GraduationCap, requiredRoles: ['admin'] },
  { label: 'Organisations', href: '/admin-portal/organisations', icon: Building2, requiredRoles: ['ops_training_admin'] },
  { label: 'Licences', href: '/admin-portal/licences', icon: Ticket, requiredRoles: ['ops_training_admin'] },
  { label: 'Staff', href: '/admin-portal/staff-management', icon: Users, requiredRoles: ['admin'] },
  { label: 'Integrations', href: '/admin-portal/integrations', icon: Settings2, requiredRoles: ['super_admin'] },
  { label: 'Settings', href: '/admin-portal/settings', icon: Settings, requiredRoles: ['admin'] },
];

/** Profile dropdown items for learners */
export const learnerDropdownItems: NavItem[] = [
  { label: 'Profile Settings', href: '/profile', icon: User },
];

/** Profile dropdown items for admins (inside admin portal) */
export const adminDropdownItems: NavItem[] = [
  { label: 'Profile Settings', href: '/profile', icon: User },
  { label: 'Admin Settings', href: '/admin-portal/settings', icon: Settings },
];
