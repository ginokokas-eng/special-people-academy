import { useParams, Link, Navigate } from "react-router-dom";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, User, Clock, ArrowRight } from "lucide-react";
import { getBlogPostBySlug, blogPosts } from "@/data/blogPosts";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  // Get related posts (same category, excluding current)
  const relatedPosts = blogPosts
    .filter(p => p.category === post.category && p.id !== post.id)
    .slice(0, 2);

  return (
    <MarketingLayout
      title={post.title}
      description={post.excerpt}
    >
      {/* Hero */}
      <section className="py-12 md:py-20 px-6 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto max-w-3xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Blog
            </Link>
          </Button>

          <Badge variant="secondary" className="mb-4">{post.category}</Badge>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            {post.title}
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            {post.excerpt}
          </p>

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-t border-b py-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{post.readTime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16 px-6">
        <div className="container mx-auto max-w-3xl">
          <article className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-a:text-primary">
            <div 
              className="blog-content"
              dangerouslySetInnerHTML={{ 
                __html: post.content
                  .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-foreground mt-8 mb-4">$1</h2>')
                  .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold text-foreground mt-6 mb-3">$1</h3>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
                  .replace(/^- (.+)$/gm, '<li class="text-muted-foreground ml-4">$1</li>')
                  .replace(/^(\d+)\. (.+)$/gm, '<li class="text-muted-foreground ml-4">$2</li>')
                  .replace(/\n\n/g, '</p><p class="text-muted-foreground mb-4">')
                  .replace(/^\| .+$/gm, (match) => `<div class="overflow-x-auto my-4"><table class="min-w-full border text-sm"><tr>${match.split('|').filter(Boolean).map(cell => `<td class="border px-3 py-2">${cell.trim()}</td>`).join('')}</tr></table></div>`)
              }} 
            />
          </article>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 md:py-16 px-6 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
              Related Articles
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {relatedPosts.map((related) => (
                <Card key={related.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Badge variant="secondary" className="w-fit mb-2">{related.category}</Badge>
                    <CardTitle className="text-lg">
                      <Link to={`/blog/${related.slug}`} className="hover:text-primary transition-colors">
                        {related.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {related.excerpt}
                    </p>
                    <Button variant="link" className="p-0 h-auto" asChild>
                      <Link to={`/blog/${related.slug}`}>
                        Read article <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="py-12 md:py-16 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Ready to put these ideas into practice?
          </h2>
          <p className="text-muted-foreground mb-6">
            See how Special People Training can help your organization deliver accessible, personalized training.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/contact">Request a Demo</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/blog">Browse More Articles</Link>
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
