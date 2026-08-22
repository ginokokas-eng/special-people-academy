import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowDown, ArrowUp, Copy, Trash2 } from '@/components/icons';
import {
  BLOCK_LABELS,
  isInteractive,
  type AccordionPayload,
  type BlockDraft,
  type BlockPayload,
  type CalloutPayload,
  type CardDeckPayload,
  type ChecklistPayload,
  type DragMatchPayload,
  type FlipCardsPayload,
  type ImagePayload,
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
              />
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
