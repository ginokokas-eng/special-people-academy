import { useLocation, useNavigate } from 'react-router-dom';
import { NATIVE_TABS, activeTabFor } from './nativeTabs';
import { cn } from '@/lib/utils';

/**
 * Bottom tab bar — native shell only.
 * Translucent chrome material, no hairline (the .material-chrome scroll-edge
 * gradient does the separation), safe-area padded, ≥56dp targets.
 */
export const NativeTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const active = activeTabFor(location.pathname);

  return (
    <nav
      aria-label="Main"
      className="native-tabbar material-chrome fixed bottom-0 inset-x-0 z-50"
    >
      <ul className="flex items-stretch justify-around px-1 pt-1.5">
        {NATIVE_TABS.map((tab) => {
          const isActive = active?.href === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (isActive && location.pathname === tab.href) {
                    window.scrollTo({ top: 0 });
                    return;
                  }
                  navigate(tab.href);
                }}
                className={cn(
                  'pressable native-chrome-el w-full min-h-[56px] rounded-2xl flex flex-col items-center justify-center gap-1 px-1 py-1.5',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    isActive ? 'bg-primary/12' : 'bg-transparent',
                  )}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={isActive ? 2.5 : 1.75}
                    aria-hidden="true"
                  />
                </span>
                <span className={cn('text-[11px] leading-none', isActive ? 'font-semibold' : 'font-medium')}>
                  {tab.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
