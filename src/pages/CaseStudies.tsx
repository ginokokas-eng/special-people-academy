import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Quote, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

// Case studies data structure
const caseStudies = [
  {
    id: "1",
    slug: "brightcare-services",
    orgName: "BrightCare Services",
    industry: "Healthcare",
    challenge: "BrightCare struggled to deliver consistent training across 15 care homes with 500+ staff members. Paper-based tracking led to compliance gaps and difficulty demonstrating training completion to regulators.",
    solution: "Implemented Special People Academy across all locations with centralized reporting, automated certificate tracking, and mobile access for staff.",
    results: [
      "95% training completion rate (up from 67%)",
      "40% reduction in training administration time",
      "Zero compliance findings in latest CQC inspection"
    ],
    quote: "Special People Academy transformed how we approach training. Our staff are more engaged, our records are impeccable, and our regulators are impressed.",
    quotePerson: "Helen Wright, Training Manager",
    metrics: { completionRate: "95%", timeSaved: "40%", satisfaction: "4.8/5" }
  },
  {
    id: "2",
    slug: "horizon-education-trust",
    orgName: "Horizon Education Trust",
    industry: "Education",
    challenge: "A multi-academy trust needed to provide consistent safeguarding and SEND training to 800 staff across 12 schools, with different training needs for teaching and support staff.",
    solution: "Deployed customized learning paths for different roles, with school-level reporting and trust-wide analytics for leadership oversight.",
    results: [
      "100% safeguarding compliance achieved",
      "60% reduction in face-to-face training costs",
      "92% of staff report improved confidence in SEND support"
    ],
    quote: "The platform's flexibility allows us to tailor training while maintaining consistency. It's exactly what a multi-school organization needs.",
    quotePerson: "David Chen, Director of HR",
    metrics: { compliance: "100%", costReduction: "60%", confidence: "92%" }
  },
  {
    id: "3",
    slug: "community-first",
    orgName: "Community First",
    industry: "Social Care",
    challenge: "A supported living provider needed to train support workers on person-centered approaches for individuals with learning disabilities, with limited training budgets and high staff turnover.",
    solution: "Rolled out our learning disability awareness and PBS courses with practical scenarios, supported by downloadable resources for on-the-job reference.",
    results: [
      "85% reduction in restrictive practice incidents",
      "Staff retention improved by 25%",
      "New staff fully trained within 2 weeks"
    ],
    quote: "The practical scenarios make our training real and relevant. Staff understand not just what to do, but why it matters.",
    quotePerson: "Sarah Thompson, Operations Director",
    metrics: { incidentReduction: "85%", retention: "+25%", onboarding: "2 weeks" }
  },
  {
    id: "4",
    slug: "sunrise-employment",
    orgName: "Sunrise Employment",
    industry: "Supported Employment",
    challenge: "A supported employment agency needed to provide workplace readiness training for clients with diverse abilities, tracking individual progress for funders and referrers.",
    solution: "Created customized learning paths with adaptive assessments, detailed progress reporting for stakeholders, and certificate options for employer recognition.",
    results: [
      "78% job placement rate for program completers",
      "Funders report 50% easier outcome tracking",
      "Clients report 90% satisfaction with training quality"
    ],
    quote: "Our clients feel proud of their certificates, and employers recognize the value of our training. It's a win-win.",
    quotePerson: "Marcus Johnson, Program Lead",
    metrics: { placement: "78%", satisfaction: "90%", reporting: "+50%" }
  }
];

export default function CaseStudies() {
  return (
    <MarketingLayout
      title="Case Studies"
      description="See how organizations across healthcare, education, and social care have transformed their training with Special People Academy."
    >
      <PageHero
        badge="Case Studies"
        title="Real Results from Real Organizations"
        subtitle="Discover how Special People Academy helps organizations deliver inclusive, effective training that makes a measurable difference."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
      />

      {/* Featured Case Study */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <Card className="overflow-hidden">
            <div className="lg:flex">
              <div className="lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-8 lg:p-12 text-primary-foreground">
                <Badge className="mb-4 bg-primary-foreground/20 text-primary-foreground">
                  Featured
                </Badge>
                <h2 className="text-2xl lg:text-3xl font-bold mb-4">
                  {caseStudies[0].orgName}
                </h2>
                <p className="opacity-90 mb-8">{caseStudies[0].challenge}</p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{caseStudies[0].metrics.completionRate}</div>
                    <div className="text-sm opacity-80">Completion</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{caseStudies[0].metrics.timeSaved}</div>
                    <div className="text-sm opacity-80">Time Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{caseStudies[0].metrics.satisfaction}</div>
                    <div className="text-sm opacity-80">Satisfaction</div>
                  </div>
                </div>
                
                <Button variant="secondary" asChild>
                  <Link to={`/case-studies/${caseStudies[0].slug}`}>
                    Read Full Story
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              
              <div className="lg:w-1/2 p-8 lg:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <Quote className="h-8 w-8 text-primary flex-shrink-0" />
                  <blockquote className="text-lg italic text-muted-foreground">
                    "{caseStudies[0].quote}"
                  </blockquote>
                </div>
                <p className="text-sm font-medium text-foreground">
                  — {caseStudies[0].quotePerson}
                </p>
                
                <div className="mt-8 pt-8 border-t">
                  <h4 className="font-semibold mb-4">Key Results:</h4>
                  <ul className="space-y-2">
                    {caseStudies[0].results.map((result, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <TrendingUp className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{result}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* More Case Studies */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">More Success Stories</h2>
            <p className="text-muted-foreground">See how organizations across industries achieve their training goals.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {caseStudies.slice(1).map((study) => (
              <Card key={study.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <Badge variant="secondary" className="w-fit mb-2">{study.industry}</Badge>
                  <CardTitle className="text-xl">{study.orgName}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {study.challenge}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    {Object.entries(study.metrics).slice(0, 2).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-xl font-bold text-primary">{value}</div>
                        <div className="text-xs text-muted-foreground capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={`/case-studies/${study.slug}`}>
                      Read Case Study
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Breakdown */}
      <section className="py-16 md:py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Trusted Across Industries
          </h2>
          <p className="text-muted-foreground mb-8">
            From healthcare to education to social care, organizations of all types choose Special People Academy.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {["Healthcare", "Education", "Social Care", "Local Government", "Charities", "Supported Employment"].map((industry) => (
              <Badge key={industry} variant="outline" className="px-4 py-2 text-base">
                {industry}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        title="Ready to Write Your Success Story?"
        subtitle="Join hundreds of organizations that have transformed their training with Special People Academy."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ text: "Start Free Trial", href: "/auth" }}
      />
    </MarketingLayout>
  );
}
