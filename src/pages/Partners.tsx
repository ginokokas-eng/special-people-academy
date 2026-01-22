import { useState } from 'react';
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings, 
  BookOpen, 
  Share2, 
  Megaphone, 
  GraduationCap, 
  FileText, 
  Headphones,
  Send,
  CheckCircle
} from "lucide-react";
import { toast } from 'sonner';
import { Link } from "react-router-dom";

const partnerTypes = [
  { 
    icon: Settings, 
    title: "Implementation Partners", 
    description: "For consultants, schools, and organizations supporting rollout and training. Help clients get the most from Special People Academy with expert guidance.",
    ideal: "Consultants, education agencies, training providers"
  },
  { 
    icon: BookOpen, 
    title: "Content Partners", 
    description: "For creators of life skills curricula, visual supports, and training libraries. Contribute content that reaches learners who need it.",
    ideal: "Curriculum developers, therapists, educators"
  },
  { 
    icon: Share2, 
    title: "Referral Partners", 
    description: "For communities and networks who want to share SPA with organizations that could benefit. Earn recognition for successful referrals.",
    ideal: "Advocacy groups, professional networks, influencers"
  }
];

const benefits = [
  {
    icon: Megaphone,
    title: "Co-Marketing",
    description: "Joint campaigns, case studies, and visibility in our partner directory."
  },
  {
    icon: GraduationCap,
    title: "Training Resources",
    description: "Access to product training, certification, and ongoing education."
  },
  {
    icon: FileText,
    title: "Partner Enablement",
    description: "Sales materials, implementation guides, and branding assets."
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "[Dedicated partner support line and faster response times.]"
  }
];

const partnershipTypes = [
  "Implementation Partner",
  "Content Partner",
  "Referral Partner",
  "Other / Not Sure"
];

export default function Partners() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    website: '',
    partnershipType: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitted(true);
    toast.success('Application submitted! We\'ll be in touch soon.');
    setIsSubmitting(false);
  };

  return (
    <MarketingLayout 
      title="Partners" 
      description="Partner with SPA to expand inclusive training—implementation, content, and referral partnerships available."
    >
      <PageHero 
        badge="Partner Program" 
        title="Partner with Special People Academy" 
        subtitle="Let's bring inclusive, effective skill-building to more learners—together."
        primaryCTA={{ text: "Apply to Partner", href: "#apply" }}
        secondaryCTA={{ text: "Contact Us", href: "/contact" }}
      />

      {/* Partner Types */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Partnership Types</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ways to partner with us
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're an implementer, content creator, or community connector, there's a place for you in our partner ecosystem.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {partnerTypes.map((partner, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <partner.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{partner.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-base">
                    {partner.description}
                  </CardDescription>
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Ideal for:</span> {partner.ideal}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-24 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Partner Benefits</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              What you get as a partner
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center border-none shadow-sm">
                <CardHeader className="pb-2">
                  <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
                    <benefit.icon className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-12">
            <Badge className="mb-4">Apply</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Apply to become a partner
            </h2>
            <p className="text-muted-foreground">
              Tell us about yourself and how you'd like to work together.
            </p>
          </div>

          {isSubmitted ? (
            <Card className="text-center">
              <CardContent className="pt-12 pb-12">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Application received!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Thanks for your interest in partnering with us. We'll review your application and get back to you within 5 business days.
                </p>
                <Button onClick={() => setIsSubmitted(false)} variant="outline">
                  Submit Another Application
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Full name"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organization">Organization *</Label>
                      <Input
                        id="organization"
                        name="organization"
                        value={formData.organization}
                        onChange={handleChange}
                        required
                        placeholder="Company or org name"
                        maxLength={200}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="https://yoursite.com"
                        maxLength={255}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnershipType">Partnership Type *</Label>
                      <Select 
                        value={formData.partnershipType} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, partnershipType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border z-50">
                          {partnershipTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Tell us about your partnership idea *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder="What are you hoping to achieve together? How do you work with organizations in education, therapy, or workforce development?"
                      rows={5}
                      maxLength={2000}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isSubmitting || !formData.name || !formData.organization || !formData.partnershipType || !formData.message}
                  >
                    {isSubmitting ? 'Submitting...' : (
                      <>
                        Apply to Partner
                        <Send className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    We'll review your application and respond within 5 business days.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <CTABanner 
        title="Have a partnership idea?" 
        subtitle="If you have a unique collaboration in mind that doesn't fit the categories above, we'd love to hear from you."
        primaryCTA={{ text: "Contact Us", href: "/contact" }}
      />
    </MarketingLayout>
  );
}
