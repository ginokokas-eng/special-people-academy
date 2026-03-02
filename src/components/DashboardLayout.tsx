import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRedirectSettings } from '@/hooks/useRedirectSettings';
import { useRoles } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  Menu, 
  X,
  Search,
  Bell,
  LayoutDashboard,
  Phone,
} from 'lucide-react';
import defaultLogo from '@/assets/logo.png';
import { useBranding } from '@/hooks/useBrandingSettings';
import { useGeneralSettings } from '@/hooks/useGeneralSettings';
import { Input } from '@/components/ui/input';
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
import { learnerNavItems, learnerDropdownItems } from '@/config/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isAdmin, isTrainer } = useAuth();
  const { isSuperAdmin, isOpsTrainingAdmin } = useRoles();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const branding = useBranding();
  const generalSettings = useGeneralSettings();
  const logo = branding.logoMarkUrl || defaultLogo;
  const platformName = branding.platformName || 'Special People Academy';

  // Adjust learner nav based on general settings
  const adjustedLearnerNavItems = learnerNavItems.map(item => {
    if (item.href === '/my-courses' && generalSettings.learnerCoursesNavDestination === 'catalog') {
      return { ...item, label: 'Courses', href: '/courses' };
    }
    return item;
  });

  const { logoutRedirectUrl } = useRedirectSettings();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Sign out failed:', error);
    }
    navigate(logoutRedirectUrl);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courses?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';
  const showAdminLink = isAdmin || isSuperAdmin || isOpsTrainingAdmin || isTrainer;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
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
            
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <img src={logo} alt={platformName} className="h-7 sm:h-8 w-auto object-contain flex-shrink-0" />
              <span className="hidden sm:inline text-foreground">{platformName}</span>
            </a>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
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
                        {isAdmin ? 'Admin' : isTrainer ? 'Trainer' : 'Learner'}
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    {learnerDropdownItems.map((item) => (
                      <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </DropdownMenuItem>
                    ))}
                    {showAdminLink && (
                      <DropdownMenuItem onClick={() => navigate('/admin-portal/dashboard')}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Admin Portal
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate('/auth')}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - only show for logged in users */}
        {user && (
          <aside className={`
            fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 
            bg-background border-r border-border
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <nav className="p-4 space-y-1">
              {adjustedLearnerNavItems.map((item) => {
                const isActive = location.pathname === item.href;
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
            </nav>
          </aside>
        )}

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
};
