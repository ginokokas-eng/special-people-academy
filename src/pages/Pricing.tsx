import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Check, X, ArrowRight, Clock, Users, Rocket, HeartHandshake, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const plans = [
  {
    id: "individual",
    name: "Individual",
    description: "For a caregiver or single learner plan",
    monthlyPrice: 29,
    annualPrice: 24,
    features: [
      "1–3 learner profiles",
      "Basic progress tracking",
      "Core lesson library",
      "Email support",
      "Mobile-friendly access",
      "Downloadable resources"
    ],
    cta: "Subscribe Now",
    popular: false,
    isContact: false
  },
  {
    id: "team",
    name: "Team",
    description: "For small teams and care organizations",
    monthlyPrice: 99,
    annualPrice: 79,
    features: [
      "Up to 15 learners",
      "Everything in Individual, plus:",
      "Shared team dashboards",
      "Basic reporting & exports",
      "Lesson templates library",
      "Priority email support",
      "Custom branding basics"
    ],
    cta: "Subscribe Now",
    popular: true,
    isContact: false
  },
  {
    id: "organization",
    name: "Organization",
    description: "For schools, centers, and programs",
    monthlyPrice: 249,
    annualPrice: 199,
    features: [
      "Up to 100 learners",
      "Everything in Team, plus:",
      "Role-based permissions",
      "Advanced analytics & reporting",
      "Multiple groups/classrooms",
      "Dedicated onboarding session",
      "Phone & chat support"
    ],
    cta: "Subscribe Now",
    popular: false,
    isContact: false
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations with advanced needs",
    monthlyPrice: null,
    annualPrice: null,
    features: [
      "Unlimited learners",
      "Everything in Organization, plus:",
      "Single Sign-On (SSO)",
      "Audit logs & compliance tools",
      "Custom data exports & API",
      "Dedicated success manager",
      "Custom SLA & uptime guarantee",
      "On-site training options"
    ],
    cta: "Talk to Sales",
    popular: false,
    isContact: true
  }
];

const comparisonFeatures = [
  { feature: "Learner profiles", individual: "1–3", team: "Up to 15", organization: "Up to 100", enterprise: "Unlimited" },
  { feature: "Core lesson library", individual: true, team: true, organization: true, enterprise: true },
  { feature: "Progress tracking", individual: "Basic", team: "Basic", organization: "Advanced", enterprise: "Advanced" },
  { feature: "Reporting & exports", individual: false, team: "Basic", organization: "Advanced", enterprise: "Custom" },
  { feature: "Team dashboards", individual: false, team: true, organization: true, enterprise: true },
  { feature: "Role-based permissions", individual: false, team: false, organization: true, enterprise: true },
  { feature: "Multiple groups", individual: false, team: false, organization: true, enterprise: true },
  { feature: "Custom branding", individual: false, team: "Basic", organization: true, enterprise: "Full" },
  { feature: "SSO integration", individual: false, team: false, organization: false, enterprise: true },
  { feature: "Audit logs", individual: false, team: false, organization: false, enterprise: true },
  { feature: "API access", individual: false, team: false, organization: false, enterprise: true },
  { feature: "Dedicated success manager", individual: false, team: false, organization: false, enterprise: true },
  { feature: "Support", individual: "Email", team: "Priority email", organization: "Phone & chat", enterprise: "24/7 dedicated" },
  { feature: "Onboarding", individual: "Self-serve", team: "Self-serve", organization: "Guided session", enterprise: "Custom program" },
];

const onboardingSteps = [
  {
    icon: Clock,
    title: "Day 1: Account Setup",
    description: "Create your account, configure settings, and invite your first team members or caregivers."
  },
  {
    icon: Users,
    title: "Week 1: Add Learners",
    description: "Set up learner profiles, customize goals, and explore the lesson library to build your first plans."
  },
  {
    icon: Rocket,
    title: "Week 2: Go Live",
    description: "Start delivering lessons, tracking progress, and gathering insights from daily activities."
  },
  {
    icon: HeartHandshake,
    title: "Ongoing: Grow & Optimize",
    description: "Review reports, adjust plans based on progress, and expand your program as learners develop."
  }
];

