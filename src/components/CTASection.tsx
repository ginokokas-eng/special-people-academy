import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const steps = [
  "30-min discovery call with our care training team",
  "Tailored demo aligned to your services",
  "Free pilot scoped to your first cohort",
];

export const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28 px-6 bg-white">
      <div className="container mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F0626] via-[#2D0E6B] to-[#4C1D95] p-8 sm:p-12 lg:p-16 shadow-[0_40px_100px_-30px_rgba(15,6,38,0.55)]">
          {/* Ambient glows */}
          <div aria-hidden className="absolute -top-32 left-1/3 w-[420px] h-[420px] rounded-full bg-[hsl(262_83%_58%/0.30)] blur-[140px]" />
          <div aria-hidden className="absolute -bottom-24 right-0 w-[360px] h-[360px] rounded-full bg-[hsl(217_91%_60%/0.25)] blur-[140px]" />

          <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-16 items-center text-white">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium backdrop-blur-sm">
                <Calendar className="h-3.5 w-3.5" />
                Onboarding in under 2 weeks
              </div>

              <h2 className="font-heading text-3xl lg:text-[48px] leading-[1.05] font-bold tracking-tight">
                Bring your whole team{" "}
                <span className="bg-gradient-to-r from-[#C4B5FD] via-white to-[#A5F3FC] bg-clip-text text-transparent">
                  inspection-ready
                </span>
              </h2>

              <p className="text-white/75 text-base lg:text-lg max-w-xl leading-relaxed">
                Talk to a specialist who understands UK care delivery. We'll show you exactly how
                Special People Training fits your service, sites and budget.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={() => navigate("/contact")}
                  className="rounded-full bg-white text-[#2D0E6B] hover:bg-white/95 px-6 h-12 font-semibold"
                >
                  Contact Sales
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => navigate("/courses")}
                  className="rounded-full h-12 px-5 text-white hover:bg-white/10 font-semibold"
                >
                  Browse courses
                </Button>
              </div>
            </div>

            {/* What happens next checklist */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-md p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65 mb-4">
                  What happens next
                </div>
                <ul className="space-y-3.5">
                  {steps.map((s, idx) => (
                    <li key={s} className="flex items-start gap-3">
                      <span className="h-7 w-7 rounded-full bg-white/15 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-white/90 leading-relaxed pt-1">{s}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-2 text-xs text-white/65">
                  <Check className="h-3.5 w-3.5 text-[hsl(152_55%_60%)]" />
                  No obligation, no pressure — ever.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
