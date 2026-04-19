import { ArrowRight, Play, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const HomeShowcaseSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative bg-white">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8 pt-4 pb-20 lg:pb-28">
        {/* Top CTA row */}
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <Button
            onClick={() => navigate("/auth")}
            className="rounded-full bg-[hsl(259_72%_14%)] hover:bg-[hsl(259_72%_10%)] text-white h-11 px-5 text-[14px] font-semibold shadow-[0_10px_30px_-12px_rgba(20,10,60,0.4)]"
          >
            Start 14-day trial
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/courses")}
            className="rounded-full h-11 px-5 text-[14px] font-semibold border-[#E8E4F7] bg-white hover:bg-[hsl(262_50%_97%)] text-[hsl(259_72%_14%)]"
          >
            <Play className="h-4 w-4 mr-1.5" />
            Watch 2-min tour
          </Button>
          <p className="text-[13px] text-[hsl(259_20%_45%)] max-w-[260px] leading-snug">
            No card required. Multi-seat discounts for rotas of 25+.
          </p>
        </div>

        {/* Two-card editorial row */}
        <div className="grid md:grid-cols-2 gap-5 lg:gap-6 mb-16">
          {/* Lead nurse portrait card */}
          <article className="relative rounded-[28px] bg-gradient-to-br from-[#F5C6BC] via-[#F1B8AE] to-[#EBA89E] aspect-[4/5] md:aspect-auto md:min-h-[460px] overflow-hidden p-6 flex flex-col justify-between">
            {/* Diagonal stripe pattern */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.18] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 9px)",
              }}
            />
            {/* Inner dashed frame */}
            <div className="absolute inset-4 rounded-[22px] border border-dashed border-white/55 pointer-events-none" />

            {/* Top-right pill */}
            <div className="relative z-10 flex justify-end">
              <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold tracking-[0.12em] uppercase text-[hsl(259_72%_14%)]">
                Meet the team
              </span>
            </div>

            {/* Center placeholder text */}
            <div className="relative z-10 flex-1 flex items-center justify-center">
              <div className="text-center font-mono text-[11px] tracking-wider text-[hsl(259_72%_14%)]/55 uppercase leading-relaxed">
                [ Lead Nurse Portrait
                <br />
                warm, natural light
                <br />
                800×1066 ]
              </div>
            </div>

            {/* Bottom name block */}
            <div className="relative z-10">
              <h3 className="font-heading text-[22px] lg:text-[24px] font-bold text-[hsl(259_72%_14%)] leading-tight">
                Amara Okafor, RN
              </h3>
              <p className="text-[13px] text-[hsl(259_72%_14%)]/70 mt-0.5">
                Clinical Lead · Sheffield
              </p>
            </div>
          </article>

          {/* Currently Playing module card */}
          <article className="relative rounded-[28px] bg-white border border-[#EEEAF8] shadow-[0_18px_40px_-22px_rgba(76,29,149,0.18)] p-7 lg:p-9 flex flex-col">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(262_83%_58%)] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(262_83%_58%)]" />
              </span>
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[hsl(262_83%_45%)]">
                Currently playing · Module 4 of 7
              </span>
            </div>

            <h3 className="font-heading text-[28px] lg:text-[34px] leading-[1.1] font-bold text-[hsl(259_72%_14%)] tracking-tight mb-4">
              Safeguarding Adults at Risk — Level 3
            </h3>
            <p className="text-[15px] leading-relaxed text-[hsl(259_20%_35%)] max-w-md">
              Scenario-based learning with real-world decision points, built to the 2024
              statutory framework.
            </p>

            <div className="flex-1" />

            {/* Divider */}
            <div className="border-t border-dashed border-[#E8E4F7] my-6" />

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: "Duration", value: "3h 40m" },
                { label: "CPD Points", value: "12" },
                { label: "Format", value: "Video + Quiz" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[hsl(259_20%_50%)] mb-1">
                    {s.label}
                  </div>
                  <div className="font-heading text-[17px] font-bold text-[hsl(259_72%_14%)] leading-tight">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="h-[5px] rounded-full bg-[hsl(259_30%_94%)] overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0E7490] via-[#0D9488] to-[#10B981]"
                style={{ width: "68%" }}
              />
            </div>
            <div className="flex justify-between text-[12px] text-[hsl(259_20%_45%)]">
              <span>4 of 7 modules</span>
              <span className="font-semibold text-[hsl(259_72%_14%)]">68% complete</span>
            </div>
          </article>
        </div>

        {/* Live stats dark band */}
        <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-[#1A1448] via-[#16123E] to-[#0F0B30] p-8 lg:p-12 min-h-[340px] flex flex-col">
          {/* Ambient glows */}
          <div aria-hidden className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[hsl(262_83%_58%/0.18)] blur-[120px] pointer-events-none" />
          <div aria-hidden className="absolute -bottom-32 -left-20 w-[380px] h-[380px] rounded-full bg-[hsl(217_91%_60%/0.12)] blur-[120px] pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-12 gap-10 flex-1">
            {/* Left: live counter */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center gap-2 mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152_60%_50%)] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(152_60%_50%)]" />
                </span>
                <span className="text-[11px] font-semibold text-white/80">
                  Live · Last 30 days
                </span>
              </div>

              <div className="font-heading text-[64px] lg:text-[88px] font-bold text-white leading-none tracking-tight tabular-nums">
                47,291
              </div>

              <p className="text-[15px] leading-relaxed text-white/70 mt-5 max-w-sm">
                certifications issued to care workers across the UK this month alone.
              </p>

              <div className="flex-1" />

              <div className="flex flex-wrap gap-2 mt-8">
                {["Care Homes", "NHS Trusts", "Supported Living", "Domiciliary"].map((tag) => (
                  <span
                    key={tag}
                    className="px-3.5 py-1.5 rounded-full border border-white/20 bg-white/5 text-[11px] font-semibold tracking-wide uppercase text-white/85"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: live ticker / activity */}
            <div className="lg:col-span-7 lg:pl-8 lg:border-l lg:border-white/10">
              <div className="flex items-center justify-between mb-5">
                <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/60">
                  Live activity
                </div>
                <div className="text-[11px] font-medium text-white/40">Auto-refreshing</div>
              </div>

              <div className="space-y-3">
                {[
                  { name: "Sarah O.", course: "Medication Administration", time: "2 min ago", color: "hsl(38_92%_55%)" },
                  { name: "James T.", course: "Safeguarding Adults · L3", time: "4 min ago", color: "hsl(262_83%_65%)" },
                  { name: "Priya K.", course: "Basic Life Support", time: "7 min ago", color: "hsl(217_91%_65%)" },
                  { name: "Michael R.", course: "Moving & Handling", time: "11 min ago", color: "hsl(152_55%_55%)" },
                ].map((a) => (
                  <div
                    key={a.name + a.time}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur px-4 py-3 hover:bg-white/[0.07] transition-colors"
                  >
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                      style={{ background: `linear-gradient(135deg, ${a.color}, hsl(259 72% 14%))` }}
                    >
                      {a.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white leading-tight truncate">
                        {a.name} <span className="font-normal text-white/60">earned</span>{" "}
                        <span className="text-white">{a.course}</span>
                      </div>
                      <div className="text-[11px] text-white/45 mt-0.5">{a.time}</div>
                    </div>
                    <Circle className="h-2 w-2 fill-[hsl(152_60%_55%)] text-[hsl(152_60%_55%)]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
