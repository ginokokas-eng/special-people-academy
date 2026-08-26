import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { NativeHeader } from './NativeHeader';
import { NativeTabBar } from './NativeTabBar';
import { activeTabFor } from './nativeTabs';

interface NativeShellProps {
  children: ReactNode;
  /** Overrides the per-tab title (drill-downs). */
  title?: string;
  backTo?: string;
  actions?: ReactNode;
  /** Immersive surfaces (lesson player, quiz) opt out of the tab bar. */
  hideTabBar?: boolean;
  /** Surfaces that own their own header (mobile player) opt out. */
  hideHeader?: boolean;
}

/**
 * The native app shell: safe-area padding, collapsing large-title header,
 * ~200ms content cross-fade between peer tabs, bottom tab bar.
 * Rendered only when running inside the Capacitor shell.
 */
export const NativeShell = ({
  children,
  title,
  backTo,
  actions,
  hideTabBar,
  hideHeader,
}: NativeShellProps) => {
  const location = useLocation();
  const tab = activeTabFor(location.pathname);
  const heading = title ?? tab?.title ?? '';

  return (
    <div className="native-shell learner-surface min-h-screen">
      {!hideHeader && heading ? (
        <NativeHeader title={heading} backTo={backTo} actions={actions} />
      ) : null}

      <main
        key={tab?.href ?? location.pathname}
        className="native-crossfade native-shell-main px-4 pb-6"
        data-tabbar={hideTabBar ? 'hidden' : 'visible'}
      >
        {children}
      </main>

      {!hideTabBar && <NativeTabBar />}
    </div>
  );
};
