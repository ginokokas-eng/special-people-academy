import { ArrowRight, Play, Circle, BadgeCheck, Clock, ShieldCheck, Award, TrendingUp, BookOpen, Zap, Video } from "lucide-react";
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
            onClick={() => navigate("/contact")}
            className="rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white h-11 px-5 text-[14px] font-semibold shadow-[0_10px_30px_-12px_rgba(124,58,237,0.6)]"
          >
            Contact Sales
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/courses")}
            className="rounded-full h-11 px-5 text-[14px] font-semibold border-[#E8E4F7] bg-white hover:bg-[hsl(262_50%_97%)] text-[hsl(259_72%_14%)]"
          >
            <Play className="h-4 w-4 mr-1.5" />
            Explore Courses
          </Button>
          <p className="text-[13px] text-[hsl(259_20%_45%)] max-w-[260px] leading-snug">
            No card required. Multi-seat discounts for rotas of 25+.
          </p>
        </div>

        {/* Three-card editorial row */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 mb-16">
          {/* Currently Playing module card */}
          <article className="relative rounded-[28px] bg-white border border-[#EEEAF8] shadow-[0_20px_50px_-25px_rgba(76,29,149,0.25)] p-6 flex flex-col min-h-[460px]">
            {/* Top label */}
            <div className="flex items-center gap-2 mb-6">
              <span className="h-2 w-2 rounded-full bg-[hsl(262_83%_58%)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(262_83%_45%)]">
                Currently Playing · Module 4 of 7
              </span>
            </div>

            {/* Title */}
            <h3 className="font-heading text-[28px] lg:text-[32px] font-bold text-[hsl(259_72%_14%)] leading-[1.05] tracking-tight mb-4">
              Safeguarding<br />Adults at Risk —<br />Level 3
            </h3>

            {/* Description */}
            <p className="text-[14px] leading-relaxed text-[hsl(259_20%_45%)] mb-6">
              Scenario-based learning with real-world decision points, built to the 2024 statutory framework.
            </p>

            <div className="flex-1" />

            {/* Divider */}
            <div className="border-t border-dashed border-[#E8E4F7] mb-4" />

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(259_20%_55%)] mb-1">Duration</div>
                <div className="text-[15px] font-bold text-[hsl(259_72%_14%)]">3h 40m</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(259_20%_55%)] mb-1">CPD Points</div>
                <div className="text-[15px] font-bold text-[hsl(259_72%_14%)]">12</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(259_20%_55%)] mb-1">Format</div>
                <div className="text-[15px] font-bold text-[hsl(259_72%_14%)]">Video + Quiz</div>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="h-1.5 rounded-full bg-[hsl(259_30%_94%)] overflow-hidden mb-2">
                <div className="h-full rounded-full bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(217_91%_60%)]" style={{ width: "68%" }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[hsl(259_20%_45%)]">
                <span>4 of 7 modules</span>
                <span className="font-semibold">68% complete</span>
              </div>
            </div>
          </article>

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

          {/* Compliance + Live stats stacked column */}
          <div className="flex flex-col gap-5 lg:gap-6">
            {/* Compliance overview dashboard card */}
            <div className="relative">
              {/* Floating "Certificate issued" chip */}
              <div className="hidden sm:flex absolute -left-3 lg:-left-6 -top-5 z-20 items-center gap-3 rounded-2xl bg-white border border-[#EEEAF8] shadow-[0_18px_40px_-20px_rgba(76,29,149,0.30)] px-3.5 py-2.5">
                <div className="h-9 w-9 rounded-xl bg-[hsl(152_55%_42%/0.12)] text-[hsl(152_55%_32%)] flex items-center justify-center">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-[hsl(259_20%_45%)]">Certificate issued</div>
                  <div className="text-sm font-semibold text-[hsl(259_72%_14%)] leading-tight">Medication — Sarah O.</div>
                </div>
              </div>

              {/* Floating "Renewal due" chip */}
              <div className="hidden sm:flex absolute -right-3 lg:-right-4 -bottom-5 z-20 items-center gap-3 rounded-2xl bg-white border border-[#EEEAF8] shadow-[0_18px_40px_-20px_rgba(76,29,149,0.30)] px-3.5 py-2.5">
                <div className="h-9 w-9 rounded-xl bg-[hsl(38_92%_50%/0.15)] text-[hsl(38_92%_45%)] flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-[hsl(259_20%_45%)]">Renewal due</div>
                  <div className="text-sm font-semibold text-[hsl(259_72%_14%)] leading-tight">Safeguarding · 14 days</div>
                </div>
              </div>

              {/* Main glass dashboard card */}
              <article className="relative rounded-[28px] border border-[#E8E4F7] bg-white/95 backdrop-blur-xl shadow-[0_30px_80px_-30px_rgba(76,29,149,0.30)] p-6 sm:p-7 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs font-medium text-[hsl(259_20%_45%)]">Compliance overview</div>
                    <div className="font-heading text-lg lg:text-xl font-bold text-[hsl(259_72%_14%)] leading-tight">
                      Sunrise Care Group
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(152_55%_42%/0.12)] text-[hsl(152_55%_28%)] text-[11px] font-semibold whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(152_55%_42%)]" />
                    Inspection-ready
                  </div>
                </div>

                {/* KPI tiles */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: "Compliant", value: "94%", icon: ShieldCheck, color: "text-[hsl(152_55%_32%)]", bg: "bg-[hsl(152_55%_42%/0.10)]" },
                    { label: "Certificates", value: "1,284", icon: Award, color: "text-[hsl(262_83%_45%)]", bg: "bg-[hsl(262_83%_58%/0.10)]" },
                    { label: "Trained", value: "+12%", icon: TrendingUp, color: "text-[hsl(217_91%_45%)]", bg: "bg-[hsl(217_91%_60%/0.10)]" },
                  ].map((k) => {
                    const Icon = k.icon;
                    return (
                      <div key={k.label} className="rounded-xl border border-[#EEEAF8] p-3 bg-white">
                        <div className={`h-7 w-7 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-2`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-base lg:text-lg font-bold text-[hsl(259_72%_14%)] leading-none">{k.value}</div>
                        <div className="text-[11px] text-[hsl(259_20%_45%)] mt-1">{k.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress rows */}
                <div className="space-y-3.5">
                  {[
                    { name: "Safeguarding Adults", pct: 96, tone: "bg-[hsl(152_55%_42%)]" },
                    { name: "Medication Management", pct: 88, tone: "bg-[hsl(262_83%_58%)]" },
                    { name: "Moving & Handling", pct: 72, tone: "bg-[hsl(38_92%_50%)]" },
                    { name: "Basic Life Support", pct: 81, tone: "bg-[hsl(217_91%_60%)]" },
                  ].map((row) => (
                    <div key={row.name}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-[hsl(259_72%_14%)]">{row.name}</span>
                        <span className="font-semibold text-[hsl(259_20%_30%)]">{row.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[hsl(259_30%_94%)] overflow-hidden">
                        <div className={`h-full rounded-full ${row.tone}`} style={{ width: `${row.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            {/* Live stats dark mini-card */}
            <article className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-[#1A1448] via-[#16123E] to-[#0F0B30] p-6 lg:p-7">
              <div aria-hidden className="absolute -top-16 -right-16 w-[260px] h-[260px] rounded-full bg-[hsl(262_83%_58%/0.18)] blur-[100px] pointer-events-none" />
              <div aria-hidden className="absolute -bottom-20 -left-12 w-[220px] h-[220px] rounded-full bg-[hsl(217_91%_60%/0.14)] blur-[100px] pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152_60%_50%)] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(152_60%_50%)]" />
                  </span>
                  <span className="text-[11px] font-semibold text-white/80">Live · Last 30 days</span>
                </div>

                <div className="font-heading text-[48px] lg:text-[56px] font-bold text-white leading-none tracking-tight tabular-nums">
                  47,291
                </div>

                <p className="text-[13px] leading-relaxed text-white/70 mt-3 max-w-xs">
                  certifications issued to care workers across the UK this month alone.
                </p>

                <div className="flex flex-wrap gap-1.5 mt-5">
                  {["Care Homes", "NHS Trusts", "Supported Living", "Domiciliary"].map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-[10px] font-semibold tracking-wide uppercase text-white/85"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </div>
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
