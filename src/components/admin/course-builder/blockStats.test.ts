import { describe, expect, it } from 'vitest';
import { formatAvgAttempts, optionSharePct, optionTallies, topDistractor } from './blockStats';

describe('optionSharePct', () => {
  it('rounds the share to a whole percentage', () => {
    expect(optionSharePct(1, 3)).toBe(33);
    expect(optionSharePct(2, 3)).toBe(67);
    expect(optionSharePct(3, 3)).toBe(100);
  });

  it('is 0 when there is nothing to divide', () => {
    expect(optionSharePct(0, 0)).toBe(0);
    expect(optionSharePct(2, 0)).toBe(0);
    expect(optionSharePct(0, 5)).toBe(0);
  });
});

describe('optionTallies / topDistractor', () => {
  const options = [
    { id: 'a', label: 'Right answer' },
    { id: 'b', label: 'Common mistake' },
    { id: 'c', label: 'Rare mistake' },
  ];

  it('orders options by pick count and marks the correct one', () => {
    const t = optionTallies(options, { a: 2, b: 7, c: 1 }, 'a');
    expect(t.map((o) => o.id)).toEqual(['b', 'a', 'c']);
    expect(t.find((o) => o.id === 'a')?.correct).toBe(true);
  });

  it('picks the most-chosen wrong option', () => {
    const t = optionTallies(options, { a: 9, b: 7, c: 1 }, 'a');
    expect(topDistractor(t)?.id).toBe('b');
  });

  it('returns null when only the correct option was picked', () => {
    const t = optionTallies(options, { a: 4 }, 'a');
    expect(topDistractor(t)).toBeNull();
  });
});

describe('formatAvgAttempts', () => {
  it('shows one decimal place', () => {
    expect(formatAvgAttempts(1)).toBe('1.0');
    expect(formatAvgAttempts(1.25)).toBe('1.3');
    expect(formatAvgAttempts(2.04)).toBe('2.0');
  });

  it('shows a dash when there is no data', () => {
    expect(formatAvgAttempts(0)).toBe('—');
    expect(formatAvgAttempts(null)).toBe('—');
  });
});
