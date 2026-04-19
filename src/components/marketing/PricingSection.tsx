import { Check, ArrowRight } from "lucide-react";
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
        {/* Editorial header */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-12 lg:mb-16">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-[hsl(189_94%_30%)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(189_94%_30%)]">
                05 / Pricing
              </span>
            </div>
            <h2 className="font-heading text-[34px] sm:text-[42px] lg:text-[52px] leading-[1.05] tracking-tight font-bold text-[hsl(259_72%_14%)]">
              Simple pricing,
              <br />
              scaled for every rota.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-10">
            <p className="text-[15px] lg:text-base leading-relaxed text-[hsl(259_20%_30%)] max-w-md">
              Per-seat pricing with no hidden fees. Volume discounts for groups of 100+ —
              speak to our team.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl p-7 transition-all",
                plan.highlighted
                  ? "bg-gradient-to-br from-[#0E1A47] via-[#0B1640] to-[#091236] text-white shadow-[0_30px_80px_-30px_rgba(11,22,64,0.6)]"
                  : "bg-white border border-[#EEEAF8] hover:border-[#D6CCF5] hover:shadow-[0_8px_30px_-15px_rgba(76,29,149,0.15)]"
              )}
            >
              {plan.highlighted && (
                <div className="absolute top-5 right-5 inline-flex items-center px-3 py-1 rounded-full bg-[#F59E0B] text-[#1A1448] text-[10px] font-bold uppercase tracking-wide shadow-md">
                  Most popular
                </div>
              )}

              <div
                className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.14em]",
                  plan.highlighted ? "text-[#F59E0B]" : "text-[hsl(189_94%_30%)]"
                )}
              >
                {plan.bestFor}
              </div>
              <div
                className={cn(
                  "font-heading text-[26px] font-bold mt-2",
                  plan.highlighted ? "text-white" : "text-[hsl(259_72%_14%)]"
                )}
              >
                {plan.name}
              </div>
              <div
                className={cn(
                  "text-sm mt-1.5",
                  plan.highlighted ? "text-white/75" : "text-[hsl(259_20%_45%)]"
                )}
              >
                {plan.tagline}
              </div>

              <div
                className={cn(
                  "mt-6 mb-6 pb-6 border-b",
                  plan.highlighted ? "border-white/15" : "border-[#EEEAF8]"
                )}
              >
                <div
                  className={cn(
                    "font-heading text-3xl font-bold",
                    plan.highlighted ? "text-white" : "text-[hsl(259_72%_14%)]"
                  )}
                >
                  Custom
                </div>
                <div
                  className={cn(
                    "text-xs mt-1",
                    plan.highlighted ? "text-white/70" : "text-[hsl(259_20%_45%)]"
                  )}
                >
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
                    <Check
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        plan.highlighted ? "text-[#F59E0B]" : "text-[hsl(189_94%_30%)]"
                      )}
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate("/contact")}
                className={cn(
                  "w-full rounded-full h-11 font-semibold",
                  plan.highlighted
                    ? "bg-[#F59E0B] hover:bg-[#D97706] text-[#1A1448]"
                    : "bg-[#0F0B30] hover:bg-[#1A1448] text-white"
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
