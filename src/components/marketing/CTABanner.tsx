import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface CTABannerProps {
  title: string;
  subtitle?: string;
  primaryCTA?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryCTA?: {
    text: string;
    href: string;
  };
  steps?: { title: string; description: string }[];
}

const defaultSteps = [
  { title: "Quick call.", description: "15 minutes with a human. No scripted demo." },
  { title: "Migrate in 48h.", description: "We import your records, SCORM & users." },
  { title: "Go live.", description: "Your team is training the same week." },
  { title: "You stay.", description: "94% annual retention. Our best salespeople are our customers." },
];

const splitTitle = (title: string) => {
  // Split on '?' or first sentence — second half gets the orange highlight
  const qIdx = title.indexOf("?");
  if (qIdx > -1 && qIdx < title.length - 1) {
    return { lead: title.slice(0, qIdx + 1).trim(), accent: title.slice(qIdx + 1).trim() };
  }
  const sentences = title.split(/(?<=\.)\s+/);
  if (sentences.length > 1) {
    return { lead: sentences[0], accent: sentences.slice(1).join(" ") };
  }
  return { lead: title, accent: "" };
};

export const CTABanner = ({
  title,
  subtitle,
  primaryCTA = { text: "Start free trial", href: "/contact" },
  secondaryCTA,
  steps = defaultSteps,
}: CTABannerProps) => {
  const { lead, accent } = splitTitle(title);

  return (
    <section className="section-y bg-white">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0B1640] via-[#0E1F55] to-[#091236] p-8 sm:p-12 lg:p-16 shadow-[0_40px_100px_-30px_rgba(11,22,64,0.55)]">
          {/* Ambient glows */}
          <div
            aria-hidden
            className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full bg-[hsl(217_91%_60%/0.18)] blur-[140px] pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-16 w-[400px] h-[400px] rounded-full bg-[hsl(38_92%_55%/0.10)] blur-[140px] pointer-events-none"
          />

          <div className="relative z-10 max-w-3xl">
            <h2 className="font-heading text-[34px] sm:text-[44px] lg:text-[54px] leading-[1.05] font-bold text-white tracking-tight">
              {lead}
              {accent && (
                <>
                  <br />
                  <span className="text-[#F59E0B]">{accent}</span>
                </>
              )}
            </h2>

            {subtitle && (
              <p className="mt-6 text-[15px] lg:text-base leading-relaxed text-white/70 max-w-xl">
                {subtitle}
              </p>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {primaryCTA.onClick ? (
                <Button
                  size="lg"
                  onClick={primaryCTA.onClick}
                  className="rounded-full h-12 px-6 bg-[#F59E0B] hover:bg-[#D97706] text-[#1A1448] font-semibold"
                >
                  {primaryCTA.text}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="rounded-full h-12 px-6 bg-[#F59E0B] hover:bg-[#D97706] text-[#1A1448] font-semibold"
                >
                  <Link to={primaryCTA.href || "/contact"}>
                    {primaryCTA.text}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {secondaryCTA && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full h-12 px-6 bg-white/[0.04] border-white/15 text-white hover:bg-white/[0.10] hover:text-white"
                >
                  <Link to={secondaryCTA.href}>{secondaryCTA.text}</Link>
                </Button>
              )}
            </div>

            {/* What happens next */}
            {steps && steps.length > 0 && (
              <div className="mt-10 rounded-[20px] border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 lg:p-7">
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-px w-6 bg-[#F59E0B]" />
                  <span className="text-[10.5px] font-bold tracking-[0.18em] uppercase text-[#F59E0B]">
                    What happens next
                  </span>
                </div>
                <ul className="space-y-3.5">
                  {steps.map((step, i) => (
                    <li key={step.title} className="flex items-start gap-4 text-sm text-white/85">
                      <span className="font-mono text-[11px] font-bold text-[#F59E0B] tabular-nums pt-0.5 w-6 shrink-0">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className="font-semibold text-white">{step.title}</span>{" "}
                        <span className="text-white/65">{step.description}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
