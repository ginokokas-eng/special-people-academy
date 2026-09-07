import { useEffect, useState } from 'react';

/**
 * True when motion should be stilled: either the operating system asks for
 * reduced motion, or the document is explicitly marked `data-motion="reduce"`
 * (used by the staff preview frame so an author can see the reduced-motion
 * experience without changing their own OS setting).
 *
 * The attribute is watched through a custom `academy:motion` event, dispatched
 * by whoever changes it, plus a MutationObserver as a safety net.
 */
export const MOTION_EVENT = 'academy:motion';

const QUERY = '(prefers-reduced-motion: reduce)';

export function motionReduced(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (document.documentElement?.dataset?.motion === 'reduce') return true;
  return window.matchMedia?.(QUERY)?.matches === true;
}

/** Sets or clears the document-level reduced-motion attribute and notifies. */
export function setDocumentMotion(reduce: boolean) {
  if (typeof document === 'undefined') return;
  if (reduce) document.documentElement.setAttribute('data-motion', 'reduce');
  else document.documentElement.removeAttribute('data-motion');
  window.dispatchEvent(new Event(MOTION_EVENT));
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(motionReduced);

  useEffect(() => {
    const update = () => setReduced(motionReduced());
    update();

    const media = window.matchMedia?.(QUERY);
    media?.addEventListener?.('change', update);
    window.addEventListener(MOTION_EVENT, update);

    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(update);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-motion'],
      });
    }

    return () => {
      media?.removeEventListener?.('change', update);
      window.removeEventListener(MOTION_EVENT, update);
      observer?.disconnect();
    };
  }, []);

  return reduced;
}
