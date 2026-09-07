import { describe, expect, it } from 'vitest';
import { cloneDefaultTitle, remapVisibility } from './courseClone';

describe('cloneDefaultTitle', () => {
  it('prefixes an ordinary title with "Copy of"', () => {
    expect(cloneDefaultTitle('Enteral Feeding')).toBe('Copy of Enteral Feeding');
  });

  it('keeps the "E2E " prefix in front so the cleanup guard still matches', () => {
    expect(cloneDefaultTitle('E2E Course 123')).toBe('E2E Copy of E2E Course 123');
    expect(cloneDefaultTitle('E2E Copy of E2E Course 123')).toMatch(/^E2E /);
  });

  it('trims and falls back when there is no title', () => {
    expect(cloneDefaultTitle('  Basic Life Support  ')).toBe('Copy of Basic Life Support');
    expect(cloneDefaultTitle('')).toBe('Copy of untitled course');
  });

  it('does not treat a mid-string E2E as the prefix', () => {
    expect(cloneDefaultTitle('Our E2E Course')).toBe('Copy of Our E2E Course');
  });
});

describe('remapVisibility', () => {
  const map = { 'old-1': 'new-1', 'old-2': 'new-2' };

  it('re-points a rule at the copied block', () => {
    const out = remapVisibility(
      { text: 'hi', visibility: { block_id: 'old-2', when: 'answered' } },
      map,
    );
    expect(out.visibility).toEqual({ block_id: 'new-2', when: 'answered' });
    expect(out.text).toBe('hi');
  });

  it('drops a rule whose block was not copied', () => {
    const out = remapVisibility({ text: 'hi', visibility: { block_id: 'gone' } }, map);
    expect(out.visibility).toBeUndefined();
    expect(out.text).toBe('hi');
  });

  it('leaves payloads without a rule untouched', () => {
    const payload = { text: 'hi' };
    expect(remapVisibility(payload, map)).toEqual(payload);
    expect(remapVisibility({ text: 'hi', visibility: {} }, map)).toEqual({
      text: 'hi',
      visibility: {},
    });
  });

  it('does not mutate the input', () => {
    const payload = { visibility: { block_id: 'old-1' } };
    remapVisibility(payload, map);
    expect(payload.visibility.block_id).toBe('old-1');
  });
});
