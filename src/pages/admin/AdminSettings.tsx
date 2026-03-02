import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Shield, Bell, Palette, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminSettings() {
  return (
    <PortalLayout title="Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">Manage platform configuration and preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link to="/admin-portal/settings/security" className="block group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                </CardTitle>
                <CardDescription>Authentication methods, domain restrictions, and session controls.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manage sign-in methods, allowed domains, and session behaviour.</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin-portal/settings/notifications" className="block group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                </CardTitle>
                <CardDescription>Email and in-app notification preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Configure notification channels, events, and reminder rules.</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin-portal/settings/branding" className="block group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Branding
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                </CardTitle>
                <CardDescription>Platform branding and appearance.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manage logos, platform name, and footer content.</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin-portal/settings/general" className="block group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  General
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                </CardTitle>
                <CardDescription>Organisation profile, training defaults, and feature toggles.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Manage organisation details, default training rules, and enable/disable platform features.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </PortalLayout>
  );
}
