"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { cn } from "@/lib/utils";

interface ShredRevealCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  className?: string;
  triggerOnHover?: boolean;
  duration?: number;
}

export function ShredRevealCard({
  frontContent,
  backContent,
  className,
  triggerOnHover = true,
  duration = 1.2,
}: ShredRevealCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const progress = useMotionValue(0);
  const frontClip = useTransform(progress, [0, 1], ["0%", "100%"]);
  const backReveal = useTransform(progress, [0, 1], ["0%", "100%"]);

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const triggerReveal = useCallback(() => {
    if (isRevealed || reduceMotion) {
      // If reduced motion or already revealed, just toggle instantly
      if (reduceMotion) {
        progress.set(isRevealed ? 0 : 1);
        setIsRevealed(!isRevealed);
        return;
      }
      return;
    }

    setShowFlash(true);
    setTimeout(() => setShowFlash(false), 600);

    animate(progress, 1, {
      duration,
      ease: [0.4, 0, 0.2, 1],
      onComplete: () => setIsRevealed(true),
    });
  }, [isRevealed, reduceMotion, progress, duration]);

  const resetReveal = useCallback(() => {
    if (!isRevealed) return;

    animate(progress, 0, {
      duration: duration * 0.6,
      ease: [0.4, 0, 0.2, 1],
      onComplete: () => setIsRevealed(false),
    });
  }, [isRevealed, progress, duration]);

  const handleMouseEnter = () => {
    if (triggerOnHover) triggerReveal();
  };

  const handleMouseLeave = () => {
    if (triggerOnHover) resetReveal();
  };

  const handleClick = () => {
    if (!triggerOnHover) {
      if (isRevealed) {
        resetReveal();
      } else {
        triggerReveal();
      }
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl cursor-pointer",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Back layer (knowledge base info) */}
      <motion.div
        className="absolute inset-0 shred-back z-10"
        style={{ "--back-reveal": backReveal } as React.CSSProperties}
      >
        {backContent}
      </motion.div>

      {/* Front layer (training card) */}
      <motion.div
        className="relative shred-front z-20"
        style={{ "--front-clip": frontClip } as React.CSSProperties}
      >
        {frontContent}
      </motion.div>

      {/* Shred lines overlay */}
      <div className="absolute inset-0 shred-lines pointer-events-none z-25" />

      {/* Scan flash effect */}
      {showFlash && <div className="scan-flash" />}
    </div>
  );
}

// Pre-styled card variants for training reveals
interface TrainingShredCardProps {
  title: string;
  category: string;
  duration: string;
  thumbnailUrl?: string;
  knowledgePoints: string[];
  certificationInfo?: string;
  className?: string;
}

export function TrainingShredCard({
  title,
  category,
  duration,
  thumbnailUrl,
  knowledgePoints,
  certificationInfo,
  className,
}: TrainingShredCardProps) {
  const frontContent = (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
      {/* Thumbnail */}
      <div
        className="aspect-video bg-muted bg-cover bg-center"
        style={{
          backgroundImage: thumbnailUrl
            ? `url(${thumbnailUrl})`
            : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.7) 100%)",
        }}
      />
      {/* Card body */}
      <div className="p-5">
        <span className="text-xs font-medium text-primary">{category}</span>
        <h3 className="font-semibold text-foreground mt-1 line-clamp-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-2">{duration}</p>
      </div>
    </div>
  );

  const backContent = (
    <div
      className="h-full rounded-xl p-5 flex flex-col justify-between"
      style={{ backgroundColor: "#124145" }}
    >
      <div>
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "#C4D14F" }}
        >
          Knowledge Base
        </span>
        <h3 className="font-semibold text-white mt-2 line-clamp-2">{title}</h3>
        <ul className="mt-4 space-y-2">
          {knowledgePoints.map((point, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-sm"
              style={{ color: "#F6E5D4" }}
            >
              <span style={{ color: "#C4D14F" }}>•</span>
              {point}
            </li>
          ))}
        </ul>
      </div>
      {certificationInfo && (
        <div
          className="mt-4 pt-3 border-t text-xs"
          style={{ borderColor: "rgba(246, 229, 212, 0.2)", color: "#FF988C" }}
        >
          {certificationInfo}
        </div>
      )}
    </div>
  );

  return (
    <ShredRevealCard
      frontContent={frontContent}
      backContent={backContent}
      className={cn("min-h-[280px]", className)}
    />
  );
}