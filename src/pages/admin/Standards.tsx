/**
 * Admin → Standards.
 *
 * The seeded list is deliberately minimal: the 15 Care Certificate standards by
 * number and official title, and the 5 CQC key questions. Outcome wording is
 * NOT invented here — staff add their own child outcomes from the published
 * framework.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Edit, Loader2, Plus, Trash2 } from '@/components/icons';
import { toast } from 'sonner';
import {
  FRAMEWORKS,
  frameworkLabel,
  nestOutcomes,
  type StandardRow,
} from '@/lib/standards';

interface UsageCounts {
  courses: number;
  lessons: number;
  bank: number;
}

const HONESTY_NOTE =
  'Add outcome wording from the published Care Certificate standards; this list is not a substitute for the official framework.';

export default function Standards() {
  const [rows, setRows] = useState<StandardRow[]>([]);
  const [usage, setUsage] = useState<Record<string, UsageCounts>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<{
    open: boolean;
    editing: StandardRow | null;
    framework: string;
    parentCode: string;
  }>({ open: false, editing: null, framework: 'care_certificate', parentCode: '' });
  const [form, setForm] = useState({ code: '', title: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [standardsRes, linksRes] = await Promise.all([
      supabase.from('standards').select('id, framework, code, title, parent_code, sort'),
      supabase.from('standard_links').select('standard_id, course_id, lesson_id, bank_id'),
    ]);
    if (standardsRes.error) {
      console.error('Error loading standards:', standardsRes.error);
      toast.error('Could not load the standards list');
    }
    setRows((standardsRes.data ?? []) as StandardRow[]);

    const counts: Record<string, UsageCounts> = {};
    for (const link of (linksRes.data ?? []) as {
      standard_id: string;
      course_id: string | null;
      lesson_id: string | null;
      bank_id: string | null;
    }[]) {
      const entry = (counts[link.standard_id] ??= { courses: 0, lessons: 0, bank: 0 });
      if (link.course_id) entry.courses += 1;
      else if (link.lesson_id) entry.lessons += 1;
      else if (link.bank_id) entry.bank += 1;
    }
    setUsage(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byFramework = useMemo(
    () =>
      FRAMEWORKS.map((framework) => ({
        framework,
        nested: nestOutcomes(rows.filter((r) => r.framework === framework)),
      })),
    [rows],
  );

  const openNew = (framework: string, parentCode: string) => {
    setForm({ code: parentCode ? `${parentCode}.` : '', title: '' });
    setDialog({ open: true, editing: null, framework, parentCode });
  };

  const openEdit = (row: StandardRow) => {
    setForm({ code: row.code, title: row.title });
    setDialog({
      open: true,
      editing: row,
      framework: String(row.framework),
      parentCode: row.parent_code ?? '',
    });
  };

  const save = async () => {
    const code = form.code.trim();
    const title = form.title.trim();
    if (!code) return toast.error('Add the outcome number, for example 10.3');
    if (!title) return toast.error('Add the outcome wording');

    setSaving(true);
    try {
      if (dialog.editing) {
        const { error } = await supabase
          .from('standards')
          .update({ code, title })
          .eq('id', dialog.editing.id);
        if (error) throw error;
        toast.success('Outcome saved');
      } else {
        const parent = rows.find(
          (r) => r.framework === dialog.framework && r.code === dialog.parentCode,
        );
        const { error } = await supabase.from('standards').insert({
          framework: dialog.framework,
          code,
          title,
          parent_code: dialog.parentCode || null,
          sort: parent?.sort ?? 0,
        } as never);
        if (error) throw error;
        toast.success('Outcome added');
      }
      setDialog({ open: false, editing: null, framework: 'care_certificate', parentCode: '' });
      await load();
    } catch (error) {
      console.error('Error saving standard:', error);
      toast.error('Could not save that outcome. The number may already be in use.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: StandardRow) => {
    if (
      !(await confirmDialog({
        title: 'Delete this outcome?',
        description:
          'Anything linked to it loses that link. The parent standard is not affected.',
      }))
    )
      return;
    const { error } = await supabase.from('standards').delete().eq('id', row.id);
    if (error) {
      console.error('Error deleting standard:', error);
      toast.error('Could not delete that outcome');
      return;
    }
    toast.success('Outcome deleted');
    await load();
  };

  const UsageChips = ({ id }: { id: string }) => {
    const counts = usage[id];
    if (!counts) return <span className="text-xs text-muted-foreground">Not linked yet</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {counts.courses > 0 && (
          <Badge variant="outline">{counts.courses} course{counts.courses === 1 ? '' : 's'}</Badge>
        )}
        {counts.lessons > 0 && (
          <Badge variant="outline">{counts.lessons} lesson{counts.lessons === 1 ? '' : 's'}</Badge>
        )}
        {counts.bank > 0 && (
          <Badge variant="outline">{counts.bank} question{counts.bank === 1 ? '' : 's'}</Badge>
        )}
      </div>
    );
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Standards</h1>
          <p className="text-sm text-muted-foreground">
            Areas your training evidences. Link them to a course, a lesson or a question so reports
            can show the coverage.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Frameworks</CardTitle>
            <CardDescription>{HONESTY_NOTE}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-16 items-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
              </div>
            ) : (
              <Tabs defaultValue="care_certificate">
                <TabsList>
                  {FRAMEWORKS.map((f) => (
                    <TabsTrigger key={f} value={f}>
                      {frameworkLabel(f)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {byFramework.map(({ framework, nested }) => (
                  <TabsContent key={framework} value={framework} className="mt-5 space-y-3">
                    {nested.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nothing in this framework yet.</p>
                    ) : (
                      nested.map(({ parent, children }) => (
                        <div key={parent.id} className="rounded-lg border border-border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">
                                <span className="text-muted-foreground">{parent.code}</span>{' '}
                                {parent.title}
                              </p>
                              <div className="mt-1.5">
                                <UsageChips id={parent.id} />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openNew(framework, parent.code)}
                            >
                              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                              Add outcome
                            </Button>
                          </div>

                          {children.length > 0 && (
                            <ul className="mt-3 space-y-2 border-l border-border pl-4">
                              {children.map((child) => (
                                <li
                                  key={child.id}
                                  className="flex flex-wrap items-start justify-between gap-3"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm text-foreground">
                                      <span className="text-muted-foreground">{child.code}</span>{' '}
                                      {child.title}
                                    </p>
                                    <div className="mt-1">
                                      <UsageChips id={child.id} />
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Edit outcome ${child.code}`}
                                      onClick={() => openEdit(child)}
                                    >
                                      <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Delete outcome ${child.code}`}
                                      onClick={() => void remove(child)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialog.open}
        onOpenChange={(open) =>
          setDialog((prev) => ({ ...prev, open, editing: open ? prev.editing : null }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.editing ? 'Edit outcome' : 'Add outcome'}</DialogTitle>
            <DialogDescription>{HONESTY_NOTE}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="standard-code">Number</Label>
              <Input
                id="standard-code"
                value={form.code}
                placeholder="e.g. 10.3"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="standard-title">Wording</Label>
              <Input
                id="standard-title"
                value={form.title}
                placeholder="Copy the wording from the published framework"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDialog({ open: false, editing: null, framework: 'care_certificate', parentCode: '' })
              }
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {dialog.editing ? 'Save outcome' : 'Add outcome'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
