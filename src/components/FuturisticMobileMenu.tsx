import { useEffect, useRef } from "react";
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

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, transition: { duration: 0.25, ease: "easeIn" as const } },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.25 },
  },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.18, ease: "easeIn" as const },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const FuturisticMobileMenu = ({
  open,
  onClose,
  items,
  tagline = "Lead the shift from marketing department to marketing culture.",
  footerText = "MBA-level marketing training for modern teams.",
}: FuturisticMobileMenuProps) => {
  const navigate = useNavigate();
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

  // ESC + initial focus
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => firstLinkRef.current?.focus(), 400);
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
          key="minimal-menu"
          className="fixed inset-0 z-[80] lg:hidden"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
        >
          {/* Click-outside */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="absolute inset-0 w-full h-full cursor-default focus:outline-none"
            tabIndex={-1}
          />

          {/* Panel */}
          <motion.div
            className="absolute inset-0 flex flex-col overflow-hidden text-white bg-[#0A0A0F]"
            initial={{ y: "-2%", opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
            }}
            exit={{
              y: "-2%",
              opacity: 0,
              transition: { duration: 0.3, ease: "easeIn" as const },
            }}
          >
            {/* Single ambient glow — slow, subtle */}
            <motion.div
              aria-hidden
              className="absolute -top-1/4 left-1/2 -translate-x-1/2 h-[110vh] w-[110vw] rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, hsl(262 70% 35% / 0.35) 0%, hsl(262 70% 25% / 0.15) 30%, transparent 60%)",
                filter: "blur(40px)",
              }}
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Header spacer (clear native sticky header) */}
            <div className="h-[64px] shrink-0" />

            {/* Hairline under header */}
            <div
              aria-hidden
              className="h-px w-full bg-white/[0.06]"
            />

            {/* Content */}
            <div className="relative flex-1 flex flex-col px-7 pt-12 pb-8 overflow-y-auto">
              {/* Tagline */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={0.15}
                className="mb-12"
              >
                <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-white/40 mb-4">
                  Menu
                </p>
                <p className="text-[15px] leading-relaxed text-white/65 max-w-[19rem] font-light">
                  {tagline}
                </p>
              </motion.div>

              {/* Menu items — large, clean, minimal */}
              <motion.ul
                variants={listVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="flex-1 -mx-1"
              >
                {items.map((item, idx) => {
                  const isPrimary = item.primary;
                  return (
                    <motion.li
                      key={item.label}
                      variants={itemVariants}
                      className="border-b border-white/[0.06] last:border-b-0"
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
                          "transition-colors duration-300 ease-out",
                          "focus-visible:outline-none focus-visible:bg-white/[0.03] focus-visible:rounded-lg"
                        )}
                      >
                        <span
                          className={cn(
                            "font-heading font-medium leading-none transition-colors duration-300",
                            isPrimary
                              ? "text-[26px] text-white"
                              : "text-[26px] text-white/85 group-hover:text-white"
                          )}
                        >
                          {item.label}
                        </span>

                        <ArrowUpRight
                          aria-hidden
                          className={cn(
                            "h-5 w-5 shrink-0 transition-all duration-300",
                            isPrimary
                              ? "text-[hsl(262_83%_70%)]"
                              : "text-white/25 group-hover:text-white/70 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          )}
                        />

                        {/* Primary glow underline */}
                        {isPrimary && (
                          <span
                            aria-hidden
                            className="absolute left-1 right-1 bottom-0 h-px"
                            style={{
                              background:
                                "linear-gradient(90deg, hsl(262 83% 65% / 0.6), hsl(262 83% 65% / 0)",
                            }}
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
                custom={0.55}
                className="mt-12 pt-6 border-t border-white/[0.06]"
              >
                <p className="text-[12px] text-white/40 leading-relaxed">
                  {footerText}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
