import { useState, useEffect } from 'react';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, KeyRound, Globe, Clock, History, LogOut, Plus, X, ArrowLeft, Info } from 'lucide-react';
import { useSecuritySettings, type SecuritySettings as SecuritySettingsType } from '@/hooks/useSecuritySettings';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SecuritySettingsPage() {
  const { settings, isLoading, auditLog, auditLogLoading, save, isSaving } = useSecuritySettings();
  const [form, setForm] = useState<SecuritySettingsType>(settings);
  const [newDomain, setNewDomain] = useState('');

  useEffect(() => {
    if (!isLoading) setForm(settings);
  }, [isLoading, settings]);

  const handleSave = async () => {
    await save(form);
  };

  const addDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    if (form.staffAllowedDomains.includes(domain)) {
      toast.error('Domain already added.');
      return;
    }
    setForm(prev => ({ ...prev, staffAllowedDomains: [...prev.staffAllowedDomains, domain] }));
    setNewDomain('');
  };

  const removeDomain = (domain: string) => {
    setForm(prev => ({ ...prev, staffAllowedDomains: prev.staffAllowedDomains.filter(d => d !== domain) }));
  };

  if (isLoading) {
    return (
      <PortalLayout title="Security Settings">
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Security Settings">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin-portal/settings">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Security Settings</h1>
            <p className="text-muted-foreground mt-1">Manage authentication methods, domain restrictions, and session controls.</p>
          </div>
        </div>

        {/* A) Sign-in Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Sign-in Methods
            </CardTitle>
            <CardDescription>Control which authentication methods are available to users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email &amp; Password</Label>
                <p className="text-xs text-muted-foreground">Standard email/password authentication.</p>
              </div>
              <Switch
                checked={form.enableEmailPassword}
                onCheckedChange={v => setForm(prev => ({ ...prev, enableEmailPassword: v }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Google Login</Label>
                <p className="text-xs text-muted-foreground">Sign in with Google accounts.</p>
              </div>
              <Switch
                checked={form.enableGoogleLogin}
                onCheckedChange={v => setForm(prev => ({ ...prev, enableGoogleLogin: v }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Microsoft Login</Label>
                <p className="text-xs text-muted-foreground">Sign in with Microsoft / Azure AD.</p>
              </div>
              <Switch
                checked={form.enableMicrosoftLogin}
                onCheckedChange={v => setForm(prev => ({ ...prev, enableMicrosoftLogin: v }))}
              />
            </div>
            <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>OAuth providers must also be configured in the auth provider dashboard.</span>
            </div>
          </CardContent>
        </Card>

        {/* B) Allowed Email Domains */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Allowed Email Domains
            </CardTitle>
            <CardDescription>Restrict staff/admin accounts to specific email domains. Learners can still register with any email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Restrict staff accounts to allowed domains</Label>
                <p className="text-xs text-muted-foreground">When enabled, only users with matching email domains can be assigned staff or admin roles.</p>
              </div>
              <Switch
                checked={form.restrictStaffAccountsToDomains}
                onCheckedChange={v => setForm(prev => ({ ...prev, restrictStaffAccountsToDomains: v }))}
              />
            </div>

            {form.restrictStaffAccountsToDomains && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label>Allowed Domains</Label>
                  <div className="flex flex-wrap gap-2">
                    {form.staffAllowedDomains.map(domain => (
                      <Badge key={domain} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                        {domain}
                        <button onClick={() => removeDomain(domain)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {form.staffAllowedDomains.length === 0 && (
                      <p className="text-xs text-muted-foreground">No domains configured. All emails will be allowed.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. company.co.uk"
                      value={newDomain}
                      onChange={e => setNewDomain(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                      className="max-w-xs"
                    />
                    <Button variant="outline" size="sm" onClick={addDomain}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* C) Session Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Session Controls
            </CardTitle>
            <CardDescription>Configure session timeouts and redirect behaviour.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="timeout">Session Timeout (hours)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min={1}
                  max={720}
                  value={form.sessionTimeoutHours}
                  onChange={e => setForm(prev => ({ ...prev, sessionTimeoutHours: Math.max(1, parseInt(e.target.value) || 8) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginRedirect">Login Redirect URL</Label>
                <Input
                  id="loginRedirect"
                  value={form.loginRedirectUrl}
                  onChange={e => setForm(prev => ({ ...prev, loginRedirectUrl: e.target.value }))}
                  placeholder="/dashboard"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoutRedirect">Logout Redirect URL</Label>
                <Input
                  id="logoutRedirect"
                  value={form.logoutRedirectUrl}
                  onChange={e => setForm(prev => ({ ...prev, logoutRedirectUrl: e.target.value }))}
                  placeholder="/"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* D) Audit & Safety */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Admin Audit &amp; Safety
            </CardTitle>
            <CardDescription>Recent security settings changes and admin actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Settings Change History (last 10)</Label>
              {auditLogLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {auditLog.map((entry: any) => (
                    <div key={entry.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{entry.change_summary || 'Settings updated'}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.changed_at), 'dd MMM yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Force Logout All Users</Label>
                <p className="text-xs text-muted-foreground">Invalidate all active sessions across the platform.</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                <LogOut className="h-4 w-4 mr-1" />
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            <Shield className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving…' : 'Save Security Settings'}
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
}
