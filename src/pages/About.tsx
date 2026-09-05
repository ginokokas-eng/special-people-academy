import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Brain, 
  Users, 
  Target,
  CheckCircle,
  Shield
} from "@/components/icons";

const values = [
  {
    icon: Heart,
    title: "Person-first, always",
    description: "Training written the way good care is given: plain language, respect for the people being supported, and respect for the staff doing the work."
  },
  {
    icon: Shield,
    title: "Safe practice first",
    description: "Our courses are policy-led. We teach what safe practice looks like, where the limits of a care role sit, and when to stop and escalate."
  },
  {
    icon: Brain,
    title: "Built with practitioners",
    description: "Content is shaped with experienced care and clinical staff, so it matches the reality of a shift rather than a textbook."
  },
  {
    icon: Users,
    title: "Made for whole teams",
    description: "Managers can see who is trained, what is outstanding and what is due for renewal, without chasing paperwork."
  },
  {
    icon: Target,
    title: "Evidence you can show",
    description: "Every completion produces a verifiable certificate, so CQC readiness is a by-product of doing the training properly."
  }
];



const inclusiveTrainingPoints = [
  "Plain-English content written for busy care staff",
  "Captions and transcripts on video lessons",
  "Learners work at their own pace and keep their place",
  "Short lessons that fit around a shift",
  "Scenario questions drawn from real care situations",
  "Practical sign-off by a trainer where competency must be observed"
];

export default function About() {
  return (
    <MarketingLayout 
      title="About us" 
      description="CPD training for UK care providers: person-first courses, verifiable certificates and a clear view of team compliance."
    >
      <PageHero 
        badge="About Us" 
        title="Training built by care people, for care people" 
        subtitle="Special People Training provides CPD training for UK care providers — clear, policy-led courses that help staff practise safely and help managers stay inspection-ready."
        primaryCTA={{ text: "Browse courses", href: "/courses" }}
        secondaryCTA={{ text: "Talk to sales", href: "/contact?tab=sales" }}
      />

      {/* Mission Section */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Our Mission</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Training that holds up on a real shift — and in an inspection
            </h2>
          </div>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>
              Care staff deserve training that respects their time and prepares them for the situations they
              actually meet. Special People Training was built to provide exactly that: CPD courses for care
              homes, domiciliary care and supported living services across the UK.
            </p>
            <p>
              Our courses are policy-led. They teach what safe practice looks like, where a care role's limits
              sit and when to stop and escalate. Where competency has to be observed, a trainer signs the
              learner off in person before a competency certificate is issued.
            </p>
            <p>
              For managers, the same work produces the evidence: completions, renewal dates and verifiable
              certificates, so CQC readiness stops being a spreadsheet exercise.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Our Values</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              What guides everything we build
            </h2>
          </div>
          
          {/* Five values: the first two share a wider row, the last three sit in a
              three-up row, so no slot is ever left empty. */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
            {values.map((value, index) => (
              <Card
                key={value.title}
                className={`border-none shadow-sm ${index < 2 ? 'lg:col-span-3' : 'lg:col-span-2'}`}
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What We Mean by Inclusive Training */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Our courses</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              What our courses are like
            </h2>
            <p className="text-lg text-muted-foreground">
              Short, practical lessons that a member of staff can finish between visits, with assessments
              that check understanding rather than memory.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inclusiveTrainingPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accessibility Commitment */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Our Accessibility Commitment</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                We want every member of staff to be able to complete their training, including those who
                use assistive technology. We build towards WCAG 2.1 AA and fix barriers as we find them.
              </p>
              <p className="text-muted-foreground">
                That means keyboard navigation, screen reader support, captions and transcripts on video
                lessons, and clear, predictable layouts. If something gets in your way, please tell us.
              </p>
              <p className="text-sm text-muted-foreground italic">
                Accessibility is never "done." We're always learning and improving.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <CTABanner 
        title="Ready to work together?" 
        subtitle="Browse the course catalogue, or talk to us about training your team."
        primaryCTA={{ text: "Browse courses", href: "/courses" }} 
        secondaryCTA={{ text: "Talk to sales", href: "/contact?tab=sales" }}
      />
    </MarketingLayout>
  );
}
