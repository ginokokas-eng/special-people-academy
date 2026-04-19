import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const steps = [
  { title: "Quick call.", body: "15 minutes with a human. No scripted demo." },
  { title: "Migrate in 48h.", body: "We import your records, SCORM & users." },
  { title: "Go live.", body: "Your team is training the same week." },
  { title: "You stay.", body: "94% annual retention. Our best salespeople are our customers." },
];

export const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="section-y bg-white">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0B2545] via-[#0E2F5A] to-[#0A1E3D] p-8 sm:p-12 lg:p-16 shadow-[0_40px_100px_-30px_rgba(11,37,69,0.55)]">
          {/* Ambient glows */}
          <div aria-hidden className="absolute -top-32 -left-20 w-[460px] h-[460px] rounded-full bg-[hsl(217_91%_60%/0.18)] blur-[140px]" />
          <div aria-hidden className="absolute -bottom-24 -right-10 w-[420px] h-[420px] rounded-full bg-[hsl(38_92%_50%/0.14)] blur-[140px]" />

          <div className="relative max-w-3xl text-white">
            <h2 className="font-heading text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.05] font-bold tracking-tight">
              Care work is<br />
              the hardest job<br />
              in the country.{" "}
              <span className="text-[hsl(38_92%_55%)] block sm:inline">
                Training shouldn't make it harder.
              </span>
            </h2>

            <p className="mt-6 text-white/75 text-base lg:text-[17px] leading-relaxed max-w-xl">
              Start a 14-day trial in under 90 seconds. Bring your existing training records.
              We'll take it from there.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="rounded-full bg-[hsl(38_92%_55%)] hover:bg-[hsl(38_92%_50%)] text-[#0B2545] px-6 h-12 font-semibold shadow-[0_10px_30px_-12px_rgba(245,158,11,0.55)]"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/contact")}
                className="rounded-full h-12 px-6 font-semibold border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Book a 20-min demo
              </Button>
            </div>

            {/* What happens next */}
            <div className="mt-12 rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-md p-6 lg:p-7">
              <div className="flex items-center gap-2 mb-5 text-[hsl(38_92%_60%)]">
                <span className="text-base leading-none">−</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.22em]">
                  What happens next
                </span>
              </div>
              <ul className="space-y-3.5">
                {steps.map((s, idx) => (
                  <li key={s.title} className="flex items-start gap-4 text-sm leading-relaxed">
                    <span className="font-mono text-[12px] font-semibold text-[hsl(38_92%_60%)] tabular-nums pt-0.5 w-5 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-white/85">
                      <span className="font-semibold text-white">{s.title}</span> {s.body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
