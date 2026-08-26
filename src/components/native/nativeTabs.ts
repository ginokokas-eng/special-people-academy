import { GraduationCap, Search, Award, User } from '@/components/icons';

export interface NativeTab {
  href: string;
  label: string;
  title: string;
  icon: typeof User;
}

/**
 * The native tab set is intentionally fixed: 4 destinations, Learn first.
 * It deliberately IGNORES `learnerCoursesNavDestination` — in the app the
 * Catalogue tab is always /courses.
 */
export const NATIVE_TABS: NativeTab[] = [
  { href: '/my-learning', label: 'Learn', title: 'Learn', icon: GraduationCap },
  { href: '/courses', label: 'Catalogue', title: 'Catalogue', icon: Search },
  { href: '/certificates', label: 'Certificates', title: 'Certificates', icon: Award },
  { href: '/profile', label: 'Profile', title: 'Profile', icon: User },
];

/** The tab that owns a given pathname (drill-downs keep their parent tab active). */
export function activeTabFor(pathname: string): NativeTab | undefined {
  if (pathname.startsWith('/courses')) return NATIVE_TABS[1];
  if (pathname.startsWith('/my-learning') || pathname.startsWith('/my-courses') || pathname.startsWith('/dashboard')) {
    return NATIVE_TABS[0];
  }
  if (pathname.startsWith('/certificates')) return NATIVE_TABS[2];
  if (pathname.startsWith('/profile') || pathname.startsWith('/notifications')) return NATIVE_TABS[3];
  return undefined;
}
