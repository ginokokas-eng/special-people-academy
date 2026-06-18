import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatTime } from './useLearnerPrefs';

const sb = supabase as any;

const ISSUE_TYPES: { value: string; label: string }[] = [
  { value: 'playback', label: 'Playback issue (video/audio)' },
  { value: 'transcript', label: 'Transcript or captions issue' },
  { value: 'resource', label: 'Resource or download issue' },
  { value: 'other', label: 'Other issue' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  lessonId: string | undefined;
  playbackTime: number;
}

export function ReportProblemDialog({ open, onOpenChange, courseId, lessonId, playbackTime }: Props) {
  const { user } = useAuth();
  const [issueType, setIssueType] = useState('playback');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await sb.from('lesson_issue_reports').insert({
      user_id: user.id,
      course_id: courseId,
      lesson_id: lessonId ?? null,
      issue_type: issueType,
      message: message.trim() || null,
      playback_time_seconds: issueType === 'playback' ? Math.round(playbackTime) : null,
      status: 'open',
    });
    setSaving(false);
    if (error) {
      toast.error('Could not submit your report');
      return;
    }
    toast.success('Thanks — your report has been sent to the team');
    setMessage('');
    setIssueType('playback');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            Let us know what went wrong with this lesson and we'll look into it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={issueType} onValueChange={setIssueType} className="space-y-1">
            {ISSUE_TYPES.map((t) => (
              <label
                key={t.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border p-2.5 text-sm hover:bg-muted/50"
              >
                <RadioGroupItem value={t.value} />
                {t.label}
              </label>
            ))}
          </RadioGroup>
          {issueType === 'playback' && (
            <p className="text-xs text-muted-foreground">
              We'll include the current playback time ({formatTime(playbackTime)}).
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="report-msg">Details (optional)</Label>
            <Textarea
              id="report-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the problem…"
              className="min-h-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
