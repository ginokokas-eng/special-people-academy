import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { motionReduced, setDocumentMotion } from './useReducedMotion';

/**
 * The suite runs in node, so window/document are stubbed here. The helper only
 * touches `documentElement.dataset.motion` and `matchMedia`, which is exactly
 * what these tests drive.
 */
const html = {
  dataset: {} as Record<string, string | undefined>,
  setAttribute(_name: string, value: string) {
    this.dataset.motion = value;
  },
  removeAttribute() {
    delete this.dataset.motion;
  },
  hasAttribute() {
    return this.dataset.motion !== undefined;
  },
};

function stub(mediaMatches: boolean) {
  (globalThis as Record<string, unknown>).document = { documentElement: html };
  (globalThis as Record<string, unknown>).window = {
    matchMedia: vi.fn().mockReturnValue({ matches: mediaMatches }),
    dispatchEvent: vi.fn(),
  };
  (globalThis as Record<string, unknown>).Event = class {
    constructor(public type: string) {}
  };
}

describe('motionReduced', () => {
  beforeEach(() => {
    html.dataset = {};
    stub(false);
  });
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).document;
    delete (globalThis as Record<string, unknown>).window;
  });

  it('is false with no attribute and no media match', () => {
    expect(motionReduced()).toBe(false);
  });

  it('is true when the document attribute is set', () => {
    setDocumentMotion(true);
    expect(html.dataset.motion).toBe('reduce');
    expect(motionReduced()).toBe(true);
  });

  it('is false again once the attribute is cleared', () => {
    setDocumentMotion(true);
    setDocumentMotion(false);
    expect(html.dataset.motion).toBeUndefined();
    expect(motionReduced()).toBe(false);
  });

  it('is true when the operating system asks for reduced motion', () => {
    stub(true);
    expect(motionReduced()).toBe(true);
  });
});
