import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@/components/icons';
import { MediaUploadField } from './MediaUploadField';
import { SignedImage } from '@/components/course-learn/blocks/SignedImage';
import type {
  CarouselItem,
  CarouselPayload,
  HotGraphicPayload,
  Hotspot,
} from '@/components/course-learn/blocks/types';

interface RichFormProps<T> {
  payload: T;
  onChange: (payload: T) => void;
  idPrefix: string;
  courseId?: string;
  lessonId?: string;
}

/* -------------------------------- carousel -------------------------------- */

export function CarouselBlockForm({
  payload,
  onChange,
  idPrefix,
  courseId,
  lessonId,
}: RichFormProps<CarouselPayload>) {
  const items = payload.items ?? [];

  const setItems = (next: CarouselItem[]) => onChange({ ...payload, items: next });
  const patchItem = (index: number, patch: Partial<CarouselItem>) =>
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  return (
    <div className="space-y-3">
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
          placeholder="Use the arrows to move through each step."
          onChange={(e) => onChange({ ...payload, instruction: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">Slide {index + 1}</Badge>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move slide ${index + 1} earlier`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label={`Move slide ${index + 1} later`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                  disabled={items.length === 1}
                  aria-label={`Delete slide ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-slide-${index}-title`}>Slide title</Label>
              <Input
                id={`${idPrefix}-slide-${index}-title`}
                value={item.title}
                onChange={(e) => patchItem(index, { title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-slide-${index}-text`}>Slide text</Label>
              <Textarea
                id={`${idPrefix}-slide-${index}-text`}
                rows={3}
                value={item.text}
                onChange={(e) => patchItem(index, { text: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Blank lines start a new paragraph. Lines beginning with “-” become bullets.
              </p>
            </div>

            <MediaUploadField
              label="Slide image (optional)"
              value={item.media}
              onChange={(media) => patchItem(index, { media })}
              idPrefix={`${idPrefix}-slide-${index}`}
              courseId={courseId}
              lessonId={lessonId}
            />
            {(item.media?.path || item.media?.url) && (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-slide-${index}-alt`}>Image alt text</Label>
                <Input
                  id={`${idPrefix}-slide-${index}-alt`}
                  value={item.alt ?? ''}
                  onChange={(e) => patchItem(index, { alt: e.target.value })}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setItems([...items, { id: crypto.randomUUID(), title: '', text: '' }])
        }
      >
        <Plus className="mr-2 h-4 w-4" /> Add slide
      </Button>
    </div>
  );
}

/* ------------------------------- hot graphic ------------------------------ */

export function HotGraphicBlockForm({
  payload,
  onChange,
  idPrefix,
  courseId,
  lessonId,
}: RichFormProps<HotGraphicPayload>) {
  const hotspots = payload.hotspots ?? [];
  const [placing, setPlacing] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const hasImage = !!(payload.image?.path || payload.image?.url);

  const setHotspots = (next: Hotspot[]) => onChange({ ...payload, hotspots: next });
  const patchSpot = (id: string, patch: Partial<Hotspot>) =>
    setHotspots(hotspots.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  /** Turns a pointer position into x/y PERCENTAGES of the rendered image box. */
  const percentFromEvent = (clientX: number, clientY: number) => {
    const box = imageWrapRef.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return null;
    return {
      x: Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - box.top) / box.height) * 100)),
    };
  };

  return (
    <div className="space-y-3">
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
          placeholder="Select each point on the image to find out more."
          onChange={(e) => onChange({ ...payload, instruction: e.target.value })}
        />
      </div>

      <MediaUploadField
        label="Background image"
        value={payload.image}
        onChange={(image) => onChange({ ...payload, image })}
        idPrefix={idPrefix}
        courseId={courseId}
        lessonId={lessonId}
      />

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-alt`}>Alt text for the image (required)</Label>
        <Input
          id={`${idPrefix}-alt`}
          value={payload.alt ?? ''}
          placeholder="e.g. A feeding pump set up beside a bed"
          onChange={(e) => onChange({ ...payload, alt: e.target.value })}
        />
      </div>

      {hasImage && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={placing ? 'default' : 'outline'}
              onClick={() => setPlacing((v) => !v)}
            >
              {placing ? 'Click the image to place a point' : 'Add a point'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Drag a point to move it, or type exact positions below.
            </p>
          </div>

          <div
            ref={imageWrapRef}
            className={cn(
              'relative overflow-hidden rounded-lg border bg-card',
              placing && 'cursor-crosshair ring-2 ring-primary'
            )}
            onClick={(e) => {
              if (!placing) return;
              const pos = percentFromEvent(e.clientX, e.clientY);
              if (!pos) return;
              setHotspots([
                ...hotspots,
                { id: crypto.randomUUID(), x: pos.x, y: pos.y, title: '', text: '' },
              ]);
              setPlacing(false);
            }}
            onPointerMove={(e) => {
              if (!dragging) return;
              const pos = percentFromEvent(e.clientX, e.clientY);
              if (pos) patchSpot(dragging, pos);
            }}
            onPointerUp={() => setDragging(null)}
            onPointerLeave={() => setDragging(null)}
          >
            <SignedImage
              media={payload.image}
              alt={payload.alt || ''}
              className="max-h-[420px]"
            />
            {hotspots.map((spot, i) => (
              <button
                key={spot.id}
                type="button"
                aria-label={`Point ${i + 1}${spot.title ? `: ${spot.title}` : ''} — drag to reposition`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDragging(spot.id);
                }}
                style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border-2 border-primary bg-background text-xs font-semibold text-primary shadow-md"
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {hotspots.map((spot, index) => (
          <div key={spot.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">Point {index + 1}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setHotspots(hotspots.filter((h) => h.id !== spot.id))}
                aria-label={`Delete point ${index + 1}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-spot-${index}-title`}>Title</Label>
              <Input
                id={`${idPrefix}-spot-${index}-title`}
                value={spot.title}
                onChange={(e) => patchSpot(spot.id, { title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-spot-${index}-text`}>What learners read</Label>
              <Textarea
                id={`${idPrefix}-spot-${index}-text`}
                rows={3}
                value={spot.text}
                onChange={(e) => patchSpot(spot.id, { text: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-spot-${index}-x`}>Across (%)</Label>
                <Input
                  id={`${idPrefix}-spot-${index}-x`}
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(spot.x)}
                  onChange={(e) =>
                    patchSpot(spot.id, {
                      x: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-spot-${index}-y`}>Down (%)</Label>
                <Input
                  id={`${idPrefix}-spot-${index}-y`}
                  type="number"
                  min={0}
                  max={100}
                  value={Math.round(spot.y)}
                  onChange={(e) =>
                    patchSpot(spot.id, {
                      y: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))}
        {!hotspots.length && (
          <p className="text-xs text-muted-foreground">
            No points yet. Add at least one so learners have something to explore.
          </p>
        )}
      </div>
    </div>
  );
}
