import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { useOrgLicences } from '@/components/org/useOrgLicences';
import { BulkInviteForm } from '@/components/org/BulkInviteForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, Building2, Trophy, Award, RefreshCw } from '@/components/icons';
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

function StatusCell({ row }: { row: MatrixRow | undefined }) {
  if (!row || row.status === 'not_started') {
    return <span className="text-sm text-muted-foreground">Not started</span>;
  }
  if (row.status === 'completed') {
    return (
      <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
        Completed
      </Badge>
    );
  }
  return (
    <div className="space-y-1 min-w-[110px]">
      <p className="text-sm font-medium">In progress · {row.percent}%</p>
      <Progress value={row.percent} className="h-1.5" />
    </div>
  );
}

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

  if (authLoading || orgLoading || !organisation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{organisation.name} training portal | Academy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{organisation.name}</h1>
              <p className="text-sm text-muted-foreground">
                Your team’s training, seats and compliance in one place.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </header>

        <Tabs defaultValue="people" className="space-y-6">
          <TabsList>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="licences">Licences</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>

          {/* ---------------- People ---------------- */}
          <TabsContent value="people" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {licences.map((l) => (
                <Card key={l.id}>
                  <CardHeader className="pb-2">
                    <CardDescription>{l.course_title}</CardDescription>
                    <CardTitle className="text-xl">
                      {l.seats_used}/{l.seats_total} seats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={(l.seats_used / Math.max(l.seats_total, 1)) * 100} className="h-1.5" />
                    <p className="mt-2 text-xs text-muted-foreground">Expires {fmtDate(l.expires_at)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <BulkInviteForm licences={licences} onCompleted={() => void Promise.all([loadData(), reloadLicences()])} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Members
                </CardTitle>
                <CardDescription>Everyone linked to {organisation.name}.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {people.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No members yet — invite your team above.
                        </TableCell>
                      </TableRow>
                    )}
                    {people.map((p) => (
                      <TableRow key={`${p.user_id}-${p.started_at}`}>
                        <TableCell className="font-medium">{p.full_name ?? 'Unnamed'}</TableCell>
                        <TableCell>{p.email ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={p.org_role === 'org_admin' ? 'default' : 'outline'}>
                            {p.org_role === 'org_admin' ? 'Organisation admin' : 'Member'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.ended_at ? (
                            <span className="text-sm text-muted-foreground">Ended {fmtDate(p.ended_at)}</span>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>{fmtDate(p.started_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Pending invitations</CardTitle>
                  <CardDescription>Each pending invitation holds a seat until it is accepted.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => void handleReleaseExpired()}>
                  Release expired
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No invitations waiting.
                        </TableCell>
                      </TableRow>
                    )}
                    {invitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.email}</TableCell>
                        <TableCell>{inv.org_role === 'org_admin' ? 'Organisation admin' : 'Member'}</TableCell>
                        <TableCell>{fmtDate(inv.expires_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={revoking === inv.id}
                            onClick={() => void handleRevoke(inv.id)}
                          >
                            {revoking === inv.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Withdraw
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- Compliance ---------------- */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Compliance matrix
                </CardTitle>
                <CardDescription>
                  Progress counts required lessons only — the same rule learners see.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Learner</TableHead>
                      {licensedCourses.map((c) => (
                        <TableHead key={c.id} className="min-w-[150px]">
                          {c.title}
                        </TableHead>
                      ))}
                      <TableHead className="text-right">CPD hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrixByLearner.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={licensedCourses.length + 2} className="text-center text-muted-foreground">
                          No learners on a licence yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {matrixByLearner.map((learner) => (
                      <TableRow key={learner.userId}>
                        <TableCell>
                          <p className="font-medium">{learner.name}</p>
                          <p className="text-xs text-muted-foreground">{learner.email}</p>
                        </TableCell>
                        {licensedCourses.map((c) => (
                          <TableCell key={c.id}>
                            <StatusCell row={learner.rows.get(c.id)} />
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-medium">{learner.cpd.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- Licences ---------------- */}
          <TabsContent value="licences">
            <Card>
              <CardHeader>
                <CardTitle>Your licences</CardTitle>
                <CardDescription>What you have bought and how much of it is in use.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Window</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licencesLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Loading…
                        </TableCell>
                      </TableRow>
                    )}
                    {!licencesLoading && licences.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No licences yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {licences.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{l.course_title}</TableCell>
                        <TableCell>
                          {l.seats_used}/{l.seats_total}
                        </TableCell>
                        <TableCell className="text-sm">
                          {fmtDate(l.starts_at)} – {fmtDate(l.expires_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {l.order_reference ?? '—'}
                          {l.order_po_reference ? ` · PO ${l.order_po_reference}` : ''}
                        </TableCell>
                        <TableCell>
                          <Badge variant={l.status === 'active' ? 'secondary' : 'outline'}>{l.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- Certificates ---------------- */}
          <TabsContent value="certificates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Certificates
                </CardTitle>
                <CardDescription>
                  Issued certificates for your team. Anyone can check one at /verify with its code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {certificates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Certificates appear here once issued.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Learner</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Certificate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificates.map((cert) => (
                        <TableRow key={cert.id}>
                          <TableCell>
                            <p className="font-medium">{cert.full_name || cert.email || 'Learner'}</p>
                            <p className="text-xs text-muted-foreground">{cert.email}</p>
                          </TableCell>
                          <TableCell>
                            <p>{cert.course_title}</p>
                            {cert.verification_code && (
                              <p className="font-mono text-xs text-muted-foreground">{cert.verification_code}</p>
                            )}
                          </TableCell>
                          <TableCell>{fmtDate(cert.issued_at)}</TableCell>
                          <TableCell>{cert.expires_at ? fmtDate(cert.expires_at) : 'No expiry'}</TableCell>
                          <TableCell>
                            <Badge variant={cert.status === 'expired' ? 'outline' : 'secondary'}>
                              {cert.status === 'expired'
                                ? 'Expired'
                                : cert.status === 'expiring_soon'
                                  ? 'Expiring soon'
                                  : 'Valid'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
