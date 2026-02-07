"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type KnowledgeBaseInfo = {
  title: string;
  summary: string;
  bullets: string[];
};

export type TrainingShredItem = {
  id: string;
  title: string;
  slug?: string;
  category: string;
  delivery: string;
  duration?: string;
  practicalSignOff?: boolean;
  kb: KnowledgeBaseInfo;
};


type Props = {
  items: TrainingShredItem[];
  className?: string;
  speed?: number; // px/sec
  initialDirection?: 1 | -1;
  onActiveChange?: (item: TrainingShredItem) => void;
  showControls?: boolean;
};

export function TrainingKnowledgeShredStream({
  items,
  className,
  speed = 120,
  initialDirection = -1,
  onActiveChange,
  showControls = false,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lineRef = React.useRef<HTMLDivElement>(null);

  const rafRef = React.useRef<number | null>(null);
  const lastTimeRef = React.useRef<number>(0);
  const positionRef = React.useRef<number>(0);
  const directionRef = React.useRef<1 | -1>(initialDirection);

  const [isPlaying, setIsPlaying] = React.useState(true);
  const [directionUi, setDirectionUi] = React.useState<1 | -1>(initialDirection);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  const lastActiveIdRef = React.useRef<string | null>(null);

  // Duplicate items so the stream feels continuous
  const streamItems = React.useMemo(() => [...items, ...items, ...items], [items]);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const updateClipping = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const scannerX = containerRect.left + containerRect.width / 2;
    const scannerWidth = 10;
    const scannerLeft = scannerX - scannerWidth / 2;
    const scannerRight = scannerX + scannerWidth / 2;

    const wrappers = container.querySelectorAll<HTMLElement>("[data-training-id]");
    wrappers.forEach((wrapper) => {
      const rect = wrapper.getBoundingClientRect();
      const cardLeft = rect.left;
      const cardRight = rect.right;
      const cardWidth = rect.width;

      const front = wrapper.querySelector<HTMLElement>("[data-layer='front']");
      const back = wrapper.querySelector<HTMLElement>("[data-layer='back']");
      if (!front || !back) return;

      // Intersecting with the scanner beam?
      if (cardLeft < scannerRight && cardRight > scannerLeft) {
        const scannerIntersectLeft = Math.max(scannerLeft - cardLeft, 0);
        const scannerIntersectRight = Math.min(scannerRight - cardLeft, cardWidth);

        const frontClip = (scannerIntersectLeft / cardWidth) * 100;
        const backReveal = (scannerIntersectRight / cardWidth) * 100;

        front.style.setProperty("--front-clip", `${frontClip}%`);
        back.style.setProperty("--back-reveal", `${backReveal}%`);

        // Trigger once per pass to update the knowledge panel and flash effect
        if (!wrapper.dataset.scanned && scannerIntersectLeft > 0) {
          wrapper.dataset.scanned = "true";

          const id = wrapper.dataset.trainingId!;
          if (lastActiveIdRef.current !== id) {
            lastActiveIdRef.current = id;
            const found = items.find((x) => x.id === id);
            if (found) onActiveChange?.(found);
          }

          const flash = document.createElement("div");
          flash.className = "scan-flash";
          wrapper.appendChild(flash);
          setTimeout(() => flash.remove(), 650);
        }
      } else {
        // Outside the scanner beam: set final state based on which side of scanner it is on
        if (cardRight < scannerLeft) {
          // Already fully scanned
          front.style.setProperty("--front-clip", "100%");
          back.style.setProperty("--back-reveal", "100%");
        } else if (cardLeft > scannerRight) {
          // Not scanned yet
          front.style.setProperty("--front-clip", "0%");
          back.style.setProperty("--back-reveal", "0%");
        }
        delete wrapper.dataset.scanned;
      }
    });
  }, [items, onActiveChange]);

  const animate = React.useCallback(
    (t: number) => {
      const container = containerRef.current;
      const line = lineRef.current;
      if (!container || !line) return;

      if (!lastTimeRef.current) lastTimeRef.current = t;
      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;

      if (isPlaying && !reduceMotion) {
        positionRef.current += speed * directionRef.current * dt;

        const containerWidth = container.offsetWidth;
        const lineWidth = line.scrollWidth;

        // wrap loop
        if (positionRef.current < -lineWidth) positionRef.current = containerWidth;
        if (positionRef.current > containerWidth) positionRef.current = -lineWidth;

        line.style.transform = `translateX(${positionRef.current}px)`;
        updateClipping();
      }

      rafRef.current = requestAnimationFrame(animate);
    },
    [isPlaying, reduceMotion, speed, updateClipping]
  );

  React.useEffect(() => {
    if (!reduceMotion) {
      rafRef.current = requestAnimationFrame(animate);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [animate, reduceMotion]);

  const togglePlay = () => setIsPlaying((p) => !p);

  const changeDirection = () => {
    directionRef.current = (directionRef.current * -1) as 1 | -1;
    setDirectionUi(directionRef.current);
  };

  const reset = () => {
    const container = containerRef.current;
    if (!container) return;
    positionRef.current = container.offsetWidth;
    lastTimeRef.current = 0;
  };

  return (
    <div className={cn("relative", className)}>
      {showControls && !reduceMotion && (
        <div className="flex gap-2 mb-4 justify-center">
          <button
            onClick={togglePlay}
            className="px-3 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            onClick={reset}
            className="px-3 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            🔄 Reset
          </button>
          <button
            onClick={changeDirection}
            className="px-3 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            ↔ Direction ({directionUi === -1 ? "←" : "→"})
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative w-full h-[320px] overflow-hidden rounded-xl bg-secondary/50"
      >
        {/* Scanner beam - using theme colors */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[10px] -translate-x-1/2 z-40 pointer-events-none">
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{
              boxShadow: "0 0 30px 8px hsl(var(--primary) / 0.5)",
            }}
          />
          <div
            className="absolute inset-0 opacity-60"
            style={{
              background:
                "repeating-linear-gradient(0deg, transparent 0px, transparent 4px, hsl(var(--muted-foreground) / 0.15) 4px, hsl(var(--muted-foreground) / 0.15) 6px)",
            }}
          />
        </div>

        {/* Card stream */}
        <div className="absolute inset-0 flex items-center">
          <div ref={lineRef} className="flex gap-6 pl-4" style={{ willChange: "transform" }}>
            {streamItems.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                data-training-id={item.id}
                className="relative w-[280px] h-[260px] flex-shrink-0 rounded-xl overflow-hidden shadow-card"
              >
                {/* BACK LAYER (Knowledge base) */}
                <div
                  data-layer="back"
                  className="absolute inset-0 shred-back z-10"
                  style={{ "--back-reveal": "0%" } as React.CSSProperties}
                >
                  <div className="h-full p-5 flex flex-col bg-primary text-primary-foreground">
                    <div className="shred-lines absolute inset-0 pointer-events-none" />
                    <div className="relative z-10 flex flex-col h-full">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                        Key guidance
                      </span>
                      <h4 className="font-semibold mt-1 text-sm line-clamp-2">
                        {item.kb.title}
                      </h4>
                      <p className="text-xs mt-2 line-clamp-2 opacity-80">
                        {item.kb.summary}
                      </p>
                      <ul className="mt-3 space-y-1 flex-1">
                        {item.kb.bullets.slice(0, 3).map((b, i) => (
                          <li
                            key={i}
                            className="text-xs flex items-start gap-1.5 opacity-90"
                          >
                            <span className="text-accent">•</span>
                            <span className="line-clamp-1">{b}</span>
                          </li>
                        ))}
                      </ul>

                    </div>
                  </div>
                </div>

                {/* FRONT LAYER (Training card) */}
                <div
                  data-layer="front"
                  className="absolute inset-0 shred-front z-20"
                  style={{ "--front-clip": "0%" } as React.CSSProperties}
                >
                  <div className="h-full bg-card border border-border flex flex-col">
                    <div className="flex-1 p-5 flex flex-col justify-between bg-gradient-to-br from-primary/5 to-transparent">
                      <div>
                        <span className="text-[10px] font-medium text-primary uppercase tracking-wide">
                          {item.category}
                        </span>
                        <h3 className="font-semibold text-foreground mt-1 line-clamp-3 text-base">
                          {item.title}
                        </h3>
                      </div>

                      {item.practicalSignOff && (
                        <div className="flex items-center gap-1.5 mt-3">
                          <span className="w-2 h-2 rounded-full bg-accent" />
                          <span className="text-[10px] text-muted-foreground">
                            Practical sign-off
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-secondary/50">
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.delivery}
                      </span>
                      {item.duration && (
                        <span className="text-xs text-muted-foreground">
                          {item.duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {reduceMotion && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
            <p className="text-sm text-muted-foreground text-center px-6">
              Animation reduced (prefers-reduced-motion). Browse trainings below and tap
              to view guidance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}