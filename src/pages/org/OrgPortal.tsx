import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { useOrgLicences, type OrgLicence } from '@/components/org/useOrgLicences';
import { BulkInviteForm } from '@/components/org/BulkInviteForm';
import { PortalShell } from '@/components/org/PortalShell';
import {
  ComplianceDot,
  EmptyState,
  InitialsAvatar,
  MatrixStatus,
  PortalCard,
  SectionCard,
  StatTile,
  thClass,
  type MatrixState,
} from '@/components/org/PortalBits';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  AlertTriangle,
  Award,
  Building2,
  Check,
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Ticket,
  Trophy,
  UserPlus,
  Users,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrgPerson {
  user_id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  org_role: string;
  started_at: string;
  ended_at: string | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  org_role: string;
  expires_at: string;
  licence_id: string | null;
}

interface OrgCertificate {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  course_title: string;
  certificate_number: string;
  certificate_type: string;
  verification_code: string | null;
  issued_at: string;
  expires_at: string | null;
  status: string;
}

interface MatrixRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  course_id: string;
  course_title: string;
  status: string;
  percent: number;
  required_total: number;
  required_completed: number;
  cpd_hours_total: number | null;
}

const fmtDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const daysUntil = (value: string | null) => {
  if (!value) return Infinity;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
};

/**
 * /org — the buyer-facing portal for organisation admins.
 *
 * The organisation comes from the caller's own org_admin membership, never the
 * URL. Compliance progress comes from the security-definer RPC
 * get_org_compliance_matrix (org admins must NOT read raw lesson_progress).
 */
