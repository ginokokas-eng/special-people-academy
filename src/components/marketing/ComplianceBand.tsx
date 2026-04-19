import { Check, CircleCheck, Star, Box, Briefcase, Globe } from "lucide-react";

const accreditations = [
  { icon: Check, name: "CPD Certified", sub: "The CPD Standards Office" },
  { icon: CircleCheck, name: "Skills for Care", sub: "Endorsed Provider" },
  { icon: Star, name: "Care Inspectorate", sub: "Scotland — SSSC" },
  { icon: Box, name: "NHS Digital", sub: "DSPT Compliant" },
  { icon: Briefcase, name: "RoSPA", sub: "Health & Safety" },
  { icon: Globe, name: "CIW Wales", sub: "Registered" },
];

export const ComplianceBand = () => {
  return (
    <section className="section-y bg-white">
      <div className="section-container">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1A0B3D] via-[#1F0E4A] to-[#160933] p-8 sm:p-12 lg:p-16 shadow-[0_40px_100px_-30px_rgba(20,9,55,0.55)]">
          {/* Ambient glows */}
          <div aria-hidden className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full bg-[hsl(262_83%_58%/0.22)] blur-[140px] pointer-events-none" />
          <div aria-hidden className="absolute -bottom-24 -left-16 w-[400px] h-[400px] rounded-full bg-[hsl(280_70%_50%/0.18)] blur-[140px] pointer-events-none" />

          <div className="relative z-10">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-7">
              <span className="h-px w-8 bg-[hsl(38_92%_55%)]" />
              <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[hsl(38_92%_60%)]">
                — 03 / Compliance
              </span>
            </div>

            {/* Headline */}
            <h2 className="font-heading text-[34px] sm:text-[44px] lg:text-[56px] leading-[1.05] font-bold text-white tracking-tight max-w-4xl">
              Every certificate,<br />
              inspection-ready{" "}
              <span className="bg-gradient-to-r from-[#7DD3FC] via-[#67E8F9] to-[#A5F3FC] bg-clip-text text-transparent">
                the moment
              </span>{" "}
              it's earned.
            </h2>

            <p className="mt-7 text-[15px] lg:text-base leading-relaxed text-white/65 max-w-lg">
              When the inspector walks in, you need evidence — not a spreadsheet. Special People
              generates audit-grade documentation automatically, mapped to the frameworks that
              matter.
            </p>

            {/* Accreditations panel */}
            <div className="mt-12 rounded-[24px] border border-white/10 bg-white/[0.03] backdrop-blur-sm p-7 lg:p-9">
              <div className="text-[10px] font-bold tracking-[0.16em] uppercase text-[hsl(38_92%_60%)] mb-3">
                Accreditations
              </div>
              <h3 className="font-heading text-[24px] lg:text-[30px] font-bold text-white tracking-tight">
                Recognised by the bodies who set the bar.
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-white/60 max-w-2xl">
                Our courses carry formal CPD certification and are endorsed by sector-wide bodies.
                Every module is reviewed annually by registered clinicians.
              </p>

              {/* Grid of accreditations */}
              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accreditations.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div
                      key={a.name}
                      className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 hover:bg-white/[0.07] hover:border-white/15 transition-all"
                    >
                      <div className="h-9 w-9 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center mb-4">
                        <Icon className="h-4 w-4 text-[hsl(217_91%_75%)]" strokeWidth={2} />
                      </div>
                      <div className="font-heading text-[15px] font-bold text-white leading-tight">
                        {a.name}
                      </div>
                      <div className="text-[10.5px] font-semibold tracking-[0.10em] uppercase text-white/50 mt-1.5">
                        {a.sub}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
