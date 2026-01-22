import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Heart, 
  Accessibility, 
  Users, 
  MapPin, 
  Briefcase,
  Home,
  HeartPulse,
  BookOpen,
  Clock,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const whyWorkHere = [
  {
    icon: Heart,
    title: "Mission-Driven Work",
    description: "Everything we build directly supports learners, families, and educators. Your work has real impact on people's lives."
  },
  {
    icon: Accessibility,
    title: "Accessibility Is Core",
    description: "We don't retrofit accessibility—we design for it from day one. You'll work on genuinely inclusive products."
  },
  {
    icon: Users,
    title: "Collaborative Culture",
    description: "Small team, big trust. We work closely across disciplines and value every voice in decision-making."
  }
];

const benefits = [
  {
    icon: Home,
    title: "Remote/Hybrid",
    description: "[Remote-first with optional office days in London. Open to UK-based candidates.]"
  },
  {
    icon: HeartPulse,
    title: "Health Benefits",
    description: "[Private health insurance, dental, and mental health support included.]"
  },
  {
    icon: BookOpen,
    title: "Learning Stipend",
    description: "[Annual budget for courses, conferences, books, and professional development.]"
  },
  {
    icon: Clock,
    title: "Flexible Schedule",
    description: "[Core hours with flexibility around personal needs. We trust you to manage your time.]"
  }
];

const hiringSteps = [
  {
    step: "1",
    title: "Application Review",
    description: "We review your CV and cover letter within 5 business days."
  },
  {
    step: "2",
    title: "Intro Call",
    description: "A 30-minute chat with our team to discuss the role and your background."
  },
  {
    step: "3",
    title: "Skills Assessment",
    description: "A practical task or portfolio review relevant to the role."
  },
  {
    step: "4",
    title: "Final Interview",
    description: "Meet the team and discuss culture fit, expectations, and next steps."
  }
];

const openRoles = [
  {
    id: "1",
    title: "Customer Success Specialist",
    department: "Customer Success",
    location: "Remote (UK)",
    type: "Full-time",
    responsibilities: [
      "Onboard new organizations and guide them through implementation",
      "Provide ongoing support via email, chat, and video calls",
      "Gather feedback and advocate for customer needs internally",
      "Create help articles and training resources"
    ],
    requirements: [
      "2+ years in customer success, support, or account management",
      "Excellent written and verbal communication",
      "Experience with SaaS or ed-tech platforms preferred",
      "Patience, empathy, and problem-solving skills"
    ]
  },
  {
    id: "2",
    title: "Instructional Designer (Inclusive Learning)",
    department: "Content",
    location: "Remote (UK)",
    type: "Full-time",
    responsibilities: [
      "Design and develop accessible training content for diverse learners",
      "Create step-by-step lessons, visual supports, and assessments",
      "Collaborate with subject matter experts and accessibility specialists",
      "Continuously improve content based on learner feedback and data"
    ],
    requirements: [
      "3+ years in instructional design, special education, or related field",
      "Experience creating content for learners with disabilities",
      "Familiarity with WCAG guidelines and plain language principles",
      "Strong project management and collaboration skills"
    ]
  },
  {
    id: "3",
    title: "Full-Stack Engineer",
    department: "Engineering",
    location: "Remote (UK) / London",
    type: "Full-time",
    responsibilities: [
      "Build and maintain features across our React + Supabase stack",
      "Implement accessible, performant user interfaces",
      "Collaborate with design and product on new features",
      "Write clean, tested, maintainable code"
    ],
    requirements: [
      "3+ years professional experience with React and TypeScript",
      "Experience with PostgreSQL and backend development",
      "Understanding of web accessibility standards",
      "Strong communication and teamwork skills"
    ]
  },
  {
    id: "4",
    title: "Partnerships Manager",
    department: "Business Development",
    location: "Remote (UK)",
    type: "Full-time",
    responsibilities: [
      "Identify and develop strategic partnerships with schools, agencies, and organizations",
      "Manage partner relationships and ensure mutual success",
      "Collaborate with marketing on co-branded initiatives",
      "Represent Special People Academy at events and conferences"
    ],
    requirements: [
      "3+ years in partnerships, business development, or sales",
      "Experience in education, healthcare, or social care sectors",
      "Strong relationship-building and negotiation skills",
      "Passion for inclusive education and accessibility"
    ]
  }
];

export default function Careers() {
  return (
    <MarketingLayout 
      title="Careers" 
      description="Join our mission to build inclusive training tools and empower learners through respectful, accessible skill-building."
    >
      <PageHero 
        badge="Careers" 
        title="Build technology that supports real people" 
        subtitle="We're creating inclusive training programs and tools that help learners grow skills with dignity and clarity."
        primaryCTA={{ text: "View Open Roles", href: "#open-roles" }}
      />

      {/* Why Work Here */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Why Join Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Why work at Special People Academy
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {whyWorkHere.map((item, index) => (
              <Card key={index} className="text-center border-none shadow-sm">
                <CardHeader>
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Benefits</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              What we offer
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center mb-3">
                    <benefit.icon className="h-5 w-5 text-accent" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Hiring Process */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Hiring Process</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              What to expect
            </h2>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {hiringSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {step.step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section id="open-roles" className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Open Roles</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Current opportunities
            </h2>
          </div>
          
          <Accordion type="single" collapsible className="space-y-4">
            {openRoles.map((role) => (
              <AccordionItem 
                key={role.id} 
                value={role.id}
                className="bg-background border rounded-lg px-6"
              >
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex flex-col items-start text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-lg text-foreground">{role.title}</span>
                      <Badge variant="secondary">{role.type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {role.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {role.location}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Responsibilities</h4>
                      <ul className="space-y-2">
                        {role.responsibilities.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-accent mt-1 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Requirements</h4>
                      <ul className="space-y-2">
                        {role.requirements.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <p className="text-sm text-muted-foreground italic mb-4">
                        We welcome accommodations throughout the hiring process. Let us know what you need.
                      </p>
                      <Button asChild>
                        <Link to="/contact">
                          Apply Now
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <CTABanner 
        title="Don't see the right role?" 
        subtitle="We're always interested in hearing from talented people who share our mission. Reach out and introduce yourself."
        primaryCTA={{ text: "Contact Us", href: "/contact" }}
      />
    </MarketingLayout>
  );
}
