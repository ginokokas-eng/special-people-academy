import { ShieldCheck, FileCheck, BellRing, BarChart3, ClipboardList, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: ClipboardList,
    title: "Inspection readiness",
    desc: "Always-on dashboards mapped to CQC outcomes — see gaps before assessors do.",
  },
  {
    icon: FileCheck,
    title: "Audit packs in one click",
    desc: "Export training records, certificates and sign-offs as a single inspection-ready bundle.",
  },
  {
    icon: ShieldCheck,
    title: "Certificate tracking",
    desc: "Live status for every learner across every mandatory course, by site or team.",
  },
  {
    icon: BellRing,
    title: "Renewal reminders",
    desc: "Automated nudges to learners and managers before certificates expire.",
  },
];

export const ComplianceBand = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1E0B4B] via-[#3B0F8B] to-[#6D28D9] p-8 sm:p-12 lg:p-16 shadow-[0_40px_100px_-30px_rgba(45,14,107,0.45)]">
          {/* Ambient glows */}
          <div aria-hidden className="absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full bg-[hsl(262_83%_58%/0.35)] blur-[140px]" />
          <div aria-hidden className="absolute -bottom-20 -left-10 w-[360px] h-[360px] rounded-full bg-[hsl(217_91%_60%/0.30)] blur-[140px]" />

          <div className="relative grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            {/* Copy + features */}
            <div className="lg:col-span-7 text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-medium backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Compliance built in
              </div>

              <h2 className="font-heading text-3xl lg:text-[44px] leading-[1.1] font-bold mt-5 tracking-tight">
                Stay inspection-ready,{" "}
                <span className="bg-gradient-to-r from-[#C4B5FD] via-white to-[#A5F3FC] bg-clip-text text-transparent">
                  every single day
                </span>
              </h2>

              <p className="mt-4 text-white/75 text-base lg:text-lg max-w-xl leading-relaxed">
                Replace spreadsheets and paper folders with a live, role-based view of training,
                competencies and certificates — designed around how UK care services actually run.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-3.5">
                {features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className="rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur-md p-4 hover:bg-white/[0.10] transition-colors"
                    >
                      <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                        <Icon className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div className="text-sm font-semibold">{f.title}</div>
                      <div className="text-xs text-white/65 leading-relaxed mt-1">{f.desc}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-9 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/contact")}
                  className="rounded-full bg-white text-[#4C1D95] hover:bg-white/95 px-6 h-12 font-semibold"
                >
                  Book a compliance walkthrough
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => navigate("/features")}
                  className="rounded-full h-12 px-5 text-white hover:bg-white/10 font-semibold"
                >
                  See all features
                </Button>
              </div>
            </div>

            {/* Mock compliance card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-white/15 bg-white/95 backdrop-blur-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(259_20%_45%)]">
                      Site overview
                    </div>
                    <div className="font-heading font-bold text-[hsl(259_72%_14%)]">Greenfield Lodge</div>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-[hsl(262_83%_58%/0.12)] text-[hsl(262_83%_45%)] flex items-center justify-center">
                    <BarChart3 className="h-4.5 w-4.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl bg-[hsl(152_55%_42%/0.08)] p-3">
                    <div className="text-[11px] text-[hsl(259_20%_45%)]">Mandatory complete</div>
                    <div className="text-xl font-bold text-[hsl(259_72%_14%)] mt-1">96%</div>
                  </div>
                  <div className="rounded-xl bg-[hsl(38_92%_50%/0.10)] p-3">
                    <div className="text-[11px] text-[hsl(259_20%_45%)]">Expiring &lt;30d</div>
                    <div className="text-xl font-bold text-[hsl(259_72%_14%)] mt-1">8</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Safeguarding", pct: 100 },
                    { label: "Infection control", pct: 92 },
                    { label: "Fire safety", pct: 87 },
                    { label: "Medication", pct: 78 },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-medium text-[hsl(259_72%_14%)]">{r.label}</span>
                        <span className="text-[hsl(259_20%_45%)] font-semibold">{r.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[hsl(259_30%_94%)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4]"
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-[#EEEAF8] flex items-center justify-between">
                  <div className="text-[11px] text-[hsl(259_20%_45%)]">Next inspection window</div>
                  <div className="text-xs font-semibold text-[hsl(259_72%_14%)]">Q3 2025</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
