import { Shield, Zap, Target, Award } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    icon: <Shield className="h-6 w-6" />,
    title: "Compliance Ready (CQC & Ofsted Aligned)",
    shortText: "Stay inspection-ready with training mapped to real-world requirements, robust evidence, and clear audit trails.",
    modalHeading: "Compliance you can evidence",
    bullets: [
      "CQC-aligned training oversight: clear records of who trained, when, and competency status.",
      "Ofsted-aware practice: safeguarding, behaviour support, and care standards reflected in course design (where relevant to children's services).",
      "Governance-friendly reporting: downloadable training matrices, attendance logs, and refresher alerts.",
      "Policy-linked learning: connect courses to your internal policies/procedures (Safeguarding, MCA, medication, epilepsy, first aid, etc.).",
      "Audit trail: version control for materials and certificates, so you can demonstrate continuous improvement.",
    ],
    ctas: [
      { label: "View Courses", href: "/courses", variant: "default" },
      { label: "Contact Sales", href: "/contact", variant: "outline" },
    ],
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Microlearning that fits shift work",
    shortText: "Short, focused learning blocks designed for busy carers, nurses, and support teams—without compromising quality.",
    modalHeading: "Learning built for the realities of care",
    bullets: [
      "Bite-sized lessons (5–15 minutes) to reduce training fatigue.",
      "Mobile-friendly access for staff on different shifts and locations.",
      "Knowledge checks to confirm understanding (quick quizzes / scenario questions).",
      "Practical focus: what to do, what to record, what to escalate.",
      "Blended learning options: combine online learning + in-person practical competency where required.",
    ],
    ctas: [
      { label: "See how it works", href: "/features", variant: "default" },
      { label: "Browse training", href: "/courses", variant: "outline" },
    ],
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: "Personalized Paths for each role",
    shortText: "Role-based learning journeys for support workers, senior carers, nurses, and therapists—tailored to service needs.",
    modalHeading: "Role-specific learning journeys (not one-size-fits-all)",
    bullets: [
      "Role pathways: Support Worker, Senior Support Worker, Team Lead, Registered Nurse, Healthcare Assistant, Physiotherapy/Allied roles (as applicable).",
      "Client-specific add-ons: match training to complex needs (epilepsy rescue meds, PEG/enteral feeding, anaphylaxis, PBS).",
      "Skills gap tracking: identify what's missing and assign the next module automatically (or via admin).",
      "Refresher schedules: automated reminders for annual/bi-annual renewals based on course type.",
      "Manager oversight: coordinators and clinical leads can monitor progress by team, site, or client package.",
    ],
    ctas: [
      { label: "Talk to us about pathways", href: "/contact", variant: "default" },
      { label: "Enterprise options", href: "/enterprise", variant: "outline" },
    ],
  },
  {
    icon: <Award className="h-6 w-6" />,
    title: "Verified Certificates (CPD Provider)",
    shortText: "Industry-recognised certification and clear proof of learning—easy to share, store, and audit.",
    modalHeading: "Certificates that mean something",
    bullets: [
      "CPD provider approach: deliver structured learning with clear outcomes and CPD hours (where applicable).",
      "Certificates include: learner name, course title, learning outcomes, CPD hours (if CPD-certified), completion date, and certificate ID.",
      "Download anytime: PDF certificates stored in the learner profile for quick access.",
      "Manager view: export certificates for tenders, audits, and compliance packs.",
      "Practical competency sign-off: for hands-on courses, include assessor sign-off and expiry date.",
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
    className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 text-left w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    aria-label={`Learn more about ${feature.title}`}
  >
    <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground mb-4 group-hover:scale-110 transition-transform">
      {feature.icon}
    </div>
    <h3 className="font-semibold text-foreground text-lg mb-2">{feature.title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{feature.shortText}</p>
    <span className="inline-flex items-center text-primary text-sm font-medium mt-3 group-hover:underline">
      Learn more →
    </span>
  </button>
);

export const FeaturesSection = () => {
  const [selectedFeature, setSelectedFeature] = useState<FeatureCardData | null>(null);
  const navigate = useNavigate();

  return (
    <section className="py-20 px-6 bg-secondary/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Why Choose Special People Academy
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to build an inclusive culture of continuous learning and personal development.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresData.map((feature, index) => (
            <div
              key={index}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
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
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground mb-4">
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
