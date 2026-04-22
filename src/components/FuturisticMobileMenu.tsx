import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
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

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, transition: { duration: 0.25, ease: "easeIn" as const } },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.18 },
  },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: "blur(6px)",
    transition: { duration: 0.2, ease: "easeIn" as const },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
  exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
};

export const FuturisticMobileMenu = ({
  open,
  onClose,
  items,
  tagline = "Lead the shift from marketing department to marketing culture.",
  footerText = "MBA-level marketing training for modern teams.",
}: FuturisticMobileMenuProps) => {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // ESC + focus trap entry
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => firstLinkRef.current?.focus(), 350);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const handleItemClick = (item: FuturisticMenuItem) => {
    onClose();
    if (item.onClick) {
      // Allow exit animation a tick before navigating via callback
      window.setTimeout(item.onClick, 50);
      return;
    }
    if (item.external) {
      window.location.href = item.href;
      return;
    }
    window.setTimeout(() => navigate(item.href), 50);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="futuristic-menu"
          className="fixed inset-0 z-[80] lg:hidden"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          {/* Click-outside backdrop (panel covers full screen, but tapping outside content also closes) */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="absolute inset-0 w-full h-full cursor-default focus:outline-none"
            tabIndex={-1}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className="absolute inset-0 flex flex-col overflow-hidden text-white"
            initial={{ clipPath: "circle(0% at calc(100% - 40px) 40px)" }}
            animate={{
              clipPath: "circle(150% at calc(100% - 40px) 40px)",
              transition: { duration: 0.7, ease: [0.85, 0, 0.15, 1] as const },
            }}
            exit={{
              clipPath: "circle(0% at calc(100% - 40px) 40px)",
              transition: { duration: 0.5, ease: [0.85, 0, 0.15, 1] as const },
            }}
          >
            {/* Layered background */}
            <div
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(120% 80% at 80% 0%, hsl(265 70% 22%) 0%, hsl(258 60% 12%) 45%, hsl(255 50% 6%) 100%)",
              }}
            />
            {/* Animated gradient wave */}
            <motion.div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-70"
              style={{
                background:
                  "conic-gradient(from 220deg at 50% 50%, hsl(262 83% 58% / 0.0), hsl(262 83% 58% / 0.18), hsl(189 94% 50% / 0.12), hsl(262 83% 58% / 0.0))",
                filter: "blur(40px)",
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 28, ease: "linear", repeat: Infinity }}
            />
            {/* Grid pattern */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-[0.18]"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(0 0% 100% / 0.08) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.08) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
                maskImage:
                  "radial-gradient(80% 60% at 50% 35%, black 40%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(80% 60% at 50% 35%, black 40%, transparent 100%)",
              }}
            />
            {/* Floating particles */}
            <Particles />
            {/* Glow orbs */}
            <motion.div
              aria-hidden
              className="absolute -top-24 -right-24 h-72 w-72 rounded-full -z-10"
              style={{
                background:
                  "radial-gradient(circle, hsl(262 83% 58% / 0.45) 0%, transparent 65%)",
                filter: "blur(20px)",
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full -z-10"
              style={{
                background:
                  "radial-gradient(circle, hsl(189 94% 50% / 0.30) 0%, transparent 65%)",
                filter: "blur(28px)",
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />

            {/* Top accent line */}
            <motion.div
              aria-hidden
              className="absolute top-[64px] left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(262 83% 70% / 0.6), hsl(189 94% 60% / 0.5), transparent)",
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1, transition: { delay: 0.3, duration: 0.7 } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            />

            {/* Spacer to clear the existing header (64px mobile) */}
            <div className="h-[64px] shrink-0" />

            {/* Content */}
            <div className="relative flex-1 flex flex-col px-6 pt-8 pb-8 overflow-y-auto">
              {/* Tagline */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={0.25}
                className="mb-8"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-[hsl(189_94%_70%)]" />
                  <span className="text-[11px] font-medium tracking-[0.18em] uppercase text-white/80">
                    Training Academy
                  </span>
                </div>
                <p className="mt-4 text-[15px] leading-snug text-white/75 max-w-[20rem]">
                  {tagline}
                </p>
              </motion.div>

              {/* Menu items */}
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex-1 space-y-1"
              >
                {items.map((item, idx) => {
                  const isPrimary = item.primary;
                  return (
                    <motion.li key={item.label} variants={itemVariants}>
                      <a
                        ref={idx === 0 ? firstLinkRef : undefined}
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleItemClick(item);
                        }}
                        className={cn(
                          "group relative flex items-center justify-between gap-4 py-4 px-1 rounded-xl",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(189_94%_60%)] focus-visible:ring-offset-0",
                          "transition-transform duration-300 ease-out active:scale-[0.98]"
                        )}
                      >
                        {/* Index */}
                        <span className="absolute left-0 -top-1 text-[10px] font-mono tracking-widest text-white/30">
                          {String(idx + 1).padStart(2, "0")}
                        </span>

                        <span className="flex-1 pl-6">
                          <span
                            className={cn(
                              "block font-heading font-semibold leading-tight transition-all duration-300",
                              isPrimary
                                ? "text-[28px] bg-gradient-to-r from-white via-[hsl(189_94%_85%)] to-[hsl(262_83%_85%)] bg-clip-text text-transparent"
                                : "text-[26px] text-white group-hover:text-[hsl(189_94%_75%)] group-hover:translate-x-1"
                            )}
                          >
                            {item.label}
                          </span>
                          {/* Animated underline / scan line */}
                          <span
                            aria-hidden
                            className="mt-2 block h-px w-full origin-left bg-gradient-to-r from-[hsl(262_83%_70%)] via-[hsl(189_94%_60%)] to-transparent scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-500 ease-out"
                          />
                        </span>

                        {isPrimary ? (
                          <span
                            aria-hidden
                            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(262_83%_60%)] to-[hsl(262_83%_45%)] text-white shadow-[0_0_24px_-4px_hsl(262_83%_60%/0.8)] transition-transform duration-300 group-hover:scale-110"
                          >
                            <span
                              className="absolute inset-0 rounded-full"
                              style={{
                                boxShadow:
                                  "0 0 0 1px hsl(0 0% 100% / 0.2) inset, 0 0 30px hsl(262 83% 65% / 0.5)",
                              }}
                            />
                            <ArrowUpRight className="h-5 w-5 relative" />
                          </span>
                        ) : (
                          <ArrowUpRight
                            aria-hidden
                            className="h-5 w-5 text-white/40 transition-all duration-300 group-hover:text-[hsl(189_94%_75%)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        )}
                      </a>
                    </motion.li>
                  );
                })}
              </motion.ul>

              {/* Footer */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={0.6}
                className="mt-10 pt-6 border-t border-white/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[12px] text-white/50 leading-relaxed max-w-[18rem]">
                    {footerText}
                  </p>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-white/40">
                    v · 2026
                  </span>
                </div>
                {/* Decorative bottom line */}
                <div
                  aria-hidden
                  className="mt-5 h-px w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, hsl(262 83% 70% / 0.5), transparent)",
                  }}
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ---------- Floating particles ---------- */
const PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: Math.random() * 2.5 + 1,
  delay: Math.random() * 4,
  duration: Math.random() * 6 + 6,
}));

const Particles = () => (
  <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
    {PARTICLES.map((p) => (
      <motion.span
        key={p.id}
        className="absolute rounded-full bg-white"
        style={{
          left: `${p.left}%`,
          top: `${p.top}%`,
          width: p.size,
          height: p.size,
          boxShadow: "0 0 8px hsl(189 94% 70% / 0.8)",
        }}
        animate={{
          y: [0, -30, 0],
          opacity: [0.2, 0.9, 0.2],
        }}
        transition={{
          duration: p.duration,
          delay: p.delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

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
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.line
        x1="3"
        x2="21"
        animate={
          open
            ? { y1: 12, y2: 12, rotate: 45, transformOrigin: "12px 12px" }
            : { y1: 6, y2: 6, rotate: 0, transformOrigin: "12px 12px" }
        }
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.svg>
  );
};
