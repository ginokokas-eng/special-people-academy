import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import { 
  Target, 
  ListChecks, 
  Play, 
  TrendingUp, 
  Award, 
  Users, 
  FileText, 
  Accessibility,
  Heart,
  GraduationCap,
  Briefcase,
  Home,
  CheckCircle,
  Star,
  BarChart3,
  Layers,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const benefitCards = [
  {
    icon: Target,
    title: "Personalized Plans",
    description: "Every learner gets a tailored journey based on their unique goals, pace, and preferences."
  },
  {
    icon: BarChart3,
    title: "Measurable Progress",
    description: "Track skill development with clear metrics, daily notes, and visual trend reports."
  },
  {
    icon: Accessibility,
    title: "Accessible Delivery",
    description: "Content designed for diverse needs—captions, readable layouts, and multiple formats."
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Caregivers, educators, and therapists work together with shared notes and permissions."
  },
  {
    icon: Settings,
    title: "Scalable Administration",
    description: "Manage one learner or hundreds with flexible group settings and bulk tools."
  }
];

const coreFeatures = [
  {
    icon: Target,
    title: "Personalized Learning Plans",
    description: "Set meaningful goals, define skill levels, and let learners progress at their own pace. Each plan adapts to individual strengths and areas for growth."
  },
  {
    icon: ListChecks,
    title: "Step-by-Step Lessons",
    description: "Break complex skills into manageable tasks with clear checklists. Learners build confidence through structured, achievable milestones."
  },
  {
    icon: Play,
    title: "Multi-Modal Content",
    description: "Deliver lessons through video, audio, text, and visual supports. Every learner can engage in the way that works best for them."
  },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    description: "Record daily notes, monitor mastery levels, and visualize trends over time. See exactly how skills are developing week by week."
  },
  {
    icon: Award,
    title: "Reinforcement & Motivation",
    description: "Celebrate achievements with badges, positive feedback loops, and consistent routines that encourage continued engagement."
  },
  {
    icon: Users,
    title: "Caregiver/Educator Collaboration",
    description: "Share notes, observations, and updates across your team. Set permissions so the right people see the right information."
  },
  {
    icon: FileText,
    title: "Reporting & Export",
    description: "Generate PDF or CSV reports for meetings, reviews, or compliance. Summarize progress with one click."
  },
  {
    icon: Accessibility,
    title: "Accessibility Options",
    description: "Built-in captions, readable layouts, keyboard navigation, and screen reader support ensure everyone can participate fully."
  }
];

const useCases = [
  {
    icon: Home,
    title: "Families & Caregivers",
    problem: "Juggling daily responsibilities while trying to support skill development at home can feel overwhelming without structure.",
    solution: "SPA provides ready-made lesson plans, progress logs, and gentle reminders—so families can focus on quality time while tracking real growth.",
    href: "/contact"
  },
  {
    icon: GraduationCap,
    title: "Schools & Classrooms",
    problem: "Teachers need tools that work across diverse learning profiles without creating extra administrative burden.",
    solution: "SPA offers classroom-ready resources, individual progress dashboards, and collaborative notes that integrate into existing workflows.",
    href: "/contact"
  },
  {
    icon: Heart,
    title: "Therapy & Coaching Programs",
    problem: "Tracking skill acquisition across sessions and sharing updates with families requires consistent documentation.",
    solution: "SPA centralizes session notes, skill benchmarks, and family communication—making every session count toward long-term goals.",
    href: "/contact"
  },
  {
    icon: Briefcase,
    title: "Workforce Readiness & Life Skills",
    problem: "Preparing individuals for employment or independent living requires structured, practical skill-building.",
    solution: "SPA breaks down workplace and life skills into achievable steps, with progress reports that demonstrate job readiness to employers.",
    href: "/contact"
  }
];

const accessibilityCommitments = [
  "Captions and transcripts for all video and audio content",
  "Clear, plain language throughout the platform",
  "Adjustable content formats including text size and contrast options",
  "Screen reader compatibility tested with major assistive technologies",
  "Predictable navigation with consistent layouts across all pages",
  "Keyboard-accessible controls for users who don't use a mouse",
  "Reduced motion options for users sensitive to animations"
];

const testimonials = [
  {
    quote: "Special People Training transformed how we deliver life skills training. The step-by-step approach means every learner can succeed at their own pace, and the progress reports make our funding reviews so much easier.",
    name: "Maria Gonzales",
    role: "Program Director, Community Skills Center"
  },
  {
    quote: "As a parent, I finally have a tool that helps me work alongside my son's therapy team. We're all on the same page now, and I can see exactly what he's learning and how he's growing.",
    name: "David Thompson",
    role: "Parent & Caregiver"
  },
  {
    quote: "We've tried other platforms, but nothing came close to SPA's accessibility features. Our students with visual and motor differences can finally participate fully in digital learning.",
    name: "Dr. Aisha Patel",
    role: "Special Education Coordinator, Riverside School District"
  }
];

