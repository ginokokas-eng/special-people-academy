import { useEffect, useState } from 'react';

/**
 * True once the page has scrolled past `threshold` — used to collapse a native
 * large-title header into an inline chrome bar (the pattern CourseLearn already
 * uses for its inline header).
 */
export function useCollapsingHeader(threshold = 28): boolean {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setCollapsed((prev) => {
        // Small hysteresis so a header sitting exactly on the threshold cannot flicker.
        if (prev) return y > threshold * 0.5;
        return y > threshold;
      });
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return collapsed;
}
