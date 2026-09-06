/**
 * Standards picker.
 *
 * Attaches standards (Care Certificate / CQC key questions) to exactly ONE
 * target — a course, a lesson or a question-bank item. Writes `standard_links`
 * straight away so there is no half-saved state; the CHECK constraint on the
 * table guarantees a link never points at two things at once.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, Loader2, Plus, X } from '@/components/icons';
import {
  EVIDENCE_HEADING,
  groupByFramework,
  standardChipLabel,
  type StandardRow,
} from '@/lib/standards';

export type StandardTarget =
  | { kind: 'course'; id: string }
  | { kind: 'lesson'; id: string }
  | { kind: 'bank'; id: string };

const columnFor = (target: StandardTarget) =>
  target.kind === 'course' ? 'course_id' : target.kind === 'lesson' ? 'lesson_id' : 'bank_id';

interface StandardPickerProps {
  target: StandardTarget;
  /** Optional label above the chips. */
  label?: string;
  /** Helper line under the label. */
  description?: string;
  /** Called with the current selection after every change (e.g. to mirror a code). */
  onChange?: (selected: StandardRow[]) => void;
}

export function StandardPicker({ target, label, description, onChange }: StandardPickerProps) {
  const [standards, setStandards] = useState<StandardRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const column = columnFor(target);

  const load = useCallback(async () => {
    setLoading(true);
    const [all, links] = await Promise.all([
      supabase.from('standards').select('id, framework, code, title, parent_code, sort'),
      supabase.from('standard_links').select('standard_id').eq(column, target.id),
    ]);
    if (all.error) console.error('Error loading standards:', all.error);
    if (links.error) console.error('Error loading standard links:', links.error);
    setStandards((all.data ?? []) as StandardRow[]);
    setSelectedIds(((links.data ?? []) as { standard_id: string }[]).map((r) => r.standard_id));
    setLoading(false);
  }, [column, target.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => standards.filter((s) => selectedIds.includes(s.id)),
    [standards, selectedIds],
  );

  useEffect(() => {
    if (!loading) onChange?.(selected);
    // onChange is a reporting hook; re-running it on identity changes would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, loading]);

  const groups = useMemo(() => groupByFramework(standards), [standards]);

  const toggle = async (standard: StandardRow) => {
    if (busy) return;
    setBusy(true);
    const isOn = selectedIds.includes(standard.id);
    try {
      if (isOn) {
        const { error } = await supabase
          .from('standard_links')
          .delete()
          .eq('standard_id', standard.id)
          .eq(column, target.id);
        if (error) throw error;
        setSelectedIds((prev) => prev.filter((id) => id !== standard.id));
      } else {
        const { data: auth } = await supabase.auth.getUser();
        const { error } = await supabase.from('standard_links').insert({
          standard_id: standard.id,
          [column]: target.id,
          created_by: auth?.user?.id ?? null,
        } as never);
        if (error) throw error;
        setSelectedIds((prev) => [...prev, standard.id]);
      }
    } catch (error) {
      console.error('Error updating standard link:', error);
      toast.error('Could not update the standards for this item');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {label !== null && (
        <Label>{label ?? EVIDENCE_HEADING}</Label>
      )}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          selected.map((s) => (
            <Badge key={s.id} variant="secondary" className="gap-1">
              {standardChipLabel(s)}
              <button
                type="button"
                aria-label={`Remove ${standardChipLabel(s)}`}
                className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => void toggle(s)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))
        )}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add standard
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(26rem,92vw)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search by number or title…" />
              <CommandList className="max-h-72">
                <CommandEmpty>No standard matches that search.</CommandEmpty>
                {groups.map((group) => (
                  <CommandGroup key={group.framework} heading={group.label}>
                    {group.rows.map((s) => {
                      const isOn = selectedIds.includes(s.id);
                      return (
                        <CommandItem
                          key={s.id}
                          value={`${s.code} ${s.title}`}
                          onSelect={() => void toggle(s)}
                          className="gap-2"
                        >
                          <Check
                            className={`h-4 w-4 shrink-0 ${isOn ? 'opacity-100 text-primary' : 'opacity-0'}`}
                            aria-hidden="true"
                          />
                          <span className={s.parent_code ? 'pl-3' : ''}>{standardChipLabel(s)}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {!loading && selected.length === 0 && (
        <p className="text-xs text-muted-foreground">Nothing linked yet.</p>
      )}
    </div>
  );
}

export default StandardPicker;
