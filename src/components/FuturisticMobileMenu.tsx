import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight, ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface FuturisticMenuItem {
  label: string;
  href: string;
  onClick?: () => void;
  primary?: boolean;
  external?: boolean;
  /**
   * Sub-links. When present the row becomes a collapsible group instead of a
   * link, so the phone menu can carry the same dropdown contents as the
   * desktop nav rather than a shortened hardcoded list.
   */
  children?: FuturisticMenuItem[];
}

interface FuturisticMobileMenuProps {
  open: boolean;
  onClose: () => void;
  items: FuturisticMenuItem[];
  tagline?: string;
  footerText?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Site palette (same tokens as the desktop navbar). */
const INK = "hsl(259_72%_14%)";
const VIOLET = "hsl(262_83%_58%)";

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
  const [openGroup, setOpenGroup] = useState<string | null>(null);

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
            className="absolute inset-0 w-full h-full bg-[hsl(259_72%_14%/0.25)] backdrop-blur-sm cursor-default focus:outline-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          />

          {/* Panel — circular reveal from top-right (under hamburger) */}
          <motion.div
            className="absolute inset-0 flex flex-col overflow-hidden bg-white text-[hsl(259_72%_14%)]"
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
            {/* Soft violet wash — matches the marketing pages, no dark grid */}
            <div
              aria-hidden
              className="absolute -top-1/3 -right-1/4 h-[70vh] w-[80vw] rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${VIOLET.replace(/_/g, " ")} 0%, transparent 62%)`,
                opacity: 0.1,
                filter: "blur(70px)",
              }}
            />

            {/* Top bar inside the menu */}
            <div className="relative h-[64px] shrink-0 flex items-center px-6">
              <motion.span
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.5, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                className="font-heading text-[13px] font-bold tracking-[0.18em] uppercase text-[hsl(262_83%_58%)]"
              >
                Menu
              </motion.span>
            </div>

            <div aria-hidden className="h-px w-full bg-[#EEEAF8]" />

            {/* Content */}
            <div className="relative flex-1 flex flex-col px-6 pt-8 pb-8 overflow-y-auto">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.4, duration: 0.6, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="text-[14px] leading-relaxed text-[hsl(259_20%_38%)] max-w-[20rem] mb-8"
              >
                {tagline}
              </motion.p>

              <ul className="flex-1 -mx-1">
                {items.map((item, idx) => {
                  const isPrimary = item.primary;
                  return (
                    <motion.li
                      key={item.label}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                          delay: 0.42 + idx * 0.06,
                          duration: 0.55,
                          ease: EASE,
                        },
                      }}
                      exit={{
                        opacity: 0,
                        y: -6,
                        transition: { duration: 0.15, ease: "easeIn" },
                      }}
                      className="border-b border-[#EEEAF8] last:border-b-0"
                    >
                      {item.children ? (
                        <div>
                          <button
                            type="button"
                            aria-expanded={openGroup === item.label}
                            onClick={() =>
                              setOpenGroup((cur) => (cur === item.label ? null : item.label))
                            }
                            className="group relative flex w-full items-center justify-between gap-4 py-4 px-1 text-left transition-all duration-300 ease-out active:scale-[0.985] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_83%_58%)]"
                          >
                            <span className="font-heading font-bold leading-tight text-[24px] text-[hsl(259_72%_14%)] truncate min-w-0">
                              {item.label}
                            </span>
                            <ChevronDown
                              aria-hidden
                              className={cn(
                                "h-5 w-5 shrink-0 text-[hsl(259_20%_45%)] transition-transform duration-300",
                                openGroup === item.label && "rotate-180 text-[hsl(262_83%_58%)]"
                              )}
                            />
                          </button>
                          <AnimatePresence initial={false}>
                            {openGroup === item.label && (
                              <motion.ul
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: EASE }}
                                className="overflow-hidden pb-3 pl-3"
                              >
                                {item.children.map((child) => (
                                  <li key={child.label}>
                                    <a
                                      href={child.href}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleItemClick(child);
                                      }}
                                      className="flex items-center justify-between gap-3 rounded-lg py-3.5 px-2 text-[16px] text-[hsl(259_20%_38%)] transition-colors hover:bg-[hsl(262_83%_58%/0.06)] hover:text-[hsl(259_72%_14%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_83%_58%)]"
                                    >
                                      {child.label}
                                      <ArrowUpRight
                                        aria-hidden
                                        className="h-4 w-4 text-[hsl(262_83%_58%)]"
                                      />
                                    </a>
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <a
                          ref={idx === 0 ? firstLinkRef : undefined}
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault();
                            handleItemClick(item);
                          }}
                          className={cn(
                            "group relative flex items-center justify-between gap-4 py-4 px-1 rounded-lg",
                            "transition-all duration-300 ease-out active:scale-[0.985]",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(262_83%_58%)]"
                          )}
                        >
                          <span
                            className={cn(
                              "font-heading font-bold leading-tight text-[24px] truncate min-w-0 transition-colors duration-300",
                              isPrimary
                                ? "text-[hsl(262_83%_58%)]"
                                : "text-[hsl(259_72%_14%)]"
                            )}
                          >
                            {item.label}
                          </span>

                          {isPrimary ? (
                            <span
                              aria-hidden
                              className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(262_83%_58%)] text-white transition-transform duration-300 group-hover:scale-105"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </span>
                          ) : (
                            <ArrowUpRight
                              aria-hidden
                              className="h-5 w-5 shrink-0 text-[hsl(259_20%_45%)] transition-all duration-300 group-hover:text-[hsl(262_83%_58%)]"
                            />
                          )}
                        </a>
                      )}
                    </motion.li>
                  );
                })}
              </ul>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.42 + items.length * 0.06 + 0.1, duration: 0.5, ease: EASE },
                }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="mt-12 pt-5 border-t border-[#EEEAF8]"
              >
                <p className="text-[12px] text-[hsl(259_20%_45%)] leading-relaxed">{footerText}</p>
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
