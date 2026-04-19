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
              {/* Live stats dark card */}
              <article className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1A1448] via-[#16123E] to-[#0F0B30] p-7 sm:p-8 min-h-[440px] flex flex-col">
                <div aria-hidden className="absolute -top-20 -right-20 w-[320px] h-[320px] rounded-full bg-[hsl(262_83%_58%/0.22)] blur-[110px] pointer-events-none" />
                <div aria-hidden className="absolute -bottom-24 -left-16 w-[280px] h-[280px] rounded-full bg-[hsl(217_91%_60%/0.16)] blur-[110px] pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(152_60%_50%)] opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(152_60%_50%)]" />
                    </span>
                    <span className="text-[11px] font-semibold text-white/80">Live · Last 30 days</span>
                  </div>

                  <div className="font-heading text-[64px] sm:text-[80px] font-bold text-white leading-none tracking-tight tabular-nums">
                    47,291
                  </div>

                  <p className="text-[14px] leading-relaxed text-white/70 mt-4 max-w-xs">
                    certifications issued to care workers across the UK this month alone.
                  </p>

                  <div className="flex-1" />

                  <div className="flex flex-wrap gap-1.5 mt-6">
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
      </div>
    </section>
  );
};
