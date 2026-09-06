/**
 * Per-organisation SCORM launcher management.
 *
 * The launch key is generated in the browser: only its sha-256 hash and a short
 * prefix are stored, and the full key is shown once, at generation time, so it
 * can be baked into the downloadable package. There is no way to recover it
 * later — the answer to a lost key is to revoke it and generate a new one.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Download, Loader2, Package } from '@/components/icons';
import { toast } from 'sonner';
import { buildScormPackageZip } from '@/lib/scormPackage';

interface LaunchKeyRow {
  id: string;
  label: string | null;
  key_prefix: string;
  allowed_frame_origins: string[];
  created_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
}

interface CourseOption {
  id: string;
  title: string;
}

interface Props {
  organisationId: string | null;
  organisationName: string;
  onClose: () => void;
}

const fmt = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    'lk_' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

const parseOrigins = (raw: string): string[] =>
  raw
    .split(/[\s,]+/)
    .map((v) => v.trim().replace(/\/+$/, ''))
    .filter((v) => /^https?:\/\/[^/\s]+$/i.test(v));

export function OrgLauncherDialog({ organisationId, organisationName, onClose }: Props) {
  const [keys, setKeys] = useState<LaunchKeyRow[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('');
  const [originsText, setOriginsText] = useState('');
  const [freshKey, setFreshKey] = useState<{ id: string; key: string } | null>(null);
  const [courseId, setCourseId] = useState<string>('');

  const load = useCallback(async () => {
    if (!organisationId) return;
    setLoading(true);
    const [{ data: keyRows, error: keyError }, { data: courseRows }] = await Promise.all([
      supabase
        .from('org_launch_keys')
        .select('id, label, key_prefix, allowed_frame_origins, created_at, revoked_at, last_used_at')
        .eq('organisation_id', organisationId)
        .order('created_at', { ascending: false }),
      supabase.from('courses').select('id, title').eq('is_published', true).order('title'),
    ]);
    if (keyError) toast.error('Could not load launchers', { description: keyError.message });
    setKeys((keyRows as LaunchKeyRow[]) ?? []);
    setCourses((courseRows as CourseOption[]) ?? []);
    setLoading(false);
  }, [organisationId]);

  useEffect(() => {
    if (!organisationId) return;
    setFreshKey(null);
    setLabel('');
    setOriginsText('');
    setCourseId('');
    void load();
  }, [organisationId, load]);

  const createKey = async () => {
    if (!organisationId) return;
    setBusy(true);
    try {
      const key = generateKey();
      const { data, error } = await supabase
        .from('org_launch_keys')
        .insert({
          organisation_id: organisationId,
          label: label.trim() || null,
          key_hash: await sha256Hex(key),
          key_prefix: key.slice(0, 11),
          allowed_frame_origins: parseOrigins(originsText),
        })
        .select('id')
        .single();
      if (error) throw error;
      setFreshKey({ id: data.id as string, key });
      setLabel('');
      toast.success('Launcher key created — download the package now');
      await load();
    } catch (e) {
      toast.error('Could not create the launcher key', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (id: string) => {
    setBusy(true);
    const { error } = await supabase
      .from('org_launch_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
    setBusy(false);
    if (error) {
      toast.error('Could not switch off this launcher', { description: error.message });
      return;
    }
    if (freshKey?.id === id) setFreshKey(null);
    toast.success('Launcher switched off — packages using it will stop working');
    await load();
  };

  const saveOrigins = async (id: string, raw: string) => {
    setBusy(true);
    const { error } = await supabase
      .from('org_launch_keys')
      .update({ allowed_frame_origins: parseOrigins(raw) })
      .eq('id', id);
    setBusy(false);
    if (error) {
      toast.error('Could not save the addresses', { description: error.message });
      return;
    }
    toast.success('Allowed addresses saved');
    await load();
  };

  const download = async () => {
    if (!freshKey || !courseId) return;
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    setBusy(true);
    try {
      const blob = await buildScormPackageZip({
        courseId: course.id,
        courseTitle: course.title,
        organisationName,
        launchKey: freshKey.key,
        functionsUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`,
        anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${course.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-scorm12.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Could not build the package', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!organisationId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Launch from another learning system</DialogTitle>
          <DialogDescription>
            Create a package {organisationName} can upload to their own learning system. Their
            learners open the training there and their results come back automatically.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>What to tell them about the key.</strong> The package contains a key that starts
            training against this organisation's licence. Anyone who gets hold of the file can use
            it, so it must only be uploaded to their own learning system and never emailed around or
            put on a public page. The upside is that learners never have to sign in separately; the
            trade-off is that the file has to be looked after. If it does get out, switch the
            launcher off below and give them a fresh package.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">New launcher</h3>
              <div className="space-y-2">
                <Label htmlFor="launcher-label">Name (for your records)</Label>
                <Input
                  id="launcher-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Moodle — head office"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="launcher-origins">
                  Web addresses allowed to show the training (optional)
                </Label>
                <Textarea
                  id="launcher-origins"
                  value={originsText}
                  onChange={(e) => setOriginsText(e.target.value)}
                  rows={2}
                  placeholder="https://learning.brightfutures.co.uk"
                />
                <p className="text-xs text-muted-foreground">
                  One per line. Leave empty to allow any address.
                </p>
              </div>
              <Button onClick={() => void createKey()} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create launcher
              </Button>
            </section>

            {freshKey && (
              <section className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
                <h3 className="text-sm font-semibold">Download the package</h3>
                <p className="text-xs text-muted-foreground">
                  This is the only time the key is available. Pick a course and download now — if
                  you close this window you will need to create a new launcher.
                </p>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-foreground/80">
                  This package contains this organisation's launch key. Anyone with the package can
                  start learners against your licence. If it leaks, revoke the key here and issue a
                  new package.
                </p>
                <Button onClick={() => void download()} disabled={busy || !courseId}>
                  <Download className="mr-2 h-4 w-4" />
                  Download package
                </Button>

              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Existing launchers</h3>
              {keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No launchers yet for this organisation.
                </p>
              ) : (
                <ul className="space-y-3">
                  {keys.map((k) => (
                    <li key={k.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <Package className="h-4 w-4 text-primary" aria-hidden="true" />
                            {k.label ?? 'Launcher'}
                            {k.revoked_at ? (
                              <Badge variant="destructive">Switched off</Badge>
                            ) : (
                              <Badge variant="secondary">Working</Badge>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Key {k.key_prefix}… • created {fmt(k.created_at)} • last used{' '}
                            {fmt(k.last_used_at)}
                          </p>
                        </div>
                        {!k.revoked_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void revokeKey(k.id)}
                          >
                            Switch off
                          </Button>
                        )}
                      </div>
                      {!k.revoked_at && (
                        <div className="mt-3 space-y-2">
                          <Label htmlFor={`origins-${k.id}`} className="text-xs">
                            Allowed web addresses
                          </Label>
                          <Textarea
                            id={`origins-${k.id}`}
                            rows={2}
                            defaultValue={(k.allowed_frame_origins ?? []).join('\n')}
                            onBlur={(e) => void saveOrigins(k.id, e.target.value)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
