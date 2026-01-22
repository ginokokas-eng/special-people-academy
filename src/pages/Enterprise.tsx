import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import { 
  Building2, 
  Shield, 
  Users, 
  BarChart3, 
  Headphones, 
  Lock,
  Paintbrush,
  Globe,
  CheckCircle
} from "lucide-react";

const enterpriseFeatures = [
  {
    icon: Users,
    title: "Unlimited Learners",
    description: "Scale your training program to any size without per-seat limitations. Add learners as your organization grows."
  },
  {
    icon: Lock,
    title: "Single Sign-On (SSO)",
    description: "Integrate with your identity provider for seamless, secure access. Support for SAML 2.0 and OAuth."
  },
  {
    icon: Shield,
    title: "Advanced Security",
    description: "Enterprise-grade security with data encryption, audit logs, and compliance with GDPR, HIPAA, and SOC 2."
  },
  {
    icon: Paintbrush,
    title: "Custom Branding",
    description: "White-label the platform with your organization's logo, colors, and domain for a seamless brand experience."
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Deep insights into learning outcomes, engagement metrics, and compliance tracking with customizable dashboards."
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description: "A dedicated account manager and priority support team ensure your success at every step."
  },
  {
    icon: Building2,
    title: "Custom Course Development",
    description: "Our instructional design team can create bespoke training content tailored to your organization's specific needs."
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description: "Deliver training in multiple languages to support diverse workforces and global operations."
  }
];

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "24/7", label: "Priority Support" },
  { value: "100+", label: "Enterprise Clients" },
  { value: "<2hr", label: "Response Time" }
];

const faqs = [
  {
    question: "What makes the Enterprise plan different from Team?",
    answer: "Enterprise includes unlimited learner seats, dedicated account management, custom branding, SSO/SAML integration, advanced security features, custom course development, and a guaranteed SLA. It's designed for large organizations with complex requirements."
  },
  {
    question: "Can you develop custom courses for our organization?",
    answer: "Yes, our instructional design team specializes in creating accessible, inclusive training content. We work with your subject matter experts to develop courses that address your specific training needs while maintaining our high accessibility standards."
  },
  {
    question: "How does SSO integration work?",
    answer: "We support SAML 2.0 and OAuth 2.0 protocols, allowing seamless integration with identity providers like Okta, Azure AD, Google Workspace, and others. Our team handles the technical setup to ensure a smooth rollout for your users."
  },
  {
    question: "What compliance certifications do you have?",
    answer: "Special People Academy is SOC 2 Type II compliant and follows GDPR requirements. We can provide detailed security documentation and participate in your vendor assessment process. For healthcare organizations, we offer BAA agreements for HIPAA compliance."
  },
  {
    question: "How long does enterprise implementation take?",
    answer: "Typical implementation takes 4-8 weeks, depending on the complexity of integrations and customizations required. We assign a dedicated implementation team to guide you through the process and ensure a successful launch."
  },
  {
    question: "Can we have a dedicated environment?",
    answer: "Yes, for organizations with specific data residency or isolation requirements, we offer dedicated infrastructure options. This ensures your data is completely separated from other customers and can meet specific regulatory requirements."
  }
];

export default function Enterprise() {
  return (
    <MarketingLayout
      title="Enterprise"
      description="Enterprise-grade training solutions for large organizations. Custom courses, SSO, advanced security, and dedicated support from Special People Academy."
    >
      <PageHero
        badge="Enterprise Solutions"
        title="Training at Scale, Without Compromise"
        subtitle="Special People Academy Enterprise gives large organizations the power, flexibility, and security they need to deliver inclusive training across their entire workforce."
        primaryCTA={{ text: "Talk to Sales", href: "/contact" }}
        secondaryCTA={{ text: "View Features", href: "/features" }}
      />

      {/* Stats */}
      <section className="py-12 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Enterprise-Grade Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to deploy accessible training across your organization with confidence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {enterpriseFeatures.map((feature, index) => (
              <div key={index} className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by Leading Organizations
            </h2>
            <p className="text-lg text-muted-foreground">
              From healthcare providers to educational institutions, organizations across industries trust Special People Academy for their inclusive training needs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-background p-8 rounded-xl border">
              <h3 className="font-semibold text-foreground mb-4">Security & Compliance</h3>
              <ul className="space-y-3">
                {[
                  "SOC 2 Type II certified",
                  "GDPR compliant",
                  "HIPAA ready with BAA",
                  "Regular penetration testing",
                  "Data encryption at rest and in transit"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-background p-8 rounded-xl border">
              <h3 className="font-semibold text-foreground mb-4">Implementation Support</h3>
              <ul className="space-y-3">
                {[
                  "Dedicated implementation manager",
                  "Custom onboarding program",
                  "Data migration assistance",
                  "Integration configuration",
                  "Train-the-trainer sessions"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <FAQSection 
        title="Enterprise FAQs"
        faqs={faqs} 
      />

      <CTABanner
        title="Ready to Scale Your Training Program?"
        subtitle="Let's discuss how Special People Academy Enterprise can meet your organization's unique needs."
        primaryCTA={{ text: "Schedule a Consultation", href: "/contact" }}
      />
    </MarketingLayout>
  );
}
