import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from '@/components/icons';
import { cloneDefaultTitle } from '@/lib/courseClone';

export interface CloneSource {
  id: string;
  title: string;
}

interface Props {
  source: CloneSource | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Makes a draft copy of a whole course.
 *
 * Everything is done by the `clone_course` database function in one go, so a
 * half-copied course can never be left behind. Uploaded videos and images are
 * not copied yet — the copy points at the original course's files.
 */
export function CloneCourseDialog({ source, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [copyTranslations, setCopyTranslations] = useState(true);
  const [working, setWorking] = useState(false);
  const [mediaCount, setMediaCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = !!source;

  useEffect(() => {
    if (!source) return;
    setTitle(cloneDefaultTitle(source.title));
    setCopyTranslations(true);
    setError(null);
    setMediaCount(null);
  }, [source]);

  const handleConfirm = async () => {
    if (!source || !title.trim()) return;
    setWorking(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('clone_course', {
        _course_id: source.id,
        _new_title: title.trim(),
        _copy_translations: copyTranslations,
      });
      if (rpcError) throw rpcError;

      const result = data as { course_id?: string; media?: unknown[] } | null;
      if (!result?.course_id) throw new Error('The copy did not report a new course.');

      // Uploaded files live in the original course's folder, so they are copied
      // across before the copy opens. A failure here is never fatal — the editor
      // offers to try again.
      setMediaCount(Array.isArray(result.media) ? result.media.length : 0);
      let media: 'ok' | 'partial' | 'failed' = 'failed';
      try {
        const { data: mediaData, error: fnError } = await supabase.functions.invoke(
          'clone-course-media',
          { body: { course_id: result.course_id } },
        );
        if (fnError) throw fnError;
        const remaining = Number((mediaData as { remaining?: number } | null)?.remaining ?? 1);
        media = remaining === 0 ? 'ok' : 'partial';
      } catch (mediaErr) {
        console.error('Copying course media failed:', mediaErr);
      }

      onOpenChange(false);
      navigate(`/admin-portal/courses/${result.course_id}/edit?cloned=1&media=${media}`);
    } catch (err) {
      console.error('Error cloning course:', err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'The course could not be copied. Please try again.',
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!next && !working ? onOpenChange(false) : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate this course</DialogTitle>
          <DialogDescription>
            The copy starts as a draft with nothing published. Learner records — enrolments,
            certificates, quiz attempts and answers — stay with the original.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clone-title">Title of the copy</Label>
            <Input
              id="clone-title"
              data-testid="clone-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={working}
            />
          </div>
          <div className="flex items-start gap-2">
            <Checkbox
              id="clone-translations"
              data-testid="clone-translations"
              checked={copyTranslations}
              onCheckedChange={(checked) => setCopyTranslations(checked === true)}
              disabled={working}
            />
            <Label htmlFor="clone-translations" className="text-sm font-normal leading-snug">
              Copy translations
              <span className="block text-muted-foreground">
                Copied translations come across as drafts, so they need checking again before
                learners see them.
              </span>
            </Label>
          </div>
          {working && mediaCount !== null && (
            <p className="text-sm text-muted-foreground" data-testid="clone-media-progress">
              Copying {mediaCount} file{mediaCount === 1 ? '' : 's'}…
            </p>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription data-testid="clone-error">{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
            Cancel
          </Button>
          <Button
            data-testid="clone-confirm"
            onClick={handleConfirm}
            disabled={working || !title.trim()}
          >
            {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Duplicate course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
