import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, GraduationCap, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Learner {
  user_id: string;
  email: string;
  full_name: string;
  source_system: string | null;
  fountain_applicant_id: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  enrollments_total: number;
  enrollments_completed: number;
  certificates_count: number;
}

export default function Learners() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: rolesLoading } = useRoles();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<null | {
    total: number; created: number; updated: number; skipped: number; failed: number;
    errors?: Array<{ email?: string; reason: string }>;
  }>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-learners-from-ariadne');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSyncResult(data);
      toast.success(`Synced: ${data.created} created, ${data.updated} updated`);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(`Sync failed: ${e?.message ?? 'unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (authLoading || rolesLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!isAdmin && !isSuperAdmin) {
      navigate('/access-denied');
      return;
    }
    void load();
  }, [user, authLoading, rolesLoading, isAdmin, isSuperAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-learners');
      if (error) throw error;
      setLearners(data?.learners ?? []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load learners');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return learners
      .filter((l) => {
        if (sourceFilter === 'fountain' && l.source_system !== 'fountain') return false;
        if (sourceFilter === 'manual' && l.source_system === 'fountain') return false;
        if (!q) return true;
        return (
          l.email.toLowerCase().includes(q) ||
          l.full_name.toLowerCase().includes(q) ||
          (l.fountain_applicant_id ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }, [learners, search, sourceFilter]);

  const fountainCount = learners.filter((l) => l.source_system === 'fountain').length;

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <PortalLayout>
      <div className="container max-w-[1400px] mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Learners</h1>
              <p className="text-muted-foreground">All registered learners across the platform</p>
            </div>
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync from Ariadne
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total learners</CardDescription>
              <CardTitle className="text-3xl">{learners.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Synced from Fountain</CardDescription>
              <CardTitle className="text-3xl">{fountainCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Direct sign-ups</CardDescription>
              <CardTitle className="text-3xl">{learners.length - fountainCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Learner directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, email, Fountain ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="fountain">Fountain only</SelectItem>
                  <SelectItem value="manual">Direct sign-ups</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No learners found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Enrolled</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Certificates</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last sign-in</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((l) => (
                      <TableRow key={l.user_id}>
                        <TableCell className="font-medium">{l.full_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{l.email || '—'}</TableCell>
                        <TableCell>
                          {l.source_system === 'fountain' ? (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Fountain</Badge>
                          ) : (
                            <Badge variant="secondary">Direct</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{l.enrollments_total}</TableCell>
                        <TableCell className="text-right">{l.enrollments_completed}</TableCell>
                        <TableCell className="text-right">{l.certificates_count}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{fmt(l.created_at)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{fmt(l.last_sign_in_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
