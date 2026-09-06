import { describe, expect, it } from 'vitest';
import {
  compareCodes,
  correctPct,
  formatPct,
  frameworkLabel,
  groupByFramework,
  lessonsLabel,
  nestOutcomes,
  sortStandards,
  standardChipLabel,
  xOfY,
  type StandardRow,
} from './standards';

const row = (over: Partial<StandardRow>): StandardRow => ({
  id: over.code ?? 'x',
  framework: 'care_certificate',
  code: '1',
  title: 'Understand your role',
  parent_code: null,
  sort: 1,
  ...over,
});

describe('percent formatters', () => {
  it('returns null when nothing was attempted', () => {
    expect(correctPct(0, 0)).toBeNull();
    expect(correctPct(3, 0)).toBeNull();
  });

  it('rounds a real percentage', () => {
    expect(correctPct(1, 3)).toBe(33);
    expect(correctPct(2, 3)).toBe(67);
    expect(correctPct(4, 4)).toBe(100);
  });

  it('renders unknown percentages as an em dash', () => {
    expect(formatPct(null)).toBe('—');
    expect(formatPct(undefined)).toBe('—');
    expect(formatPct(0)).toBe('0%');
    expect(formatPct(66.7, 1)).toBe('66.7%');
    expect(formatPct(66.7)).toBe('67%');
  });
});

describe('x/y labels', () => {
  it('never exceeds the total', () => {
    expect(xOfY(7, 5)).toBe('5/5');
    expect(xOfY(0, 0)).toBe('0/0');
    expect(xOfY(2, 5)).toBe('2/5');
  });

  it('pluralises lessons', () => {
    expect(lessonsLabel(1, 1)).toBe('1/1 lesson');
    expect(lessonsLabel(0, 3)).toBe('0/3 lessons');
  });
});

describe('framework grouping and sorting', () => {
  it('labels frameworks in plain English', () => {
    expect(frameworkLabel('care_certificate')).toBe('Care Certificate');
    expect(frameworkLabel('cqc')).toBe('CQC key questions');
    expect(frameworkLabel('other')).toBe('other');
  });

  it('puts Care Certificate before CQC regardless of input order', () => {
    const groups = groupByFramework([
      row({ framework: 'cqc', code: 'safe', title: 'Safe', sort: 1 }),
      row({ code: '2', title: 'Your personal development', sort: 2 }),
    ]);
    expect(groups.map((g) => g.framework)).toEqual(['care_certificate', 'cqc']);
  });

  it('sorts codes numerically, not alphabetically', () => {
    expect(compareCodes('2', '10')).toBeLessThan(0);
    expect(compareCodes('10', '10.3')).toBeLessThan(0);
    expect(compareCodes('10.3', '10.10')).toBeLessThan(0);
    const sorted = sortStandards([
      { code: '10', sort: 0 },
      { code: '2', sort: 0 },
      { code: '10.3', sort: 0 },
    ]);
    expect(sorted.map((s) => s.code)).toEqual(['2', '10', '10.3']);
  });

  it('nests staff-authored outcomes under their parent', () => {
    const nested = nestOutcomes([
      row({ code: '10', title: 'Safeguarding adults', sort: 10 }),
      row({ code: '10.3', title: 'Local reporting route', parent_code: '10', sort: 10 }),
      row({ code: '3', title: 'Duty of care', sort: 3 }),
    ]);
    expect(nested.map((n) => n.parent.code)).toEqual(['3', '10']);
    expect(nested[1].children.map((c) => c.code)).toEqual(['10.3']);
    expect(nested[0].children).toEqual([]);
  });

  it('builds a chip label from code and title', () => {
    expect(standardChipLabel({ code: '12', title: 'Basic life support' })).toBe(
      '12 · Basic life support',
    );
  });
});
