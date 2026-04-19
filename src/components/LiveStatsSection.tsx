import { useEffect, useRef, useState } from "react";

interface LiveStatsSectionProps {
  value?: number;
  label?: string;
  subtitle?: string;
  sectors?: string[];
  durationMs?: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const LiveStatsSection = ({
  value = 47291,
  label = "Live · Last 30 days",
  subtitle = "certifications issued to care workers across the UK this month alone.",
  sectors = ["Care Homes", "NHS Trusts", "Supported Living", "Domiciliary"],
  durationMs = 2100,
}: LiveStatsSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  // Trigger when in view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Count-up animation
  useEffect(() => {
    if (!visible || startedRef.current) return;
    startedRef.current = true;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, durationMs]);

  return (
    <section className="relative bg-white">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        <div
          ref={ref}
          className={`group relative rounded-[32px] overflow-hidden bg-gradient-to-br from-[#1A1448] via-[#16123E] to-[#0F0B30] p-8 sm:p-12 lg:p-16 transition-all duration-700 ease-out will-change-transform shadow-[0_30px_80px_-30px_rgba(15,11,48,0.55)] hover:shadow-[0_40px_100px_-30px_rgba(15,11,48,0.7)] hover:-translate-y-0.5 ${
            visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-[0.98]"
          }`}
        >
          {/* Ambient corner glows */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[hsl(262_83%_58%/0.25)] blur-[120px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 w-[380px] h-[380px] rounded-full bg-[hsl(217_91%_60%/0.18)] blur-[120px]"
          />

          {/* Inner highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/5"
          />

          {/* Subtle moving shimmer */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -inset-x-1/2 opacity-[0.07] mix-blend-screen animate-[shimmer_7s_linear_infinite]"
            style={{
              background:
                "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%)",
            }}
          />

          <div className="relative z-10 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: label + number + subtitle */}
            <div className="lg:col-span-8">
              <div className="flex items-center gap-2.5 mb-6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152_70%_55%)] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(152_70%_55%)] shadow-[0_0_12px_rgba(74,222,128,0.7)]" />
                </span>
                <span className="text-[12px] font-semibold tracking-[0.14em] uppercase text-white/75">
                  {label}
                </span>
              </div>

              <div className="font-heading text-[64px] sm:text-[96px] lg:text-[128px] font-bold text-white leading-[0.95] tracking-tight tabular-nums">
                {display.toLocaleString("en-GB")}
              </div>

              <p className="mt-6 text-[16px] sm:text-[18px] leading-relaxed text-white/75 max-w-2xl">
                {subtitle}
              </p>
            </div>

            {/* Right: sector pills */}
            <div className="lg:col-span-4">
              <div className="flex flex-wrap gap-2.5 lg:justify-end">
                {sectors.map((tag, i) => (
                  <span
                    key={tag}
                    className={`px-3.5 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur text-[11px] font-semibold tracking-[0.08em] uppercase text-white/90 transition-all duration-500 ease-out ${
                      visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                    }`}
                    style={{ transitionDelay: `${600 + i * 120}ms` }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-30%); }
          100% { transform: translateX(30%); }
        }
      `}</style>
    </section>
  );
};
