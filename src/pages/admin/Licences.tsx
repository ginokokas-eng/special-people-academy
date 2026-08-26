import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BulkInviteForm } from '@/components/org/BulkInviteForm';
import { useOrgLicences, type OrgLicence } from '@/components/org/useOrgLicences';
import { Loader2, Ticket, Plus } from '@/components/icons';
import { toast } from 'sonner';

interface OrgOption {
  id: string;
  name: string;
  kind: string;
  is_active: boolean;
}

interface CourseOption {
  id: string;
  title: string;
  offering_id: string | null;
}

/** org_orders lifecycle: draft -> invoiced -> paid | void. */
const ORDER_NEXT: Record<string, string[]> = {
  draft: ['invoiced', 'void'],
  invoiced: ['paid', 'void'],
  paid: [],
  void: [],
};

const fmtDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const isoPlusMonths = (months: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

/**
 * /admin-portal/licences — issue and review B2B licences.
 *
 * Licences are ONLY ever created through the create_licence primitive: it
 * creates the org_order and the licence atomically. Nothing here inserts into
 * licences or licence_seats directly.
 *
 * Only individual_online offerings are licensable — blended and face-to-face
 * remain booking products.
 */
export default function Licences() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, isOpsTrainingAdmin, loading: rolesLoading } = useRoles();
  const isStaff = isAdmin || isSuperAdmin || isOpsTrainingAdmin;

  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [orgId, setOrgId] = useState<string>('');
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [issueOpen, setIssueOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({});

  const { licences, loading: licencesLoading, reload } = useOrgLicences(orgId || null);

  const [form, setForm] = useState({
    course_id: '',
    seats_total: '10',
    starts_at: new Date().toISOString().slice(0, 10),
    expires_at: isoPlusMonths(12),
    order_reference: '',
    po_reference: '',
    amount_gbp: '',
    order_status: 'draft',
  });

  const loadRefs = useCallback(async () => {
    setLoadingRefs(true);
    const [orgRes, offeringRes] = await Promise.all([
      supabase.from('organisations').select('id, name, kind, is_active').order('name'),
      supabase
        .from('course_offerings')
        .select('id, course_id, offering_type, active, courses:course_id ( id, title )')
        .eq('offering_type', 'individual_online')
        .eq('active', true),
    ]);

    setOrgs((orgRes.data as OrgOption[]) ?? []);

    const options: CourseOption[] = ((offeringRes.data ?? []) as Record<string, unknown>[]).map((row) => {
      const course = row.courses as { id?: string; title?: string } | null;
      return {
        id: (course?.id ?? row.course_id) as string,
        title: course?.title ?? 'Untitled course',
        offering_id: row.id as string,
      };
    });
    // De-duplicate by course, keeping the first online offering.
    const unique = new Map<string, CourseOption>();
    for (const o of options) if (!unique.has(o.id)) unique.set(o.id, o);
    setCourses(Array.from(unique.values()).sort((a, b) => a.title.localeCompare(b.title)));
    setLoadingRefs(false);
  }, []);

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!isStaff) {
      navigate('/access-denied', { replace: true });
      return;
    }
    void loadRefs();
  }, [authLoading, rolesLoading, user, isStaff, navigate, loadRefs]);

  const selectedOrg = useMemo(() => orgs.find((o) => o.id === orgId) ?? null, [orgs, orgId]);

  const handleIssue = async () => {
    const course = courses.find((c) => c.id === form.course_id);
    const seats = Number.parseInt(form.seats_total, 10);
    if (!orgId || !course) {
      toast.error('Pick an organisation and a licensable course.');
      return;
    }
    if (!Number.isInteger(seats) || seats < 1 || seats > 10000) {
      toast.error('Seats must be a whole number between 1 and 10,000.');
      return;
    }
    if (Date.parse(form.expires_at) <= Date.parse(form.starts_at)) {
      toast.error('The licence must expire after it starts.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc('create_licence', {
      _organisation_id: orgId,
      _course_id: course.id,
      _offering_id: course.offering_id,
      _seats_total: seats,
      _starts_at: new Date(form.starts_at).toISOString(),
      _expires_at: new Date(form.expires_at).toISOString(),
      _order_reference: form.order_reference.trim() || null,
      _po_reference: form.po_reference.trim() || null,
      _amount_gbp: form.amount_gbp ? Math.round(Number(form.amount_gbp) * 100) : null,
      _order_status: form.order_status,
    });
    setSaving(false);

    if (error) {
      toast.error('Could not issue the licence', { description: error.message });
      return;
    }
    toast.success(`${seats} seats issued for ${course.title}.`);
    setIssueOpen(false);
    await reload();
  };

  const updateOrderStatus = async (licence: OrgLicence, status: string) => {
    if (!licence.order_reference) return;
    setOrderStatuses((s) => ({ ...s, [licence.id]: status }));
    const { error } = await supabase
      .from('org_orders')
      .update({ status })
      .eq('organisation_id', licence.organisation_id)
      .eq('reference', licence.order_reference);
    if (error) {
      toast.error('Could not update the order', { description: error.message });
      setOrderStatuses((s) => ({ ...s, [licence.id]: licence.order_status ?? 'draft' }));
      return;
    }
    toast.success(`Order marked ${status}.`);
    await reload();
  };

  return (
    <PortalLayout title="Licences">
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Ticket className="h-6 w-6 text-primary" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Licences</h1>
              <p className="text-sm text-muted-foreground">
                Seat licences for online courses, and the orders behind them.
              </p>
            </div>
          </div>
          <Button onClick={() => setIssueOpen(true)} disabled={!orgId}>
            <Plus className="mr-2 h-4 w-4" />
            Issue licence
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose an organisation</CardTitle>
            <CardDescription>Licences, seat usage and invitations are shown per organisation.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-md">
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger aria-label="Organisation">
                <SelectValue placeholder={loadingRefs ? 'Loading…' : 'Select an organisation'} />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                    {o.kind === 'internal' ? ' (internal)' : ''}
                    {o.is_active ? '' : ' — inactive'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {orgId && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{selectedOrg?.name} licences</CardTitle>
                <CardDescription>Seats used, licence window and order status.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Window</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Licence</TableHead>
                      <TableHead className="text-right">Order status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licencesLoading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                        </TableCell>
                      </TableRow>
                    )}
                    {!licencesLoading && licences.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No licences yet for this organisation.
                        </TableCell>
                      </TableRow>
                    )}
                    {licences.map((l) => {
                      const status = orderStatuses[l.id] ?? l.order_status ?? 'draft';
                      const next = ORDER_NEXT[status] ?? [];
                      return (
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
                            {l.order_amount_gbp != null ? ` · £${(l.order_amount_gbp / 100).toFixed(2)}` : ''}
                          </TableCell>
                          <TableCell>
                            <Badge variant={l.status === 'active' ? 'secondary' : 'outline'}>{l.status}</Badge>
                          </TableCell>
                          <TableCell className="space-x-2 text-right">
                            <Badge variant="outline">{status}</Badge>
                            {next.map((s) => (
                              <Button key={s} size="sm" variant="outline" onClick={() => void updateOrderStatus(l, s)}>
                                Mark {s}
                              </Button>
                            ))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <BulkInviteForm licences={licences} allowOrgAdminRole onCompleted={() => void reload()} />
          </>
        )}
      </div>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue a licence</DialogTitle>
            <DialogDescription>
              Only online self-paced courses can be licensed. Blended and face-to-face training stays a booking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lic-course">Course</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm((f) => ({ ...f, course_id: v }))}>
                <SelectTrigger id="lic-course">
                  <SelectValue placeholder="Choose a licensable course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 && (
                    <SelectItem value="none" disabled>
                      No online offerings available
                    </SelectItem>
                  )}
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lic-seats">Seats</Label>
                <Input
                  id="lic-seats"
                  type="number"
                  min={1}
                  value={form.seats_total}
                  onChange={(e) => setForm((f) => ({ ...f, seats_total: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lic-start">Starts</Label>
                <Input
                  id="lic-start"
                  type="date"
                  value={form.starts_at}
                  onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lic-end">Expires</Label>
                <Input
                  id="lic-end"
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lic-ref">Order reference</Label>
                <Input
                  id="lic-ref"
                  value={form.order_reference}
                  onChange={(e) => setForm((f) => ({ ...f, order_reference: e.target.value }))}
                  placeholder="Auto-generated if blank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lic-po">PO reference</Label>
                <Input
                  id="lic-po"
                  value={form.po_reference}
                  onChange={(e) => setForm((f) => ({ ...f, po_reference: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lic-amount">Amount (£)</Label>
                <Input
                  id="lic-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount_gbp}
                  onChange={(e) => setForm((f) => ({ ...f, amount_gbp: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lic-status">Order status</Label>
                <Select value={form.order_status} onValueChange={(v) => setForm((f) => ({ ...f, order_status: v }))}>
                  <SelectTrigger id="lic-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="invoiced">Invoiced</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleIssue()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Issue licence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
