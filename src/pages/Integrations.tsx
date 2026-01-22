import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Database, 
  Users, 
  Calendar, 
  FileSpreadsheet, 
  MessageSquare, 
  Video,
  Shield,
  Zap,
  Settings
} from "lucide-react";

const integrations = [
  {
    icon: Users,
    name: "HR Systems",
    description: "Connect with popular HR platforms to automatically sync employee data, track training compliance, and streamline onboarding.",
    examples: "BambooHR, Workday, SAP SuccessFactors"
  },
  {
    icon: Calendar,
    name: "Calendar Apps",
    description: "Sync training schedules with learners' calendars for automated reminders and easy scheduling of practical sessions.",
    examples: "Google Calendar, Outlook, Apple Calendar"
  },
  {
    icon: Database,
    name: "Learning Management Systems",
    description: "Integrate with existing LMS platforms to centralize training records and provide a unified learning experience.",
    examples: "Moodle, Canvas, Blackboard"
  },
  {
    icon: FileSpreadsheet,
    name: "Reporting & Analytics",
    description: "Export data to your preferred analytics tools for custom reporting, compliance tracking, and insights.",
    examples: "Power BI, Tableau, Google Data Studio"
  },
  {
    icon: MessageSquare,
    name: "Communication Tools",
    description: "Send notifications and updates through the channels your team already uses for seamless communication.",
    examples: "Slack, Microsoft Teams, Email"
  },
  {
    icon: Video,
    name: "Video Conferencing",
    description: "Launch virtual training sessions directly from the platform with integrated video conferencing tools.",
    examples: "Zoom, Google Meet, Microsoft Teams"
  }
];

const apiFeatures = [
  {
    icon: Zap,
    title: "RESTful API",
    description: "A comprehensive API that allows you to manage users, courses, enrollments, and reporting programmatically."
  },
  {
    icon: Shield,
    title: "Secure Authentication",
    description: "OAuth 2.0 and API key authentication options to keep your integrations secure and compliant."
  },
  {
    icon: Settings,
    title: "Webhooks",
    description: "Real-time notifications for course completions, certificate issuance, and other key events in your training program."
  }
];

const faqs = [
  {
    question: "How do I set up an integration?",
    answer: "Most integrations can be configured directly from your admin dashboard. Navigate to Settings > Integrations, select the platform you want to connect, and follow the setup wizard. For enterprise integrations, our support team can assist with custom configurations."
  },
  {
    question: "Is there a cost for using integrations?",
    answer: "Basic integrations are included in all plans at no additional cost. Some advanced integrations and custom API access may require a Team or Enterprise plan. Check our pricing page for details on what's included in each plan."
  },
  {
    question: "Can I build custom integrations?",
    answer: "Yes! Enterprise customers have access to our full API and can build custom integrations to connect Special People Academy with any system. We also offer professional services for organizations that need help building custom solutions."
  },
  {
    question: "How is data synced between systems?",
    answer: "Data syncs happen in real-time for most integrations. When a learner completes a course, that information is immediately available in connected systems. For bulk data operations, we offer scheduled syncs to minimize system load."
  },
  {
    question: "What security measures protect integrated data?",
    answer: "All data transfers use TLS encryption. We follow the principle of least privilege, only requesting access to the data needed for each integration. Our platform is SOC 2 compliant and undergoes regular security audits."
  }
];

export default function Integrations() {
  return (
    <MarketingLayout
      title="Integrations"
      description="Connect Special People Academy with your existing tools. Integrate with HR systems, calendars, LMS platforms, and more for seamless training management."
    >
      <PageHero
        badge="Integrations"
        title="Connect Your Entire Training Ecosystem"
        subtitle="Special People Academy works seamlessly with the tools you already use. Automate workflows, sync data, and create a unified training experience."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ text: "View API Docs", href: "/help-center" }}
      />

      {/* Integrations Grid */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Popular Integrations
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Connect with the platforms your organization already relies on for a seamless experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {integrations.map((integration, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <integration.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{integration.name}</CardTitle>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Examples: </span>
                    {integration.examples}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* API Section */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Build Custom Integrations
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our developer-friendly API gives you full control to create custom workflows and integrations.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {apiFeatures.map((feature, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQSection 
        title="Integration FAQs"
        faqs={faqs} 
      />

      <CTABanner
        title="Need a Custom Integration?"
        subtitle="Our team can help you connect Special People Academy with any system your organization uses."
        primaryCTA={{ text: "Talk to Our Team", href: "/contact" }}
      />
    </MarketingLayout>
  );
}
