import { useState } from "react";
import { Building2, Home, HeartHandshake, Stethoscope, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Sector = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  description: string;
  bullets: string[];
};

const sectors: Sector[] = [
  {
    id: "care-homes",
    label: "Care Homes",
    icon: Building2,
    headline: "Keep every shift safe and inspection-ready",
    description:
      "Standardise mandatory training across all roles, track competencies by floor or unit, and produce CQC-ready evidence in seconds.",
    bullets: [
      "Role-based learning pathways",
      "Practical sign-off for clinical skills",
      "Manager dashboards by site & unit",
    ],
  },
  {
    id: "domiciliary",
    label: "Domiciliary Care",
    icon: Home,
    headline: "Train a distributed workforce without the admin",
    description:
      "Mobile-first courses staff can complete between visits, plus automated reminders so certificates never lapse.",
    bullets: [
      "Bite-size mobile lessons",
      "Auto renewals & expiry alerts",
      "Branch-level reporting",
    ],
  },
  {
    id: "supported-living",
    label: "Supported Living",
    icon: HeartHandshake,
    headline: "Person-centred training tailored to each service",
    description:
      "Build pathways aligned to individual support plans and document evidence of competency for each person you support.",
    bullets: [
      "Care plan-aligned modules",
      "Per-service-user evidence packs",
      "Specialist clinical add-ons",
    ],
  },
  {
    id: "nhs",
    label: "NHS / Organisations",
    icon: Stethoscope,
    headline: "Enterprise-grade training for large workforces",
    description:
      "SSO, granular roles and SCORM-friendly tooling — deploy across trusts and partner providers from one place.",
    bullets: [
      "SSO & directory sync",
      "SCORM & external content",
      "Procurement-ready security",
    ],
  },
];

export const OrganisationsSection = () => {
  const [active, setActive] = useState(sectors[0].id);
  const navigate = useNavigate();
  const current = sectors.find((s) => s.id === active) ?? sectors[0];
  const ActiveIcon = current.icon;

  return (
    <section className="section-y bg-[hsl(270_30%_98%)]">
      <div className="section-container">
        <div className="max-w-2xl mb-10 lg:mb-12">
          <span className="eyebrow mb-3">For organisations</span>
          <h2 className="heading-display text-3xl lg:text-[40px] leading-tight mt-3">
            Built for the way care teams actually work
          </h2>
          <p className="mt-3 text-[hsl(259_20%_30%)] text-base lg:text-lg">
            Choose your service type to see how Special People Training fits.
          </p>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Organisation type"
          className="flex flex-wrap gap-2 mb-8 border-b border-[#EEEAF8] pb-1"
        >
          {sectors.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(s.id)}
                className={cn(
                  "relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white border border-[#E8E4F7] text-[hsl(259_72%_14%)] shadow-[0_4px_14px_-6px_rgba(76,29,149,0.20)]"
                    : "text-[hsl(259_20%_40%)] hover:text-[hsl(259_72%_14%)] hover:bg-white/60"
                )}
              >
                <Icon
                  className={cn("h-4 w-4", isActive ? "text-[hsl(262_83%_58%)]" : "text-[hsl(259_20%_50%)]")}
                />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Active panel */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 rounded-2xl border border-[#EEEAF8] bg-white p-7 lg:p-9 shadow-[0_8px_30px_-15px_rgba(76,29,149,0.15)]">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-xl bg-[hsl(262_83%_58%/0.10)] text-[hsl(262_83%_45%)] flex items-center justify-center">
                <ActiveIcon className="h-5 w-5" />
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[hsl(259_20%_45%)]">
                {current.label}
              </div>
            </div>
            <h3 className="font-heading text-2xl lg:text-3xl font-bold text-[hsl(259_72%_14%)] leading-tight">
              {current.headline}
            </h3>
            <p className="mt-3 text-[hsl(259_20%_30%)] leading-relaxed">{current.description}</p>

            <ul className="mt-6 space-y-2.5">
              {current.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-[hsl(259_72%_14%)]">
                  <span className="mt-0.5 h-5 w-5 rounded-full bg-[hsl(152_55%_42%/0.12)] text-[hsl(152_55%_32%)] flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-7">
              <Button
                onClick={() => navigate("/contact")}
                className="rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-5 h-11 font-semibold"
              >
                Talk to our team
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Side cards summary */}
          <div className="lg:col-span-5 grid sm:grid-cols-2 lg:grid-cols-1 gap-4">
            {sectors
              .filter((s) => s.id !== active)
              .slice(0, 3)
              .map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className="text-left rounded-2xl border border-[#EEEAF8] bg-white p-5 hover:border-[#D6CCF5] hover:shadow-[0_8px_30px_-15px_rgba(76,29,149,0.20)] transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-9 w-9 rounded-lg bg-[hsl(262_83%_58%/0.08)] text-[hsl(262_83%_45%)] flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-sm font-semibold text-[hsl(259_72%_14%)]">{s.label}</div>
                    </div>
                    <p className="text-xs text-[hsl(259_20%_45%)] leading-relaxed line-clamp-2">
                      {s.description}
                    </p>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </section>
  );
};
