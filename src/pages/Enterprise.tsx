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
  Handshake,
  BookOpen,
  CalendarCheck,
  School,
  Network,
  Heart,
  Briefcase,
  Layers,
  UserCog,
  FileText,
  CheckCircle
} from "lucide-react";

const enterpriseNeeds = [
  {
    icon: Building2,
    title: "Multi-Site Management",
    description: "Manage learners, staff, and training programs across multiple locations from a single dashboard. Keep data organized by site while maintaining central oversight."
  },
  {
    icon: UserCog,
    title: "Roles & Permissions",
    description: "Control who sees and manages what with flexible role-based access. Assign site admins, trainers, caregivers, and observers with appropriate permissions."
  },
  {
    icon: Layers,
    title: "Standardized Templates",
    description: "Create and deploy consistent learning plans across your organization. Build templates once, then adapt them for individual learners while maintaining quality standards."
  },
  {
    icon: BarChart3,
    title: "Advanced Reporting",
    description: "Generate detailed reports across all sites and programs. Track compliance, monitor progress trends, and export data for board reports and audits."
  }
];

const securityFeatures = [
  {
    icon: Lock,
    title: "Role-Based Access Controls",
    description: "Define precise permissions for different user types. Ensure staff only access the data and features relevant to their role."
  },
  {
    icon: FileCheck,
    title: "Audit-Friendly Activity Tracking",
    description: "Maintain a detailed log of key actions for compliance and accountability. Available as an add-on for organizations with regulatory requirements."
  },
  {
    icon: FileText,
    title: "Data Export & Retention Controls",
    description: "Set data retention policies that align with your compliance needs. Export data in standard formats at any time."
  },
  {
    icon: Shield,
    title: "Secure Access Practices",
    description: "Designed with industry-standard security practices including encryption in transit and at rest, secure authentication, and regular security reviews."
  }
];

const implementationSupport = [
  {
    icon: Users,
    title: "Dedicated Onboarding",
    description: "A dedicated implementation specialist guides your rollout, handling configuration, data setup, and testing."
  },
  {
    icon: GraduationCap,
    title: "Staff Training Sessions",
    description: "Live training sessions for your administrators, trainers, and caregivers—tailored to their specific roles and workflows."
  },
  {
    icon: BookOpen,
    title: "Adoption Playbooks",
    description: "Proven rollout guides and communication templates to drive adoption across your organization."
  },
  {
    icon: CalendarCheck,
    title: "Ongoing Check-Ins",
    description: "Regular success reviews to monitor adoption, address questions, and optimize your use of the platform."
  }
];

const useCases = [
  {
    icon: School,
    title: "School Districts",
    problem: "Managing individualized learning across many schools with varying staff capacity.",
    solution: "Central oversight with site-level management. Standardized templates, shared reporting, and consistent training quality across all schools."
  },
  {
    icon: Network,
    title: "Provider Networks",
    problem: "Coordinating training and compliance across multiple care providers or service locations.",
    solution: "Multi-site dashboards, role-based access for different provider staff, and consolidated reporting for network-wide compliance."
  },
  {
    icon: Heart,
    title: "Non-Profits & Community Programs",
    problem: "Limited resources, diverse learner needs, and the need for clear impact reporting.",
    solution: "Affordable enterprise options, accessible content for diverse populations, and progress tracking that demonstrates program outcomes."
  },
  {
    icon: Briefcase,
    title: "Workforce Readiness Programs",
    problem: "Preparing individuals for employment with structured skill-building and progress documentation.",
    solution: "Life skills and job readiness lessons, progress certificates, and reports that support transition planning and funding requirements."
  }
];

const faqs = [
  {
    question: "Can we use our own domain?",
    answer: "Yes. Enterprise customers can access the platform through a custom subdomain (e.g., training.yourorganization.com). Full white-label options with custom branding are also available."
  },
  {
    question: "Do you support Single Sign-On (SSO)?",
    answer: "Yes. We support SAML 2.0 and OIDC protocols, which work with most common identity providers including Microsoft Entra ID, Google Workspace, Okta, and others. Our team handles the technical configuration."
  },
  {
    question: "Can we segment learners by site or group?",
    answer: "Absolutely. You can organize learners into sites, locations, classrooms, or custom groups. Each group can have its own administrators and staff while rolling up to central reporting."
  },
  {
    question: "What reporting is available?",
    answer: "Enterprise includes advanced reporting with cross-site analytics, learner progress summaries, compliance tracking, and custom report builders. Reports can be scheduled for automatic delivery and exported in PDF or CSV formats."
  },
  {
    question: "Do you offer an SLA?",
    answer: "Yes. Enterprise agreements include service level commitments covering uptime, support response times, and issue resolution. We'll discuss specific SLA terms during the sales process based on your requirements."
  },
  {
    question: "Can we run a pilot before full rollout?",
    answer: "Absolutely. We encourage pilots to ensure the platform meets your needs. We'll work with you to define pilot scope, success criteria, and a clear path to full deployment."
  }
];

export default function Enterprise() {
  return (
    <MarketingLayout
      title="Enterprise"
      description="Enterprise-ready training management with advanced admin, reporting, and support—built for schools, providers, and multi-site programs."
    >
      <PageHero
        badge="Enterprise Solutions"
        title="Enterprise-ready training for programs at scale"
        subtitle="Manage multiple sites, teams, and learner groups with structured admin tools, reporting, and implementation support."
        primaryCTA={{ text: "Talk to Enterprise", href: "/contact" }}
        secondaryCTA={{ text: "Request a Demo", href: "/contact" }}
      />

      {/* What Enterprise Teams Need */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Enterprise Teams Need—And How SPA Helps
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for organizations managing training across multiple sites, teams, and learner populations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
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
              Security & Administration
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Designed with organizational security and compliance needs in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
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
            We can provide security documentation and participate in your vendor assessment process.
          </p>
        </div>
      </section>

      {/* Implementation & Success */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Implementation & Success
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our team is with you from planning through rollout and beyond.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              Use Cases
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Organizations across sectors use SPA to deliver consistent, accessible training at scale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
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
                      <p className="text-sm font-medium text-foreground mb-1">How SPA helps:</p>
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
        title="Enterprise FAQs"
        subtitle="Common questions about enterprise deployments and capabilities."
        faqs={faqs}
      />

      <CTABanner
        title="Let's plan your rollout"
        subtitle="Tell us about your organization and goals—we'll help you design a deployment that works."
        primaryCTA={{ text: "Schedule a Call", href: "/contact" }}
        secondaryCTA={{ text: "See Case Studies", href: "/case-studies" }}
      />
    </MarketingLayout>
  );
}
