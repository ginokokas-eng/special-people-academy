import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  LayoutDashboard, 
  Menu, 
  X,
  Bell,
  ClipboardList,
  Users,
  Briefcase,
  PenTool,
  User,
  LogOut,
  ChevronLeft,
  Home,
  Settings2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PortalLayoutProps {
  children: ReactNode;
  title?: string;
  backHref?: string;
  backLabel?: string;
}

/**
 * PortalLayout - Layout for authenticated portal pages (/app/*)
 * Features a portal-specific header with navigation and user menu.
 * Used for admin, trainer, and org management routes.
 */
export const PortalLayout = ({ children, title, backHref, backLabel }: PortalLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isAdmin, isTrainer } = useAuth();
  const { isSuperAdmin, isOpsTrainingAdmin } = useRoles();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Sign out failed:', error);
      // Still navigate to home even if there's an error
    }
    navigate('/');
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  // Portal navigation items
  const portalNavItems = [
    ...(isSuperAdmin || isOpsTrainingAdmin ? [
      { label: 'Course Builder', href: '/app/admin/courses', icon: PenTool },
    ] : []),
    ...(isTrainer ? [
      { label: 'Trainer Portal', href: '/trainer', icon: ClipboardList },
    ] : []),
    ...(isAdmin ? [
      { label: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
    ] : []),
    ...(isSuperAdmin ? [
      { label: 'Staff Management', href: '/staff-management', icon: Users },
      { label: 'Career Applications', href: '/career-applications', icon: Briefcase },
      { label: 'Integrations', href: '/app/admin/integrations-status', icon: Settings2 },
    ] : []),
  ];

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
              <a href="/" className="flex items-center gap-2 font-bold text-lg">
                <div className="p-1.5 rounded-lg gradient-primary">
                  <GraduationCap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="hidden sm:inline text-foreground">Admin Portal</span>
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
            {portalNavItems.map((item) => {
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
              Dashboard
            </Button>

            <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
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
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  My Dashboard
                </DropdownMenuItem>
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
          {portalNavItems.map((item) => {
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
            My Dashboard
          </Button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};
