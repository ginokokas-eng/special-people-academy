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
  BarChart3, 
  CreditCard, 
  AlertCircle,
  ArrowRight,
  Mail,
  MessageCircle,
  Clock
} from "lucide-react";
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

const helpCategories: HelpCategory[] = [
  {
    icon: Rocket,
    title: "Getting Started",
    description: "New to SPA? Set up your account and create your first learner plan.",
    articles: [
      {
        title: "Creating your first learner plan",
        content: "Start by navigating to the Learners section and clicking 'Add Learner.' Enter basic information, then select goals from our skill library or create custom ones. Set a pace that works for the learner, and you're ready to begin."
      },
      {
        title: "Inviting a caregiver or staff member",
        content: "Go to Settings → Team Members and click 'Invite.' Enter their email and select a role (Caregiver, Educator, or Observer). They'll receive an email to join your organization and can start collaborating immediately."
      },
      {
        title: "Setting goals and milestones",
        content: "Goals help you track progress toward specific skills. Create a goal from the learner's profile, break it into milestones, and assign target dates. You'll see progress visually as milestones are completed."
      },
      {
        title: "Accessibility settings overview",
        content: "SPA is designed with accessibility in mind. Go to Settings → Accessibility to enable high contrast mode, adjust text sizes, enable screen reader optimizations, and configure caption preferences for video content."
      }
    ]
  },
  {
    icon: BookOpen,
    title: "Lessons & Content",
    description: "Build engaging lessons with step-by-step instructions and multimedia.",
    articles: [
      {
        title: "Building step-by-step lessons",
        content: "Navigate to the Lessons library and click 'Create Lesson.' Add a title, then break the skill into individual steps. Each step can include text instructions, images, or video demonstrations. Preview the lesson before publishing."
      },
      {
        title: "Adding visuals, videos, and attachments",
        content: "Within any lesson step, click the media button to upload images, videos, or PDF attachments. Supported formats include JPG, PNG, MP4, and PDF. We recommend keeping videos under 5 minutes for best engagement."
      },
      {
        title: "Using templates and skill libraries",
        content: "Save time by starting with our pre-built templates. Browse the Template Library by category (life skills, social skills, etc.), then customize any template to fit your learner's needs. You can also save your own lessons as templates."
      },
      {
        title: "Best practices for clear instructions",
        content: "Use plain language and short sentences. One action per step works best. Include visuals whenever possible. Test your lessons with learners and adjust based on where they struggle. Consistency in formatting helps learners know what to expect."
      }
    ]
  },
  {
    icon: BarChart3,
    title: "Tracking & Reports",
    description: "Monitor progress, generate reports, and export your data.",
    articles: [
      {
        title: "Marking mastery and progress",
        content: "After each session, mark lesson steps as 'Needs Practice,' 'Emerging,' or 'Mastered.' You can also add notes for context. These ratings roll up into overall goal progress and help identify patterns over time."
      },
      {
        title: "Weekly summary reports",
        content: "Every Monday, SPA generates a summary of the previous week's activity. View it in your dashboard or enable email delivery in Settings → Notifications. Reports show sessions completed, skills practiced, and areas needing attention."
      },
      {
        title: "Exporting CSV/PDF",
        content: "Go to Reports → Export to download your data. Choose between PDF (formatted for sharing) or CSV (for spreadsheets and analysis). You can export by learner, by goal, or for your entire organization."
      },
      {
        title: "Tips for consistent data collection",
        content: "Set a regular time for data entry—right after sessions works best. Use the mobile app for quick updates on the go. Enable reminders in Settings to prompt team members who haven't logged data recently."
      },
      {
        title: "Understanding trend charts",
        content: "Trend charts show progress over time. Green lines indicate improvement, yellow suggests plateaus, and red may indicate regression. Use these insights to adjust lesson difficulty or try different teaching approaches."
      }
    ]
  },
  {
    icon: CreditCard,
    title: "Account & Billing",
    description: "Manage your subscription, invoices, and account settings.",
    articles: [
      {
        title: "Updating your plan",
        content: "Go to Settings → Billing → Change Plan. You'll see available options and pricing. Upgrades take effect immediately; downgrades apply at the next billing cycle. Your data is always preserved when changing plans."
      },
      {
        title: "Invoices and receipts",
        content: "All invoices are available in Settings → Billing → Invoice History. Click any invoice to view or download a PDF. For Organization and Enterprise plans, you can add a PO number and billing address to invoices."
      },
      {
        title: "Cancelling or pausing service",
        content: "You can cancel anytime in Settings → Billing → Cancel Subscription. You'll retain access until the end of your billing period. To pause instead, contact support—we offer pauses up to 3 months for qualifying accounts."
      },
      {
        title: "Discounts for non-profits and schools",
        content: "We offer discounts for registered non-profits, schools, and educational institutions. Contact our sales team with documentation of your organization's status to learn about available pricing."
      }
    ]
  },
  {
    icon: AlertCircle,
    title: "Troubleshooting",
    description: "Solutions for common issues and how to get additional help.",
    articles: [
      {
        title: "Login issues",
        content: "If you can't log in, first try resetting your password using the 'Forgot Password' link. Check that caps lock is off and you're using the correct email. If you use SSO, contact your organization's IT team. Still stuck? Contact support."
      },
      {
        title: "Video not playing",
        content: "Ensure you're using a supported browser (Chrome, Firefox, Safari, Edge). Check your internet connection. Try refreshing the page or clearing your browser cache. If using a VPN, try disabling it temporarily."
      },
      {
        title: "Missing permissions",
        content: "If you can't access certain features, your role may not have permission. Ask your organization's admin to check your role in Settings → Team Members. Different roles (Admin, Educator, Caregiver, Observer) have different access levels."
      },
      {
        title: "Data not syncing",
        content: "SPA syncs data automatically, but sync can be delayed on slow connections. Pull down to refresh on mobile. If data is missing, check that you're logged into the correct account. Contact support if issues persist."
      },
      {
        title: "Contact support",
        content: "Reach our support team at [Support Email] or use the chat widget in the app. Include your account email and a detailed description of the issue. Screenshots or screen recordings help us resolve issues faster."
      }
    ]
  }
];

