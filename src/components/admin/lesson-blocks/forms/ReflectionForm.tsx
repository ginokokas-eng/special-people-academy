import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from '@/components/icons';
import {
  validateReflection,
  type ReflectionPayload,
} from '@/components/course-learn/blocks/types';

interface Props {
  payload: ReflectionPayload;
  onChange: (payload: ReflectionPayload) => void;
  idPrefix: string;
}

/**
 * Authoring form for a reflective answer. Learners write in their own words and
 * an assessor marks it later — there is no automatic right answer here.
 */
export function ReflectionForm({ payload, onChange, idPrefix }: Props) {
  const criteria = payload.criteria ?? [];
  const issues = validateReflection(payload);

  const setCriterion = (index: number, value: string) =>
    onChange({ ...payload, criteria: criteria.map((c, i) => (i === index ? value : c)) });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-heading`}>Heading (optional)</Label>
        <Input
          id={`${idPrefix}-heading`}
          value={payload.heading ?? ''}
          placeholder="Your reflection"
          onChange={(e) => onChange({ ...payload, heading: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-prompt`}>What are learners asked to write about?</Label>
        <Textarea
          id={`${idPrefix}-prompt`}
          rows={3}
          value={payload.prompt ?? ''}
          placeholder="Describe a time you noticed a change in someone you support. What did you do, and who did you tell?"
          onChange={(e) => onChange({ ...payload, prompt: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-guidance`}>Guidance (optional)</Label>
          <Input
            id={`${idPrefix}-guidance`}
            value={payload.guidance ?? ''}
            placeholder="Write in your own words. Two or three short paragraphs is plenty."
            onChange={(e) => onChange({ ...payload, guidance: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-min-words`}>Fewest words before they can send</Label>
          <Input
            id={`${idPrefix}-min-words`}
            type="number"
            min={0}
            max={500}
            value={payload.min_words ?? 0}
            onChange={(e) =>
              onChange({ ...payload, min_words: Math.max(0, Number(e.target.value) || 0) })
            }
          />
          <p className="text-xs text-muted-foreground">Use 0 for no minimum.</p>
        </div>
      </div>

      <div className="space-y-2 rounded-md border bg-muted/40 p-3">
        <Label>What good looks like (optional)</Label>
        <p className="text-xs text-muted-foreground">
          Shown to learners, and to whoever marks the answer.
        </p>
        {criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={c}
              aria-label={`Point ${i + 1}`}
              placeholder="Mentions who they escalated to"
              onChange={(e) => setCriterion(i, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove point ${i + 1}`}
              onClick={() => onChange({ ...payload, criteria: criteria.filter((_, j) => j !== i) })}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...payload, criteria: [...criteria, ''] })}
        >
          <Plus className="mr-1 h-4 w-4" /> Add a point
        </Button>
      </div>

      {issues.length > 0 && (
        <ul className="ml-4 list-disc space-y-1 text-xs text-destructive">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
