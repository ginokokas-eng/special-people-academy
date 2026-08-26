import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { RenewalRow } from '@/components/native/RenewalRow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, CalendarClock } from '@/components/icons';
import { haptics } from '@/hooks/useHaptics';
import { toast } from 'sonner';

/**
 * /renewals — everything with an expiry date, soonest first, grouped by how
 * close it is. Reached from the Learn tab's "Due this month".
 *
 * Renewal dates come from issued certificates. A course's renewal_months only
 * becomes a date once a certificate exists to count from, so a learner with no
 * certificates genuinely has nothing due — the page says so rather than
 * inventing a schedule.
 */

interface Renewal {
  id: string;
  courseId: string | null;
  title: string;
  expiresAt: string;
  daysLeft: number;
}

const REMINDER_KEY = 'spa.renewal-reminders';

const readReminders = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(REMINDER_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
};

export default function Renewals() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<string[]>(readReminders);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('certificates')
      .select('id, expires_at, course:courses(id, title)')
      .eq('user_id', user.id)
      .not('expires_at', 'is', null)
      .order('expires_at', { ascending: true });

    const now = Date.now();
    setRows(
      (data ?? []).map((c) => {
        const course = c.course as { id?: string; title?: string } | null;
        const expires = c.expires_at as string;
        return {
          id: c.id as string,
          courseId: course?.id ?? null,
          title: course?.title ?? 'Course',
          expiresAt: expires,
          daysLeft: Math.ceil((new Date(expires).getTime() - now) / 86_400_000),
        };
      }),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const thisMonth: Renewal[] = [];
    const nextThree: Renewal[] = [];
    const later: Renewal[] = [];
    for (const r of rows) {
      if (r.daysLeft <= 31) thisMonth.push(r);
      else if (r.daysLeft <= 92) nextThree.push(r);
      else later.push(r);
    }
    return [
      { label: 'This month', items: thisMonth },
      { label: 'Next three months', items: nextThree },
      { label: 'Later', items: later },
    ].filter((g) => g.items.length > 0);
  }, [rows]);

  const toggleReminder = (id: string) => {
    haptics.selection();
    setReminders((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(REMINDER_KEY, JSON.stringify(next));
      toast.success(prev.includes(id) ? 'Reminder removed' : 'We’ll remind you 30, 14 and 3 days before.');
      return next;
    });
  };

  const soonest = rows[0] ?? null;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Renewals | Special People Academy</title>
      </Helmet>

      <div className="space-y-6 pb-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="pressable -ml-2 mb-2 h-9 rounded-full px-2.5 text-muted-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          <h1 className="font-display text-[30px] leading-tight tracking-tight text-foreground">Renewals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything with an expiry date, soonest first.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : rows.length === 0 ? (
          <section className="learner-card p-6 text-center">
            <span className="learner-chip mx-auto mb-3 h-11 w-11 rounded-2xl" aria-hidden="true">
              <CalendarClock className="h-5 w-5" />
            </span>
            <p className="font-display text-[18px] text-foreground">Nothing due</p>
            <p className="mx-auto mt-1.5 max-w-[300px] text-sm leading-relaxed text-muted-foreground">
              Renewal dates start once a certificate is issued. Finish a course and its renewal
              appears here, with reminders you can set per item.
            </p>
          </section>
        ) : (
          groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {group.label}
              </h2>
              <div className="space-y-2.5">
                {group.items.map((r) => {
                  const date = new Date(r.expiresAt);
                  const isSoonest = soonest?.id === r.id;
                  return isSoonest ? (
                    <RenewalRow
                      key={r.id}
                      expanded
                      title={r.title}
                      meta={`Expires ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`}
                      daysLeft={r.daysLeft}
                      status="due"
                      onStart={() => r.courseId && navigate(`/courses/${r.courseId}/learn`)}
                      onRemind={() => toggleReminder(r.id)}
                    />
                  ) : (
                    <RenewalRow
                      key={r.id}
                      title={r.title}
                      meta={`Expires ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                      day={String(date.getDate())}
                      month={date.toLocaleDateString('en-GB', { month: 'short' })}
                    />
                  );
                })}
              </div>
            </section>
          ))
        )}

        {reminders.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            {reminders.length} reminder{reminders.length === 1 ? '' : 's'} set on this device.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
