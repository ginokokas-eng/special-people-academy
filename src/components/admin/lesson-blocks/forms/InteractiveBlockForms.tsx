import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@/components/icons';
import type {
  ChecklistPayload,
  DragMatchPayload,
  FlipCardsPayload,
  McqPayload,
} from '@/components/course-learn/blocks/types';

interface FormProps<T> {
  payload: T;
  onChange: (payload: T) => void;
  idPrefix: string;
}

function moveInList<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/* ----------------------------------- mcq ---------------------------------- */

export function McqBlockForm({ payload, onChange, idPrefix }: FormProps<McqPayload>) {
  const options = payload.options ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-question`}>Question</Label>
        <Textarea
          id={`${idPrefix}-question`}
          rows={2}
          value={payload.question ?? ''}
          placeholder="e.g. What do you check before every feed?"
          onChange={(e) => onChange({ ...payload, question: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={opt.id} className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`${idPrefix}-option-${opt.id}`}>Answer {i + 1}</Label>
              <Input
                id={`${idPrefix}-option-${opt.id}`}
                value={opt.label}
                onChange={(e) =>
                  onChange({
                    ...payload,
                    options: options.map((o) =>
                      o.id === opt.id ? { ...o, label: e.target.value } : o
                    ),
                  })
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const remaining = options.filter((o) => o.id !== opt.id);
                onChange({
                  ...payload,
                  options: remaining,
                  correct_id:
                    payload.correct_id === opt.id ? (remaining[0]?.id ?? '') : payload.correct_id,
                });
              }}
              disabled={options.length <= 2}
              aria-label={`Remove answer ${i + 1}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
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
            options: [...options, { id: crypto.randomUUID(), label: '' }],
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" /> Add answer
      </Button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-correct`}>Correct answer</Label>
          <Select
            value={payload.correct_id || options[0]?.id}
            onValueChange={(v) => onChange({ ...payload, correct_id: v })}
          >
            <SelectTrigger id={`${idPrefix}-correct`}>
              <SelectValue placeholder="Choose the correct answer" />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt, i) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label?.trim() || `Answer ${i + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-explanation`}>Explanation (shown after answering)</Label>
          <Textarea
            id={`${idPrefix}-explanation`}
            rows={2}
            value={payload.explanation ?? ''}
            onChange={(e) => onChange({ ...payload, explanation: e.target.value })}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        This is a practice check inside the lesson. It doesn’t affect quiz scores, quiz attempts or
        certificates.
      </p>
    </div>
  );
}

/* ------------------------------- drag_match -------------------------------- */

export function DragMatchBlockForm({ payload, onChange, idPrefix }: FormProps<DragMatchPayload>) {
  const targets = payload.targets ?? [];
  const items = payload.items ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-prompt`}>Instruction</Label>
        <Input
          id={`${idPrefix}-prompt`}
          value={payload.prompt ?? ''}
          placeholder="e.g. Match each step to when it happens"
          onChange={(e) => onChange({ ...payload, prompt: e.target.value })}
        />
      </div>

      <div className="space-y-2 rounded-md border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Groups</p>
        {targets.map((target, i) => (
          <div key={target.id} className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`${idPrefix}-target-${target.id}`}>Group {i + 1}</Label>
              <Input
                id={`${idPrefix}-target-${target.id}`}
                value={target.label}
                onChange={(e) =>
                  onChange({
                    ...payload,
                    targets: targets.map((t) =>
                      t.id === target.id ? { ...t, label: e.target.value } : t
                    ),
                  })
                }
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange({ ...payload, targets: targets.filter((t) => t.id !== target.id) })}
              disabled={targets.length <= 2 || items.some((it) => it.target_id === target.id)}
              aria-label={`Remove group ${i + 1}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({ ...payload, targets: [...targets, { id: crypto.randomUUID(), label: '' }] })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Add group
        </Button>
      </div>

      <div className="space-y-2 rounded-md border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Items and their correct group</p>
        {items.map((item, i) => (
          <div key={item.id} className="space-y-2 rounded-md border bg-card p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...payload, items: moveInList(items, i, -1) })}
                  disabled={i === 0}
                  aria-label={`Move item ${i + 1} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...payload, items: moveInList(items, i, 1) })}
                  disabled={i === items.length - 1}
                  aria-label={`Move item ${i + 1} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...payload, items: items.filter((it) => it.id !== item.id) })}
                  disabled={items.length <= 1}
                  aria-label={`Remove item ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-item-${item.id}`}>Item text</Label>
                <Input
                  id={`${idPrefix}-item-${item.id}`}
                  value={item.label}
                  onChange={(e) =>
                    onChange({
                      ...payload,
                      items: items.map((it) =>
                        it.id === item.id ? { ...it, label: e.target.value } : it
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-item-target-${item.id}`}>Belongs in</Label>
                <Select
                  value={item.target_id || targets[0]?.id}
                  onValueChange={(v) =>
                    onChange({
                      ...payload,
                      items: items.map((it) => (it.id === item.id ? { ...it, target_id: v } : it)),
                    })
                  }
                >
                  <SelectTrigger id={`${idPrefix}-item-target-${item.id}`}>
                    <SelectValue placeholder="Choose a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map((t, ti) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label?.trim() || `Group ${ti + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...payload,
              items: [
                ...items,
                { id: crypto.randomUUID(), label: '', target_id: targets[0]?.id ?? '' },
              ],
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" /> Add item
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id={`${idPrefix}-shuffle`}
          checked={payload.shuffle !== false}
          onCheckedChange={(checked) => onChange({ ...payload, shuffle: checked })}
        />
        <Label htmlFor={`${idPrefix}-shuffle`} className="text-xs text-muted-foreground">
          Shuffle the item order for each learner
        </Label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-fb-correct`}>Feedback when correct</Label>
          <Input
            id={`${idPrefix}-fb-correct`}
            value={payload.feedback?.correct ?? ''}
            onChange={(e) =>
              onChange({
                ...payload,
                feedback: { ...(payload.feedback ?? { correct: '', incorrect: '' }), correct: e.target.value },
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-fb-incorrect`}>Feedback when wrong</Label>
          <Input
            id={`${idPrefix}-fb-incorrect`}
            value={payload.feedback?.incorrect ?? ''}
            onChange={(e) =>
              onChange({
                ...payload,
                feedback: {
                  ...(payload.feedback ?? { correct: '', incorrect: '' }),
                  incorrect: e.target.value,
                },
              })
            }
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Learners can drag, tap or use the keyboard. Wrong items go back to the list so they can try
        again.
      </p>
    </div>
  );
}

