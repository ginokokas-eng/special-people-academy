import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  Shield, 
  Users, 
  BarChart3, 
  Lock,
  FileCheck,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Home,
  Stethoscope,
  Heart,
  Layers,
  UserCog,
  FileText,
  FileText
} from "@/components/icons";

const enterpriseNeeds = [
  {
    icon: Building2,
    title: "One place for your whole service",
    description: "Buy training passes for a course, allocate them to staff and see the whole team's position in one organisation portal — across a single home or several."
  },
  {
    icon: UserCog,
    title: "Admins who can act, not just look",
    description: "Your organisation admins invite staff, allocate and reclaim seats, and read their team's records. Visibility stops at your own organisation."
  },
  {
    icon: Layers,
    title: "Consistent, policy-led courses",
    description: "Everyone completes the same course, with the same assessments and the same pass mark, so standards do not vary between shifts or sites."
  },
  {
    icon: BarChart3,
    title: "Compliance you can hand over",
    description: "See who is complete, in progress, due for renewal or overdue, and produce verifiable certificates for inspection."
  }
];

const securityFeatures = [
  {
    icon: Lock,
    title: "Scoped access",
    description: "Learners see their own training. Organisation admins see their own staff. Nothing crosses between organisations."
  },
  {
    icon: FileCheck,
    title: "Verifiable certificates",
    description: "Every certificate carries a verification code that anyone can check, so evidence does not rely on emailed PDFs."
  },
  {
    icon: FileText,
    title: "Records you can export",
    description: "Completion and renewal records can be exported for your own audit files and quality reporting."
  },
  {
    icon: Shield,
    title: "Secure by default",
    description: "Encrypted in transit and at rest, with row-level access rules enforced by the platform rather than the interface."
  }
];

const implementationSupport = [
  {
    icon: Users,
    title: "Set-up support",
    description: "We create your organisation, load your licences and show your admin how to invite staff and allocate seats."
  },
  {
    icon: GraduationCap,
    title: "Admin walkthrough",
    description: "A guided session for the people who will run the training: invitations, seats, renewals and the compliance view."
  },
  {
    icon: BookOpen,
    title: "Rollout guidance",
    description: "Practical help deciding which courses are mandatory for which roles, and how to sequence them."
  },
  {
    icon: CalendarCheck,
    title: "Ongoing reviews",
    description: "Periodic reviews of uptake and renewals so nothing quietly falls out of date."
  }
];

const useCases = [
  {
    icon: Building2,
    title: "Care homes",
    problem: "Keeping mandatory training current across a rota, with new starters arriving all year.",
    solution: "Allocate a pass the day someone starts, and see at a glance who is outstanding or coming up for renewal."
  },
  {
    icon: Heart,
    title: "Domiciliary care",
    problem: "Staff are rarely in one building, so classroom-only training is hard to arrange.",
    solution: "Short online lessons staff complete between visits, with practical sign-off booked only where competency must be observed."
  },
  {
    icon: Home,
    title: "Supported living",
    problem: "Support needs vary by person, and staff need training matched to those needs.",
    solution: "Choose the courses each team needs, including complex needs and specialist care topics, rather than a single fixed bundle."
  },
  {
    icon: Stethoscope,
    title: "NHS trusts",
    problem: "Evidencing consistent CPD for large, mixed teams.",
    solution: "Consistent courses, recorded assessment results and verifiable certificates for every completion."
  }
];

const faqs = [
  {
    question: "How do staff get access?",
    answer: "You buy training passes for a course, and your organisation admin allocates one to each member of staff. They receive an invitation by email, set their name and password, and start straight away."
  },
  {
    question: "What happens if someone leaves?",
    answer: "Revoke their seat. It returns to your licence so you can allocate it to someone else. Certificates already issued stay valid."
  },
  {
    question: "Can we see who has completed what?",
    answer: "Yes. The organisation portal shows your people, their progress and their renewal dates. Your admins have read-only visibility of their own staff's records."
  },
  {
    question: "Do courses expire?",
    answer: "Courses with a renewal period show an expiry date on the certificate and reappear as due for renewal in good time."
  },
  {
    question: "How do practical courses work?",
    answer: "Where competency must be observed, the learner completes the online learning and a trainer signs them off in person. Two certificates are issued: completion, and competency."
  },
  {
    question: "How is it billed?",
    answer: "Organisation licences are quoted directly. Tell us the courses and how many staff, and we will send a quote."
  }
];

export default function Enterprise() {
  return (
    <MarketingLayout
      title="For care providers"
      description="CPD training for UK care providers: allocate courses to your staff, track completion and renewals, and evidence CQC readiness."
    >
      <PageHero
        badge="For care providers"
        title="CPD training for your whole care team"
        subtitle="Buy training passes, allocate them to your staff, and see completion and renewals in one place — ready for inspection."
        primaryCTA={{ text: "Talk to sales", href: "/contact?tab=sales" }}
        secondaryCTA={{ text: "Browse courses", href: "/courses" }}
      />

      {/* What Enterprise Teams Need */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What care providers need, and how we help
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for care homes, domiciliary care, supported living services and NHS teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enterpriseNeeds.map((need, index) => {
              const Icon = need.icon;
              return (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{need.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{need.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security & Administration */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Security and administration
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built around the access rules a care provider needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {securityFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex gap-4 p-6 bg-background rounded-xl border">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
We are happy to answer information governance questions as part of your supplier checks.
          </p>
        </div>
      </section>

      {/* Implementation & Success */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Getting started
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We help you set up, then stay in touch as your team works through the training.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {implementationSupport.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="text-center p-6">
                  <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Who it is for
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The same courses, adapted to how different services work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon;
              return (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{useCase.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">The challenge:</p>
                      <p className="text-sm text-muted-foreground">{useCase.problem}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">How we help:</p>
                      <p className="text-sm text-muted-foreground">{useCase.solution}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <FAQSection
        title="Common questions"
        subtitle="How passes, seats, renewals and sign-off work."
        faqs={faqs}
      />

      <CTABanner
        title="Let's plan your training"
        subtitle="Tell us about your service and the courses your staff need, and we'll put a quote together."
        primaryCTA={{ text: "Talk to sales", href: "/contact?tab=sales" }}
        secondaryCTA={{ text: "Browse courses", href: "/courses" }}
      />
    </MarketingLayout>
  );
}
