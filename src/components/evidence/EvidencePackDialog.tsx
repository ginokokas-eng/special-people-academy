import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Loader2 } from '@/components/icons';
import {
  buildEvidenceModel,
  evidenceFileName,
  summariseEvidence,
  type EvidenceModel,
  type RawEvidencePack,
} from '@/lib/evidencePack';

const ALL = 'all';

interface Props {
  userId: string;
  learnerName: string;
  /** Pre-select one course (the learner's own "this course" download). */
  defaultCourseId?: string;
  /** The button that opens the dialog — the page owns its label and test id. */
  trigger: ReactNode;
}

/**
 * Loads a learner's evidence from `get_learner_evidence_pack`, lets whoever
 * opened it narrow to one course or one standard, and prints the result as a PDF.
 * The RPC enforces who may read what — this dialog only reports what it says.
 */
export function EvidencePackDialog({ userId, learnerName, defaultCourseId, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<EvidenceModel | null>(null);
  const [courseId, setCourseId] = useState<string>(defaultCourseId ?? ALL);
  const [standardId, setStandardId] = useState<string>(ALL);
  /** Courses and standards come from the unfiltered pack, so filtering keeps them. */
  const [options, setOptions] = useState<{
    courses: { id: string; title: string }[];
    standards: { id: string; label: string }[];
  }>({ courses: [], standards: [] });

  const load = useCallback(
    async (course: string, standard: string) => {
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_learner_evidence_pack', {
        _user: userId,
        _course: course === ALL ? null : course,
        _standard: standard === ALL ? null : standard,
      } as never);
      if (rpcError) {
        setModel(null);
        setError(
          /not_allowed/.test(rpcError.message)
            ? 'You do not have permission to read this learner’s evidence.'
            : `Could not load the evidence pack: ${rpcError.message}`,
        );
        setLoading(false);
        return;
      }
      const built = buildEvidenceModel(data as unknown as RawEvidencePack);
      setModel(built);
      // Keep the pickers stable: only the unfiltered read may define them.
      if (course === ALL && standard === ALL) {
        setOptions({
          courses: built.courses.map((c) => ({ id: c.courseId, title: c.title || 'Untitled course' })),
          standards: built.standardsSummary.map((s) => ({
            id: `${s.framework}|${s.code}`,
            label: `${s.framework} ${s.code} — ${s.title}`.trim(),
          })),
        });
      }
      setLoading(false);
    },
    [userId],
  );

  // The standard filter needs real standard ids, which the summary does not
  // carry, so it is resolved from standards the same way the RPC expects.
  const [standardIds, setStandardIds] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data } = await supabase.from('standards').select('id, framework, code');
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as { id: string; framework: string; code: string }[]) {
        map[`${row.framework}|${row.code}`] = row.id;
      }
      setStandardIds(map);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    void load(courseId, standardId === ALL ? ALL : (standardIds[standardId] ?? ALL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, courseId, standardId, standardIds, load]);

  const summary = model ? summariseEvidence(model) : null;

  const download = async () => {
    if (!model) return;
    setDownloading(true);
    setError(null);
    try {
      const { renderEvidencePdf } = await import('@/lib/evidencePdf');
      const doc = await renderEvidencePdf(model, {
        generatedBy: user?.email ?? 'Special People Academy',
      });
      doc.save(evidenceFileName(model));
    } catch (e) {
      setError(`Could not build the PDF: ${(e as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(null);
          setCourseId(defaultCourseId ?? ALL);
          setStandardId(ALL);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Evidence pack</DialogTitle>
          <DialogDescription>
            Everything recorded for {learnerName || 'this learner'}: courses, reflections, observed
            checklists, quiz results, practical sessions and competency sign-offs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="evidence-course">Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="evidence-course" data-testid="evidence-course">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All courses</SelectItem>
                  {options.courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evidence-standard">Standard</Label>
              <Select value={standardId} onValueChange={setStandardId}>
                <SelectTrigger id="evidence-standard" data-testid="evidence-standard">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All standards</SelectItem>
                  {options.standards.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gathering the evidence…
            </p>
          ) : error ? (
            <p data-testid="evidence-error" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : summary ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <li>Courses: {summary.courses}</li>
              <li>Certificates: {summary.certificates}</li>
              <li>
                Reflections: {summary.reflections} ({summary.reflectionsMarked} marked)
              </li>
              <li>Observed checklists: {summary.checklists}</li>
              <li>Quiz results: {summary.quizResults}</li>
              <li>Practical sessions: {summary.practical}</li>
              <li>Competency sign-offs: {summary.signoffs}</li>
              <li>Standards: {summary.standards}</li>
            </ul>
          ) : null}

          {summary?.isEmpty && (
            <p className="text-sm text-muted-foreground">
              There is nothing recorded for this filter yet — the pack will print as empty sections.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            data-testid="evidence-download"
            onClick={() => void download()}
            disabled={!model || loading || downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
