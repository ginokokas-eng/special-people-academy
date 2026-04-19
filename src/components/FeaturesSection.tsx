import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Globe, CalendarClock, UserCheck, Layers, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface FeatureCardData {
  icon: React.ReactNode;
  title: string;
  shortText: string;
  modalHeading: string;
  bullets: string[];
  ctas: { label: string; href: string; variant: "default" | "outline" }[];
}

const featuresData: FeatureCardData[] = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "CQC-ready by default",
    shortText:
      "Audit packs generate in one click. Every completion is timestamped, signed and mapped to the Quality Statements.",
    modalHeading: "Compliance you can evidence",
    bullets: [
      "One-click audit packs aligned to the CQC Quality Statements.",
      "Timestamped completions with assessor sign-off and version history.",
      "Downloadable training matrices, attendance logs, and refresher alerts.",
      "Policy-linked learning across Safeguarding, MCA, medication and more.",
    ],
    ctas: [
      { label: "View Courses", href: "/courses", variant: "default" },
      { label: "Contact Sales", href: "/contact", variant: "outline" },
    ],
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Built for UK care",
    shortText:
      "Aligned to the Care Certificate, CQC, Care Inspectorate (Scotland) and CIW (Wales). Not generic US compliance.",
    modalHeading: "Designed for the UK regulatory landscape",
    bullets: [
      "Mapped to the 15 Care Certificate Standards from day one.",
      "References CQC (England), Care Inspectorate (Scotland) and CIW (Wales).",
      "Reviewed quarterly by registered UK clinicians and former managers.",
      "Reflects current statutory frameworks — not US healthcare boilerplate.",
    ],
    ctas: [
      { label: "Browse training", href: "/courses", variant: "default" },
      { label: "See features", href: "/features", variant: "outline" },
    ],
  },
  {
    icon: <CalendarClock className="h-5 w-5" />,
    title: "Built for rotas, not desks",
    shortText:
      "Short, focused modules designed for handover gaps and shift breaks. Mobile-friendly across every device.",
    modalHeading: "Learning that fits real shift patterns",
    bullets: [
      "5–15 minute modules learners actually finish on shift.",
      "Mobile-first experience for staff across sites and time zones.",
      "Quick knowledge checks and scenario questions.",
      "Blend online learning with in-person practical sign-off.",
    ],
    ctas: [
      { label: "See how it works", href: "/features", variant: "default" },
      { label: "Browse training", href: "/courses", variant: "outline" },
    ],
  },
  {
    icon: <UserCheck className="h-5 w-5" />,
    title: "Personalised role pathways",
    shortText:
      "Tailored journeys for support workers, senior carers, nurses and team leads — assigned automatically.",
    modalHeading: "Role-specific learning journeys",
    bullets: [
      "Pathways for Support Worker, Senior Carer, Team Lead, Nurse and Allied roles.",
      "Client-specific add-ons: epilepsy rescue meds, PEG/enteral feeding, PBS.",
      "Skills-gap tracking with automatic next-module assignment.",
      "Manager oversight by team, site or client package.",
    ],
    ctas: [
      { label: "Talk to us about pathways", href: "/contact", variant: "default" },
      { label: "Enterprise options", href: "/enterprise", variant: "outline" },
    ],
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Practical sign-off built in",
    shortText:
      "Hands-on competency captured by trainers in the field — no paper forms, no chasing assessors.",
    modalHeading: "Practical competency, properly evidenced",
    bullets: [
      "Trainer-led practical sign-off with photo and signature capture.",
      "Reassessment dates auto-scheduled based on course type.",
      "Outcome categories: competent, competent-with-support, requires reassessment.",
      "Linked directly to the learner's audit-ready record.",
    ],
    ctas: [
      { label: "Talk to us", href: "/contact", variant: "default" },
      { label: "View Courses", href: "/courses", variant: "outline" },
    ],
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: "Verified CPD certificates",
    shortText:
      "Industry-recognised certificates with CPD hours, learner ID and outcomes — easy to share and audit.",
    modalHeading: "Certificates that mean something",
    bullets: [
      "CPD hours, learning outcomes, completion date and certificate ID on every cert.",
      "PDF certificates stored in the learner profile, downloadable any time.",
      "Manager export for tenders, audits and compliance packs.",
      "Practical sign-off and expiry date for hands-on courses.",
    ],
    ctas: [
      { label: "View Pricing", href: "/pricing", variant: "default" },
      { label: "Contact Sales", href: "/contact", variant: "outline" },
    ],
  },
];

interface FeatureCardProps {
  feature: FeatureCardData;
  onClick: () => void;
}

