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
import { CheckCircle2, GripVertical } from '@/components/icons';
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
        'pressable min-h-[44px] rounded-xl px-3.5 py-2 text-left text-sm font-medium shadow-learner',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'touch-none',
        !locked && 'cursor-grab active:cursor-grabbing',
        locked && 'bg-success/[0.14] text-foreground shadow-none',
        !locked && selected && 'bg-primary text-primary-foreground',
        !locked && !selected && 'bg-violet-soft text-violet-soft-foreground hover:shadow-learner-lg',
        isDragging && 'opacity-60'
      )}

    >
      <span className="flex items-center gap-2">
        {locked && <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />}
        {!locked && (
          <GripVertical className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
        )}
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
        'pressable rounded-xl border-2 border-dashed border-border p-3',
        (isOver || active) && 'border-solid border-primary/50 bg-violet-soft'
      )}

    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-display text-sm text-foreground">{label || 'Group'}</p>
        {active && (
          <Button type="button" size="sm" variant="outline" className="pressable" onClick={onActivate}>
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
      setAnnouncement(`${byId.get(itemId)?.label || 'Item'} returned to the pool.`);
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

  const labelOf = (id: string | number | undefined | null) =>
    id == null ? 'Item' : byId.get(String(id))?.label || 'Item';
  const targetLabelOf = (id: string | number | undefined | null) =>
    id == null ? 'group' : targets.find((t) => t.id === String(id))?.label || 'group';

  /**
   * Custom screen-reader announcements — dnd-kit's defaults read raw ids, which
   * are UUIDs. These read the authored item and group LABELS instead, matching
   * the messages written by the tap/keyboard path into the same live region.
   */
  const announcements = {
    onDragStart({ active }: { active: { id: string | number } }) {
      return `${labelOf(active.id)} picked up. Move it over a group to place it.`;
    },
    onDragOver({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
      return over
        ? `${labelOf(active.id)} is over ${targetLabelOf(over.id)}.`
        : `${labelOf(active.id)} is no longer over a group.`;
    },
    onDragEnd({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
      return over
        ? `${labelOf(active.id)} placed in ${targetLabelOf(over.id)}.`
        : `${labelOf(active.id)} returned to the pool.`;
    },
    onDragCancel({ active }: { active: { id: string | number } }) {
      return `${labelOf(active.id)} returned to the pool.`;
    },
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
        <p className="font-display text-lg leading-snug text-foreground">
          {payload.prompt || 'Match each item to the right group.'}
        </p>
        <Badge variant="secondary" className="tabular-nums">
          {Object.keys(placements).length}/{items.length} placed
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Drag an item into a group, or tap it and then tap a group. Tap a placed item to send it back.
      </p>

      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements }}
      >
        <div className="media-breakout">
        <div className="rounded-xl bg-muted/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
      </DndContext>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="pressable" onClick={check} disabled={!allPlaced || solved}>
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

      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
