"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseScannerOverlayOptions {
  duration?: number;
  runOnce?: boolean;
}

export function useScannerOverlay({ duration = 1.4, runOnce = true }: UseScannerOverlayOptions = {}) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Detect mobile (no hover)
  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Mobile: run once on viewport enter
  useEffect(() => {
    if (!isMobile || reduceMotion || hasScanned) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasScanned) {
            setIsScanning(true);
            setHasScanned(true);
            timeoutRef.current = setTimeout(() => {
              setIsScanning(false);
            }, duration * 1000);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isMobile, reduceMotion, hasScanned, duration]);

  const startScan = useCallback(() => {
    if (reduceMotion || isMobile) return;
    if (runOnce && hasScanned) return;
    
    setIsScanning(true);
    setHasScanned(true);
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsScanning(false);
    }, duration * 1000);
  }, [reduceMotion, isMobile, runOnce, hasScanned, duration]);

  const stopScan = useCallback(() => {
    // Let animation finish naturally
  }, []);

  const resetScan = useCallback(() => {
    setHasScanned(false);
    setIsScanning(false);
  }, []);

  return {
    elementRef,
    isScanning,
    reduceMotion,
    isMobile,
    startScan,
    stopScan,
    resetScan,
    duration,
  };
}
