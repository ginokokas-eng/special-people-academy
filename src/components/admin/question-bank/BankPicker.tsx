import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search } from '@/components/icons';
import { toast } from 'sonner';
import type { BankOption, BankQuestion } from '@/lib/questionBank';

interface BankPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen bank row. The caller decides what to do with it. */
  onPick: (question: BankQuestion) => void | Promise<void>;
  title?: string;
  description?: string;
}

/** Staff-only picker used by the lesson editor and the quiz builder. */
export function BankPicker({
  open,
  onOpenChange,
  onPick,
  title = 'Choose a question from the bank',
  description = 'The question is copied in. Later bank edits never change a learner mid-quiz.',
}: BankPickerProps) {
  const [rows, setRows] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('question_bank')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error('Could not load the question bank');
        setRows(
          ((data || []) as unknown[]).map((r) => {
            const row = r as Record<string, unknown>;
            return {
              ...(row as unknown as BankQuestion),
              options: (Array.isArray(row.options) ? row.options : []) as BankOption[],
              tags: (Array.isArray(row.tags) ? row.tags : []) as string[],
            };
          }),
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.stem.toLowerCase().includes(q) ||
        (r.standard_code || '').toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q)),
    );
  }, [rows, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question, tag or standard code"
            aria-label="Search the question bank"
          />
        </div>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No questions match. Add questions in the Question bank first.
            </p>
          ) : (
            filtered.map((row) => (
              <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-sm font-medium">{row.stem}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">v{row.version}</Badge>
                    {row.difficulty && <Badge variant="outline">{row.difficulty}</Badge>}
                    {row.standard_code && <Badge variant="outline">{row.standard_code}</Badge>}
                    {row.tags.map((t) => (
                      <Badge key={t} variant="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  data-testid={`bank-picker-insert-${row.id}`}
                  disabled={picking !== null}
                  onClick={async () => {
                    setPicking(row.id);
                    try {
                      await onPick(row);
                      onOpenChange(false);
                    } finally {
                      setPicking(null);
                    }
                  }}
                >
                  {picking === row.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Insert
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
