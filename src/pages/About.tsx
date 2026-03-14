import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Accessibility, 
  Brain, 
  Users, 
  Target,
  CheckCircle,
  Shield
} from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Dignity & Respect",
    description: "Every learner deserves to be treated with respect. We use person-first language and design experiences that honor individual strengths."
  },
  {
    icon: Accessibility,
    title: "Accessibility-First",
    description: "Accessibility isn't an afterthought—it's our foundation. We build for diverse needs from day one, not as a retrofit."
  },
  {
    icon: Brain,
    title: "Evidence-Informed, Human-Centered",
    description: "Our methods are grounded in research, but always adapted to the real humans we serve. Data guides us; people lead us."
  },
  {
    icon: Users,
    title: "Collaboration",
    description: "The best outcomes happen when learners, families, educators, and support teams work together with shared visibility."
  },
  {
    icon: Target,
    title: "Practical Outcomes",
    description: "Skills should transfer to real life. We focus on functional, meaningful progress—not just completion rates."
  }
];

const team = [
  {
    name: "[Founder Name]",
    role: "Founder & CEO",
    bio: "Background in special education and ed-tech. Passionate about making learning accessible to everyone.",
    initials: "FN"
  },
  {
    name: "[Head of Product]",
    role: "Head of Product",
    bio: "Former educator with expertise in curriculum design and accessibility standards.",
    initials: "HP"
  },
  {
    name: "[Lead Developer]",
    role: "Lead Developer",
    bio: "Builds inclusive technology with a focus on performance and usability across devices.",
    initials: "LD"
  },
  {
    name: "[Content Director]",
    role: "Content Director",
    bio: "Creates training content with plain language and visual supports for diverse learners.",
    initials: "CD"
  },
  {
    name: "[Customer Success]",
    role: "Customer Success Lead",
    bio: "Helps organizations implement effective training programs tailored to their needs.",
    initials: "CS"
  },
  {
    name: "[Accessibility Lead]",
    role: "Accessibility Lead",
    bio: "Ensures our platform meets WCAG guidelines and works for users of all abilities.",
    initials: "AL"
  }
];

const advisors = [
  { name: "[Advisor Name]", role: "Special Education Expert", initials: "SE" },
  { name: "[Advisor Name]", role: "Disability Advocate", initials: "DA" },
  { name: "[Advisor Name]", role: "Workforce Development", initials: "WD" }
];

const inclusiveTrainingPoints = [
  "Content designed for varied reading levels and learning styles",
  "Visual supports, captions, and screen reader compatibility",
  "Flexible pacing—learners move at their own speed",
  "Step-by-step breakdowns that reduce cognitive load",
  "Progress tracking that celebrates growth, not just completion",
  "Collaboration tools for families, educators, and support staff"
];

export default function About() {
  return (
    <MarketingLayout 
      title="About Us" 
      description="Our mission is to make skill-building inclusive, measurable, and empowering—supporting learners, families, and educators."
    >
      <PageHero 
        badge="About Us" 
        title="Made with care—for every learner" 
        subtitle="Special People Training exists to help special individuals build essential life skills through inclusive training tools that respect each person's pace and strengths."
        primaryCTA={{ text: "Partner With Us", href: "/partners" }}
        secondaryCTA={{ text: "Contact Us", href: "/contact" }}
      />

      {/* Mission Section */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Our Mission</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Skill-building that's inclusive, measurable, and empowering
            </h2>
          </div>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-4">
            <p>
              We believe that every person—regardless of ability—deserves access to training that helps them grow. 
              Special People Training was built to make that possible.
            </p>
            <p>
              Our platform helps educators, therapists, families, and program leaders deliver consistent, 
              personalized skill-building. We focus on practical outcomes: life skills, job readiness, 
              communication, and independence.
            </p>
            <p>
              We design for real people with real needs. That means clear language, visual supports, 
              flexible pacing, and tools that work for everyone on the team—from the learner to the caregiver.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Our Values</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              What guides everything we build
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="border-none shadow-sm">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What We Mean by Inclusive Training */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Inclusive Training</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              What we mean by "inclusive training"
            </h2>
            <p className="text-lg text-muted-foreground">
              Inclusive training isn't just about accessibility checkboxes. It's about designing experiences 
              that work for people with different abilities, learning styles, and support needs—from the start.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {inclusiveTrainingPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Our Team</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              The people behind the platform
            </h2>
            <p className="text-muted-foreground">
              Educators, developers, and advocates working together.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {team.map((member, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <Avatar className="h-20 w-20 mx-auto mb-4">
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                  <CardDescription className="text-primary font-medium">
                    {member.role}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Advisory Board */}
          <div className="border-t border-border pt-12">
            <h3 className="text-xl font-semibold text-foreground text-center mb-8">
              Advisory Board
            </h3>
            <div className="flex flex-wrap justify-center gap-6">
              {advisors.map((advisor, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-3 bg-background rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-sm bg-muted">
                      {advisor.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground text-sm">{advisor.name}</p>
                    <p className="text-xs text-muted-foreground">{advisor.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Accessibility Commitment */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-2xl">Our Accessibility Commitment</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                We are committed to making Special People Training accessible to all users, 
                including those who use assistive technologies. Our platform is designed to meet 
                WCAG 2.1 AA standards and is continuously tested with real users.
              </p>
              <p className="text-muted-foreground">
                This includes: keyboard navigation, screen reader compatibility, captions and transcripts, 
                high contrast options, and clear, predictable layouts. If you encounter any barriers, 
                please contact us—we want to fix them.
              </p>
              <p className="text-sm text-muted-foreground italic">
                Accessibility is never "done." We're always learning and improving.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <CTABanner 
        title="Ready to work together?" 
        subtitle="Partner with us to bring inclusive training to your organization, or reach out with questions."
        primaryCTA={{ text: "Partner With Us", href: "/partners" }} 
        secondaryCTA={{ text: "Contact Us", href: "/contact" }}
      />
    </MarketingLayout>
  );
}
