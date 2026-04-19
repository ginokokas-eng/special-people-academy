import { Button } from "@/components/ui/button";
import { ArrowRight, Play, ShieldCheck, BadgeCheck, Clock, Award, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative bg-white overflow-hidden">
      {/* Ambient lavender / violet glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-[hsl(262_83%_58%/0.10)] blur-[120px]" />
        <div className="absolute top-40 right-[-120px] w-[460px] h-[460px] rounded-full bg-[hsl(217_91%_60%/0.08)] blur-[120px]" />
        <div className="absolute bottom-[-160px] left-1/3 w-[420px] h-[420px] rounded-full bg-[hsl(280_70%_70%/0.10)] blur-[120px]" />
      </div>

      <div className="container mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32 relative z-10">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left column */}
          <div className="lg:col-span-6 space-y-7 animate-fade-up">
            {/* Trust pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8E4F7] shadow-[0_1px_2px_rgba(20,10,60,0.04)] text-xs font-medium text-[hsl(259_72%_14%)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[hsl(262_83%_58%)]" />
              CPD-certified · CQC-ready · Built for UK care providers
            </div>

            <h1 className="font-heading text-[40px] sm:text-5xl lg:text-[58px] leading-[1.05] tracking-tight font-bold text-[hsl(259_72%_14%)]">
              Training that treats{" "}
              <span className="bg-gradient-to-r from-[#0E7490] via-[#0D9488] to-[#10B981] bg-clip-text text-transparent">
                carers
              </span>{" "}
              like the{" "}
              <span className="relative inline-block text-[hsl(259_15%_55%)]">
                replaceable
                <span aria-hidden className="absolute left-0 right-0 top-1/2 h-[3px] bg-[hsl(262_83%_58%/0.55)] rounded-full -translate-y-1/2" />
              </span>{" "}
              <span className="bg-gradient-to-r from-[#0E7490] via-[#0D9488] to-[#10B981] bg-clip-text text-transparent">
                essential
              </span>{" "}
              workers they are.
            </h1>

            <p className="text-lg leading-relaxed text-[hsl(259_20%_30%)] max-w-xl">
              A compliance-ready learning platform for the people who show up, day and
              night, for the people who need them most. Built with care providers, nurses
              and support leads across the UK.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                size="lg"
                onClick={() => navigate("/contact")}
                className="rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 h-12 text-[15px] font-semibold shadow-[0_10px_30px_-12px_rgba(124,58,237,0.6)]"
              >
                Contact Sales
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/courses")}
                className="rounded-full h-12 px-6 text-[15px] font-semibold border-[#E8E4F7] bg-white hover:bg-[hsl(262_83%_58%/0.05)] text-[hsl(259_72%_14%)]"
              >
                <Play className="h-4 w-4 mr-1" />
                Explore Courses
              </Button>
            </div>

            {/* Mini proof row */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {["A", "M", "S", "J"].map((i, idx) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{
                      background: [
                        "linear-gradient(135deg,#7C3AED,#4C1D95)",
                        "linear-gradient(135deg,#06B6D4,#0EA5E9)",
                        "linear-gradient(135deg,#10B981,#059669)",
                        "linear-gradient(135deg,#F59E0B,#D97706)",
                      ][idx],
                    }}
                  >
                    {i}
                  </div>
                ))}
              </div>
              <div className="text-sm text-[hsl(259_20%_30%)]">
                <span className="font-semibold text-[hsl(259_72%_14%)]">1,200+ care staff</span>{" "}
                trained this month
              </div>
            </div>
          </div>

          {/* Right column — glass compliance dashboard */}
          <div className="lg:col-span-6 relative animate-fade-up mt-4 lg:mt-0" style={{ animationDelay: "150ms" }}>
            <div className="relative max-w-[560px] lg:ml-auto">
              {/* Floating mini cards */}
              <div className="hidden md:flex absolute -left-4 lg:-left-8 -top-5 z-20 items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#EEEAF8] shadow-[0_18px_40px_-20px_rgba(76,29,149,0.25)] px-3.5 py-2.5 animate-fade-up" style={{ animationDelay: "350ms" }}>
                <div className="h-9 w-9 rounded-xl bg-[hsl(152_55%_42%/0.12)] text-[hsl(152_55%_32%)] flex items-center justify-center">
                  <BadgeCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-[hsl(259_20%_45%)]">Certificate issued</div>
                  <div className="text-sm font-semibold text-[hsl(259_72%_14%)] leading-tight">Medication — Sarah O.</div>
                </div>
              </div>

              <div className="hidden md:flex absolute -right-4 -bottom-5 z-20 items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#EEEAF8] shadow-[0_18px_40px_-20px_rgba(76,29,149,0.25)] px-3.5 py-2.5 animate-fade-up" style={{ animationDelay: "500ms" }}>
                <div className="h-9 w-9 rounded-xl bg-[hsl(38_92%_50%/0.15)] text-[hsl(38_92%_40%)] flex items-center justify-center">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide font-semibold text-[hsl(259_20%_45%)]">Renewal due</div>
                  <div className="text-sm font-semibold text-[hsl(259_72%_14%)] leading-tight">Safeguarding · 14 days</div>
                </div>
              </div>

              {/* Main glass dashboard card */}
              <div className="relative rounded-3xl border border-[#E8E4F7] bg-white/85 backdrop-blur-xl shadow-[0_30px_80px_-30px_rgba(76,29,149,0.30)] p-6 sm:p-7">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs font-medium text-[hsl(259_20%_45%)]">Compliance overview</div>
                    <div className="font-heading text-lg font-bold text-[hsl(259_72%_14%)]">
                      Sunrise Care Group
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(152_55%_42%/0.12)] text-[hsl(152_55%_28%)] text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[hsl(152_55%_42%)]" />
                    Inspection-ready
                  </div>
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "Compliant", value: "94%", icon: ShieldCheck, color: "text-[hsl(152_55%_32%)]", bg: "bg-[hsl(152_55%_42%/0.10)]" },
                    { label: "Certificates", value: "1,284", icon: Award, color: "text-[hsl(262_83%_45%)]", bg: "bg-[hsl(262_83%_58%/0.10)]" },
                    { label: "Trained", value: "+12%", icon: TrendingUp, color: "text-[hsl(217_91%_45%)]", bg: "bg-[hsl(217_91%_60%/0.10)]" },
                  ].map((k) => {
                    const Icon = k.icon;
                    return (
                      <div key={k.label} className="rounded-xl border border-[#EEEAF8] p-3 bg-white/60">
                        <div className={`h-7 w-7 rounded-lg ${k.bg} ${k.color} flex items-center justify-center mb-2`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-base font-bold text-[hsl(259_72%_14%)] leading-none">{k.value}</div>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
