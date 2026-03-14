import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote, CheckCircle, Target, Lightbulb } from "lucide-react";

const caseStudies = [
  {
    id: "1",
    orgName: "Riverbend School Program",
    industry: "Education",
    challenge: "Inconsistent tracking across staff members made it difficult to individualize learning plans. Teachers struggled to maintain continuity when multiple staff supported the same learners.",
    solution: "Implemented standardized lesson templates combined with individualized goal tracking and shared notes accessible to all team members.",
    results: [
      "Improved consistency across all staff interactions",
      "Clearer reporting for families and administrators",
      "Faster plan updates when learner needs changed"
    ],
    quote: "[Quote from program coordinator about the impact on their team's workflow and learner outcomes]",
    quotePerson: "[Program Coordinator Name], Riverbend School"
  },
  {
    id: "2",
    orgName: "BrightPath Therapy & Coaching",
    industry: "Therapy Services",
    challenge: "Fragmented resources across therapists made it difficult to show progress over time. Families often felt disconnected from their child's development journey.",
    solution: "Deployed the step-by-step lesson library with weekly summary reports automatically shared with families and care teams.",
    results: [
      "Better communication with families",
      "Simpler reporting for insurance and funding",
      "Unified resource library for all therapists"
    ],
    quote: "[Quote from clinical director about improved family engagement and streamlined documentation]",
    quotePerson: "[Clinical Director Name], BrightPath Therapy"
  },
  {
    id: "3",
    orgName: "LaunchWorks Workforce Readiness",
    industry: "Workforce Development",
    challenge: "Participants struggled to generalize skills learned in training to real job tasks. The gap between practice and employment was difficult to bridge.",
    solution: "Created task breakdowns with prompting strategies that fade over time, paired with readiness checklists for employment transitions.",
    results: [
      "More confident transitions to employment",
      "Clearer skill milestones for participants and employers",
      "Structured fade-out of support over time"
    ],
    quote: "[Quote from program manager about participant confidence and employer feedback]",
    quotePerson: "[Program Manager Name], LaunchWorks"
  }
];

export default function CaseStudies() {
  return (
    <MarketingLayout
      title="Case Studies"
      description="See how schools and programs use Special People Training to deliver consistent, inclusive skill-building and track progress."
    >
      <PageHero
        badge="Case Studies"
        title="Real programs. Real progress."
        subtitle="Examples of how teams build consistent routines, support independence, and measure growth."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
        secondaryCTA={{ text: "View Enterprise", href: "/enterprise" }}
      />

      {/* Case Studies Grid */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Note:</strong> These case studies are examples with editable placeholders. Replace with your actual program stories.
            </p>
          </div>

          <div className="space-y-12">
            {caseStudies.map((study, index) => (
              <Card key={study.id} className="overflow-hidden">
                <div className="lg:flex">
                  {/* Left Panel - Challenge & Solution */}
                  <div className="lg:w-1/2 p-8 lg:p-10">
                    <div className="flex items-center gap-3 mb-6">
                      <Badge variant="secondary">{study.industry}</Badge>
                      <span className="text-sm text-muted-foreground">Case Study #{index + 1}</span>
                    </div>
                    
                    <CardTitle className="text-2xl lg:text-3xl mb-6">
                      {study.orgName}
                    </CardTitle>

                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-5 w-5 text-destructive" />
                          <h4 className="font-semibold text-foreground">Challenge</h4>
                        </div>
                        <p className="text-muted-foreground">{study.challenge}</p>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold text-foreground">Solution</h4>
                        </div>
                        <p className="text-muted-foreground">{study.solution}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel - Results & Quote */}
                  <div className="lg:w-1/2 bg-muted/30 p-8 lg:p-10">
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="h-5 w-5 text-accent" />
                        <h4 className="font-semibold text-foreground">Results</h4>
                      </div>
                      <ul className="space-y-3">
                        {study.results.map((result, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="h-2 w-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                            <span className="text-muted-foreground">{result}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t border-border pt-6">
                      <div className="flex items-start gap-3">
                        <Quote className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <blockquote className="text-muted-foreground italic mb-2">
                            "{study.quote}"
                          </blockquote>
                          <p className="text-sm font-medium text-foreground">
                            — {study.quotePerson}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Tags */}
      <section className="py-12 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Trusted Across Industries
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {["Schools", "Therapy Clinics", "Workforce Programs", "Residential Services", "Non-Profits", "Government Agencies"].map((industry) => (
              <Badge key={industry} variant="outline" className="px-4 py-2">
                {industry}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        title="Want to be featured?"
        subtitle="Share your story and inspire other programs working toward inclusive skill-building."
        primaryCTA={{ text: "Contact Us", href: "/contact" }}
        secondaryCTA={{ text: "View Enterprise", href: "/enterprise" }}
      />
    </MarketingLayout>
  );
}