const faqs = [
  {
    question: "Is there a free trial?",
    answer: "Yes! All Individual and Team plans include a 14-day free trial with full access to features. No credit card required to start. Enterprise customers can request a personalized pilot program."
  },
  {
    question: "Can I change plans later?",
    answer: "Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you get immediate access to new features. When downgrading, changes take effect at your next billing cycle. Your data and learner profiles are always preserved."
  },
  {
    question: "How does learner counting work?",
    answer: "A learner is any individual with an active profile in your account. You can archive inactive learners to free up slots, and archived profiles can be reactivated anytime. Team and Organization plans include flexible learner management."
  },
  {
    question: "Do you offer invoices or purchase orders?",
    answer: "Yes. Organization and Enterprise customers can pay via invoice with NET-30 terms. We accept purchase orders and can provide documentation required for institutional procurement processes."
  },
  {
    question: "What support is included?",
    answer: "All plans include access to our Help Center, video tutorials, and community resources. Team plans add priority email support. Organization plans include phone and chat support. Enterprise customers receive 24/7 dedicated support with guaranteed response times."
  },
  {
    question: "Do you offer training for staff?",
    answer: "Organization plans include a guided onboarding session. Enterprise customers receive comprehensive training programs tailored to your team size and needs, including train-the-trainer options and ongoing professional development resources."
  },
  {
    question: "Can we cancel anytime?",
    answer: "Yes. There are no long-term contracts for Individual or Team plans—cancel anytime. Organization and Enterprise agreements may have minimum terms; contact us for details. We'll help you export your data whenever you need."
  },
  {
    question: "Is our data portable?",
    answer: "Absolutely. You own your data. All plans include the ability to export learner profiles, progress reports, and lesson data in standard formats (PDF, CSV). Enterprise plans include API access for custom integrations."
  }
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const annualSavings = 20;

  const handleSubscribe = async (planId: string, isContact: boolean) => {
    if (isContact) {
      navigate("/contact");
      return;
    }

    if (!user) {
      toast.info("Please sign in to subscribe");
      navigate("/auth");
      return;
    }

    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { planId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const renderFeatureValue = (value: boolean | string) => {
    if (value === true) {
      return <Check className="h-5 w-5 text-accent mx-auto" />;
    }
    if (value === false) {
      return <X className="h-5 w-5 text-muted-foreground/40 mx-auto" />;
    }
    return <span className="text-sm text-foreground">{value}</span>;
  };

  return (
    <MarketingLayout
      title="Pricing"
      description="Simple, flexible pricing for families, schools, and organizations. Start with a free trial and scale as your program grows."
    >
      <PageHero
        badge="Simple & Transparent"
        title="Pricing that grows with your learners"
        subtitle="Choose a plan that fits your program size—then scale up with advanced admin, reporting, and support."
        primaryCTA={{ text: "Start Free Trial", href: "/auth" }}
        secondaryCTA={{ text: "Request a Demo", href: "/contact" }}
      />

      {/* Billing Toggle */}
      <section className="py-8 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-center gap-4">
            <Label htmlFor="billing-toggle" className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="billing-toggle" className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </Label>
            {isAnnual && (
              <span className="ml-2 inline-block px-3 py-1 text-xs font-semibold bg-accent/10 text-accent rounded-full">
                Save up to {annualSavings}%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 md:py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <Card 
                key={index}
                className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-2 pt-6">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 flex flex-col flex-grow">
                  <div className="text-center mb-6">
                    {plan.monthlyPrice !== null ? (
                      <>
                        <span className="text-4xl font-bold text-foreground">
                          £{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                        </span>
                        <span className="text-muted-foreground ml-1">/month</span>
                        {isAnnual && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Billed annually (£{plan.annualPrice! * 12}/year)
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-foreground">Let's talk</span>
                    )}
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={() => handleSubscribe(plan.id, plan.isContact)}
                    disabled={loadingPlan === plan.id}
                    className="w-full mt-auto" 
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {plan.cta}
                    {loadingPlan !== plan.id && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Notes under pricing */}
          <div className="mt-10 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              ✓ All plans include accessibility-first design and WCAG-friendly features
            </p>
            <p className="text-sm text-muted-foreground">
              ✓ Pricing may vary by region and program needs
            </p>
            <p className="text-sm text-muted-foreground">
              ✓ <Link to="/contact" className="text-primary hover:underline">Ask us about discounts</Link> for non-profits and educational institutions
            </p>
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Compare Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See exactly what's included in each plan to find the right fit for your program.
            </p>
          </div>
          
          <div className="bg-background rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[200px] font-semibold">Feature</TableHead>
                    <TableHead className="text-center font-semibold">Individual</TableHead>
                    <TableHead className="text-center font-semibold">Team</TableHead>
                    <TableHead className="text-center font-semibold">Organization</TableHead>
                    <TableHead className="text-center font-semibold">Enterprise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonFeatures.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.feature}</TableCell>
                      <TableCell className="text-center">{renderFeatureValue(row.individual)}</TableCell>
                      <TableCell className="text-center">{renderFeatureValue(row.team)}</TableCell>
                      <TableCell className="text-center">{renderFeatureValue(row.organization)}</TableCell>
                      <TableCell className="text-center">{renderFeatureValue(row.enterprise)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation & Onboarding Timeline */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Implementation & Onboarding
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started quickly with our straightforward setup process. Most teams are fully operational within two weeks.
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border hidden md:block" />
            
            <div className="space-y-8">
              {onboardingSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex gap-6 items-start">
                    <div className="relative z-10 flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="pt-3">
                      <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Need help getting started? Our team is here to support you every step of the way.
            </p>
            <Button asChild variant="outline">
              <Link to="/contact">
                Schedule an onboarding call
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <FAQSection 
        title="Pricing FAQs"
        subtitle="Common questions about plans, billing, and getting started."
        faqs={faqs} 
      />

      <CTABanner
        title="Not sure which plan fits?"
        subtitle="Tell us about your program and we'll recommend the best setup for your learners and team."
        primaryCTA={{ text: "Talk to Sales", href: "/contact" }}
        secondaryCTA={{ text: "View Enterprise", href: "/enterprise" }}
      />
    </MarketingLayout>
  );
}
