import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, Sparkles, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FuturisticMenuItem {
  label: string;
  href: string;
  onClick?: () => void;
  primary?: boolean;
  external?: boolean;
  meta?: string;
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
    transition: { staggerChildren: 0.07, delayChildren: 0.32 },
  },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
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

  // ESC + focus
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => firstLinkRef.current?.focus(), 450);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const handleItemClick = (item: FuturisticMenuItem) => {
    onClose();
    if (item.onClick) {
      window.setTimeout(item.onClick, 60);
      return;
    }
    if (item.external) {
      window.location.href = item.href;
      return;
    }
    window.setTimeout(() => navigate(item.href), 60);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="command-center"
          className="fixed inset-0 z-[80] lg:hidden"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          role="dialog"
          aria-modal="true"
          aria-label="Marketing Intelligence Command Center navigation"
        >
          {/* Click-outside backdrop */}
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
              transition: { duration: 0.85, ease: [0.85, 0, 0.15, 1] as const },
            }}
            exit={{
              clipPath: "circle(0% at calc(100% - 40px) 40px)",
              transition: { duration: 0.55, ease: [0.85, 0, 0.15, 1] as const },
            }}
          >
            {/* ============ BACKDROP LAYERS ============ */}
            {/* Base radial */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(130% 90% at 80% -10%, hsl(265 70% 24%) 0%, hsl(258 60% 11%) 45%, hsl(252 55% 5%) 100%)",
              }}
            />

            {/* Slow rotating conic gradient */}
            <motion.div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-70"
              style={{
                background:
                  "conic-gradient(from 220deg at 50% 50%, hsl(262 83% 58% / 0.0), hsl(262 83% 58% / 0.2), hsl(189 94% 50% / 0.18), hsl(280 90% 60% / 0.12), hsl(262 83% 58% / 0.0))",
                filter: "blur(40px)",
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 32, ease: "linear", repeat: Infinity }}
            />

            {/* Circuit-like grid */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 opacity-[0.22]"
              style={{
                backgroundImage:
                  "linear-gradient(hsl(189 94% 60% / 0.10) 1px, transparent 1px), linear-gradient(90deg, hsl(262 83% 70% / 0.10) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
                maskImage:
                  "radial-gradient(85% 65% at 50% 38%, black 40%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(85% 65% at 50% 38%, black 40%, transparent 100%)",
              }}
            />

            {/* Diagonal scanner sweep */}
            <motion.div
              aria-hidden
              className="absolute inset-0 -z-10 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.4 } }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute -inset-[20%] origin-top"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 38%, hsl(189 94% 70% / 0.18) 50%, transparent 62%)",
                }}
                animate={{ y: ["-60%", "60%"] }}
                transition={{
                  duration: 6,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />
            </motion.div>

            {/* Light trails */}
            <LightTrails />

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
                  "radial-gradient(circle, hsl(189 94% 50% / 0.32) 0%, transparent 65%)",
                filter: "blur(28px)",
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />

            {/* Top accent + corner brackets */}
            <motion.div
              aria-hidden
              className="absolute top-[64px] left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(262 83% 70% / 0.65), hsl(189 94% 60% / 0.55), transparent)",
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1, transition: { delay: 0.35, duration: 0.7 } }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            />
            <CornerBrackets />

            {/* Header spacer (clear native sticky header) */}
            <div className="h-[64px] shrink-0" />

            {/* ============ CONTENT ============ */}
            <div className="relative flex-1 flex flex-col px-6 pt-6 pb-7 overflow-y-auto">
              {/* HUD Status Strip */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={0.2}
                className="flex items-center justify-between gap-3 mb-5"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(189_94%_60%)] opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(189_94%_60%)]" />
                  </span>
                  <span className="text-[10px] font-mono tracking-[0.22em] uppercase text-white/85">
                    SYS · ONLINE
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-[0.18em] uppercase text-white/55">
                  <Radio className="h-3 w-3 text-[hsl(189_94%_70%)]" />
                  Command Center
                </div>
              </motion.div>

              {/* Identity card */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={0.28}
                className="mb-7 relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5"
              >
                <span
                  aria-hidden
                  className="absolute inset-px rounded-[15px] pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(262 83% 70% / 0.12), transparent 40%, hsl(189 94% 60% / 0.10))",
                  }}
                />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-[hsl(189_94%_75%)]" />
                    <span className="text-[10px] font-medium tracking-[0.22em] uppercase text-white/70">
                      Marketing Intelligence
                    </span>
                  </div>
                  <p className="text-[15px] leading-snug text-white/85 font-light">
                    {tagline}
                  </p>
                </div>
              </motion.div>

              {/* Section label */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={0.32}
                className="flex items-center gap-3 mb-2"
              >
                <span className="text-[10px] font-mono tracking-[0.28em] uppercase text-white/40">
                  // NAVIGATION
                </span>
                <span
                  aria-hidden
                  className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent"
                />
              </motion.div>

              {/* Menu items */}
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex-1 space-y-2"
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
                          "group relative flex items-center gap-4 rounded-2xl px-4 py-4 overflow-hidden",
                          "border border-white/[0.08] bg-white/[0.025] backdrop-blur-sm",
                          "transition-all duration-300 ease-out active:scale-[0.985]",
                          "hover:border-white/20 hover:bg-white/[0.06]",
                          "focus-visible:outline-none focus-visible:border-[hsl(189_94%_60%)] focus-visible:ring-2 focus-visible:ring-[hsl(189_94%_60%/0.4)]",
                          isPrimary &&
                            "border-[hsl(262_83%_60%/0.5)] bg-gradient-to-r from-[hsl(262_83%_30%/0.4)] via-[hsl(262_83%_25%/0.3)] to-[hsl(262_83%_20%/0.4)] shadow-[0_0_30px_-8px_hsl(262_83%_55%/0.7)]"
                        )}
                      >
                        {/* Hover sweep */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"
                          style={{
                            background:
                              "linear-gradient(90deg, transparent, hsl(189 94% 70% / 0.12), transparent)",
                          }}
                        />

                        {/* Index */}
                        <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 group-hover:text-[hsl(189_94%_70%)] transition-colors duration-300 w-6 shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>

                        {/* Label */}
                        <span className="flex-1 min-w-0">
                          <span
                            className={cn(
                              "block font-heading font-semibold leading-tight transition-all duration-300",
                              isPrimary
                                ? "text-[22px] bg-gradient-to-r from-white via-[hsl(189_94%_88%)] to-[hsl(262_83%_88%)] bg-clip-text text-transparent"
                                : "text-[20px] text-white group-hover:text-[hsl(189_94%_85%)] group-hover:translate-x-0.5"
                            )}
                          >
                            {item.label}
                          </span>
                          {/* Animated scan underline */}
                          <span
                            aria-hidden
                            className="mt-1.5 block h-px w-full origin-left scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 transition-transform duration-500 ease-out"
                            style={{
                              background:
                                "linear-gradient(90deg, hsl(262 83% 70%), hsl(189 94% 60%), transparent)",
                            }}
                          />
                        </span>

                        {/* Action affordance */}
                        {isPrimary ? (
                          <span
                            aria-hidden
                            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(262_83%_62%)] to-[hsl(262_83%_45%)] text-white shadow-[0_0_22px_-4px_hsl(262_83%_60%/0.85)] transition-transform duration-300 group-hover:scale-110"
                          >
                            <span
                              className="absolute inset-0 rounded-full"
                              style={{
                                boxShadow:
                                  "0 0 0 1px hsl(0 0% 100% / 0.22) inset, 0 0 28px hsl(262 83% 65% / 0.5)",
                              }}
                            />
                            <ArrowUpRight className="h-4 w-4 relative" />
                          </span>
                        ) : (
                          <ArrowUpRight
                            aria-hidden
                            className="h-4 w-4 shrink-0 text-white/35 transition-all duration-300 group-hover:text-[hsl(189_94%_75%)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          />
                        )}

                        {/* Left accent bar on hover */}
                        <span
                          aria-hidden
                          className="absolute left-0 top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-[hsl(189_94%_60%)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        />
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
                custom={0.7}
                className="mt-8 pt-5 border-t border-white/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[11px] text-white/55 leading-relaxed max-w-[18rem]">
                    {footerText}
                  </p>
                  <span className="font-mono text-[9px] tracking-[0.25em] text-white/40 whitespace-nowrap">
                    v · 2026
                  </span>
                </div>
                <div
                  aria-hidden
                  className="mt-4 h-px w-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, hsl(262 83% 70% / 0.5), hsl(189 94% 60% / 0.4), transparent)",
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

