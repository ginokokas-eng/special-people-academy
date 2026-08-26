import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBranding } from '@/hooks/useBrandingSettings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InitialsAvatar } from '@/components/org/PortalBits';
import { GraduationCap, LogOut, ShieldCheck } from '@/components/icons';
import logoMark from '@/assets/logo.svg';

interface PortalShellProps {
  orgName: string;
  /** Right-hand header actions (invite button, refresh…). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Chrome for the buyer-facing portal: sticky translucent top bar with the
 * Academy identity, the customer's own actions, and a user menu — the portal
 * previously had no navigation and no way to sign out at all.
 */
export function PortalShell({ orgName, actions, children }: PortalShellProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const branding = useBranding();
  const supportEmail = branding.socialLinks.email;

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="learner-surface flex min-h-screen flex-col">
      <header className="material-chrome sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Special People Academy home">
            <img src={logoMark} alt="" className="h-7 w-7 shrink-0" />
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--learner-kicker))]">
                Special People Academy
              </span>
              <span className="block truncate text-[13px] font-semibold leading-tight text-foreground">
                Training portal
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {actions}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="pressable rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <InitialsAvatar name={orgName} email={user?.email} className="h-9 w-9 text-[13px]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium text-foreground">{orgName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/my-learning')}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  My learning
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void handleSignOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-10 pb-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 text-xs text-muted-foreground md:px-6">
          <p className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Certificates can be checked by anyone at {window.location.origin}/verify
          </p>
          {supportEmail && (
            <p>
              Need help?{' '}
              <a className="underline underline-offset-2 hover:text-foreground" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
