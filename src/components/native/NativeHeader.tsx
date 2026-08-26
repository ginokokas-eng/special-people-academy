import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from '@/components/icons';
import { useCollapsingHeader } from './useCollapsingHeader';
import { cn } from '@/lib/utils';

interface NativeHeaderProps {
  title: string;
  /** Render a back chevron for drill-downs (exit the way you entered). */
  backTo?: string;
  actions?: ReactNode;
}

/**
 * Per-tab large-title header that collapses on scroll into an inline
 * .material-chrome bar. No logo, no cart, no phone — contextual actions only.
 */
export const NativeHeader = ({ title, backTo, actions }: NativeHeaderProps) => {
  const navigate = useNavigate();
  const collapsed = useCollapsingHeader();

  return (
    <header
      data-collapsed={collapsed}
      className={cn('native-header sticky top-0 z-40', collapsed && 'material-chrome')}
    >
      <div className="flex items-center gap-1 px-3 min-h-[48px]">
        {backTo ? (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label="Back"
            className="pressable native-chrome-el -ml-1 h-11 w-11 rounded-full flex items-center justify-center text-foreground"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        ) : null}

        <span
          className={cn(
            'native-chrome-el min-w-0 font-heading font-semibold text-[17px] truncate transition-opacity duration-200',
            collapsed ? 'opacity-100' : 'opacity-0',
          )}
        >
          {title}
        </span>

        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-2">
          <h1 className="native-chrome-el font-heading font-bold tracking-tight text-[30px] leading-[1.1] text-foreground">
            {title}
          </h1>
        </div>
      )}
    </header>
  );
};
