import { Check, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  tagline: string;
  bestFor: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
};

const plans: Plan[] = [
  {
    name: "Team",
    tagline: "Small services & single sites",
    bestFor: "Up to 25 staff",
    features: [
      "Full CPD-certified course library",
      "Manager dashboard & reporting",
      "Automated renewal reminders",
      "Email support",
    ],
    cta: "Contact Sales",
  },
  {
    name: "Organisation",
    tagline: "Multi-site providers",
    bestFor: "Up to 250 staff",
    highlighted: true,
    features: [
      "Everything in Team",
      "Multi-site & branch reporting",
      "Practical competency sign-off",
      "Audit-ready inspection packs",
      "Priority support",
    ],
    cta: "Contact Sales",
  },
  {
    name: "Enterprise",
    tagline: "NHS, large groups & partnerships",
    bestFor: "Unlimited staff",
    features: [
      "Everything in Organisation",
      "SSO & directory sync",
      "SCORM & external content",
      "Custom learning pathways",
      "Dedicated success manager",
    ],
    cta: "Contact Sales",
  },
];

export const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section className="section-y bg-white">
      <div className="section-container">
        <div className="max-w-2xl mx-auto text-center mb-12 lg:mb-14">
          <span className="eyebrow mb-3">Plans</span>
          <h2 className="heading-display text-3xl lg:text-[40px] leading-tight mt-3">
            Simple plans, tailored to your service
          </h2>
          <p className="mt-3 text-[hsl(259_20%_30%)] text-base lg:text-lg">
            Pricing scales with your headcount and number of sites — talk to our team for a quote
            that fits.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl p-7 transition-all",
                plan.highlighted
                  ? "bg-gradient-to-br from-[#1E0B4B] via-[#3B0F8B] to-[#6D28D9] text-white shadow-[0_30px_80px_-30px_rgba(45,14,107,0.55)] lg:-translate-y-2"
                  : "bg-white border border-[#EEEAF8] hover:border-[#D6CCF5] hover:shadow-[0_8px_30px_-15px_rgba(76,29,149,0.15)]"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#4C1D95] text-[11px] font-bold uppercase tracking-wide shadow-md">
                  <Sparkles className="h-3 w-3" />
                  Most popular
                </div>
              )}

              <div className={cn("text-xs font-semibold uppercase tracking-wide", plan.highlighted ? "text-white/70" : "text-[hsl(259_20%_45%)]")}>
                {plan.bestFor}
              </div>
              <div className={cn("font-heading text-2xl font-bold mt-1", plan.highlighted ? "text-white" : "text-[hsl(259_72%_14%)]")}>
                {plan.name}
              </div>
              <div className={cn("text-sm mt-1", plan.highlighted ? "text-white/75" : "text-[hsl(259_20%_45%)]")}>
                {plan.tagline}
              </div>

              <div className={cn("mt-6 mb-6 pb-6 border-b", plan.highlighted ? "border-white/15" : "border-[#EEEAF8]")}>
                <div className={cn("font-heading text-3xl font-bold", plan.highlighted ? "text-white" : "text-[hsl(259_72%_14%)]")}>
                  Custom
                </div>
                <div className={cn("text-xs mt-1", plan.highlighted ? "text-white/70" : "text-[hsl(259_20%_45%)]")}>
                  Quoted by team size & sites
                </div>
              </div>

              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className={cn(
                      "flex items-start gap-2.5 text-sm",
                      plan.highlighted ? "text-white/90" : "text-[hsl(259_72%_14%)]"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                        plan.highlighted ? "bg-white/15 text-white" : "bg-[hsl(152_55%_42%/0.12)] text-[hsl(152_55%_32%)]"
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate("/contact")}
                className={cn(
                  "w-full rounded-full h-11 font-semibold",
                  plan.highlighted
                    ? "bg-white text-[#4C1D95] hover:bg-white/95"
                    : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
                )}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[hsl(259_20%_45%)] mt-8">
          All plans include unlimited learners, GDPR-compliant hosting in the UK, and onboarding
          support.
        </p>
      </div>
    </section>
  );
};
