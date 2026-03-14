import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Shield, Bell, Palette, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface SectionData {
  settings: Record<string, unknown>;
  updated_at: string | null;
  updated_by: string | null;
}

interface AuditEntry {
  section: string;
  changed_at: string;
  changed_by: string | null;
}

function useSettingsOverview() {
  const { user } = useAuth();

  const settingsQuery = useQuery({
    queryKey: ['admin-settings-overview'],
    queryFn: async () => {
      const [settingsRes, auditRes, profilesRes] = await Promise.all([
        supabase
          .from('platform_settings')
          .select('section, settings, updated_at, updated_by')
          .in('section', ['security', 'notifications', 'branding', 'general']),
        supabase
          .from('settings_audit_log')
          .select('section, changed_at, changed_by')
          .in('section', ['security', 'notifications', 'branding', 'general'])
          .order('changed_at', { ascending: false })
          .limit(20),
        supabase
          .from('profiles')
          .select('user_id, full_name'),
      ]);

      const sections: Record<string, SectionData> = {};
      for (const row of settingsRes.data || []) {
        sections[row.section] = {
          settings: (row.settings as Record<string, unknown>) || {},
          updated_at: row.updated_at,
          updated_by: row.updated_by,
        };
      }

      // Build latest audit per section
      const latestAudit: Record<string, AuditEntry> = {};
      for (const entry of (auditRes.data || []) as AuditEntry[]) {
        if (!latestAudit[entry.section]) {
          latestAudit[entry.section] = entry;
        }
      }

      // Build profiles map
      const profilesMap: Record<string, string> = {};
      for (const p of profilesRes.data || []) {
        if (p.user_id && p.full_name) {
          profilesMap[p.user_id] = p.full_name;
        }
      }

      return { sections, latestAudit, profilesMap };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return settingsQuery;
}

function StatusChip({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'secondary' | 'outline' }) {
  return (
    <Badge variant={variant} className="text-xs font-normal whitespace-nowrap">
      {children}
    </Badge>
  );
}

function OnOffChip({ label, on }: { label: string; on: boolean }) {
  return (
    <StatusChip variant={on ? 'default' : 'outline'}>
      {label}: {on ? 'ON' : 'OFF'}
    </StatusChip>
  );
}

function LastUpdated({ section, sections, latestAudit, profilesMap }: {
  section: string;
  sections: Record<string, SectionData>;
  latestAudit: Record<string, AuditEntry>;
  profilesMap: Record<string, string>;
}) {
  const audit = latestAudit[section];
  const sectionData = sections[section];

  const timestamp = audit?.changed_at || sectionData?.updated_at;
  const userId = audit?.changed_by || sectionData?.updated_by;

  if (!timestamp) return null;

  const name = userId ? (profilesMap[userId] || 'Admin') : null;
  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });

  return (
    <p className="text-xs text-muted-foreground mt-2">
      Updated {timeAgo}{name ? ` by ${name}` : ''}
    </p>
  );
}

function SettingsCardSkeleton({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription><Skeleton className="h-4 w-48" /></CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-36 mt-2" />
      </CardContent>
    </Card>
  );
}

export default function AdminSettings() {
  const { data, isLoading } = useSettingsOverview();

  if (isLoading || !data) {
    return (
      <PortalLayout title="Settings">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Admin Settings</h1>
            <p className="text-muted-foreground mt-1">Manage platform configuration and preferences.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <SettingsCardSkeleton icon={Shield} title="Security" />
            <SettingsCardSkeleton icon={Bell} title="Notifications" />
            <SettingsCardSkeleton icon={Palette} title="Branding" />
            <SettingsCardSkeleton icon={Settings} title="General" />
          </div>
        </div>
      </PortalLayout>
    );
  }

  const { sections, latestAudit, profilesMap } = data;
  const sec = sections.security?.settings || {};
  const notif = sections.notifications?.settings || {};
  const brand = sections.branding?.settings || {};
  const gen = sections.general?.settings || {};

  const socialLinks = (brand.socialLinks as Record<string, string>) || {};
  const socialCount = Object.values(socialLinks).filter(v => !!v).length;

  const expiryDays = (notif.certificateExpiryReminderDays as number[]) || [];

  return (
    <PortalLayout title="Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">Manage platform configuration and preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Security */}
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
                <div className="flex flex-wrap gap-1.5">
                  <OnOffChip label="Microsoft" on={!!sec.enableMicrosoftLogin} />
                  <OnOffChip label="Google" on={!!sec.enableGoogleLogin} />
                  <StatusChip variant="secondary">Session: {(sec.sessionTimeoutHours as number) || 24}h</StatusChip>
                  <OnOffChip label="Domain restrict" on={!!sec.restrictStaffAccountsToDomains} />
                </div>
                <LastUpdated section="security" sections={sections} latestAudit={latestAudit} profilesMap={profilesMap} />
                <p className="text-xs text-primary mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View details <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Notifications */}
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
                <div className="flex flex-wrap gap-1.5">
                  <OnOffChip label="In-app" on={!!notif.enableInAppNotifications} />
                  <OnOffChip label="Email" on={!!notif.enableEmailNotifications} />
                  {expiryDays.length > 0 && (
                    <StatusChip variant="secondary">Expiry: {expiryDays.join('/')}&nbsp;days</StatusChip>
                  )}
                  {notif.fromEmail && (
                    <StatusChip variant="outline">{notif.fromEmail as string}</StatusChip>
                  )}
                </div>
                <LastUpdated section="notifications" sections={sections} latestAudit={latestAudit} profilesMap={profilesMap} />
                <p className="text-xs text-primary mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View details <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Branding */}
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
                <div className="flex flex-wrap gap-1.5">
                  <StatusChip variant="secondary">{(brand.platformName as string) || 'Special People Training'}</StatusChip>
                  <StatusChip variant={brand.logoMarkUrl ? 'default' : 'outline'}>
                    Logo: {brand.logoMarkUrl ? 'Set' : 'Not set'}
                  </StatusChip>
                  <StatusChip variant="outline">{socialCount} social link{socialCount !== 1 ? 's' : ''}</StatusChip>
                </div>
                <LastUpdated section="branding" sections={sections} latestAudit={latestAudit} profilesMap={profilesMap} />
                <p className="text-xs text-primary mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View details <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* General */}
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
                <div className="flex flex-wrap gap-1.5">
                  <StatusChip variant="secondary">{(gen.timezone as string) || 'Europe/London'}</StatusChip>
                  <StatusChip variant="secondary">{(gen.currency as string) || 'GBP'}</StatusChip>
                  <StatusChip variant="outline">
                    Courses → {(gen.learnerCoursesNavDestination as string) === 'catalog' ? 'Catalog' : 'My Courses'}
                  </StatusChip>
                  <OnOffChip label="Careers" on={!!gen.enableCareerApplications} />
                </div>
                <LastUpdated section="general" sections={sections} latestAudit={latestAudit} profilesMap={profilesMap} />
                <p className="text-xs text-primary mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View details <ArrowRight className="h-3 w-3" />
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </PortalLayout>
  );
}
