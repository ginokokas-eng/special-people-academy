import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRedirectSettings } from '@/hooks/useRedirectSettings';
import { useRoles } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  X,
  Bell,
  Home,
  LogOut,
  Phone,
} from 'lucide-react';
import defaultLogo from '@/assets/logo.svg';
import { useBranding } from '@/hooks/useBrandingSettings';
import { NotificationsSheet } from '@/components/shared/NotificationsSheet';
import { useNotifications } from '@/hooks/useNotifications';
import { SupportDialog } from '@/components/shared/SupportDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft } from 'lucide-react';
import { adminNavItems, adminDropdownItems, type NavItem } from '@/config/navigation';

interface PortalLayoutProps {
  children: ReactNode;
  title?: string;
  backHref?: string;
  backLabel?: string;
}

/**
 * PortalLayout - Layout for admin portal pages (/admin-portal/*)
 * Features a portal-specific header with role-based navigation and admin dropdown.
 */
export const PortalLayout = ({ children, title, backHref, backLabel }: PortalLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isAdmin, isTrainer } = useAuth();
  const { isSuperAdmin, isOpsTrainingAdmin } = useRoles();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const branding = useBranding();
  const logo = branding.logoMarkUrl || defaultLogo;

  const { logoutRedirectUrl } = useRedirectSettings();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Sign out failed:', error);
    }
    navigate(logoutRedirectUrl);
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  // Filter nav items based on roles
  const getVisibleNavItems = (): NavItem[] => {
    return adminNavItems.filter(item => {
      switch (item.href) {
        case '/admin-portal/dashboard':
          return isAdmin;
        case '/admin-portal/courses':
          return isSuperAdmin || isOpsTrainingAdmin;
        case '/admin-portal/trainer':
          return isTrainer;
        case '/admin-portal/staff-management':
          return isSuperAdmin;
        case '/admin-portal/integrations':
          return isSuperAdmin;
        case '/admin-portal/settings':
          return isAdmin;
        default:
          return isAdmin;
      }
    });
  };

  const visibleNavItems = getVisibleNavItems();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Portal Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            {backHref ? (
              <Button variant="ghost" size="sm" onClick={() => navigate(backHref)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                {backLabel || 'Back'}
              </Button>
            ) : (
              <a href="/" className="flex items-center gap-2.5 font-bold text-lg whitespace-nowrap">
                <img src={logo} alt={branding.platformName} className="h-8 w-8 object-contain flex-shrink-0" />
                <span className="hidden sm:inline text-foreground tracking-tight">Admin Portal</span>
              </a>
            )}

            {title && (
              <div className="hidden md:flex items-center gap-2 text-muted-foreground">
                <span className="text-border">/</span>
                <span className="font-medium text-foreground">{title}</span>
              </div>
            )}
          </div>

          {/* Center navigation (desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => navigate(item.href)}
                  className={isActive ? 'bg-primary/10 text-primary' : ''}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="hidden sm:flex gap-2">
              <Home className="h-4 w-4" />
              Learner View
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setSupportOpen(true)} aria-label="Contact Support">
              <Phone className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationsOpen(true)} aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="" alt={user?.email || ''} />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {isSuperAdmin ? 'Super Admin' : isOpsTrainingAdmin ? 'Ops Admin' : isAdmin ? 'Admin' : isTrainer ? 'Trainer' : 'Learner'}
                  </p>
                </div>
                <DropdownMenuSeparator />
                {adminDropdownItems.map((item) => (
                  <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`
        fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 
        bg-background border-r border-border
        transform transition-transform duration-200 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Button
                key={item.href}
                variant={isActive ? 'secondary' : 'ghost'}
                className={`w-full justify-start ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                onClick={() => {
                  navigate(item.href);
                  setSidebarOpen(false);
                }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            );
          })}
          <DropdownMenuSeparator className="my-4" />
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              navigate('/dashboard');
              setSidebarOpen(false);
            }}
          >
            <Home className="mr-3 h-5 w-5" />
            Learner View
          </Button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {children}
        </div>
      </main>
      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
};
