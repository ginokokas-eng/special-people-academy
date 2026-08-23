import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowDown, ArrowUp, Copy, Trash2 } from '@/components/icons';
import {
  BLOCK_LABELS,
  allowsHalfWidth,
  blockLayout,
  isInteractive,
  type AccordionPayload,
  type BlockDraft,
  type BlockPayload,
  type CalloutPayload,
  type CardDeckPayload,
  type CarouselPayload,
  type ChecklistPayload,
  type DragMatchPayload,
  type FlipCardsPayload,
  type HotGraphicPayload,
  type ImagePayload,
  type LayoutAware,
  type McqPayload,
  type TextPayload,
  type VideoPayload,
} from '@/components/course-learn/blocks/types';
import {
  AccordionBlockForm,
  CalloutBlockForm,
  CardDeckBlockForm,
  ImageBlockForm,
  TextBlockForm,
  VideoBlockForm,
} from './forms/BlockForms';
import { CarouselBlockForm, HotGraphicBlockForm } from './forms/RichBlockForms';
import {
  ChecklistBlockForm,
  DragMatchBlockForm,
  FlipCardsBlockForm,
  McqBlockForm,
} from './forms/InteractiveBlockForms';


interface BlockListProps {
  blocks: BlockDraft[];
  onChange: (index: number, patch: Partial<BlockDraft>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  /** Used by the video block to build storage paths for uploads. */
  courseId?: string;
  lessonId?: string;
}

/** Ordered, editable list of the lesson's blocks. */
export function BlockList({
  blocks,
  onChange,
  onMove,
  onDuplicate,
  onRemove,
  courseId,
  lessonId,
}: BlockListProps) {
  if (!blocks.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No blocks yet. Add your first block below.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        const idPrefix = `block-${index}`;
        const setPayload = (payload: BlockPayload) => onChange(index, { payload });
        // Consecutive half-width blocks pair into one row; an orphan half is full.
        const isHalf = blockLayout(block.block_type, block.payload) === 'half';
        const prev = blocks[index - 1];
        const next = blocks[index + 1];
        const prevIsHalf = !!prev && blockLayout(prev.block_type, prev.payload) === 'half';
        const nextIsHalf = !!next && blockLayout(next.block_type, next.payload) === 'half';
        const pairedWithPrev = isHalf && prevIsHalf;
        const pairedWithNext = isHalf && !pairedWithPrev && nextIsHalf;

        return (
          <div key={block.id ?? `new-${index}`} className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {index + 1}. {BLOCK_LABELS[block.block_type]}
                </Badge>
                {!block.id && <Badge variant="outline">Unsaved</Badge>}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onMove(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move block ${index + 1} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onMove(index, 1)}
                  disabled={index === blocks.length - 1}
                  aria-label={`Move block ${index + 1} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(index)}
                  aria-label={`Duplicate block ${index + 1}`}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  aria-label={`Delete block ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {block.block_type === 'text' && (
              <TextBlockForm
                payload={block.payload as TextPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
              />
            )}
            {block.block_type === 'callout' && (
              <CalloutBlockForm
                payload={block.payload as CalloutPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
              />
            )}
            {block.block_type === 'card_deck' && (
              <CardDeckBlockForm
                payload={block.payload as CardDeckPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
              />
            )}
            {block.block_type === 'accordion' && (
              <AccordionBlockForm
                payload={block.payload as AccordionPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
              />
            )}
            {block.block_type === 'video' && (
              <VideoBlockForm
                payload={block.payload as VideoPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
                courseId={courseId}
                lessonId={lessonId}
              />
            )}
            {block.block_type === 'image' && (
              <ImageBlockForm
                payload={block.payload as ImagePayload}
                onChange={setPayload}
                idPrefix={idPrefix}
                courseId={courseId}
                lessonId={lessonId}
              />
            )}
            {block.block_type === 'carousel' && (
              <CarouselBlockForm
                payload={block.payload as CarouselPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
                courseId={courseId}
                lessonId={lessonId}
              />
            )}
            {block.block_type === 'hot_graphic' && (
              <HotGraphicBlockForm
                payload={block.payload as HotGraphicPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
                courseId={courseId}
                lessonId={lessonId}
              />
            )}
            {block.block_type === 'flip_cards' && (
              <FlipCardsBlockForm
                payload={block.payload as FlipCardsPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
              />
            )}
            {block.block_type === 'mcq' && (
              <McqBlockForm
                payload={block.payload as McqPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
              />
            )}
            {block.block_type === 'drag_match' && (
              <DragMatchBlockForm
                payload={block.payload as DragMatchPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
              />
            )}
            {block.block_type === 'checklist' && (
              <ChecklistBlockForm
                payload={block.payload as ChecklistPayload}
                onChange={setPayload}
                idPrefix={idPrefix}
              />
            )}

            {allowsHalfWidth(block.block_type) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                <span className="text-xs font-medium text-muted-foreground">Width</span>
                <Button
                  type="button"
                  size="sm"
                  variant={isHalf ? 'outline' : 'default'}
                  onClick={() =>
                    setPayload({ ...(block.payload as LayoutAware), layout: 'full' } as BlockPayload)
                  }
                >
                  Full width
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={isHalf ? 'default' : 'outline'}
                  onClick={() =>
                    setPayload({ ...(block.payload as LayoutAware), layout: 'half' } as BlockPayload)
                  }
                >
                  Half width
                </Button>
                {isHalf && (
                  <span className="text-xs text-muted-foreground">
                    {pairedWithNext
                      ? `Sits side by side with block ${index + 2} on desktop.`
                      : pairedWithPrev
                        ? `Sits side by side with block ${index} on desktop.`
                        : 'Set the block directly above or below to half width too, so they pair up. On its own it stays full width.'}
                  </span>
                )}
              </div>
            )}

            {isInteractive(block.block_type) && (
              <div className="mt-3 flex items-center gap-2 border-t pt-3">
                <Switch
                  id={`${idPrefix}-contributes`}
                  checked={block.contributes_to_completion}
                  onCheckedChange={(checked) => onChange(index, { contributes_to_completion: checked })}
                />
                <Label htmlFor={`${idPrefix}-contributes`} className="text-xs text-muted-foreground">
                  Learners must complete this block before the lesson can be marked complete
                </Label>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}
