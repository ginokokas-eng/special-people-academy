import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const jobs = [
  { id: "1", title: "Senior Instructional Designer", department: "Content", location: "Remote (UK)", type: "Full-time" },
  { id: "2", title: "Full Stack Developer", department: "Engineering", location: "London / Remote", type: "Full-time" },
  { id: "3", title: "Customer Success Manager", department: "Customer Success", location: "Remote (UK)", type: "Full-time" },
  { id: "4", title: "Accessibility Specialist", department: "Product", location: "Remote (UK)", type: "Full-time" }
];

export default function Careers() {
  return (
    <MarketingLayout title="Careers" description="Join Special People Academy and help us build inclusive training solutions that empower learners worldwide.">
      <PageHero badge="Careers" title="Build Something Meaningful" subtitle="Join a team passionate about making training accessible to everyone. We're always looking for talented people who share our values." />
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-foreground mb-8">Open Positions</h2>
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      <CardDescription>{job.department}</CardDescription>
                    </div>
                    <Badge variant="secondary">{job.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{job.location}</div>
                    <Button variant="outline" size="sm">Apply Now <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-12 p-8 bg-muted/30 rounded-xl text-center">
            <h3 className="text-xl font-semibold mb-2">Don't See a Fit?</h3>
            <p className="text-muted-foreground mb-4">We're always interested in hearing from talented people. Send your CV to <span className="text-primary">[Careers Email]</span></p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
