import { Button } from '@/components/ui/button';
import { Plus } from '@/components/icons';
import {
  BLOCK_DESCRIPTIONS,
  BLOCK_LABELS,
  BLOCK_TYPES,
  type BlockType,
} from '@/components/course-learn/blocks/types';

interface BlockPaletteProps {
  onAdd: (type: BlockType) => void;
}

/** "Add block" picker — plain language, one card per block type. */
export function BlockPalette({ onAdd }: BlockPaletteProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {BLOCK_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onAdd(type)}
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
    </div>
  );
}
