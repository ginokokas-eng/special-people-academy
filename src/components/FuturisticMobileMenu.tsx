import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FuturisticMenuItem {
  label: string;
  href: string;
  onClick?: () => void;
  primary?: boolean;
  external?: boolean;
}

interface FuturisticMobileMenuProps {
  open: boolean;
  onClose: () => void;
  items: FuturisticMenuItem[];
  tagline?: string;
  footerText?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export const FuturisticMobileMenu = ({
  open,
  onClose,
  items,
  tagline = "The training academy.",
  footerText = "The training academy.",
}: FuturisticMobileMenuProps) => {
  const navigate = useNavigate();
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock scroll on open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // ESC + initial focus
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => firstLinkRef.current?.focus(), 500);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const handleItemClick = (item: FuturisticMenuItem) => {
    onClose();
    if (item.onClick) {
      window.setTimeout(item.onClick, 80);
      return;
    }
    if (item.external) {
      window.location.href = item.href;
      return;
    }
    window.setTimeout(() => navigate(item.href), 80);
  };

  if (!mounted) return null;

  const menu = (
    <AnimatePresence>
      {open && (
        <div
          key="menu-root"
          className="fixed inset-0 z-[100] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          {/* Click-outside scrim */}
          <motion.button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            tabIndex={-1}
            className="absolute inset-0 w-full h-full bg-black/40 backdrop-blur-sm cursor-default focus:outline-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          />

          {/* Panel — circular reveal from top-right (under hamburger) */}
          <motion.div
            className="absolute inset-0 flex flex-col overflow-hidden text-white bg-[#08080F]"
            initial={{ clipPath: "circle(0% at calc(100% - 36px) 36px)" }}
            animate={{
              clipPath: "circle(160% at calc(100% - 36px) 36px)",
              transition: { duration: 0.7, ease: [0.85, 0, 0.15, 1] as const },
            }}
            exit={{
              clipPath: "circle(0% at calc(100% - 36px) 36px)",
              transition: { duration: 0.5, ease: [0.85, 0, 0.15, 1] as const },
            }}
          >
            {/* Ambient glows */}
            <div
              aria-hidden
              className="absolute -top-1/3 -right-1/4 h-[80vh] w-[80vw] rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, hsl(262 80% 55% / 0.35) 0%, transparent 60%)",
                filter: "blur(60px)",
              }}
            />
            <div
              aria-hidden
              className="absolute -bottom-1/3 -left-1/4 h-[70vh] w-[80vw] rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, hsl(189 90% 50% / 0.18) 0%, transparent 60%)",
                filter: "blur(70px)",
              }}
            />

            {/* Subtle grid */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.08] pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                maskImage:
                  "radial-gradient(70% 50% at 50% 30%, black 30%, transparent 90%)",
                WebkitMaskImage:
                  "radial-gradient(70% 50% at 50% 30%, black 30%, transparent 90%)",
              }}
            />

            {/* Top header bar inside menu (replaces the original sticky header visually) */}
            <div className="relative h-[64px] shrink-0 flex items-center px-6">
              <motion.span
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.5, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/50"
              >
                Navigation
              </motion.span>
            </div>

            {/* Hairline divider */}
            <motion.div
              aria-hidden
              className="h-px w-full origin-right"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(262 83% 70% / 0.5), hsl(189 94% 60% / 0.4), transparent)",
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1, transition: { delay: 0.4, duration: 0.6, ease: EASE } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            />

            {/* Content */}
            <div className="relative flex-1 flex flex-col px-6 pt-10 pb-8 overflow-y-auto">
              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.6, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="text-[14px] leading-relaxed text-white/60 max-w-[20rem] font-light mb-10"
              >
                {tagline}
              </motion.p>

              {/* Menu items — large futuristic links */}
              <ul className="flex-1 -mx-1">
                {items.map((item, idx) => {
                  const isPrimary = item.primary;
                  return (
                    <motion.li
                      key={item.label}
                      initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: {
                          delay: 0.5 + idx * 0.07,
                          duration: 0.65,
                          ease: EASE,
                        },
                      }}
                      exit={{
                        opacity: 0,
                        y: -6,
                        transition: { duration: 0.15, ease: "easeIn" },
                      }}
                      className="border-b border-white/[0.07] last:border-b-0"
                    >
                      <a
                        ref={idx === 0 ? firstLinkRef : undefined}
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleItemClick(item);
                        }}
                        className={cn(
                          "group relative flex items-center justify-between gap-4 py-5 px-1",
                          "transition-all duration-300 ease-out active:scale-[0.985]",
                          "focus-visible:outline-none focus-visible:bg-white/[0.04] focus-visible:rounded-lg"
                        )}
                      >
                        <span className="flex items-baseline gap-3 min-w-0">
                          <span className="font-mono text-[10px] tracking-[0.2em] text-white/30 group-hover:text-[hsl(189_94%_70%)] transition-colors duration-300">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={cn(
                              "font-heading font-semibold leading-none transition-all duration-300 truncate",
                              isPrimary
                                ? "text-[28px] bg-gradient-to-r from-white via-[hsl(189_94%_85%)] to-[hsl(262_83%_85%)] bg-clip-text text-transparent"
                                : "text-[28px] text-white/90 group-hover:text-white group-hover:translate-x-1"
                            )}
                          >
                            {item.label}
                          </span>
                        </span>

                        {isPrimary ? (
                          <span
                            aria-hidden
                            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(262_83%_62%)] to-[hsl(262_83%_45%)] text-white shadow-[0_0_24px_-4px_hsl(262_83%_60%/0.85)] transition-transform duration-300 group-hover:scale-110"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        ) : (
                          <ArrowUpRight
                            aria-hidden
                            className="h-5 w-5 shrink-0 text-white/30 transition-all duration-300 group-hover:text-[hsl(189_94%_75%)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        )}
                      </a>
                    </motion.li>
                  );
                })}
              </ul>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.5 + items.length * 0.07 + 0.1, duration: 0.55, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="mt-12 pt-5 border-t border-white/[0.07] flex items-center justify-between gap-4"
              >
                <p className="text-[12px] text-white/45 leading-relaxed">
                  {footerText}
                </p>
                <span className="font-mono text-[9px] tracking-[0.25em] text-white/35 whitespace-nowrap">
                  v · 2026
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(menu, document.body);
};

/* ---------- Animated hamburger / X icon ---------- */
interface MorphingMenuIconProps {
  open: boolean;
  className?: string;
}

export const MorphingMenuIcon = ({ open, className }: MorphingMenuIconProps) => {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <motion.line
        x1="3"
        x2="21"
        animate={
          open
            ? { y1: 12, y2: 12, rotate: 45, transformOrigin: "12px 12px" }
            : { y1: 6, y2: 6, rotate: 0, transformOrigin: "12px 12px" }
        }
        transition={{ duration: 0.45, ease: EASE }}
      />
      <motion.line
        x1="3"
        x2="21"
        y1={12}
        y2={12}
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        style={{ transformOrigin: "12px 12px" }}
        transition={{ duration: 0.25 }}
      />
      <motion.line
        x1="3"
        x2="21"
        animate={
          open
            ? { y1: 12, y2: 12, rotate: -45, transformOrigin: "12px 12px" }
            : { y1: 18, y2: 18, rotate: 0, transformOrigin: "12px 12px" }
        }
        transition={{ duration: 0.45, ease: EASE }}
      />
    </motion.svg>
  );
};
