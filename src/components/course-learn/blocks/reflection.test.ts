import { describe, expect, it } from 'vitest';
import {
  checklistMode,
  countWords,
  defaultContributesToCompletion,
  isInteractive,
  persistsResponse,
  validateReflection,
  type ChecklistPayload,
  type ReflectionPayload,
} from './types';

const reflection = (over: Partial<ReflectionPayload> = {}): ReflectionPayload => ({
  prompt: 'What did you notice?',
  min_words: 30,
  criteria: [],
  ...over,
});

describe('countWords', () => {
  it('counts words and tolerates empty or messy spacing', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('one  two\nthree ')).toBe(3);
  });
});

describe('validateReflection', () => {
  it('accepts a complete reflection', () => {
    expect(validateReflection(reflection())).toEqual([]);
  });

  it('requires a prompt', () => {
    expect(validateReflection(reflection({ prompt: '  ' })).length).toBe(1);
  });

  it('rejects an unreasonable minimum word count', () => {
    expect(validateReflection(reflection({ min_words: -1 })).length).toBe(1);
    expect(validateReflection(reflection({ min_words: 900 })).length).toBe(1);
  });

  it('rejects blank criteria lines', () => {
    expect(validateReflection(reflection({ criteria: ['good', ' '] })).length).toBe(1);
  });
});

describe('checklist modes', () => {
  const steps: ChecklistPayload['steps'] = [{ id: 'a', step_title: 'Wash hands' }];

  it('defaults to reference so existing checklists are unchanged', () => {
    expect(checklistMode({ steps } as ChecklistPayload)).toBe('reference');
    expect(isInteractive('checklist', { steps } as ChecklistPayload)).toBe(false);
    expect(persistsResponse('checklist', { steps } as ChecklistPayload)).toBe(false);
  });

  it('treats an assessed checklist as an activity that records something', () => {
    const payload = { steps, mode: 'assessed' } as ChecklistPayload;
    expect(checklistMode(payload)).toBe('assessed');
    expect(isInteractive('checklist', payload)).toBe(true);
    expect(persistsResponse('checklist', payload)).toBe(true);
  });
});

describe('reflection block registration', () => {
  it('always records an answer and counts towards completion by default', () => {
    expect(isInteractive('reflection')).toBe(true);
    expect(persistsResponse('reflection')).toBe(true);
    expect(defaultContributesToCompletion('reflection')).toBe(true);
  });
});