const faqs = [
  {
    question: "Who is Special People Training for?",
    answer: "SPA is designed for individuals with diverse learning needs and the people who support them—families, caregivers, educators, therapists, job coaches, and program administrators. Whether you're teaching life skills at home or running a workforce readiness program, SPA adapts to your context."
  },
  {
    question: "Can we customize skill plans for each learner?",
    answer: "Absolutely. Every learner can have a fully personalized plan with custom goals, skill levels, and pacing. You can also use our library of pre-built skill templates as a starting point and adjust them to fit individual needs."
  },
  {
    question: "Do you support multiple staff or caregivers?",
    answer: "Yes. SPA is built for collaboration. You can invite team members, set role-based permissions, share notes, and ensure everyone supporting a learner has access to the information they need—while respecting privacy and confidentiality."
  },
  {
    question: "How is progress measured?",
    answer: "Progress is tracked through daily notes, skill mastery levels (emerging, developing, mastered), and visual trend reports. You can see how each skill is progressing over time and generate summary reports for reviews or meetings."
  },
  {
    question: "Is Special People Training mobile-friendly?",
    answer: "Yes. SPA is fully responsive and works on tablets, smartphones, and desktop computers. Whether you're in a classroom, at home, or on the go, you can access lessons and log progress from any device."
  },
  {
    question: "How do we get started?",
    answer: "Getting started is easy. Request a demo to see the platform in action, or sign up for a free trial to explore on your own. Our team is happy to help you set up your first learner profiles and skill plans."
  }
];

export default function Features() {
  return (
    <MarketingLayout
      title="Features"
      description="Explore inclusive, personalized training tools to build essential skills—step-by-step lessons, progress tracking, and support for caregivers and educators."
    >
      <PageHero
        badge="Platform Features"
        title="Inclusive training built around each learner"
        subtitle="Special People Training helps you plan, deliver, and track skill-building programs with accessible, step-by-step learning—designed for diverse needs and real-world goals."
        primaryCTA={{ text: "Request a demo", href: "/contact" }}
        secondaryCTA={{ text: "Start a free trial", href: "/auth" }}
      />

      {/* Why Teams Choose SPA */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Teams Choose SPA
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From families to schools to employers, teams trust Special People Training to deliver meaningful, measurable skill development.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {benefitCards.map((benefit, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl bg-background border text-center hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Platform Features */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Core Platform Features
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, deliver, and track personalized skill-building programs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {coreFeatures.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
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

      {/* Built for Everyday Use Cases */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Built for Everyday Use Cases
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how Special People Training supports real-world skill building across different settings.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {useCases.map((useCase, index) => (
              <div 
                key={index}
                className="p-8 rounded-xl bg-background border hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <useCase.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground pt-2">
                    {useCase.title}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">The Challenge</p>
                    <p className="text-foreground">{useCase.problem}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">How SPA Helps</p>
                    <p className="text-foreground">{useCase.solution}</p>
                  </div>
                  <Button asChild variant="link" className="p-0 h-auto text-primary">
                    <Link to={useCase.href}>Learn more →</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accessibility Commitment */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-accent/10 text-accent rounded-full">
                Our Commitment
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Accessibility Is Not an Add-On
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                At Special People Training, accessibility is built into every feature from the ground up. We believe everyone deserves equal access to learning, regardless of ability. Our platform is designed to meet WCAG guidelines and continuously improved based on user feedback.
              </p>
              <ul className="space-y-3">
                {accessibilityCommitments.map((commitment, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <span className="text-foreground">{commitment}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 rounded-2xl p-8 lg:p-12">
              <div className="text-center">
                <Accessibility className="h-16 w-16 text-primary mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Designed for Everyone
                </h3>
                <p className="text-muted-foreground mb-6">
                  We test our platform with users of all abilities and work with accessibility consultants to ensure every learner can succeed.
                </p>
                <Button asChild variant="outline">
                  <Link to="/contact">Request an accessibility review</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by Teams Who Care
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hear from the educators, caregivers, and program leaders who use SPA every day.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="p-8 rounded-xl bg-background border"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <blockquote className="text-foreground mb-6 italic">
                  "{testimonial.quote}"
                </blockquote>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQSection 
        title="Frequently Asked Questions"
        subtitle="Get answers to the most common questions about Special People Training."
        faqs={faqs} 
      />

      <CTABanner
        title="Ready to Build Skills with Confidence?"
        subtitle="Join hundreds of families, schools, and organizations using Special People Training to deliver meaningful, measurable learning experiences."
        primaryCTA={{ text: "Request a demo", href: "/contact" }}
        secondaryCTA={{ text: "View pricing", href: "/pricing" }}
      />
    </MarketingLayout>
  );
}
