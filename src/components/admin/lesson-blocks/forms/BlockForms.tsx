import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from '@/components/icons';
import type {
  BlockPayload,
  CalloutPayload,
  CardDeckPayload,
  ImagePayload,
  TextPayload,
} from '@/components/course-learn/blocks/types';

interface FormProps<T extends BlockPayload> {
  payload: T;
  onChange: (payload: T) => void;
  idPrefix: string;
}

export function TextBlockForm({ payload, onChange, idPrefix }: FormProps<TextPayload>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-heading`}>Heading (optional)</Label>
        <Input
          id={`${idPrefix}-heading`}
          value={payload.heading ?? ''}
          placeholder="e.g. Before you start"
          onChange={(e) => onChange({ ...payload, heading: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-text`}>Text</Label>
        <Textarea
          id={`${idPrefix}-text`}
          rows={6}
          value={payload.text ?? ''}
          placeholder={'Write a paragraph.\n\nLeave a blank line for a new paragraph.\n- Start a line with a dash for a bullet'}
          onChange={(e) => onChange({ ...payload, text: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Blank line = new paragraph. Lines starting with “-” become bullet points.
        </p>
      </div>
    </div>
  );
}

export function CalloutBlockForm({ payload, onChange, idPrefix }: FormProps<CalloutPayload>) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-variant`}>Style</Label>
          <Select
            value={payload.variant}
            onValueChange={(v) => onChange({ ...payload, variant: v as CalloutPayload['variant'] })}
          >
            <SelectTrigger id={`${idPrefix}-variant`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Good to know</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="warning">Important</SelectItem>
              <SelectItem value="success">Good practice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-title`}>Title (optional)</Label>
          <Input
            id={`${idPrefix}-title`}
            value={payload.title ?? ''}
            placeholder="Defaults to the style name"
            onChange={(e) => onChange({ ...payload, title: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-text`}>Text</Label>
        <Textarea
          id={`${idPrefix}-text`}
          rows={4}
          value={payload.text ?? ''}
          onChange={(e) => onChange({ ...payload, text: e.target.value })}
        />
      </div>
    </div>
  );
}

export function CardDeckBlockForm({ payload, onChange, idPrefix }: FormProps<CardDeckPayload>) {
  const cards = payload.cards ?? [];

  const updateCard = (id: string, patch: Partial<{ front: string; back: string }>) =>
    onChange({ ...payload, cards: cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-heading`}>Heading (optional)</Label>
          <Input
            id={`${idPrefix}-heading`}
            value={payload.heading ?? ''}
            onChange={(e) => onChange({ ...payload, heading: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-instruction`}>Instruction</Label>
          <Input
            id={`${idPrefix}-instruction`}
            value={payload.instruction ?? ''}
            placeholder="Tap each card to reveal the answer."
            onChange={(e) => onChange({ ...payload, instruction: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3">
        {cards.map((card, i) => (
          <div key={card.id} className="rounded-md border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Card {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...payload, cards: cards.filter((c) => c.id !== card.id) })}
                disabled={cards.length <= 1}
                aria-label={`Remove card ${i + 1}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-front-${card.id}`}>Front (prompt)</Label>
                <Input
                  id={`${idPrefix}-front-${card.id}`}
                  value={card.front}
                  onChange={(e) => updateCard(card.id, { front: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-back-${card.id}`}>Back (reveal)</Label>
                <Textarea
                  id={`${idPrefix}-back-${card.id}`}
                  rows={2}
                  value={card.back}
                  onChange={(e) => updateCard(card.id, { back: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            ...payload,
            cards: [...cards, { id: crypto.randomUUID(), front: '', back: '' }],
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" /> Add card
      </Button>
    </div>
  );
}

export function ImageBlockForm({ payload, onChange, idPrefix }: FormProps<ImagePayload>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-url`}>Image URL</Label>
        <Input
          id={`${idPrefix}-url`}
          value={payload.url ?? ''}
          placeholder="https://…"
          onChange={(e) => onChange({ ...payload, url: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-alt`}>Alt text (describes the image)</Label>
        <Input
          id={`${idPrefix}-alt`}
          value={payload.alt ?? ''}
          placeholder="e.g. Nurse checking a feeding tube position"
          onChange={(e) => onChange({ ...payload, alt: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-caption`}>Caption (optional)</Label>
        <Input
          id={`${idPrefix}-caption`}
          value={payload.caption ?? ''}
          onChange={(e) => onChange({ ...payload, caption: e.target.value })}
        />
      </div>
    </div>
  );
}