export default function OrgPortal() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { organisation, loading: orgLoading } = useOrgAdmin();
  const { licences, loading: licencesLoading, reload: reloadLicences } = useOrgLicences(organisation?.id);

  const [people, setPeople] = useState<OrgPerson[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<OrgCertificate[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [peopleFilter, setPeopleFilter] = useState('');
  const [matrixFilter, setMatrixFilter] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!organisation) return;
    setLoading(true);

    const [peopleRes, inviteRes, matrixRes, certRes] = await Promise.all([
      supabase.rpc('get_org_people', { _org: organisation.id }),
      supabase
        .from('organisation_invitations')
        .select('id, email, org_role, expires_at, licence_id')
        .eq('organisation_id', organisation.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase.rpc('get_org_compliance_matrix', { _org: organisation.id }),
      supabase.rpc('get_org_certificates', { _org: organisation.id }),
    ]);

    setPeople((peopleRes.data ?? []) as OrgPerson[]);
    setInvitations((inviteRes.data ?? []) as PendingInvitation[]);
    setMatrix((matrixRes.data ?? []) as unknown as MatrixRow[]);
    setCertificates((certRes.data ?? []) as unknown as OrgCertificate[]);
    setLoading(false);
  }, [organisation]);

  useEffect(() => {
    if (authLoading || orgLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!organisation) {
      navigate('/access-denied', { replace: true });
      return;
    }
    void loadData();
  }, [authLoading, orgLoading, user, organisation, navigate, loadData]);

  const handleRevoke = async (invitationId: string) => {
    setRevoking(invitationId);
    try {
      // Revoking the invitation frees its reserved seat via the primitive.
      const { data: seat } = await supabase
        .from('licence_seats')
        .select('id')
        .eq('invitation_id', invitationId)
        .maybeSingle();

      const { error: inviteErr } = await supabase
        .from('organisation_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);
      if (inviteErr) throw new Error(inviteErr.message);

      if (seat?.id) {
        const { error: seatErr } = await supabase.rpc('revoke_seat', { _seat_id: seat.id });
        if (seatErr) throw new Error(seatErr.message);
      }

      toast.success('Invitation withdrawn and the seat freed.');
      await Promise.all([loadData(), reloadLicences()]);
    } catch (e) {
      toast.error('Could not withdraw that invitation', { description: (e as Error).message });
    } finally {
      setRevoking(null);
    }
  };

  const handleReleaseExpired = async () => {
    if (!organisation) return;
    const { data, error } = await supabase.rpc('release_expired_invitation_seats', {
      _org: organisation.id,
    });
    if (error) {
      toast.error('Could not release expired invitations', { description: error.message });
      return;
    }
    toast.success(`${data ?? 0} expired ${data === 1 ? 'seat' : 'seats'} released.`);
    await Promise.all([loadData(), reloadLicences()]);
  };

  const downloadCertificate = async (certificateId: string) => {
    setDownloading(certificateId);
    try {
      // Entitlement-checked: the storage path comes from the row server-side.
      const { data, error } = await supabase.functions.invoke('issue-certificate', {
        body: { action: 'download', certificate_id: certificateId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error(data?.error ?? 'Certificate is not available yet');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not open that certificate');
    } finally {
      setDownloading(null);
    }
  };

  const licensedCourses = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of licences) map.set(l.course_id, l.course_title);
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [licences]);

  const matrixByLearner = useMemo(() => {
    const learners = new Map<
      string,
      { name: string; email: string; cpd: number; rows: Map<string, MatrixRow> }
    >();
    for (const row of matrix) {
      const entry =
        learners.get(row.user_id) ??
        {
          name: row.full_name ?? 'Unnamed learner',
          email: row.email ?? '—',
          cpd: Number(row.cpd_hours_total ?? 0),
          rows: new Map<string, MatrixRow>(),
        };
      entry.cpd = Number(row.cpd_hours_total ?? entry.cpd);
      entry.rows.set(row.course_id, row);
      learners.set(row.user_id, entry);
    }
    return Array.from(learners, ([userId, value]) => ({ userId, ...value }));
  }, [matrix]);

  /* ---------- derived overview numbers (display only) ---------- */

  const activeMembers = useMemo(() => people.filter((p) => !p.ended_at), [people]);
  const activeLicences = useMemo(() => licences.filter((l) => l.status === 'active'), [licences]);
  const seatTotals = useMemo(
    () =>
      activeLicences.reduce(
        (acc, l) => ({ used: acc.used + l.seats_used, total: acc.total + l.seats_total }),
        { used: 0, total: 0 },
      ),
    [activeLicences],
  );
  const matrixStats = useMemo(() => {
    const total = matrix.length;
    const completed = matrix.filter((r) => r.status === 'completed').length;
    const started = matrix.filter((r) => r.status !== 'not_started').length;
    return { total, completed, started, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [matrix]);
  const certStats = useMemo(() => {
    const valid = certificates.filter((c) => c.status !== 'expired').length;
    const expiringSoon = certificates.filter((c) => c.status === 'expiring_soon').length;
    return { valid, expiringSoon };
  }, [certificates]);

  const expiringLicences = useMemo(
    () => activeLicences.filter((l) => daysUntil(l.expires_at) <= 60),
    [activeLicences],
  );
  const expiredInvitations = useMemo(
    () => invitations.filter((inv) => daysUntil(inv.expires_at) < 0),
    [invitations],
  );
  const attentionCount = expiringLicences.length + (expiredInvitations.length > 0 ? 1 : 0) + (certStats.expiringSoon > 0 ? 1 : 0);

  const filteredPeople = useMemo(() => {
    const q = peopleFilter.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) => (p.full_name ?? '').toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q),
    );
  }, [people, peopleFilter]);

  const filteredLearners = useMemo(() => {
    const q = matrixFilter.trim().toLowerCase();
    if (!q) return matrixByLearner;
    return matrixByLearner.filter(
      (l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q),
    );
  }, [matrixByLearner, matrixFilter]);

  const courseCompletion = useMemo(() => {
    const byCourse = new Map<string, { completed: number; total: number }>();
    for (const row of matrix) {
      const entry = byCourse.get(row.course_id) ?? { completed: 0, total: 0 };
      entry.total += 1;
      if (row.status === 'completed') entry.completed += 1;
      byCourse.set(row.course_id, entry);
    }
    return byCourse;
  }, [matrix]);

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedCode(code);
    // Transient inline confirmation right where the click happened.
    window.setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 1600);
    toast.success('Verification code copied');
  };

  if (authLoading || orgLoading || !organisation) {
    return (
      <div className="learner-surface flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const inviteSheet = (
    <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
      <SheetTrigger asChild>
        <Button className="pressable h-9 rounded-[10px] font-semibold">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite people
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto data-[state=open]:duration-300 data-[state=closed]:duration-200 sm:max-w-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl">Invite your team</SheetTitle>
          <SheetDescription>
            Choose the licence their seat comes from, then paste email addresses. People with an
            account are enrolled straight away; everyone else gets an invitation link.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5">
          <BulkInviteForm
            variant="bare"
            licences={licences}
            onCompleted={() => void Promise.all([loadData(), reloadLicences()])}
          />
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <PortalShell
      orgName={organisation.name}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh data"
            className="pressable h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          {inviteSheet}
        </>
      }
    >
      <Helmet>
        <title>{organisation.name} training portal | Academy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mx-auto max-w-[1200px] px-4 pb-4 pt-8 md:px-6">
        {/* ---------------- Identity ---------------- */}
        <header className="mb-6 flex items-center gap-4">
          {organisation.logo_url ? (
            <img
              src={organisation.logo_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl bg-card object-contain p-1 shadow-[var(--shadow-learner)]"
            />
          ) : (
            <span className="learner-chip h-12 w-12 rounded-xl" aria-hidden="true">
              <Building2 className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--learner-kicker))]">
              Training overview
            </p>
            <h1 className="font-display truncate text-[26px] leading-tight tracking-tight text-foreground sm:text-[30px]">
              {organisation.name}
            </h1>
          </div>
        </header>

        {/* ---------------- Overview ---------------- */}
        <section aria-label="Overview" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            icon={Users}
            wash="violet"
            entranceDelay={0}
            value={activeMembers.length}
            label={activeMembers.length === 1 ? 'Team member' : 'Team members'}
            sub={
              invitations.length > 0
                ? `${invitations.length} ${invitations.length === 1 ? 'invitation' : 'invitations'} pending`
                : 'Everyone is on board'
            }
          />
          <StatTile
            icon={Ticket}
            wash="teal"
            entranceDelay={40}
            value={
              activeLicences.length > 0 ? (
                <>
                  {seatTotals.used}
                  <span className="text-muted-foreground/80">/{seatTotals.total}</span>
                </>
              ) : (
                '—'
              )
            }
            label="Seats in use"
            sub={
              activeLicences.length > 0
                ? `across ${activeLicences.length} ${activeLicences.length === 1 ? 'licence' : 'licences'}`
                : 'No active licences yet'
            }
          />
          <StatTile
            icon={Trophy}
            wash="amber"
            entranceDelay={80}
            value={licensedCourses.length > 0 ? `${matrixStats.percent}%` : '—'}
            label="Training complete"
            sub={
              licensedCourses.length > 0
                ? `${matrixStats.completed} of ${matrixStats.total} course places finished`
                : 'No licensed courses yet'
            }
          />
          <StatTile
            icon={Award}
            wash="coral"
            entranceDelay={120}
            value={certStats.valid}
            label={certStats.valid === 1 ? 'Valid certificate' : 'Valid certificates'}
            sub={certStats.expiringSoon > 0 ? `${certStats.expiringSoon} expiring soon` : 'None expiring soon'}
            subTone={certStats.expiringSoon > 0 ? 'warning' : 'default'}
          />
        </section>

        {/* ---------------- Needs attention ---------------- */}
        {attentionCount > 0 && (
          <PortalCard
            className="learner-accent settle-in mt-4"
            // Reuse the house accent bar in warning colour.
            style={{ ['--learner-wash' as never]: 'var(--warning)' } as CSSProperties}
          >
            <div className="flex flex-col gap-3 p-5 sm:p-6">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning-ink))]"
                  aria-hidden="true"
                >
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <h2 className="font-display text-[16px] text-foreground">Needs your attention</h2>
              </div>
              <ul className="space-y-2.5 text-sm text-foreground/90">
                {expiringLicences.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Your <strong className="font-semibold">{l.course_title}</strong> licence expires on{' '}
                      {fmtDate(l.expires_at)}
                      {l.seats_total - l.seats_used > 0 && (
                        <span className="text-muted-foreground">
                          {' '}
                          · {l.seats_total - l.seats_used} unused {l.seats_total - l.seats_used === 1 ? 'seat' : 'seats'}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
                {expiredInvitations.length > 0 && (
                  <li className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {expiredInvitations.length}{' '}
                      {expiredInvitations.length === 1 ? 'invitation has' : 'invitations have'} expired and still hold
                      a seat.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="pressable h-8 rounded-full"
                      onClick={() => void handleReleaseExpired()}
                    >
                      Release the seats
                    </Button>
                  </li>
                )}
                {certStats.expiringSoon > 0 && (
                  <li>
                    {certStats.expiringSoon}{' '}
                    {certStats.expiringSoon === 1 ? 'certificate expires' : 'certificates expire'} soon — plan
                    refresher training before the renewal date.
                  </li>
                )}
              </ul>
            </div>
          </PortalCard>
        )}

        {/* ---------------- Tabs ---------------- */}
        <Tabs defaultValue="people" className="mt-7">
          {/* scroll-mt keeps the row clear of the sticky header when focus scrolls it into view */}
          <TabsList className="h-auto w-full scroll-mt-20 justify-start gap-1 overflow-x-auto rounded-none border-b border-border/60 bg-transparent p-0">
            {[
              { value: 'people', label: 'People' },
              { value: 'compliance', label: 'Compliance' },
              { value: 'licences', label: 'Licences' },
              { value: 'certificates', label: 'Certificates' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative h-10 shrink-0 scroll-mt-20 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-medium text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ---------------- People ---------------- */}
          <TabsContent value="people" className="settle-in mt-6 space-y-5">
            <SectionCard
              title="Members"
              description={`Everyone linked to ${organisation.name}.`}
              aside={
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="org-people-filter"
                    value={peopleFilter}
                    onChange={(e) => setPeopleFilter(e.target.value)}
                    placeholder="Find a person"
                    aria-label="Find a person"
                    className="h-9 w-44 rounded-full border-0 bg-[hsl(var(--learner-wash)/0.06)] pl-8 text-sm sm:w-56"
                  />
                </div>
              }
              flush
            >
              {people.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No members yet"
                  body="Invite your team and they will appear here with their training progress."
                  action={
                    <Button size="sm" className="pressable rounded-full" onClick={() => setInviteOpen(true)}>
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Invite people
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={thClass}>Name</TableHead>
                        <TableHead className={cn(thClass, 'hidden md:table-cell')}>Role</TableHead>
                        <TableHead className={cn(thClass, 'hidden sm:table-cell')}>Status</TableHead>
                        <TableHead className={cn(thClass, 'text-right')}>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPeople.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                            No one matches “{peopleFilter}”.
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredPeople.map((p) => (
                        <TableRow key={`${p.user_id}-${p.started_at}`} className="border-border/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <InitialsAvatar name={p.full_name} email={p.email} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {p.full_name ?? 'Unnamed'}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{p.email ?? '—'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {p.org_role === 'org_admin' ? (
                              <Badge className="rounded-full bg-[hsl(var(--violet-soft))] text-[hsl(var(--violet-soft-foreground))] hover:bg-[hsl(var(--violet-soft))]">
                                Organisation admin
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">Member</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {p.ended_at ? (
                              <span className="text-sm text-muted-foreground">Ended {fmtDate(p.ended_at)}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--success-ink))]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" aria-hidden="true" />
                                Active
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                            {fmtDate(p.started_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Pending invitations"
              description="Each pending invitation holds a seat until it is accepted or withdrawn."
              aside={
                expiredInvitations.length > 0 ? (
                  <Button variant="outline" size="sm" className="pressable rounded-full" onClick={() => void handleReleaseExpired()}>
                    Release expired seats
                  </Button>
                ) : undefined
              }
              flush
            >
              {invitations.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="No invitations waiting"
                  body="Invitations you send appear here until they are accepted, with their expiry date."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={thClass}>Email</TableHead>
                        <TableHead className={cn(thClass, 'hidden sm:table-cell')}>Role</TableHead>
                        <TableHead className={thClass}>Expires</TableHead>
                        <TableHead className={cn(thClass, 'text-right')}>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((inv) => {
                        const expired = daysUntil(inv.expires_at) < 0;
                        return (
                          <TableRow key={inv.id} className="border-border/50">
                            <TableCell className="text-sm font-medium">{inv.email}</TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                              {inv.org_role === 'org_admin' ? 'Organisation admin' : 'Member'}
                            </TableCell>
                            <TableCell>
                              {expired ? (
                                <span className="inline-flex h-6 items-center rounded-full bg-[hsl(var(--warning)/0.14)] px-2.5 text-xs font-medium text-[hsl(var(--warning-ink))]">
                                  Expired {fmtDate(inv.expires_at)}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground tabular-nums">{fmtDate(inv.expires_at)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="pressable h-8 rounded-full text-muted-foreground hover:text-[hsl(var(--destructive-ink))]"
                                disabled={revoking === inv.id}
                                onClick={() => void handleRevoke(inv.id)}
                              >
                                {revoking === inv.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                Withdraw
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </TabsContent>

          {/* ---------------- Compliance ---------------- */}
          <TabsContent value="compliance" className="settle-in mt-6">
            <SectionCard
              title="Compliance matrix"
              description="Progress counts required lessons only — the same rule learners see."
              aside={
                matrixByLearner.length > 0 ? (
                  <div className="relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="org-matrix-filter"
                      value={matrixFilter}
                      onChange={(e) => setMatrixFilter(e.target.value)}
                      placeholder="Find a learner"
                      aria-label="Find a learner"
                      className="h-9 w-44 rounded-full border-0 bg-[hsl(var(--learner-wash)/0.06)] pl-8 text-sm sm:w-56"
                    />
                  </div>
                ) : undefined
              }
              flush
            >
              {licensedCourses.length === 0 || matrixByLearner.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="Nothing to track yet"
                  body={
                    licensedCourses.length === 0
                      ? 'The matrix fills in once your organisation holds a licence and people start training.'
                      : 'No learners are on a licence yet — invite your team to begin.'
                  }
                  action={
                    licensedCourses.length > 0 ? (
                      <Button size="sm" className="pressable rounded-full" onClick={() => setInviteOpen(true)}>
                        <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                        Invite people
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className={cn(thClass, 'portal-sticky-col min-w-[200px]')}>Learner</TableHead>
                          {licensedCourses.map((c) => {
                            const stats = courseCompletion.get(c.id);
                            return (
                              <TableHead key={c.id} className={cn(thClass, 'min-w-[150px]')}>
                                <span className="block max-w-[190px] truncate normal-case text-xs font-semibold tracking-normal text-foreground" title={c.title}>
                                  {c.title}
                                </span>
                                {stats && (
                                  <span className="mt-0.5 block text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                                    {stats.completed} of {stats.total} complete
                                  </span>
                                )}
                              </TableHead>
                            );
                          })}
                          <TableHead className={cn(thClass, 'text-right')}>CPD hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLearners.length === 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={licensedCourses.length + 2}
                              className="py-8 text-center text-sm text-muted-foreground"
                            >
                              No learner matches “{matrixFilter}”.
                            </TableCell>
                          </TableRow>
                        )}
                        {filteredLearners.map((learner) => {
                          const rows = licensedCourses.map((c) => learner.rows.get(c.id));
                          const completed = rows.filter((r) => r?.status === 'completed').length;
                          const started = rows.filter((r) => r && r.status !== 'not_started').length;
                          return (
                            <TableRow key={learner.userId} className="border-border/50 hover:bg-transparent">
                              <TableCell className="portal-sticky-col">
                                <div className="flex items-center gap-2.5">
                                  <ComplianceDot completed={completed} total={licensedCourses.length} started={started} />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">{learner.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">{learner.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              {licensedCourses.map((c) => {
                                const row = learner.rows.get(c.id);
                                const state: MatrixState =
                                  !row || row.status === 'not_started'
                                    ? 'not_started'
                                    : row.status === 'completed'
                                      ? 'completed'
                                      : 'in_progress';
                                return (
                                  <TableCell key={c.id}>
                                    <MatrixStatus state={state} percent={row?.percent} />
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-right text-sm font-medium tabular-nums">
                                {learner.cpd.toFixed(1)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
                    <span className="font-medium">Learner dot:</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" aria-hidden="true" /> All courses complete
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[hsl(var(--warning-ink))]" aria-hidden="true" /> In progress
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/75" aria-hidden="true" /> Not started
                    </span>
                  </p>
                </>
              )}
            </SectionCard>
          </TabsContent>

          {/* ---------------- Licences ---------------- */}
          <TabsContent value="licences" className="settle-in mt-6">
            {licencesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : licences.length === 0 ? (
              <PortalCard>
                <EmptyState
                  icon={Ticket}
                  title="No licences yet"
                  body="Licences are issued by the Academy team when your order is agreed. They appear here with live seat usage."
                />
              </PortalCard>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {licences.map((l) => (
                  <LicenceCard key={l.id} licence={l} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ---------------- Certificates ---------------- */}
          <TabsContent value="certificates" className="settle-in mt-6">
            <SectionCard
              title="Certificates"
              description="Issued certificates for your team. Anyone can check one at /verify with its code."
              flush
            >
              {certificates.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No certificates yet"
                  body="Certificates are issued automatically when someone completes a licensed course, and stay valid even after a licence ends."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={thClass}>Learner</TableHead>
                        <TableHead className={thClass}>Course</TableHead>
                        <TableHead className={cn(thClass, 'hidden md:table-cell')}>Issued</TableHead>
                        <TableHead className={cn(thClass, 'hidden md:table-cell')}>Expires</TableHead>
                        <TableHead className={thClass}>Status</TableHead>
                        <TableHead className={cn(thClass, 'text-right')}>Certificate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificates.map((cert) => (
                        <TableRow key={cert.id} className="border-border/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <InitialsAvatar name={cert.full_name} email={cert.email} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {cert.full_name || cert.email || 'Learner'}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{cert.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{cert.course_title}</p>
                            {cert.verification_code && (
                              <button
                                type="button"
                                onClick={() => copyCode(cert.verification_code!)}
                                className="pressable mt-0.5 inline-flex items-center gap-1 rounded font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Copy verification code ${cert.verification_code}`}
                              >
                                {cert.verification_code}
                                {copiedCode === cert.verification_code ? (
                                  <Check className="h-3 w-3 text-[hsl(var(--success-ink))]" aria-hidden="true" />
                                ) : (
                                  <Copy className="h-3 w-3" aria-hidden="true" />
                                )}
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground tabular-nums md:table-cell">
                            {fmtDate(cert.issued_at)}
                          </TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground tabular-nums md:table-cell">
                            {cert.expires_at ? fmtDate(cert.expires_at) : 'No expiry'}
                          </TableCell>
                          <TableCell>
                            <CertStatusChip status={cert.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="pressable rounded-full"
                              onClick={() => void downloadCertificate(cert.id)}
                              disabled={downloading === cert.id}
                            >
                              {downloading === cert.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </PortalShell>
  );
}

function CertStatusChip({ status }: { status: string }) {
  if (status === 'expired') {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground">
        Expired
      </span>
    );
  }
  if (status === 'expiring_soon') {
    return (
      <span className="inline-flex h-6 items-center rounded-full bg-[hsl(var(--warning)/0.14)] px-2.5 text-xs font-medium text-[hsl(var(--warning-ink))]">
        Expiring soon
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-[hsl(var(--success)/0.12)] px-2.5 text-xs font-medium text-[hsl(var(--success-ink))]">
      Valid
    </span>
  );
}

function LicenceCard({ licence }: { licence: OrgLicence }) {
  const seatsLeft = Math.max(licence.seats_total - licence.seats_used, 0);
  const usedPct = (licence.seats_used / Math.max(licence.seats_total, 1)) * 100;
  const active = licence.status === 'active';
  const expiring = active && daysUntil(licence.expires_at) <= 60;

  return (
    <PortalCard className={cn('flex flex-col gap-4 p-5 sm:p-6', !active && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[16px] leading-snug text-foreground">{licence.course_title}</h3>
        {active ? (
          expiring ? (
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-[hsl(var(--warning)/0.14)] px-2.5 text-xs font-medium text-[hsl(var(--warning-ink))]">
              Expires {fmtDate(licence.expires_at)}
            </span>
          ) : (
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-[hsl(var(--success)/0.12)] px-2.5 text-xs font-medium text-[hsl(var(--success-ink))]">
              Active
            </span>
          )
        ) : (
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-muted px-2.5 text-xs font-medium capitalize text-muted-foreground">
            {licence.status}
          </span>
        )}
      </div>

      <div>
        <p className="font-display text-[26px] leading-none tracking-tight text-foreground tabular-nums">
          {licence.seats_used}
          <span className="text-muted-foreground/80">/{licence.seats_total}</span>
        </p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          seats in use · {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} free
        </p>
        <Progress value={usedPct} className="mt-2.5 h-1.5" aria-hidden="true" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
        <dt className="text-muted-foreground">Window</dt>
        <dd className="text-right text-foreground tabular-nums">
          {fmtDate(licence.starts_at)} – {fmtDate(licence.expires_at)}
        </dd>
        <dt className="text-muted-foreground">Order</dt>
        <dd className="text-right text-foreground">
          {licence.order_reference ?? '—'}
          {licence.order_po_reference ? ` · PO ${licence.order_po_reference}` : ''}
        </dd>
      </dl>
    </PortalCard>
  );
}
