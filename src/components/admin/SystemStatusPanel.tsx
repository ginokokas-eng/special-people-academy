import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  CalendarSync,
  Users,
  Package,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

type Health = 'ok' | 'warn' | 'error' | 'idle';

interface StatusItem {
  key: string;
  label: string;
  icon: typeof CreditCard;
  health: Health;
  detail: string;
  sub?: string;
}

interface RecentError {
  source: string;
  message: string;
  at: string | null;
}

const healthBadge: Record<Health, { label: string; className: string }> = {
  ok: { label: 'Healthy', className: 'bg-success/15 text-success border-success/30' },
  warn: { label: 'Attention', className: 'bg-warning/15 text-warning border-warning/30' },
  error: { label: 'Failing', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  idle: { label: 'No data', className: 'bg-muted text-muted-foreground' },
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * Compact, work-focused operational status for the admin portal.
 * Surfaces payment webhooks, Outlook calendar sync, Ariadne learner sync,
 * SCORM packages, and recent errors. Quiet by design — no marketing.
 */
export function SystemStatusPanel() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StatusItem[]>([]);
  const [errors, setErrors] = useState<RecentError[]>([]);

  const load = async () => {
    setLoading(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [webhooks, calendar, ariadne, scorm] = await Promise.all([
      supabase
        .from('stripe_webhook_logs')
        .select('status, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('practical_sessions')
        .select('calendar_sync_status, calendar_last_error, last_synced_at')
        .order('last_synced_at', { ascending: false, nullsFirst: false })
        .limit(100),
      supabase
        .from('user_sync_log')
        .select('source_system, status, message, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('scorm_packages')
        .select('id, title, created_at')
        .order('created_at', { ascending: false }),
    ]);

    const recentErrors: RecentError[] = [];

    // --- Payment webhooks ---
    const wh = webhooks.data || [];
    const whFailures = wh.filter(
      (r) => r.status && !['processed', 'success', 'ok', 'succeeded'].includes(String(r.status).toLowerCase()),
    );
    const whFail7d = whFailures.filter((r) => r.created_at && r.created_at >= sevenDaysAgo);
    wh.filter((r) => r.error_message && r.created_at && r.created_at >= sevenDaysAgo)
      .slice(0, 3)
      .forEach((r) => recentErrors.push({ source: 'Stripe webhook', message: r.error_message!, at: r.created_at }));

    // --- Outlook calendar sync ---
    const cal = calendar.data || [];
    const calErrors = cal.filter((r) => String(r.calendar_sync_status || '').toLowerCase() === 'error' || r.calendar_last_error);
    cal.filter((r) => r.calendar_last_error)
      .slice(0, 3)
      .forEach((r) => recentErrors.push({ source: 'Outlook sync', message: r.calendar_last_error!, at: r.last_synced_at }));

    // --- Ariadne learner sync ---
    const sync = (ariadne.data || []).filter((r) => String(r.source_system || '').toLowerCase().includes('ariadne'));
    const syncSource = sync.length ? sync : ariadne.data || [];
    const syncFailures = syncSource.filter((r) => String(r.status || '').toLowerCase() === 'error' || String(r.status || '').toLowerCase() === 'failed');
    const lastSync = syncSource[0]?.created_at || null;
    syncFailures
      .filter((r) => r.message)
      .slice(0, 3)
      .forEach((r) => recentErrors.push({ source: 'Ariadne sync', message: r.message!, at: r.created_at }));

    // --- SCORM packages ---
    const packages = scorm.data || [];

    const next: StatusItem[] = [
      {
        key: 'payments',
        label: 'Payment Webhooks',
        icon: CreditCard,
        health: whFail7d.length > 0 ? 'error' : wh.length ? 'ok' : 'idle',
        detail: wh.length ? `${wh.length} recent events` : 'No events yet',
        sub: whFail7d.length > 0 ? `${whFail7d.length} failed in 7d` : `Last: ${timeAgo(wh[0]?.created_at ?? null)}`,
      },
      {
        key: 'outlook',
        label: 'Outlook Calendar Sync',
        icon: CalendarSync,
        health: calErrors.length > 0 ? 'warn' : cal.length ? 'ok' : 'idle',
        detail: `${cal.length} sessions`,
        sub: calErrors.length > 0 ? `${calErrors.length} with sync errors` : `Last: ${timeAgo(cal[0]?.last_synced_at ?? null)}`,
      },
      {
        key: 'ariadne',
        label: 'Ariadne Learner Sync',
        icon: Users,
        health: syncFailures.length > 0 ? 'warn' : syncSource.length ? 'ok' : 'idle',
        detail: syncSource.length ? `${syncSource.length} recent records` : 'No sync runs',
        sub: syncFailures.length > 0 ? `${syncFailures.length} failures` : `Last: ${timeAgo(lastSync)}`,
      },
      {
        key: 'scorm',
        label: 'SCORM Packages',
        icon: Package,
        health: packages.length ? 'ok' : 'idle',
        detail: `${packages.length} uploaded`,
        sub: packages.length ? `Latest: ${timeAgo(packages[0]?.created_at ?? null)}` : 'None uploaded',
      },
    ];

    recentErrors.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    setItems(next);
    setErrors(recentErrors.slice(0, 8));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Operational Status</h2>
          <p className="text-sm text-muted-foreground">Integrations, jobs, and recent errors at a glance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))
          : items.map((item) => (
              <Card key={item.key}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-lg bg-muted">
                      <item.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <Badge variant="outline" className={healthBadge[item.health].className}>
                      {healthBadge[item.health].label}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mt-3">{item.label}</p>
                  <p className="text-2xl font-bold leading-tight mt-1">{item.detail}</p>
                  {item.sub && <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>}
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Recent Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : errors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent errors. All systems nominal.</p>
          ) : (
            <ul className="divide-y divide-border">
              {errors.map((e, i) => (
                <li key={i} className="py-2 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{e.source}</p>
                    <p className="text-sm text-muted-foreground truncate">{e.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
