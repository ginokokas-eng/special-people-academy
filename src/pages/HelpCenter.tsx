import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  BookOpen, 
  Users, 
  Settings, 
  CreditCard, 
  Shield, 
  Video,
  MessageCircle,
  Mail,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const helpCategories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "New to Special People Academy? Learn the basics and set up your account.",
    articles: ["Creating your account", "Navigating the platform", "Enrolling in your first course", "Understanding your dashboard"]
  },
  {
    icon: Users,
    title: "For Learners",
    description: "Everything learners need to know about taking courses and earning certificates.",
    articles: ["Taking a course", "Tracking your progress", "Downloading certificates", "Accessibility features"]
  },
  {
    icon: Settings,
    title: "For Administrators",
    description: "Guides for managing your organization's training program.",
    articles: ["Adding team members", "Assigning courses", "Generating reports", "Managing permissions"]
  },
  {
    icon: CreditCard,
    title: "Billing & Subscriptions",
    description: "Manage your subscription, payments, and invoices.",
    articles: ["Viewing your subscription", "Updating payment method", "Downloading invoices", "Changing plans"]
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    description: "Learn about our security practices and how we protect your data.",
    articles: ["Two-factor authentication", "Password requirements", "Data export requests", "Privacy settings"]
  },
  {
    icon: Video,
    title: "Technical Support",
    description: "Troubleshooting guides and technical help.",
    articles: ["Browser compatibility", "Video playback issues", "Mobile app support", "Accessibility tools"]
  }
];

const popularArticles = [
  "How do I reset my password?",
  "Can I download courses for offline viewing?",
  "How do I add learners to my organization?",
  "What browsers are supported?",
  "How do I get a copy of my certificate?",
  "Can I pause my subscription?"
];

const faqs = [
  {
    question: "How do I contact support?",
    answer: "You can reach our support team via email at [Support Email] or by using the chat widget in the bottom right corner of the platform. Enterprise customers also have access to phone support."
  },
  {
    question: "What are your support hours?",
    answer: "Our support team is available Monday through Friday, 9am to 6pm GMT. Enterprise customers have access to 24/7 priority support."
  },
  {
    question: "How quickly will I get a response?",
    answer: "We aim to respond to all inquiries within 24 hours. Enterprise customers receive priority support with a guaranteed response time of 2 hours for critical issues."
  },
  {
    question: "Can I request a feature?",
    answer: "Absolutely! We love hearing from our users. You can submit feature requests through the feedback form in your account settings or by emailing [Support Email]."
  }
];

export default function HelpCenter() {
  return (
    <MarketingLayout
      title="Help Center"
      description="Find answers to common questions, access guides, and get support for Special People Academy. We're here to help you succeed."
    >
      <PageHero
        badge="Help Center"
        title="How Can We Help You?"
        subtitle="Find answers, browse guides, or get in touch with our support team."
      />

      {/* Search */}
      <section className="py-8 px-6 -mt-8 relative z-10">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-background rounded-xl shadow-lg border p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search for help articles..." 
                className="pl-12 py-6 text-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Help Categories */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Browse by Category</h2>
            <p className="text-muted-foreground">Find the help you need, organized by topic.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.articles.map((article, i) => (
                      <li key={i}>
                        <Link 
                          to="#" 
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <ArrowRight className="h-3 w-3" />
                          {article}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Popular Articles</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {popularArticles.map((article, index) => (
              <Link 
                key={index}
                to="#"
                className="p-4 bg-background rounded-lg border hover:shadow-md transition-shadow flex items-center justify-between group"
              >
                <span className="text-foreground group-hover:text-primary transition-colors">
                  {article}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Still Need Help?</h2>
            <p className="text-muted-foreground">Our support team is here for you.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Live Chat</h3>
              <p className="text-muted-foreground mb-4">
                Chat with our support team in real-time. Available Monday–Friday, 9am–6pm GMT.
              </p>
              <Button>Start Chat</Button>
            </Card>
            
            <Card className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Email Support</h3>
              <p className="text-muted-foreground mb-4">
                Send us a message and we'll get back to you within 24 hours.
              </p>
              <Button variant="outline" asChild>
                <Link to="/contact">Contact Us</Link>
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <FAQSection 
        title="Support FAQs"
        faqs={faqs} 
      />

      <CTABanner
        title="Can't Find What You're Looking For?"
        subtitle="Our team is happy to help with any questions you may have."
        primaryCTA={{ text: "Contact Support", href: "/contact" }}
      />
    </MarketingLayout>
  );
}
