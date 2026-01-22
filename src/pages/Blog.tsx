import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, User } from "lucide-react";
import { Link } from "react-router-dom";

// Sample blog posts data structure
const blogPosts = [
  {
    id: "1",
    slug: "inclusive-training-best-practices",
    title: "5 Best Practices for Creating Inclusive Training Programs",
    excerpt: "Learn how to design training that truly meets the needs of learners with diverse abilities. From content structure to assessment methods, these principles will transform your approach.",
    author: "Dr. Sarah Mitchell",
    date: "2026-01-15",
    category: "Best Practices",
    readTime: "8 min read"
  },
  {
    id: "2",
    slug: "epilepsy-awareness-workplace",
    title: "Building Epilepsy Awareness in the Workplace: A Complete Guide",
    excerpt: "Epilepsy affects 1 in 100 people, yet workplace awareness remains low. This guide covers everything from first response to creating supportive policies.",
    author: "James Thompson",
    date: "2026-01-10",
    category: "Safety Training",
    readTime: "12 min read"
  },
  {
    id: "3",
    slug: "measuring-training-outcomes",
    title: "Beyond Completion Rates: Measuring What Really Matters in Training",
    excerpt: "Completion rates tell only part of the story. Discover meaningful metrics that demonstrate real learning outcomes and behavior change.",
    author: "Maria Garcia",
    date: "2026-01-05",
    category: "Analytics",
    readTime: "6 min read"
  },
  {
    id: "4",
    slug: "person-centered-learning",
    title: "Person-Centered Learning: Why One Size Never Fits All",
    excerpt: "Every learner is unique. Explore how adaptive learning paths and personalized content delivery can dramatically improve engagement and retention.",
    author: "Dr. Sarah Mitchell",
    date: "2025-12-28",
    category: "Learning Design",
    readTime: "10 min read"
  },
  {
    id: "5",
    slug: "caregiver-training-tips",
    title: "Supporting Caregivers: Training That Makes a Real Difference",
    excerpt: "Caregivers face unique challenges. Learn how targeted training can reduce burnout, improve confidence, and lead to better outcomes for everyone involved.",
    author: "Emily Chen",
    date: "2025-12-20",
    category: "Caregiving",
    readTime: "7 min read"
  },
  {
    id: "6",
    slug: "accessible-content-creation",
    title: "Creating Accessible Training Content: A Practical Checklist",
    excerpt: "Accessibility isn't an afterthought—it's a foundation. Use this checklist to ensure your training materials work for everyone, regardless of ability.",
    author: "James Thompson",
    date: "2025-12-15",
    category: "Accessibility",
    readTime: "9 min read"
  }
];

const categories = ["All", "Best Practices", "Safety Training", "Analytics", "Learning Design", "Caregiving", "Accessibility"];

export default function Blog() {
  return (
    <MarketingLayout
      title="Blog"
      description="Insights, best practices, and guides for inclusive training. Learn from experts in accessible education and workforce development."
    >
      <PageHero
        badge="Blog"
        title="Insights for Inclusive Learning"
        subtitle="Expert articles on accessible training, person-centered learning, and building programs that make a real difference."
      />

      {/* Categories */}
      <section className="py-8 px-6 border-b">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Button 
                key={category} 
                variant={category === "All" ? "default" : "outline"} 
                size="sm"
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <Card key={post.id} className="hover:shadow-lg transition-shadow group">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{post.category}</Badge>
                    <span className="text-sm text-muted-foreground">{post.readTime}</span>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <Button variant="link" className="p-0 mt-4 h-auto" asChild>
                    <Link to={`/blog/${post.slug}`}>
                      Read more <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Articles
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 md:py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Stay Updated
          </h2>
          <p className="text-muted-foreground mb-8">
            Get the latest insights on inclusive training delivered to your inbox. No spam, just valuable content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-4 py-3 rounded-lg border bg-background flex-1 max-w-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="lg">Subscribe</Button>
          </div>
        </div>
      </section>

      <CTABanner
        title="Ready to Transform Your Training?"
        subtitle="See how Special People Academy can help your organization deliver truly inclusive learning experiences."
        primaryCTA={{ text: "Request a Demo", href: "/contact" }}
      />
    </MarketingLayout>
  );
}
