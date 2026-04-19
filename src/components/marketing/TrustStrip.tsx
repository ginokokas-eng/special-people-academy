import { Building2, Home, HeartHandshake, Stethoscope, ShieldCheck, Award } from "lucide-react";

const sectors = [
  { label: "Care Homes", icon: Building2 },
  { label: "Domiciliary Care", icon: Home },
  { label: "Supported Living", icon: HeartHandshake },
  { label: "NHS / Organisations", icon: Stethoscope },
];

const proof = [
  { value: "CPD", caption: "Certified provider", icon: Award },
  { value: "CQC", caption: "Aligned outcomes", icon: ShieldCheck },
  { value: "98%", caption: "Pass rate" },
  { value: "1.2k+", caption: "Care staff trained / month" },
];

export const TrustStrip = () => {
  return (
    <section aria-label="Trusted by UK care providers" className="bg-white border-y border-[#EEEAF8]">
      <div className="section-container py-10 lg:py-12">
        <div className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(259_20%_50%)] mb-7">
          Trusted across UK care
        </div>

        <div className="grid gap-8 lg:gap-10 md:grid-cols-2 items-center">
          {/* Sector pills */}
          <ul className="flex flex-wrap justify-center md:justify-start gap-2.5">
            {sectors.map((s) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.label}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-[#E8E4F7] text-sm font-medium text-[hsl(259_72%_14%)] shadow-[0_1px_2px_rgba(20,10,60,0.03)] transition-colors hover:border-[#D6CCF5]"
                >
                  <Icon className="h-4 w-4 text-[hsl(262_83%_58%)]" />
                  {s.label}
                </li>
              );
            })}
          </ul>

          {/* Proof points */}
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {proof.map((p) => {
              const Icon = (p as any).icon;
              return (
                <li
                  key={p.caption}
                  className="rounded-xl border border-[#EEEAF8] bg-white px-3 py-3.5 text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {Icon && <Icon className="h-3.5 w-3.5 text-[hsl(262_83%_58%)]" />}
                    <div className="font-heading text-lg font-bold text-[hsl(259_72%_14%)] leading-none">
                      {p.value}
                    </div>
                  </div>
                  <div className="text-[11px] text-[hsl(259_20%_45%)] mt-1.5">{p.caption}</div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};
