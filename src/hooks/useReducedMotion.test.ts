import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { motionReduced, setDocumentMotion } from './useReducedMotion';

function mockMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

describe('motionReduced', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-motion');
    mockMedia(false);
  });
  afterEach(() => {
    document.documentElement.removeAttribute('data-motion');
  });

  it('is false with no attribute and no media match', () => {
    expect(motionReduced()).toBe(false);
  });

  it('is true when the document attribute is set', () => {
    setDocumentMotion(true);
    expect(document.documentElement.dataset.motion).toBe('reduce');
    expect(motionReduced()).toBe(true);
  });

  it('is false again once the attribute is cleared', () => {
    setDocumentMotion(true);
    setDocumentMotion(false);
    expect(document.documentElement.hasAttribute('data-motion')).toBe(false);
    expect(motionReduced()).toBe(false);
  });

  it('is true when the operating system asks for reduced motion', () => {
    mockMedia(true);
    expect(motionReduced()).toBe(true);
  });
});
