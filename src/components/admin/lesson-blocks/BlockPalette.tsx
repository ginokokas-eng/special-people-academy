import { Button } from '@/components/ui/button';
import { Library, Plus } from '@/components/icons';
import {
  BLOCK_DESCRIPTIONS,
  BLOCK_LABELS,
  BLOCK_TYPES,
  type BlockType,
} from '@/components/course-learn/blocks/types';

interface BlockPaletteProps {
  onAdd: (type: BlockType) => void;
  /** Opens the shared question bank picker, when the caller provides one. */
  onPickFromBank?: () => void;
}

/** "Add block" picker — plain language, one card per block type. */
export function BlockPalette({ onAdd, onPickFromBank }: BlockPaletteProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {BLOCK_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
          data-testid={`block-palette-${type}`}
          aria-label={`Add ${BLOCK_LABELS[type]} block`}
          className="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
            {BLOCK_LABELS[type]}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {BLOCK_DESCRIPTIONS[type]}
          </span>
        </button>
      ))}

      {onPickFromBank && (
        <button
          type="button"
          onClick={onPickFromBank}
          data-testid="block-palette-from-bank"
          aria-label="Add a question from the question bank"
          className="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Library className="h-4 w-4 text-primary" aria-hidden="true" />
            From question bank…
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Reuse a question your team already wrote. It is copied into this lesson.
          </span>
        </button>
      )}
    </div>
  );
}

