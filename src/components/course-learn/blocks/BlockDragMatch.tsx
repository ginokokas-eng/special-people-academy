import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from '@/components/icons';
import { useBlockResponse } from './useBlockResponse';
import type { DragMatchItem, DragMatchPayload } from './types';

interface BlockDragMatchProps {
  payload: DragMatchPayload;
  blockId: string;
  lessonId: string;
  preview?: boolean;
  /** Done-signal: completed correctly, per the plan. */
  onSolved: (solved: boolean) => void;
}

/** placement map: item id -> target id (absent = still in the pool) */
type Placements = Record<string, string>;

function shuffled<T>(list: T[]): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/* -------------------------- draggable / droppable -------------------------- */

function ItemButton({
  item,
  selected,
  onActivate,
  locked,
  placed,
}: {
  item: DragMatchItem;
  selected: boolean;
  onActivate: () => void;
  locked: boolean;
  placed: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: locked,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onActivate}
      disabled={locked}
      aria-pressed={selected}
      className={cn(
        'min-h-[44px] rounded-lg border px-3 py-2 text-left text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'touch-none',
        locked && 'border-success bg-success/10 text-foreground',
        !locked && selected && 'border-primary bg-primary/10',
        !locked && !selected && (placed ? 'border-primary/40 bg-card' : 'bg-card hover:bg-muted'),
        isDragging && 'opacity-60'
      )}
    >
      <span className="flex items-center gap-2">
        {locked && <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />}
        {item.label || 'Item'}
      </span>
    </button>
  );
}

function TargetZone({
  id,
  label,
  active,
  onActivate,
  children,
}: {
  id: string;
  label: string;
  active: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border bg-muted/30 p-3 transition-colors',
        (isOver || active) && 'border-primary bg-primary/5'
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label || 'Group'}</p>
        {active && (
          <Button type="button" size="sm" variant="outline" onClick={onActivate}>
            Place here
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/* --------------------------------- block ---------------------------------- */

export function BlockDragMatch({
  payload,
  blockId,
  lessonId,
  preview,
  onSolved,
}: BlockDragMatchProps) {
  const items = payload.items ?? [];
  const targets = payload.targets ?? [];
  const enabled = !preview;
  const { existing, loaded, record } = useBlockResponse(blockId, lessonId, enabled);

  const [placements, setPlacements] = useState<Placements>({});
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [solved, setSolved] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const order = useMemo(
    () => (payload.shuffle ? shuffled(items).map((i) => i.id) : items.map((i) => i.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.map((i) => i.id).join('|'), payload.shuffle]
  );
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  useEffect(() => {
    if (!loaded || !existing) return;
    if (existing.is_correct) {
      const prev = (existing.response as Placements | null) ?? {};
      setPlacements(prev);
      setLockedIds(new Set(Object.keys(prev)));
      setSolved(true);
      setChecked(true);
    }
  }, [loaded, existing]);

  useEffect(() => {
    onSolved(items.length === 0 || solved);
  }, [solved, items.length, onSolved]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const place = useCallback(
    (itemId: string, targetId: string) => {
      if (lockedIds.has(itemId)) return;
      setPlacements((prev) => ({ ...prev, [itemId]: targetId }));
      setSelectedId(null);
      setChecked(false);
      const item = byId.get(itemId);
      const target = targets.find((t) => t.id === targetId);
      setAnnouncement(`${item?.label || 'Item'} placed in ${target?.label || 'group'}.`);
    },
    [byId, lockedIds, targets]
  );

  const returnToPool = useCallback(
    (itemId: string) => {
      if (lockedIds.has(itemId)) return;
      setPlacements((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setChecked(false);
      setAnnouncement(`${byId.get(itemId)?.label || 'Item'} returned to the list.`);
    },
    [byId, lockedIds]
  );

  const activateItem = (itemId: string) => {
    if (lockedIds.has(itemId)) return;
    if (placements[itemId]) {
      returnToPool(itemId);
      return;
    }
    if (selectedId === itemId) {
      setSelectedId(null);
      setAnnouncement(`${byId.get(itemId)?.label || 'Item'} deselected.`);
      return;
    }
    setSelectedId(itemId);
    setAnnouncement(
      `${byId.get(itemId)?.label || 'Item'} selected. Choose a group to place it in.`
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const itemId = String(event.active.id);
    const targetId = event.over ? String(event.over.id) : null;
    if (targetId) place(itemId, targetId);
    else returnToPool(itemId);
  };

  const allPlaced = items.every((i) => placements[i.id]);

  const check = () => {
    const correctIds = items.filter((i) => placements[i.id] === i.target_id).map((i) => i.id);
    const isAllCorrect = correctIds.length === items.length && items.length > 0;

    setLockedIds(new Set(correctIds));
    setPlacements((prev) => {
      const next: Placements = {};
      for (const id of Object.keys(prev)) if (correctIds.includes(id)) next[id] = prev[id];
      return next;
    });
    setChecked(true);
    setSolved(isAllCorrect);
    setAnnouncement(
      isAllCorrect
        ? payload.feedback?.correct || 'All matched correctly.'
        : `${correctIds.length} of ${items.length} correct. The rest are back in the list.`
    );

    void record({
      state: isAllCorrect ? 'complete' : 'in_progress',
      is_correct: isAllCorrect,
      response: placements,
    });
  };

  const poolIds = order.filter((id) => !placements[id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-foreground">
          {payload.prompt || 'Match each item to the right group.'}
        </p>
        <Badge variant="outline">
          {Object.keys(placements).length}/{items.length} placed
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Drag an item into a group, or tap it and then tap a group. Tap a placed item to send it back.
      </p>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Items
          </p>
          <div className="flex flex-wrap gap-2">
            {poolIds.length ? (
              poolIds.map((id) => {
                const item = byId.get(id);
                if (!item) return null;
                return (
                  <ItemButton
                    key={id}
                    item={item}
                    selected={selectedId === id}
                    onActivate={() => activateItem(id)}
                    locked={false}
                    placed={false}
                  />
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">Everything has been placed.</p>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {targets.map((target) => (
            <TargetZone
              key={target.id}
              id={target.id}
              label={target.label}
              active={Boolean(selectedId)}
              onActivate={() => selectedId && place(selectedId, target.id)}
            >
              {order
                .filter((id) => placements[id] === target.id)
                .map((id) => {
                  const item = byId.get(id);
                  if (!item) return null;
                  return (
                    <ItemButton
                      key={id}
                      item={item}
                      selected={false}
                      onActivate={() => activateItem(id)}
                      locked={lockedIds.has(id)}
                      placed
                    />
                  );
                })}
              {!order.some((id) => placements[id] === target.id) && (
                <p className="text-xs text-muted-foreground">Nothing here yet.</p>
              )}
            </TargetZone>
          ))}
        </div>
      </DndContext>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={check} disabled={!allPlaced || solved}>
          Check answers
        </Button>
        {solved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {payload.feedback?.correct || 'All matched correctly.'}
          </span>
        )}
        {checked && !solved && (
          <span className="text-sm text-destructive">
            {payload.feedback?.incorrect ||
              'Not quite. The ones that don’t match are back in the list — try again.'}
          </span>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
