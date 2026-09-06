/**
 * Standards mapping helpers.
 *
 * Standards describe the areas a piece of training *evidences* — never a
 * compliance rating. Formatters here are deliberately honest: nothing is
 * rounded up, and unknown numbers render as an em dash rather than a zero.
 */

export type StandardFramework = 'care_certificate' | 'cqc';

export interface StandardRow {
  id: string;
  framework: StandardFramework | string;
  code: string;
  title: string;
  parent_code: string | null;
  sort: number;
}

/** The two frameworks in display order. */
export const FRAMEWORKS: StandardFramework[] = ['care_certificate', 'cqc'];

export const FRAMEWORK_LABELS: Record<string, string> = {
  care_certificate: 'Care Certificate',
  cqc: 'CQC key questions',
};

export function frameworkLabel(framework: string): string {
  return FRAMEWORK_LABELS[framework] ?? framework;
}

/** "Areas this training evidences" — reused wherever a report is headed. */
export const EVIDENCE_HEADING = 'Areas this training evidences';
export const EVIDENCE_DISCLAIMER =
  'This is training evidence, not a compliance rating.';

/** Sorts numerically by `sort`, then by code so outcomes like 10.3 stay in order. */
export function sortStandards<T extends { sort?: number; code: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const sa = a.sort ?? 0;
    const sb = b.sort ?? 0;
    if (sa !== sb) return sa - sb;
    return compareCodes(a.code, b.code);
  });
}

/** Compares dotted codes segment by segment ("2" < "10" < "10.3"). */
export function compareCodes(a: string, b: string): number {
  const pa = a.split('.');
  const pb = b.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const sa = pa[i];
    const sb = pb[i];
    if (sa === undefined) return -1;
    if (sb === undefined) return 1;
    const na = Number(sa);
    const nb = Number(sb);
    const bothNumeric = Number.isFinite(na) && Number.isFinite(nb) && sa !== '' && sb !== '';
    if (bothNumeric) {
      if (na !== nb) return na - nb;
    } else if (sa !== sb) {
      return sa.localeCompare(sb);
    }
  }
  return 0;
}

/** Groups rows into framework buckets, in framework display order. */
export function groupByFramework<T extends { framework: string; code: string; sort?: number }>(
  rows: T[],
): { framework: string; label: string; rows: T[] }[] {
  const seen: string[] = [];
  for (const row of rows) if (!seen.includes(row.framework)) seen.push(row.framework);
  const ordered = [
    ...FRAMEWORKS.filter((f) => seen.includes(f)),
    ...seen.filter((f) => !(FRAMEWORKS as string[]).includes(f)),
  ];
  return ordered.map((framework) => ({
    framework,
    label: frameworkLabel(framework),
    rows: sortStandards(rows.filter((r) => r.framework === framework)),
  }));
}

/** Nests staff-authored outcomes under their parent standard. */
export function nestOutcomes<T extends StandardRow>(rows: T[]): { parent: T; children: T[] }[] {
  const parents = sortStandards(rows.filter((r) => !r.parent_code));
  return parents.map((parent) => ({
    parent,
    children: sortStandards(rows.filter((r) => r.parent_code === parent.code)),
  }));
}

/** "3/5" — or "0/0" when nothing is linked; never blank. */
export function xOfY(done: number, total: number): string {
  const d = Number.isFinite(done) ? Math.max(0, Math.trunc(done)) : 0;
  const t = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0;
  return `${Math.min(d, t)}/${t}`;
}

/** "3 of 5 lessons" label used on the learner evidence card. */
export function lessonsLabel(done: number, total: number): string {
  const t = Math.max(0, Math.trunc(total || 0));
  return `${xOfY(done, t)} ${t === 1 ? 'lesson' : 'lessons'}`;
}

/**
 * Correct-answer percentage. Returns null (render as "—") when there is
 * nothing to divide by — an unanswered standard is not 0%.
 */
export function correctPct(correct: number, attempted: number): number | null {
  if (!attempted || attempted <= 0) return null;
  const pct = (correct / attempted) * 100;
  if (!Number.isFinite(pct)) return null;
  return Math.round(pct);
}

/** Formats a nullable percentage for display. */
export function formatPct(value: number | null | undefined, dp = 0): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return `${Number(Number(value).toFixed(dp))}%`;
}

/** "12 · Basic life support" chip label. */
export function standardChipLabel(row: { code: string; title: string }): string {
  return `${row.code} · ${row.title}`;
}
