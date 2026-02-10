"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ScannerOverlayProps {
  isScanning: boolean;
  duration?: number;
  className?: string;
}

export function ScannerOverlay({ isScanning, duration = 1.4, className }: ScannerOverlayProps) {
  // Deterministic particles
  const particles = Array.from({ length: 16 }).map((_, i) => {
    const top = (i / 16) * 100;
    const drift = (i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 4);
    const delay = i * 0.04;
    const isGreen = i % 3 === 0;
    return { i, top, drift, delay, isGreen };
  });

  if (!isScanning) return null;

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-20 overflow-hidden", className)}>
      {/* Background glow */}
      <motion.div
        className="absolute left-0 right-0 h-32"
        style={{ 
          background: "linear-gradient(to bottom, hsl(var(--scanner-dark) / 0.35), hsl(var(--scanner-dark) / 0.15), transparent)",
          filter: "blur(8px)"
        }}
        initial={{ top: "-8rem" }}
        animate={{ top: "100%" }}
        transition={{ duration, ease: "easeInOut" }}
      />

      {/* Core beam */}
      <motion.div
        className="absolute left-0 right-0 h-0.5"
        style={{
          background: "linear-gradient(to right, transparent, hsl(var(--scanner-beam)), transparent)",
          boxShadow: "0 0 12px 2px hsl(var(--scanner-beam) / 0.6)"
        }}
        initial={{ top: "-0.25rem" }}
        animate={{ top: "100%" }}
        transition={{ duration, ease: "easeInOut" }}
      />

      {/* Secondary beam line */}
      <motion.div
        className="absolute left-0 right-0 h-px opacity-60"
        style={{
          background: "linear-gradient(to right, transparent 10%, hsl(var(--scanner-peach)) 50%, transparent 90%)",
        }}
        initial={{ top: "-0.5rem" }}
        animate={{ top: "100%" }}
        transition={{ duration, ease: "easeInOut", delay: 0.05 }}
      />

      {/* Particle dust */}
      {particles.map((p) => (
        <motion.span
          key={p.i}
          className="absolute h-1 w-1 rounded-full"
          style={{ 
            left: `${50 + p.drift}%`, 
            backgroundColor: p.isGreen ? "hsl(var(--scanner-beam))" : "hsl(var(--scanner-peach))",
            boxShadow: p.isGreen 
              ? "0 0 4px hsl(var(--scanner-beam) / 0.8)" 
              : "0 0 4px hsl(var(--scanner-peach) / 0.8)"
          }}
          initial={{ top: `${p.top}%`, opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
          transition={{
            duration: duration * 0.4,
            delay: p.delay + duration * (p.top / 100),
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
