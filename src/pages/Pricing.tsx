import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Individual",
    description: "Perfect for personal learning or family use",
    price: "£29",
    period: "per month",
    features: [
      "Access to all self-paced courses",
      "Progress tracking dashboard",
      "Downloadable resources",
      "Certificate of completion",
      "Email support",
      "Mobile-friendly access"
    ],
    cta: "Start Free Trial",
    href: "/auth",
    popular: false
  },
  {
    name: "Team",
    description: "For small teams and care organizations",
    price: "£149",
    period: "per month",
    features: [
      "Everything in Individual, plus:",
      "Up to 25 learner accounts",
      "Team progress reporting",
      "Regulated certification options",
      "Priority email support",
      "Admin dashboard",
      "Custom learning paths",
      "Bulk enrollment tools"
    ],
    cta: "Request a Demo",
    href: "/contact",
    popular: true
  },
  {
    name: "Enterprise",
    description: "For large organizations with advanced needs",
    price: "Custom",
    period: "contact for pricing",
    features: [
      "Everything in Team, plus:",
      "Unlimited learner accounts",
      "Dedicated account manager",
      "Custom course development",
      "API access & integrations",
      "Single Sign-On (SSO)",
      "Advanced analytics & reporting",
      "On-site training options",
      "SLA with guaranteed uptime"
    ],
    cta: "Talk to Sales",
    href: "/contact",
    popular: false
  }
];

const faqs = [
  {
    question: "Can I try Special People Academy before committing?",
    answer: "Yes! We offer a 14-day free trial for Individual and Team plans. You'll have full access to all features so you can experience the platform before making a decision. No credit card required to start."
  },
  {
    question: "What's included in regulated certification?",
    answer: "Regulated certifications are official qualifications recognized by industry bodies. They typically include a proctored assessment and carry a small additional fee (usually £15 per certificate). These are ideal for professional development and compliance requirements."
  },
  {
    question: "How does billing work for Team plans?",
    answer: "Team plans are billed monthly or annually (with a 20% discount for annual billing). You can add or remove learner seats at any time, and your bill will be prorated accordingly."
  },
  {
    question: "What if I need more than 25 learners but not full Enterprise features?",
    answer: "We offer flexible Team+ packages for organizations that need more seats without the full Enterprise suite. Contact our sales team to discuss a custom package that fits your needs."
  },
  {
    question: "Do you offer discounts for non-profits or schools?",
    answer: "Yes, we offer significant discounts for registered charities, schools, and non-profit organizations. Please contact our team with proof of your organization's status to learn about available discounts."
  },
  {
    question: "Can I switch plans later?",
    answer: "Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you'll get immediate access to new features. When downgrading, the change takes effect at your next billing cycle."
  }
];

export default function Pricing() {
  return (
    <MarketingLayout
      title="Pricing"
      description="Flexible pricing plans for individuals, teams, and enterprises. Start your free trial today and discover accessible, inclusive learning with Special People Academy."
    >
      <PageHero
        badge="Simple, Transparent Pricing"
        title="Plans That Grow With You"
        subtitle="Whether you're an individual learner, a small team, or a large organization, we have a plan that fits your needs and budget."
      />

      {/* Pricing Cards */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index}
                className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-center mb-6">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    asChild 
                    className="w-full" 
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <Link to={plan.href}>
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Note */}
      <section className="py-12 px-6 bg-muted/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            All Plans Include
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "WCAG-compliant platform",
              "Regular content updates",
              "Secure data handling",
              "24/7 platform access"
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-center gap-2 p-4 bg-background rounded-lg">
                <Check className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQSection 
        title="Pricing FAQs"
        subtitle="Have questions about our plans? We've got answers."
        faqs={faqs} 
      />

      <CTABanner
        title="Not Sure Which Plan Is Right for You?"
        subtitle="Our team can help you choose the perfect plan for your organization's needs and budget."
        primaryCTA={{ text: "Talk to Our Team", href: "/contact" }}
        secondaryCTA={{ text: "Start Free Trial", href: "/auth" }}
      />
    </MarketingLayout>
  );
}