/* ---------- Light trails ---------- */
const LightTrails = () => (
  <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
    {[
      { top: "18%", delay: 0, duration: 7, hue: 189 },
      { top: "42%", delay: 2, duration: 9, hue: 262 },
      { top: "68%", delay: 1.2, duration: 8, hue: 280 },
      { top: "85%", delay: 3.5, duration: 10, hue: 189 },
    ].map((t, i) => (
      <motion.div
        key={i}
        className="absolute h-px w-1/2"
        style={{
          top: t.top,
          background: `linear-gradient(90deg, transparent, hsl(${t.hue} 94% 70% / 0.7), transparent)`,
          boxShadow: `0 0 12px hsl(${t.hue} 94% 65% / 0.5)`,
        }}
        initial={{ x: "-60%" }}
        animate={{ x: ["-60%", "180%"] }}
        transition={{
          duration: t.duration,
          delay: t.delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

/* ---------- Particles ---------- */
const PARTICLES = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: Math.random() * 2.5 + 1,
  delay: Math.random() * 4,
  duration: Math.random() * 6 + 6,
  hue: Math.random() > 0.5 ? 189 : 262,
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
          boxShadow: `0 0 8px hsl(${p.hue} 94% 70% / 0.85)`,
        }}
        animate={{
          y: [0, -34, 0],
          opacity: [0.15, 0.95, 0.15],
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

/* ---------- Corner HUD brackets ---------- */
const CornerBrackets = () => {
  const common = "absolute h-5 w-5 border-[hsl(189_94%_60%/0.55)]";
  return (
    <>
      <motion.span
        aria-hidden
        className={cn(common, "top-[76px] left-4 border-l-2 border-t-2 rounded-tl-md")}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 0.55, duration: 0.4 } }}
        exit={{ opacity: 0 }}
      />
      <motion.span
        aria-hidden
        className={cn(common, "top-[76px] right-4 border-r-2 border-t-2 rounded-tr-md")}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 0.6, duration: 0.4 } }}
        exit={{ opacity: 0 }}
      />
      <motion.span
        aria-hidden
        className={cn(common, "bottom-4 left-4 border-l-2 border-b-2 rounded-bl-md")}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 0.65, duration: 0.4 } }}
        exit={{ opacity: 0 }}
      />
      <motion.span
        aria-hidden
        className={cn(common, "bottom-4 right-4 border-r-2 border-b-2 rounded-br-md")}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1, transition: { delay: 0.7, duration: 0.4 } }}
        exit={{ opacity: 0 }}
      />
    </>
  );
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
