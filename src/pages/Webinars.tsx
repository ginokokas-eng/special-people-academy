import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Video, Play, ArrowRight, Users } from "lucide-react";
import { Link } from "react-router-dom";

const upcomingWebinars = [
  {
    id: "1",
    title: "Setting Up a Skill Plan in 20 Minutes",
    description: "A fast, practical walkthrough of creating a learner's first skill plan—from goal setting to milestone tracking. Perfect for new users.",
    host: "[Host Name]",
    date: "[Date TBD]",
    time: "[Time TBD]",
    duration: "20 minutes",
    registrationLink: "#"
  },
  {
    id: "2",
    title: "Progress Tracking That's Kind and Useful",
    description: "Learn how to collect meaningful data without creating pressure. We'll cover what to measure, how often, and how to share progress constructively.",
    host: "[Host Name]",
    date: "[Date TBD]",
    time: "[Time TBD]",
    duration: "30 minutes",
    registrationLink: "#"
  },
  {
    id: "3",
    title: "Making Lessons Accessible for Different Learning Styles",
    description: "Practical strategies for creating content that works for visual, auditory, and kinesthetic learners—plus tips for supporting diverse needs.",
    host: "[Host Name]",
    date: "[Date TBD]",
    time: "[Time TBD]",
    duration: "30 minutes",
    registrationLink: "#"
  }
];

const onDemandWebinars = [
  {
    id: "4",
    title: "Intro to Special People Training",
    description: "A comprehensive overview of the platform, core features, and how organizations use SPA to deliver inclusive training.",
    host: "SPA Team",
    duration: "25 minutes",
    watchLink: "#"
  },
  {
    id: "5",
    title: "Templates for Life Skills Programs",
    description: "Explore our pre-built templates for daily living, social skills, and community participation. Learn how to customize them for your learners.",
    host: "SPA Team",
    duration: "20 minutes",
    watchLink: "#"
  },
  {
    id: "6",
    title: "Collaboration Between Home and School",
    description: "Best practices for sharing progress, aligning goals, and maintaining consistency across home and educational settings.",
    host: "SPA Team",
    duration: "30 minutes",
    watchLink: "#"
  },
  {
    id: "7",
    title: "Reporting for Program Leaders",
    description: "How to generate, interpret, and present progress reports to stakeholders—from weekly summaries to board-level overviews.",
    host: "SPA Team",
    duration: "25 minutes",
    watchLink: "#"
  }
];

const faqs = [
  {
    question: "Are webinars free?",
    answer: "Yes, all webinars are free to attend. We offer them as a resource for educators, caregivers, and program leaders—whether or not you're a current SPA customer."
  },
  {
    question: "Will I get a recording?",
    answer: "Yes. All registrants receive a recording within 48 hours of the live session. If you can't attend live, register anyway and we'll send you the replay. On-demand webinars are available immediately."
  },
  {
    question: "Can my team attend?",
    answer: "Absolutely. You can share the registration link with colleagues, or register multiple people from your organization. For large groups, consider scheduling a private session—contact us to arrange."
  },
  {
    question: "Do you provide certificates of attendance?",
    answer: "We can provide a certificate of attendance upon request for those who attend live sessions in full. Contact us after the webinar with your name and email, and we'll send a certificate for your records."
  }
];

export default function Webinars() {
  return (
    <MarketingLayout
      title="Webinars"
      description="Live and on-demand sessions on inclusive training, progress tracking, and program setup."
    >
      <PageHero
        badge="Webinars"
        title="Learn together—live or on demand"
        subtitle="Short, practical sessions for caregivers, educators, and program leaders."
      />

      {/* Upcoming Webinars */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">Upcoming Webinars</h2>
            </div>
            <p className="text-muted-foreground">Register now to join live. Can't make it? We'll send you the recording.</p>
          </div>
          
          <div className="space-y-6">
            {upcomingWebinars.map((webinar) => (
              <Card key={webinar.id} className="overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-52 bg-primary/10 flex flex-col items-center justify-center p-6 text-center">
                    <Badge className="mb-3">Live Session</Badge>
                    <div className="text-sm text-primary font-medium mb-1">{webinar.date}</div>
                    <div className="text-sm text-muted-foreground">{webinar.time}</div>
                  </div>
                  <div className="flex-1 p-6">
                    <CardTitle className="text-xl mb-2">{webinar.title}</CardTitle>
                    <CardDescription className="mb-4">{webinar.description}</CardDescription>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Host: {webinar.host}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{webinar.duration}</span>
                      </div>
                    </div>
                    <Button asChild>
                      <Link to={webinar.registrationLink}>
                        Register
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* On-Demand Webinars */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <Play className="h-6 w-6 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">On-Demand Webinars</h2>
            </div>
            <p className="text-muted-foreground">Watch anytime. No registration required.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {onDemandWebinars.map((webinar) => (
              <Card key={webinar.id} className="hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="h-4 w-4 text-primary" />
                    <Badge variant="secondary">On-Demand</Badge>
                    <span className="text-sm text-muted-foreground">{webinar.duration}</span>
                  </div>
                  <CardTitle className="text-lg">{webinar.title}</CardTitle>
                  <CardDescription>{webinar.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{webinar.host}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={webinar.watchLink}>
                        <Play className="mr-1 h-3 w-3" />
                        Watch Now
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <FAQSection
        title="Webinar FAQs"
        subtitle="Common questions about our live and on-demand sessions."
        faqs={faqs}
      />

      {/* Private Sessions CTA */}
      <section className="py-16 md:py-20 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="w-16 h-16 rounded-full bg-primary-foreground/10 flex items-center justify-center mx-auto mb-6">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Want a session for your organization?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            We offer private webinars and training sessions tailored to your team's needs. Perfect for onboarding, professional development, or introducing SPA to stakeholders.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/contact">
              Request a Private Session
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