/* ------------------------------- flip cards ------------------------------- */

export function FlipCardsBlockForm({ payload, onChange, idPrefix }: FormProps<FlipCardsPayload>) {
  const cards = payload.cards ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            placeholder="Tap a card to flip it over."
            onChange={(e) => onChange({ ...payload, instruction: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3">
        {cards.map((card, i) => (
          <div key={card.id} className="rounded-md border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Card {i + 1}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...payload, cards: moveInList(cards, i, -1) })}
                  disabled={i === 0}
                  aria-label={`Move card ${i + 1} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...payload, cards: moveInList(cards, i, 1) })}
                  disabled={i === cards.length - 1}
                  aria-label={`Move card ${i + 1} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
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
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-front-${card.id}`}>Front</Label>
                <Input
                  id={`${idPrefix}-front-${card.id}`}
                  value={card.front}
                  onChange={(e) =>
                    onChange({
                      ...payload,
                      cards: cards.map((c) =>
                        c.id === card.id ? { ...c, front: e.target.value } : c
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-back-${card.id}`}>Back</Label>
                <Textarea
                  id={`${idPrefix}-back-${card.id}`}
                  rows={2}
                  value={card.back}
                  onChange={(e) =>
                    onChange({
                      ...payload,
                      cards: cards.map((c) => (c.id === card.id ? { ...c, back: e.target.value } : c)),
                    })
                  }
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
          onChange({ ...payload, cards: [...cards, { id: crypto.randomUUID(), front: '', back: '' }] })
        }
      >
        <Plus className="mr-2 h-4 w-4" /> Add card
      </Button>
    </div>
  );
}

/* -------------------------------- checklist ------------------------------- */

export function ChecklistBlockForm({ payload, onChange, idPrefix }: FormProps<ChecklistPayload>) {
  const steps = payload.steps ?? [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-heading`}>Heading (optional)</Label>
          <Input
            id={`${idPrefix}-heading`}
            value={payload.heading ?? ''}
            placeholder="Practical checklist"
            onChange={(e) => onChange({ ...payload, heading: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-caption`}>Caption</Label>
          <Input
            id={`${idPrefix}-caption`}
            value={payload.caption ?? ''}
            placeholder="Your assessor completes the real sign-off in person."
            onChange={(e) => onChange({ ...payload, caption: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={step.id} className="rounded-md border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...payload, steps: moveInList(steps, i, -1) })}
                  disabled={i === 0}
                  aria-label={`Move step ${i + 1} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...payload, steps: moveInList(steps, i, 1) })}
                  disabled={i === steps.length - 1}
                  aria-label={`Move step ${i + 1} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...payload, steps: steps.filter((s) => s.id !== step.id) })}
                  disabled={steps.length <= 1}
                  aria-label={`Remove step ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-step-title-${step.id}`}>Step title</Label>
                <Input
                  id={`${idPrefix}-step-title-${step.id}`}
                  value={step.step_title}
                  onChange={(e) =>
                    onChange({
                      ...payload,
                      steps: steps.map((s) =>
                        s.id === step.id ? { ...s, step_title: e.target.value } : s
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-step-instruction-${step.id}`}>What to do</Label>
                <Textarea
                  id={`${idPrefix}-step-instruction-${step.id}`}
                  rows={2}
                  value={step.instruction ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...payload,
                      steps: steps.map((s) =>
                        s.id === step.id ? { ...s, instruction: e.target.value } : s
                      ),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-step-safety-${step.id}`}>Safety note (optional)</Label>
                <Textarea
                  id={`${idPrefix}-step-safety-${step.id}`}
                  rows={2}
                  value={step.safety_note ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...payload,
                      steps: steps.map((s) =>
                        s.id === step.id ? { ...s, safety_note: e.target.value } : s
                      ),
                    })
                  }
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
            steps: [
              ...steps,
              { id: crypto.randomUUID(), step_title: '', instruction: '', safety_note: '' },
            ],
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" /> Add step
      </Button>

      <p className="text-xs text-muted-foreground">
        Learners see this as a read-only study reference. It can’t be ticked off and never affects
        practical sign-off or competency records.
      </p>
    </div>
  );
}
