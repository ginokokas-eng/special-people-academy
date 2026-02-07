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
      {/* Background glow - Deep Teal #124145 */}
      <motion.div
        className="absolute left-0 right-0 h-32"
        style={{ 
          background: "linear-gradient(to bottom, rgba(18, 65, 69, 0.35), rgba(18, 65, 69, 0.15), transparent)",
          filter: "blur(8px)"
        }}
        initial={{ top: "-8rem" }}
        animate={{ top: "100%" }}
        transition={{ duration, ease: "easeInOut" }}
      />

      {/* Core beam - Green accent #C4D14F */}
      <motion.div
        className="absolute left-0 right-0 h-0.5"
        style={{
          background: "linear-gradient(to right, transparent, #C4D14F, transparent)",
          boxShadow: "0 0 12px 2px rgba(196, 209, 79, 0.6)"
        }}
        initial={{ top: "-0.25rem" }}
        animate={{ top: "100%" }}
        transition={{ duration, ease: "easeInOut" }}
      />

      {/* Secondary beam line - Peach #FF988C */}
      <motion.div
        className="absolute left-0 right-0 h-px opacity-60"
        style={{
          background: "linear-gradient(to right, transparent 10%, #FF988C 50%, transparent 90%)",
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
            backgroundColor: p.isGreen ? "#C4D14F" : "#FF988C",
            boxShadow: p.isGreen 
              ? "0 0 4px rgba(196, 209, 79, 0.8)" 
              : "0 0 4px rgba(255, 152, 140, 0.8)"
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