// Flatten all articles for search
const allArticles = helpCategories.flatMap(category => 
  category.articles.map(article => ({
    ...article,
    category: category.title
  }))
);

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories;
    
    const query = searchQuery.toLowerCase();
    return helpCategories.map(category => ({
      ...category,
      articles: category.articles.filter(
        article => 
          article.title.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query)
      )
    })).filter(category => category.articles.length > 0);
  }, [searchQuery]);

  const hasResults = filteredCategories.length > 0;

  return (
    <MarketingLayout
      title="Help Center"
      description="Get setup help, training guides, troubleshooting tips, and billing support."
    >
      {/* Hero with Search */}
      <section className="py-16 md:py-24 px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            How can we help?
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Search our knowledge base or browse categories below.
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search articles…" 
              className="pl-12 py-6 text-lg bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
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
                : `No results found for "${searchQuery}"`
              }
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
              <h2 className="text-xl font-semibold text-foreground mb-2">No articles found</h2>
              <p className="text-muted-foreground mb-6">
                Try a different search term or browse all categories.
              </p>
              <Button onClick={() => setSearchQuery("")}>Clear Search</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{category.title}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {category.articles.map((article, articleIndex) => (
                          <AccordionItem key={articleIndex} value={`${index}-${articleIndex}`}>
                            <AccordionTrigger className="text-left hover:text-primary">
                              <span className="flex items-center gap-2">
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

      {/* Support CTA Strip */}
      <section className="py-12 md:py-16 px-6 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Can't find what you need? We'll help.
              </h2>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm opacity-90 mt-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>[Support Hours: Mon–Fri, 9am–6pm GMT]</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>[Support Email]</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact Support
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/contact">
                  Request a Demo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Help Options */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Other Ways to Get Help</h2>
            <p className="text-muted-foreground">Choose the option that works best for you.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Chat with our team in real-time during support hours.
              </p>
              <Button variant="outline" size="sm">Start Chat</Button>
            </Card>
            
            <Card className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Email Us</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send a message and we'll respond within 24 hours.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/contact">Send Message</Link>
              </Button>
            </Card>
            
            <Card className="text-center p-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Video Tutorials</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Watch step-by-step guides for common tasks.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/webinars">Watch Now</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
