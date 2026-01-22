import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Video, 
  Calendar, 
  FolderOpen, 
  BarChart3, 
  MessageSquare,
  FileSpreadsheet,
  Webhook,
  Code,
  Lock,
  Phone,
  Settings,
  TestTube,
  Rocket,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const integrationCategories = [
  {
    icon: ShieldCheck,
    title: "Authentication & SSO",
    description: "Secure access with single sign-on using SAML or OIDC protocols. Simplify login for staff and reduce password fatigue.",
    examples: "Google Workspace, Microsoft Entra ID, Okta, OneLogin"
  },
  {
    icon: Video,
    title: "Video & Virtual Sessions",
    description: "Connect live training sessions and embed video resources directly into learning plans.",
    examples: "Zoom, Microsoft Teams, Google Meet"
  },
  {
    icon: Calendar,
    title: "Calendar & Scheduling",
    description: "Keep training sessions consistent with calendar sync. Schedule reminders and track attendance.",
    examples: "Google Calendar, Microsoft Outlook, Apple Calendar"
  },
  {
    icon: FolderOpen,
    title: "Storage & Content",
    description: "Organize PDFs, videos, and resources in your existing cloud storage and link them to lessons.",
    examples: "Google Drive, OneDrive, Dropbox, SharePoint"
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description: "Export progress data and visualize learner outcomes in your preferred business intelligence tools.",
    examples: "Power BI, Google Data Studio, Tableau"
  },
  {
    icon: MessageSquare,
    title: "Messaging & Collaboration",
    description: "Keep teams aligned with notifications and updates in the tools they already use daily.",
    examples: "Slack, Microsoft Teams, Email"
  }
];

const apiFeatures = [
  {
    icon: FileSpreadsheet,
    title: "CSV Export",
    description: "Download learner profiles, progress reports, and activity logs in standard CSV format for use in spreadsheets or other systems."
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description: "Receive real-time notifications when key events occur—like lesson completions or milestone achievements—to trigger workflows in external systems.",
    badge: "Enterprise"
  },
  {
    icon: Code,
    title: "REST API",
    description: "Programmatically access learner data, manage enrollments, and sync information with your existing systems through our documented API.",
    badge: "Enterprise"
  },
  {
    icon: Lock,
    title: "Data Portability",
    description: "You own your data. Export everything at any time in standard formats. We support full data portability and never lock you in."
  }
];

const implementationSteps = [
  {
    icon: Phone,
    step: "1",
    title: "Discovery Call",
    description: "We learn about your current systems, workflows, and integration requirements to plan the best approach."
  },
  {
    icon: Settings,
    step: "2",
    title: "Configuration & Setup",
    description: "Our team configures connections, maps data fields, and sets up authentication in a staging environment."
  },
  {
    icon: TestTube,
    step: "3",
    title: "Testing & Validation",
    description: "We run thorough tests to ensure data flows correctly and meets your security requirements."
  },
  {
    icon: Rocket,
    step: "4",
    title: "Go Live & Monitor",
    description: "Launch with confidence and ongoing monitoring to ensure everything runs smoothly."
  }
];

const faqs = [
  {
    question: "Do you support Single Sign-On (SSO)?",
    answer: "Yes. Our Organization and Enterprise plans support SAML 2.0 and OIDC protocols, which work with most common identity providers. This allows your staff and caregivers to log in using their existing organizational credentials without managing separate passwords."
  },
  {
    question: "Can we export progress reports?",
    answer: "Absolutely. All plans include the ability to export progress data in PDF and CSV formats. You can generate reports for individual learners, groups, or your entire program. Enterprise plans also include scheduled automated exports."
  },
  {
    question: "Can we integrate with our existing LMS?",
    answer: "We can work with many learning management systems through our API and export capabilities. During the discovery call, we'll assess compatibility with your specific LMS and recommend the best integration approach—whether that's data sync, embedded views, or complementary use."
  },
  {
    question: "Do you have an API?",
    answer: "Yes. Our REST API is available on Enterprise plans and provides programmatic access to learner data, progress tracking, and enrollment management. We provide comprehensive documentation and support during implementation."
  },
  {
    question: "How long does integration setup take?",
    answer: "Most standard integrations (SSO, calendar sync) can be configured within 1–2 weeks. More complex setups involving custom API work or multiple systems typically take 3–4 weeks. We'll provide a timeline estimate during your discovery call."
  }
];

export default function Integrations() {
  return (
    <MarketingLayout
      title="Integrations"
      description="Connect SPA with the tools you already use—SSO, video conferencing, calendars, storage, and reporting."
    >
      <PageHero
        badge="Connect Your Tools"
        title="Integrations that fit into your workflow"
        subtitle="Bring Special People Academy into the tools your team already uses—so adoption is easier and reporting is smoother."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ text: "Contact Us", href: "/contact" }}
      />

      {/* Integration Categories */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Integration Categories
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect SPA with the systems your organization relies on. We focus on compatibility with widely-used platforms.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrationCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <CardDescription className="text-base">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Common examples include:</span>{" "}
                      {category.examples}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Specific vendor compatibility depends on your plan and requirements. Contact us to confirm options for your setup.
          </p>
        </div>
      </section>

      {/* API & Data Export */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              API & Data Export
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your data belongs to you. We make it easy to export, connect, and integrate with your existing systems.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {apiFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="relative">
                  {feature.badge && (
                    <div className="absolute top-4 right-4">
                      <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {feature.badge}
                      </span>
                    </div>
                  )}
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-10 p-6 bg-background rounded-xl border text-center">
            <p className="text-foreground font-medium mb-2">
              Data Ownership Commitment
            </p>
            <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
              We believe in data portability and transparency. You can export your complete data—learner profiles, 
              progress records, and resources—at any time in standard formats. No lock-in, no hidden restrictions.
            </p>
          </div>
        </div>
      </section>

      {/* Implementation Support */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Implementation Support
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our team guides you through every step of the integration process, from initial planning to go-live and beyond.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {implementationSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="relative mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-7 w-7 text-primary" />
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 p-6 bg-muted/50 rounded-xl border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Security Review Support
                </h3>
                <p className="text-muted-foreground text-sm">
                  For organizations with security requirements, we provide documentation and support for your IT and compliance review process.
                </p>
              </div>
              <Button asChild variant="outline" className="flex-shrink-0">
                <Link to="/contact">
                  Request Security Info
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <FAQSection
        title="Integration FAQs"
        subtitle="Common questions about connecting SPA with your existing tools."
        faqs={faqs}
      />

      <CTABanner
        title="Need a specific integration?"
        subtitle="Tell us what tools you use—we'll confirm options and recommend the best path for your organization."
        primaryCTA={{ text: "Contact Integrations Team", href: "/contact" }}
      />
    </MarketingLayout>
  );
}
