import { useState, useMemo } from "react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  Rocket,
  BookOpen,
  Award,
  Building2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from "@/components/icons";
import { Link } from "react-router-dom";

interface Article {
  title: string;
  content: string;
}

interface HelpCategory {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  articles: Article[];
}

/**
 * Help content describes only what this academy actually does today: the four
 * sign-in routes, organisation invitations, course access, the lesson player,
 * quizzes, practical sign-off, certificates, renewals and the organisation
 * portal. No support hours, chat or response-time promises.
 */
const helpCategories: HelpCategory[] = [
  {
    icon: Rocket,
    title: "Signing in",
    description: "The ways you can get into your account.",
    articles: [
      {
        title: "Sign in with your email and password",
        content:
          "Go to the sign-in page, enter the email address your account uses and your password. If your password is not working, use the 'Forgot your password?' link to have a reset link sent to you.",
      },
      {
        title: "Sign in with an email link",
        content:
          "On the sign-in page choose 'Email me a sign-in link'. We send a link to your email address; opening it on the same device signs you straight in. The link only works for an account that already exists, so accept your invitation first if you are new.",
      },
      {
        title: "Sign in with Google",
        content:
          "If your work email is a Google account you can use the 'Continue with Google' button instead of a password. Use the same email address your training is registered against, otherwise you will end up with a second, empty account.",
      },
      {
        title: "Resetting your password",
        content:
          "Request a reset from the sign-in page, open the email and choose a new password of at least 8 characters. The reset link can only be used once.",
      },
    ],
  },
  {
    icon: BookOpen,
    title: "Getting on a course",
    description: "Invitations, buying a course and enrolling.",
    articles: [
      {
        title: "Accepting an organisation invitation",
        content:
          "If your employer has allocated you a training pass you will receive an invitation email. Open it, enter your full name and choose a password (at least 8 characters). Your name is printed on your certificates, so enter it as you want it to appear. Once accepted, the course appears under My Courses.",
      },
      {
        title: "Buying a course for yourself",
        content:
          "Open the course you want from the course catalogue and use the buy button. Payment is taken by card, and access is granted as soon as the payment succeeds. If a course has no buy button it is only available through an organisation.",
      },
      {
        title: "Finding your courses",
        content:
          "My Courses lists everything you have access to, with a status of not started, in progress or completed. My Learning shows the same courses with your progress and what to do next.",
      },
      {
        title: "Courses with a prerequisite",
        content:
          "Some courses require an earlier course to be completed first. Where that applies, the course page tells you which one, and enrolment unlocks once the earlier course is complete.",
      },
    ],
  },
  {
    icon: ShieldCheck,
    title: "Lessons, quizzes and sign-off",
    description: "How progress and completion are recorded.",
    articles: [
      {
        title: "Using the lesson player",
        content:
          "Lessons play in order within each module. Video lessons record your progress as you watch, and interactive lessons record your answers as you work through them. You can leave and come back; your place is kept.",
      },
      {
        title: "What counts as complete",
        content:
          "A lesson counts as complete when you have finished its content — watched the video, or answered the interactive parts. A course counts as complete when every required lesson, every assessment and, where required, the practical sign-off are done.",
      },
      {
        title: "Quizzes and attempts",
        content:
          "Assessments have a pass mark of 80% and a limited number of attempts. Before you start a final attempt you are warned. If you use all your attempts the assessment locks and your training lead is notified so they can arrange support and a reset.",
      },
      {
        title: "Practical sign-off",
        content:
          "Clinical and practical courses include a step that a trainer must complete with you in person. Until a trainer signs your competency off, the course shows as awaiting sign-off and the competency certificate is not issued.",
      },
    ],
  },
  {
    icon: Award,
    title: "Certificates and renewals",
    description: "Proving and maintaining your training.",
    articles: [
      {
        title: "Getting your certificate",
        content:
          "Certificates are issued automatically once a course is complete. You can download them from the course's certificate tab or from your certificates page.",
      },
      {
        title: "Completion and competency certificates",
        content:
          "Courses with a practical element issue two certificates: one for completing the learning, and one for competency once a trainer has signed you off.",
      },
      {
        title: "Verifying a certificate",
        content:
          "Each certificate carries a verification code. Anyone — an inspector, a new employer — can enter that code at /verify to confirm who it was issued to, for which course and when, without needing an account.",
      },
      {
        title: "Renewals and expiry",
        content:
          "Where a course has a renewal period, the certificate shows an expiry date and the course reappears as due for renewal in good time. Organisation admins can see what is due or overdue across their team.",
      },
    ],
  },
  {
    icon: Building2,
    title: "For organisation admins",
    description: "People, licences, seats and compliance.",
    articles: [
      {
        title: "The organisation portal",
        content:
          "Signed-in organisation admins have an Organisation link in the sidebar. It shows your people, your licences and your team's compliance position in one place.",
      },
      {
        title: "Licences and seats",
        content:
          "A licence covers a course for a number of seats. Each seat is one member of staff on that course. The licences view shows how many seats are used and how many are still free.",
      },
      {
        title: "Inviting staff and allocating seats",
        content:
          "From your people view, invite a member of staff by email and allocate them a seat. They receive an invitation to set their name and password. Unaccepted invitations release their seat when they expire, so nothing is wasted.",
      },
      {
        title: "Removing someone",
        content:
          "Revoking a seat removes that person's access to the course and returns the seat to your licence so you can allocate it to someone else. Certificates already issued stay valid.",
      },
      {
        title: "The compliance view",
        content:
          "Compliance shows, per person and per course, whether training is complete, in progress, due for renewal or overdue. Your visibility is read-only: you can see your own staff's records, and nothing outside your organisation.",
      },
    ],
  },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories;

    const query = searchQuery.toLowerCase();
    return helpCategories
      .map((category) => ({
        ...category,
        articles: category.articles.filter(
          (article) =>
            article.title.toLowerCase().includes(query) ||
            article.content.toLowerCase().includes(query),
        ),
      }))
      .filter((category) => category.articles.length > 0);
  }, [searchQuery]);

  const hasResults = filteredCategories.length > 0;

  return (
    <MarketingLayout
      title="Help Centre"
      description="How to sign in, get on a course, complete lessons and quizzes, get certificates and manage your organisation's training."
    >
      {/* Hero with Search */}
      <section className="py-16 md:py-24 px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Help Centre
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Answers about signing in, courses, certificates and managing your team's training.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search help…"
              aria-label="Search help articles"
              className="pl-12 py-6 text-lg bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-4">
              {hasResults
                ? `Showing results for "${searchQuery}"`
                : `No results found for "${searchQuery}"`}
            </p>
          )}
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          {!hasResults ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Nothing found</h2>
              <p className="text-muted-foreground mb-6">
                Try a different search, or browse all the topics.
              </p>
              <Button onClick={() => setSearchQuery("")}>Clear search</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Card key={category.title}>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-xl">{category.title}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {category.articles.map((article, articleIndex) => (
                          <AccordionItem key={article.title} value={`${index}-${articleIndex}`}>
                            <AccordionTrigger className="text-left hover:text-primary">
                              <span className="flex items-center gap-2 min-w-0">
                                <ArrowRight className="h-4 w-4 flex-shrink-0" />
                                {article.title}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground pl-6">
                              {article.content}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Support CTA */}
      <section className="py-12 md:py-16 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Still stuck? Send us a message.
              </h2>
              <p className="text-sm opacity-90">
                Tell us what you were trying to do and we'll reply by email.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact?tab=support">Contact support</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/contact?tab=sales">Talk to sales</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
