import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardCheck, CheckCircle2, XCircle, Clock, Info } from 'lucide-react';
import type { LearnCourse } from './types';

const sb = supabase as any;

interface AttendanceRow {
  attended: boolean | null;
  competency_outcome: string | null;
  notes: string | null;
  marked_at: string | null;
  session_date: string | null;
}

export function PracticalTab({ course }: { course: LearnCourse }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AttendanceRow[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data: sessions } = await sb
      .from('practical_sessions')
      .select('id, session_date')
      .eq('course_id', course.id);
    const sessionIds = (sessions || []).map((s: any) => s.id);
    const sessionDate: Record<string, string> = {};
    (sessions || []).forEach((s: any) => (sessionDate[s.id] = s.session_date));

    if (sessionIds.length) {
      const { data: att } = await sb
        .from('practical_attendance')
        .select('session_id, attended, competency_outcome, notes, marked_at')
        .eq('user_id', user.id)
        .in('session_id', sessionIds);
      setRows(
        (att || []).map((a: any) => ({
          attended: a.attended,
          competency_outcome: a.competency_outcome,
          notes: a.notes,
          marked_at: a.marked_at,
          session_date: sessionDate[a.session_id] || null,
        }))
      );
    }
    setLoading(false);
  }, [user, course.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!course.requires_practical_signoff) {
    return (
      <div className="rounded-lg border bg-card p-5 flex items-start gap-3">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">No practical sign-off required</p>
          <p className="text-sm text-muted-foreground mt-1">
            This course can be completed entirely online and does not require a hands-on practical
            assessment.
          </p>
        </div>
      </div>
    );
  }

  const latest = rows[0];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground">Practical sign-off required</h4>
        </div>
        {course.practical_details ? (
          <p className="text-sm text-foreground/90 whitespace-pre-line">{course.practical_details}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This course requires an in-person practical assessment with a trainer to complete your
            competency sign-off.
          </p>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Your assessment status</h4>
        {rows.length === 0 ? (
          <div className="rounded-lg border bg-card p-5 flex items-start gap-3">
            <Clock className="h-5 w-5 text-status-warning-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Awaiting practical session</p>
              <p className="text-sm text-muted-foreground mt-1">
                You have not yet attended a practical session for this course. Your trainer will book
                or confirm a session with you.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => {
              const passed = r.competency_outcome?.toLowerCase().includes('compet') || r.competency_outcome?.toLowerCase() === 'pass';
              return (
                <div key={i} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {r.attended ? (
                        <CheckCircle2 className="h-4 w-4 text-status-success-foreground" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {r.attended ? 'Attended' : 'Did not attend'}
                      </span>
                      {r.session_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.session_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {r.competency_outcome && (
                      <Badge variant={passed ? 'default' : 'secondary'}>{r.competency_outcome}</Badge>
                    )}
                  </div>
                  {r.notes && (
                    <p className="text-sm text-muted-foreground mt-2 border-t pt-2">
                      <span className="font-medium text-foreground">Trainer notes: </span>
                      {r.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
