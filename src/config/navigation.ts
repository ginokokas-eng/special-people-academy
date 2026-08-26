import {
  LayoutDashboard,
  BookOpen,
  Building2,
  GraduationCap,
  Trophy,
  PenTool,
  ClipboardList,
  Ticket,
  Users,
  Settings,
  Settings2,
  User,
  type LucideIcon,
} from '@/components/icons';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Learner sidebar & dropdown items */
export const learnerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Courses', href: '/my-courses', icon: BookOpen },
  { label: 'My Learning', href: '/my-learning', icon: GraduationCap },
  { label: 'Certificates', href: '/certificates', icon: Trophy },
];

/** Admin portal top-bar items (visible based on role) */
export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin-portal/dashboard', icon: LayoutDashboard },
  { label: 'Courses', href: '/admin-portal/courses', icon: PenTool },
  { label: 'Training', href: '/admin-portal/trainer', icon: ClipboardList },
  { label: 'Learners', href: '/admin-portal/learners', icon: GraduationCap },
  { label: 'Organisations', href: '/admin-portal/organisations', icon: Building2 },
  { label: 'Licences', href: '/admin-portal/licences', icon: Ticket },
  { label: 'Staff', href: '/admin-portal/staff-management', icon: Users },
  { label: 'Integrations', href: '/admin-portal/integrations', icon: Settings2 },
  { label: 'Settings', href: '/admin-portal/settings', icon: Settings },
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
