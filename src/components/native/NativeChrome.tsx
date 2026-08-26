import { useLocation } from 'react-router-dom';
import { NativeHeader } from './NativeHeader';
import { NativeTabBar } from './NativeTabBar';
import { activeTabFor } from './nativeTabs';

/**
 * Native replacement for the website Navbar: a collapsing large-title header
 * plus the bottom tab bar. No logo, no cart, no phone, no hamburger.
 *
 * Rendered from `Navbar` when running inside the Capacitor shell, so every page
 * that already mounts the web navbar (public layout, course detail, marketing
 * shells) inherits native chrome through a single seam.
 */
const DRILLDOWN_TITLES: Array<{ match: RegExp; title: string; backTo: string }> = [
  { match: /^\/courses\/[^/]+$/, title: 'Course', backTo: '/courses' },
];

// Routes that must render bare in the app: auth, SSO handoff, invitations and
// public verification are not part of the tabbed shell.
const BARE_ROUTES = [/^\/auth/, /^\/sso/, /^\/invite/, /^\/verify/, /^\/native-welcome/, /^\/reset-password/];

export const NativeChrome = () => {
  const location = useLocation();
  const path = location.pathname;
  if (BARE_ROUTES.some((r) => r.test(path))) return null;
  const drilldown = DRILLDOWN_TITLES.find((d) => d.match.test(path));
  const tab = activeTabFor(path);

  const title = drilldown?.title ?? tab?.title ?? '';

  return (
    <>
      {title ? (
        <NativeHeader title={title} backTo={drilldown?.backTo} />
      ) : null}
      <NativeTabBar />
    </>
  );
};
