import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Copy, Mail, CheckCircle2, AlertCircle, Send } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { OrgLicence } from '@/components/org/useOrgLicences';

interface InviteRow {
  email: string;
  outcome: 'enrolled' | 'invited' | 'invalid_email' | 'failed';
  message: string;
  invite_url?: string;
}

interface BulkInviteFormProps {
  licences: OrgLicence[];
  /** Platform staff may also mint org admins. */
  allowOrgAdminRole?: boolean;
  onCompleted?: () => void;
  /** 'card' (default) wraps the form in its own card — 'bare' renders just the fields (for sheets/dialogs). */
  variant?: 'card' | 'bare';
}

const OUTCOME_LABEL: Record<InviteRow['outcome'], string> = {
  enrolled: 'Seat assigned',
  invited: 'Invitation created',
  invalid_email: 'Skipped',
  failed: 'Failed',
};

/**
 * Bulk invite people onto a licence.
 *
 * All seat writes happen inside the org-invite edge function via the Step-1
 * primitives — this form never touches licences, seats or invitations directly.
 */
export function BulkInviteForm({
  licences,
  allowOrgAdminRole = false,
  onCompleted,
  variant = 'card',
}: BulkInviteFormProps) {
  const [licenceId, setLicenceId] = useState<string>('');
  const [orgRole, setOrgRole] = useState<'member' | 'org_admin'>('member');
  const [emails, setEmails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<InviteRow[] | null>(null);

  const selected = licences.find((l) => l.id === licenceId);
  const seatsLeft = selected ? Math.max(selected.seats_total - selected.seats_used, 0) : null;
  const pastedCount = emails.split(/[\n,;]+/).map((v) => v.trim()).filter(Boolean).length;

  const handleSubmit = async () => {
    if (!licenceId) {
      toast.error('Choose the licence these people should use.');
      return;
    }
    if (pastedCount === 0) {
      toast.error('Add at least one email address.');
      return;
    }

    setSubmitting(true);
    setRows(null);
    try {
      const { data, error } = await supabase.functions.invoke('org-invite', {
        body: { licence_id: licenceId, emails, org_role: orgRole },
      });
      if (error) {
        const detail = typeof error.context?.body === 'string' ? error.context.body : error.message;
        throw new Error(detail || 'The invitation request failed.');
      }
      if (data?.error) throw new Error(data.message ?? data.error);

      setRows((data?.rows ?? []) as InviteRow[]);
      const s = data?.summary ?? { enrolled: 0, invited: 0, failed: 0 };
      if (s.failed > 0) {
        toast.warning(`${s.enrolled} enrolled, ${s.invited} invited, ${s.failed} not processed.`);
      } else {
        toast.success(`${s.enrolled} enrolled, ${s.invited} invited.`);
      }
      setEmails('');
      onCompleted?.();
    } catch (e) {
      toast.error('Could not invite these people', {
        description: (e as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fields = (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invite-licence">Licence</Label>
          <Select value={licenceId} onValueChange={setLicenceId}>
            <SelectTrigger id="invite-licence">
              <SelectValue placeholder="Choose a licence" />
            </SelectTrigger>
            <SelectContent>
              {licences.length === 0 && (
                <SelectItem value="none" disabled>
                  No licences available
                </SelectItem>
              )}
              {licences.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.course_title} — {l.seats_used}/{l.seats_total} seats used
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {seatsLeft !== null && (
            <p className="text-sm text-muted-foreground">
              {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} available on this licence.
            </p>
          )}
        </div>

        {allowOrgAdminRole && (
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role in the organisation</Label>
            <Select value={orgRole} onValueChange={(v) => setOrgRole(v as 'member' | 'org_admin')}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="org_admin">Organisation admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-emails">Email addresses</Label>
        <Textarea
          id="invite-emails"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={6}
          placeholder={'jo@example.org\nsam@example.org'}
          className="font-mono text-sm"
        />
        <p className="text-sm text-muted-foreground">
          {pastedCount} {pastedCount === 1 ? 'address' : 'addresses'} pasted.
          {seatsLeft !== null && pastedCount > seatsLeft && (
            <span className="ml-1 text-[hsl(var(--destructive-ink))]">
              That is more than the seats available — the extras will report “seats full”.
            </span>
          )}
        </p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="pressable w-full rounded-[10px] font-semibold sm:w-auto"
      >
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
        Send invitations
      </Button>

      {rows && rows.length > 0 && (
        <div className="space-y-3 rounded-xl bg-[hsl(var(--learner-wash)/0.05)] p-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Results</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Email delivery isn’t configured yet — copy each link and send it to the person yourself.
            </p>
          </div>
          <ul className="space-y-2">
            {rows.map((row, i) => {
              const failed = row.outcome === 'failed' || row.outcome === 'invalid_email';
              return (
                <li
                  key={`${row.email}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 shadow-[var(--shadow-xs)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{row.email}</p>
                    <p
                      className={cn(
                        'mt-0.5 inline-flex items-center gap-1 text-xs',
                        failed ? 'text-[hsl(var(--destructive-ink))]' : 'text-[hsl(var(--success-ink))]',
                      )}
                    >
                      {failed ? (
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      )}
                      {OUTCOME_LABEL[row.outcome]}
                      {row.message ? <span className="text-muted-foreground"> · {row.message}</span> : null}
                    </p>
                  </div>
                  {row.invite_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        void navigator.clipboard.writeText(row.invite_url!);
                        toast.success('Invitation link copied');
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy link
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );

  if (variant === 'bare') return fields;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Invite people
        </CardTitle>
        <CardDescription>
          Paste one email per line (or separated by commas). People who already have an account get a
          seat straight away; everyone else receives an invitation link.
        </CardDescription>
      </CardHeader>
      <CardContent>{fields}</CardContent>
    </Card>
  );
}
