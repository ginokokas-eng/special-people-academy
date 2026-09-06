import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageSquare } from '@/components/icons';
import { sortThread, type BlockComment } from '@/lib/blockComments';

interface Props {
  blockLabel: string;
  comments: BlockComment[];
  onAdd: (body: string) => Promise<void>;
  onResolve: (id: string, resolved: boolean) => Promise<void>;
}

/**
 * Reviewer notes on a single block. Staff only (enforced in the database), and
 * never shown to learners — these live entirely in the editor.
 */
export function BlockCommentsPopover({ blockLabel, comments, onAdd, onResolve }: Props) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const open = comments.filter((c) => !c.resolved_at).length;
  const thread = sortThread(comments);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Reviewer notes on ${blockLabel}${open ? `, ${open} open` : ''}`}
        >
          <MessageSquare className="h-4 w-4" />
          {open > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[0.7rem]">
              {open}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <p className="text-sm font-medium text-foreground">Reviewer notes</p>
        {!thread.length && (
          <p className="text-xs text-muted-foreground">
            No notes yet. Leave one for whoever edits this block next.
          </p>
        )}
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {thread.map((comment) => (
            <div
              key={comment.id}
              className="rounded-md border p-2 text-xs"
              data-resolved={!!comment.resolved_at}
            >
              <p className={comment.resolved_at ? 'text-muted-foreground line-through' : 'text-foreground'}>
                {comment.body}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[0.7rem] text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[0.7rem]"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    await onResolve(comment.id, !comment.resolved_at);
                    setBusy(false);
                  }}
                >
                  {comment.resolved_at ? 'Reopen' : 'Resolve'}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Textarea
          value={body}
          maxLength={1000}
          rows={3}
          placeholder="Add a note…"
          onChange={(event) => setBody(event.target.value)}
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!body.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await onAdd(body.trim());
            setBody('');
            setBusy(false);
          }}
        >
          Add note
        </Button>
      </PopoverContent>
    </Popover>
  );
}
