import { useCallback, useEffect, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Building2, Plus, Users, Search } from '@/components/icons';
import { toast } from 'sonner';

interface Organisation {
  id: string;
  name: string;
  slug: string;
  kind: string;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
}

interface OrgPerson {
  user_id: string;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  org_role: string;
  started_at: string;
  ended_at: string | null;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const fmtDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/**
 * /admin-portal/organisations — platform-staff management of customer orgs.
 *
 * The internal "Special People" organisation is intentionally read-mostly: it
 * cannot be deactivated from here, because every internal learner depends on it.
 */
export default function Organisations() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, isOpsTrainingAdmin, loading: rolesLoading } = useRoles();
  const isStaff = isAdmin || isSuperAdmin || isOpsTrainingAdmin;

  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Every self-employed buyer gets a kind='personal' shell organisation, so
  // without this the customer list drowns in one-person rows.
  const [showPersonal, setShowPersonal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', contact_email: '' });

  const [editing, setEditing] = useState<Organisation | null>(null);
  const [editForm, setEditForm] = useState({ name: '', contact_email: '', is_active: true });

  const [membersOf, setMembersOf] = useState<Organisation | null>(null);
  const [members, setMembers] = useState<OrgPerson[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organisations')
      .select('id, name, slug, kind, contact_email, is_active, created_at')
      .order('name');
    if (error) toast.error('Could not load organisations', { description: error.message });
    setOrgs((data as Organisation[]) ?? []);
    setLoading(false);
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
    void load();
  }, [authLoading, rolesLoading, user, isStaff, navigate, load]);

  const handleCreate = async () => {
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error('Give the organisation a name.');
      return;
    }
    const slug = slugify(form.slug || name);
    setSaving(true);
    const { error } = await supabase.from('organisations').insert({
      name,
      slug,
      kind: 'customer',
      contact_email: form.contact_email.trim() || null,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast.error('Could not create the organisation', { description: error.message });
      return;
    }
    toast.success(`${name} created.`);
    setCreateOpen(false);
    setForm({ name: '', slug: '', contact_email: '' });
    await load();
  };

  const openEdit = (org: Organisation) => {
    setEditing(org);
    setEditForm({ name: org.name, contact_email: org.contact_email ?? '', is_active: org.is_active });
  };

  const handleEditSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('organisations')
      .update({
        name: editForm.name.trim(),
        contact_email: editForm.contact_email.trim() || null,
        // The internal org can never be deactivated from this screen.
        is_active: editing.kind === 'internal' ? true : editForm.is_active,
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast.error('Could not save changes', { description: error.message });
      return;
    }
    toast.success('Organisation updated.');
    setEditing(null);
    await load();
  };

  const openMembers = async (org: Organisation) => {
    setMembersOf(org);
    setMembersLoading(true);
    const { data, error } = await supabase.rpc('get_org_people', { _org: org.id });
    if (error) toast.error('Could not load members', { description: error.message });
    setMembers((data ?? []) as OrgPerson[]);
    setMembersLoading(false);
  };

  const setMemberRole = async (person: OrgPerson, role: 'org_admin' | 'member') => {
    if (!membersOf) return;
    const { error } = await supabase
      .from('organisation_members')
      .update({ org_role: role })
      .eq('organisation_id', membersOf.id)
      .eq('user_id', person.user_id)
      .is('ended_at', null);
    if (error) {
      toast.error('Could not change that role', { description: error.message });
      return;
    }
    toast.success(role === 'org_admin' ? 'Promoted to organisation admin.' : 'Changed to member.');
    await openMembers(membersOf);
  };

  const endMembership = async (person: OrgPerson) => {
    if (!membersOf) return;
    // Memberships are never deleted — they are ended so history survives.
    const { error } = await supabase
      .from('organisation_members')
      .update({ ended_at: new Date().toISOString() })
      .eq('organisation_id', membersOf.id)
      .eq('user_id', person.user_id)
      .is('ended_at', null);
    if (error) {
      toast.error('Could not end that membership', { description: error.message });
      return;
    }
    toast.success('Membership ended.');
    await openMembers(membersOf);
  };

  const personalCount = orgs.filter((o) => o.kind === 'personal').length;

  const filtered = orgs.filter((o) => {
    if (!showPersonal && o.kind === 'personal') return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return o.name.toLowerCase().includes(q) || o.slug.includes(q) || (o.contact_email ?? '').includes(q);
  });

  return (
    <PortalLayout title="Organisations">
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Organisations</h1>
              <p className="text-sm text-muted-foreground">Customer organisations and their people.</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New organisation
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organisations"
                className="pl-9"
                aria-label="Search organisations"
              />
            </div>
            {personalCount > 0 && (
              <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={showPersonal} onCheckedChange={setShowPersonal} />
                Show individual buyers ({personalCount})
              </label>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No organisations found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{org.slug}</TableCell>
                    <TableCell className="text-sm">{org.contact_email ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={org.kind === 'internal' ? 'default' : 'outline'}>{org.kind}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.is_active ? 'secondary' : 'destructive'}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(org.created_at)}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => void openMembers(org)}>
                        <Users className="mr-1 h-3 w-3" />
                        Members
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(org)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New organisation</DialogTitle>
            <DialogDescription>Create a customer organisation so you can issue licences to it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Name</Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder={slugify(form.name) || 'auto-generated'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-email">Contact email</Label>
              <Input
                id="org-email"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Contact email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.contact_email}
                onChange={(e) => setEditForm((f) => ({ ...f, contact_email: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">
                  {editing?.kind === 'internal'
                    ? 'The internal organisation always stays active.'
                    : 'Inactive organisations keep their history but stop new activity.'}
                </p>
              </div>
              <Switch
                checked={editing?.kind === 'internal' ? true : editForm.is_active}
                disabled={editing?.kind === 'internal'}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleEditSave()} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members */}
      <Dialog open={!!membersOf} onOpenChange={(open) => !open && setMembersOf(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{membersOf?.name} members</DialogTitle>
            <DialogDescription>Promote an organisation admin, or end a membership.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                )}
                {!membersLoading && members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No members yet.
                    </TableCell>
                  </TableRow>
                )}
                {members.map((p) => (
                  <TableRow key={`${p.user_id}-${p.started_at}`}>
                    <TableCell className="font-medium">{p.full_name ?? 'Unnamed'}</TableCell>
                    <TableCell className="text-sm">{p.email ?? '—'}</TableCell>
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
                    <TableCell className="space-x-2 text-right">
                      {!p.ended_at && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void setMemberRole(p, p.org_role === 'org_admin' ? 'member' : 'org_admin')
                            }
                          >
                            {p.org_role === 'org_admin' ? 'Demote' : 'Promote'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void endMembership(p)}>
                            End
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
