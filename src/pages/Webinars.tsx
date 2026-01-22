import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Video, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

// Webinar data structure
const upcomingWebinars = [
  {
    id: "1",
    title: "Designing Accessible Training: A Masterclass",
    description: "Join our lead instructional designer for a deep dive into creating training content that works for everyone. Learn practical techniques for accessibility that go beyond compliance.",
    host: "Dr. Sarah Mitchell",
    date: "2026-02-15",
    time: "2:00 PM GMT",
    duration: "60 minutes",
    registrationLink: "#"
  },
  {
    id: "2",
    title: "Measuring Training ROI for Care Organizations",
    description: "Discover how to demonstrate the value of your training investment. We'll cover metrics that matter, data collection strategies, and presenting results to stakeholders.",
    host: "James Thompson",
    date: "2026-02-22",
    time: "11:00 AM GMT",
    duration: "45 minutes",
    registrationLink: "#"
  },
  {
    id: "3",
    title: "Supporting Neurodivergent Learners in the Workplace",
    description: "Practical strategies for creating training programs that support learners with autism, ADHD, dyslexia, and other neurodivergent conditions.",
    host: "Emily Chen",
    date: "2026-03-05",
    time: "3:00 PM GMT",
    duration: "60 minutes",
    registrationLink: "#"
  }
];

const pastWebinars = [
  {
    id: "4",
    title: "Introduction to Special People Academy",
    description: "A comprehensive overview of our platform, features, and how organizations can get the most from our training solutions.",
    host: "Maria Garcia",
    date: "2026-01-10",
    duration: "45 minutes",
    watchLink: "#"
  },
  {
    id: "5",
    title: "First Aid Training Best Practices for Care Settings",
    description: "Expert guidance on delivering effective first aid training in care environments, with a focus on practical skills and confidence building.",
    host: "James Thompson",
    date: "2025-12-15",
    duration: "60 minutes",
    watchLink: "#"
  },
  {
    id: "6",
    title: "Building a Culture of Continuous Learning",
    description: "How to foster engagement with training and create an organizational culture where learning is valued and supported.",
    host: "Dr. Sarah Mitchell",
    date: "2025-12-01",
    duration: "45 minutes",
    watchLink: "#"
  },
  {
    id: "7",
    title: "Compliance Training That Actually Works",
    description: "Move beyond checkbox compliance to create training that genuinely changes behavior and protects your organization.",
    host: "Emily Chen",
    date: "2025-11-20",
    duration: "50 minutes",
    watchLink: "#"
  }
];

export default function Webinars() {
  return (
    <MarketingLayout
      title="Webinars"
      description="Join live webinars and watch on-demand sessions from Special People Academy. Expert insights on inclusive training, accessibility, and workforce development."
    >
      <PageHero
        badge="Webinars"
        title="Learn from the Experts"
        subtitle="Join our live webinars or watch on-demand sessions covering inclusive training, accessibility best practices, and effective learning strategies."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
      />

      {/* Upcoming Webinars */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Upcoming Webinars</h2>
            <p className="text-muted-foreground">Register now to join our live sessions.</p>
          </div>
          
          <div className="space-y-6">
            {upcomingWebinars.map((webinar) => (
              <Card key={webinar.id} className="overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-48 bg-primary/10 flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-4xl font-bold text-primary">
                      {new Date(webinar.date).getDate()}
                    </div>
                    <div className="text-sm text-primary font-medium">
                      {new Date(webinar.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </div>
                    <Badge className="mt-2">Live</Badge>
                  </div>
                  <div className="flex-1 p-6">
                    <CardTitle className="text-xl mb-2">{webinar.title}</CardTitle>
                    <CardDescription className="mb-4">{webinar.description}</CardDescription>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{webinar.host}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{webinar.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{webinar.duration}</span>
                      </div>
                    </div>
                    <Button asChild>
                      <Link to={webinar.registrationLink}>
                        Register Now
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

      {/* Past Webinars */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">On-Demand Webinars</h2>
            <p className="text-muted-foreground">Watch previous sessions at your convenience.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {pastWebinars.map((webinar) => (
              <Card key={webinar.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
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
                        Watch Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Host a Webinar */}
      <section className="py-16 md:py-20 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Want to Host a Webinar?
          </h2>
          <p className="text-muted-foreground mb-8">
            We're always looking for experts to share their knowledge with our community. If you have insights on inclusive training, accessibility, or workforce development, we'd love to hear from you.
          </p>
          <Button variant="outline" size="lg" asChild>
            <Link to="/contact">Submit a Topic</Link>
          </Button>
        </div>
      </section>

      <CTABanner
        title="Ready to Experience Special People Academy?"
        subtitle="See how our platform can transform your organization's training program."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ text: "Start Free Trial", href: "/auth" }}
      />
    </MarketingLayout>
  );
}
