"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type ScannerCardProps = {
  className?: string;
  children: React.ReactNode;
  duration?: number;
};

export function ScannerCard({ className, children, duration = 2.6 }: ScannerCardProps) {
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const particles = Array.from({ length: 22 }).map((_, i) => {
    const top = (i / 22) * 100;
    const drift = (i % 2 === 0 ? 1 : -1) * (10 + (i % 6) * 3);
    const delay = i * 0.08;
    return { i, top, drift, delay };
  });

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* Scanner overlay */}
      {!reduceMotion ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          {/* Glow */}
          <motion.div
            className="absolute left-0 right-0 h-24 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent blur-md"
            initial={{ top: "-6rem" }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Core beam */}
          <motion.div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
            initial={{ top: "-0.25rem" }}
            animate={{ top: ["0%", "100%", "0%"] }}
            transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Particle dust */}
          {particles.map((p) => (
            <motion.span
              key={p.i}
              className="absolute h-1 w-1 rounded-full bg-primary/60"
              style={{ left: `${50 + p.drift}%`, top: `${p.top}%` }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
              transition={{
                duration: duration / 2,
                repeat: Infinity,
                delay: p.delay,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-primary/5 via-transparent to-primary/5" />
      )}
    </div>
  );
}
