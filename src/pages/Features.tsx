import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import { 
  BookOpen, 
  Users, 
  Award, 
  BarChart3, 
  Shield, 
  Accessibility,
  Video,
  FileText,
  Bell,
  CheckCircle
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Comprehensive Course Library",
    description: "Access a growing collection of courses designed specifically for individuals with diverse learning needs, covering life skills, safety training, and professional development."
  },
  {
    icon: Users,
    title: "Person-Centered Learning Paths",
    description: "Every learner receives a customized journey that adapts to their pace, preferences, and goals. Our platform respects individual differences and celebrates progress."
  },
  {
    icon: Award,
    title: "Recognized Certifications",
    description: "Earn industry-recognized certificates upon course completion. Our regulated certification options meet professional standards and support career advancement."
  },
  {
    icon: BarChart3,
    title: "Progress Tracking & Reporting",
    description: "Caregivers, educators, and program managers can monitor learner progress with detailed analytics, completion rates, and competency assessments."
  },
  {
    icon: Shield,
    title: "Safety & Compliance Training",
    description: "Specialized modules for epilepsy awareness, first aid, medication management, and safeguarding ensure learners and their support networks are well-prepared."
  },
  {
    icon: Accessibility,
    title: "Accessible by Design",
    description: "Our platform meets WCAG accessibility standards with clear navigation, readable fonts, high contrast options, and screen reader compatibility."
  },
  {
    icon: Video,
    title: "Multi-Format Content",
    description: "Learn through videos, interactive scenarios, written guides, and hands-on activities. Multiple formats ensure everyone can engage in the way that works best for them."
  },
  {
    icon: FileText,
    title: "Downloadable Resources",
    description: "Access care plan templates, quick-reference guides, and printable materials that extend learning beyond the screen into everyday life."
  },
  {
    icon: Bell,
    title: "Notifications & Reminders",
    description: "Stay on track with gentle reminders for upcoming sessions, certificate renewals, and new course releases tailored to learner interests."
  }
];

const faqs = [
  {
    question: "What types of courses does Special People Academy offer?",
    answer: "We offer a wide range of courses including life skills training, safety awareness (epilepsy, first aid, anaphylaxis), professional development, and specialized certifications. All courses are designed with accessibility and inclusivity as core principles."
  },
  {
    question: "How are courses adapted for different learning needs?",
    answer: "Our courses use plain language, visual supports, video demonstrations, and interactive scenarios. Learners can progress at their own pace, and content can be revisited as many times as needed. We also offer support for caregivers and educators to facilitate learning."
  },
  {
    question: "Are the certifications recognized by employers?",
    answer: "Yes, our regulated certifications meet industry standards and are recognized by employers, care organizations, and regulatory bodies. We partner with accreditation bodies to ensure our qualifications have real-world value."
  },
  {
    question: "Can organizations track progress for multiple learners?",
    answer: "Absolutely. Our platform includes robust reporting tools that allow program managers, educators, and care coordinators to monitor progress, generate compliance reports, and identify areas where additional support may be needed."
  },
  {
    question: "Is the platform accessible for users with disabilities?",
    answer: "Yes, accessibility is central to our design. We follow WCAG guidelines, offer keyboard navigation, support screen readers, and provide options for text size and contrast adjustments. Our content is written in clear, plain language."
  }
];

export default function Features() {
  return (
    <MarketingLayout
      title="Features"
      description="Discover the powerful features of Special People Academy - accessible learning, recognized certifications, progress tracking, and person-centered training programs."
    >
      <PageHero
        badge="Platform Features"
        title="Built for Inclusive, Effective Learning"
        subtitle="Every feature is designed with accessibility, dignity, and real-world outcomes in mind. Explore how Special People Academy empowers learners and their support networks."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ text: "View Courses", href: "/courses" }}
      />

      {/* Features Grid */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need for Meaningful Learning
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From course creation to certification, our platform provides comprehensive tools for learners, caregivers, and organizations.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
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

      {/* Benefits Section */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why Organizations Choose Special People Academy
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We partner with schools, care providers, employers, and families to deliver training that makes a real difference. Our platform reduces administrative burden while improving learning outcomes.
              </p>
              <ul className="space-y-4">
                {[
                  "Reduce training costs by up to 60%",
                  "Ensure consistent, compliant training across teams",
                  "Track and report on learning outcomes easily",
                  "Support learners with diverse needs effectively",
                  "Access expert-designed, evidence-based content"
                ].map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl p-8 lg:p-12">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">98%</div>
                <p className="text-muted-foreground mb-6">of learners report feeling more confident after completing our courses</p>
                <div className="text-5xl font-bold text-accent mb-2">500+</div>
                <p className="text-muted-foreground mb-6">organizations trust Special People Academy</p>
                <div className="text-5xl font-bold text-primary mb-2">50,000+</div>
                <p className="text-muted-foreground">certificates awarded to learners worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQSection faqs={faqs} />

      <CTABanner
        title="Ready to Transform Your Training Program?"
        subtitle="Join hundreds of organizations that trust Special People Academy to deliver accessible, effective learning experiences."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ text: "Start Free Trial", href: "/auth" }}
      />
    </MarketingLayout>
  );
}