const FeatureCard = ({ feature, onClick }: FeatureCardProps) => (
  <button
    onClick={onClick}
    className="group rounded-3xl border border-[#EEEAF8] bg-white p-6 lg:p-7 text-left w-full transition-all duration-300 shadow-[0_1px_2px_rgba(20,10,60,0.04)] hover:shadow-[0_18px_40px_-22px_rgba(76,29,149,0.18)] hover:border-[#D6CCF5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(189_94%_30%)] focus-visible:ring-offset-2"
    aria-label={`Learn more about ${feature.title}`}
  >
    <div className="w-10 h-10 rounded-xl bg-[hsl(189_94%_94%)] text-[hsl(189_94%_28%)] flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105">
      {feature.icon}
    </div>
    <h3 className="font-heading font-bold text-[hsl(259_72%_14%)] text-[19px] leading-snug mb-3">
      {feature.title}
    </h3>
    <p className="text-[hsl(259_20%_40%)] text-[14px] leading-relaxed">
      {feature.shortText}
    </p>
  </button>
);

export const FeaturesSection = () => {
  const [selectedFeature, setSelectedFeature] = useState<FeatureCardData | null>(null);
  const navigate = useNavigate();

  return (
    <section className="section-y bg-white relative overflow-hidden">
      {/* Soft ambient corner glow */}
      <div aria-hidden className="pointer-events-none absolute -top-20 right-0 w-[520px] h-[520px] rounded-full bg-[hsl(217_91%_60%/0.08)] blur-[120px]" />

      <div className="section-container relative">
        {/* Editorial header */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 mb-12 lg:mb-14">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-[hsl(189_94%_30%)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(189_94%_30%)]">
                02 / The Difference
              </span>
            </div>
            <h2 className="font-heading text-[34px] sm:text-[42px] lg:text-[52px] leading-[1.05] tracking-tight font-bold text-[hsl(259_72%_14%)]">
              Not another LMS.<br />
              A training partner that<br />
              knows what 3am looks like.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-6">
            <p className="text-[15px] lg:text-base leading-relaxed text-[hsl(259_20%_35%)]">
              Built by clinicians and former care home managers. Every course is written,
              filmed and reviewed by people who have done the work.
            </p>
          </div>
        </div>

        {/* Dark promise band */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B2545] via-[#0E2F5A] to-[#0A1E3D] p-8 sm:p-10 lg:p-14 mb-10 lg:mb-12 shadow-[0_30px_80px_-30px_rgba(11,37,69,0.5)]">
          <div aria-hidden className="absolute -top-24 -left-16 w-[420px] h-[420px] rounded-full bg-[hsl(217_91%_60%/0.18)] blur-[140px]" />
          <div aria-hidden className="absolute -bottom-24 -right-10 w-[360px] h-[360px] rounded-full bg-[hsl(38_92%_50%/0.10)] blur-[140px]" />

          <div className="relative text-white max-w-3xl">
            <div className="flex items-center gap-2 mb-5 text-[hsl(38_92%_60%)]">
              <span className="text-base leading-none">−</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.22em]">
                The Special People Promise
              </span>
            </div>
            <h3 className="font-heading text-[28px] sm:text-[34px] lg:text-[40px] leading-[1.1] font-bold tracking-tight">
              Your staff deserve training that{" "}
              <span className="text-[hsl(38_92%_55%)]">respects their time,</span> their
              intelligence, and the weight they carry.
            </h3>

            <div className="grid sm:grid-cols-2 gap-8 mt-10 pt-8 border-t border-white/15">
              <div>
                <div className="font-heading text-[44px] lg:text-[56px] font-bold leading-none text-white tabular-nums">
                  12<span className="text-[hsl(38_92%_60%)]">m</span>
                </div>
                <p className="text-[13px] text-white/70 leading-relaxed mt-3 max-w-xs">
                  Average module length. Designed for handover, not all-day classroom blocks.
                </p>
              </div>
              <div>
                <div className="font-heading text-[44px] lg:text-[56px] font-bold leading-none text-white tabular-nums">
                  87<span className="text-[hsl(38_92%_60%)]">%</span>
                </div>
                <p className="text-[13px] text-white/70 leading-relaxed mt-3 max-w-xs">
                  Of learners say they finish modules on shift. We built this for rotas, not desks.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {featuresData.map((feature, index) => (
            <div
              key={index}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <FeatureCard
                feature={feature}
                onClick={() => setSelectedFeature(feature)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Feature Detail Modal */}
      <Dialog open={!!selectedFeature} onOpenChange={(open) => !open && setSelectedFeature(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedFeature && (
            <>
              <DialogHeader>
                <div className="w-12 h-12 rounded-xl bg-[hsl(189_94%_94%)] text-[hsl(189_94%_28%)] flex items-center justify-center mb-4">
                  {selectedFeature.icon}
                </div>
                <DialogTitle className="text-xl">{selectedFeature.modalHeading}</DialogTitle>
                <DialogDescription className="sr-only">
                  Details about {selectedFeature.title}
                </DialogDescription>
              </DialogHeader>

              <ul className="space-y-3 my-4">
                {selectedFeature.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="text-primary mt-1 shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                {selectedFeature.ctas.map((cta, idx) => (
                  <Button
                    key={idx}
                    variant={cta.variant}
                    onClick={() => {
                      setSelectedFeature(null);
                      navigate(cta.href);
                    }}
                    className="flex-1"
                  >
                    {cta.label}
                  </Button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
