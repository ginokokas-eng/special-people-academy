import { useEffect, useState } from 'react';
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PageHero } from "@/components/marketing/PageHero";
import { FAQSection } from "@/components/marketing/FAQSection";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Send, 
  CheckCircle, 
  Mail, 
  Phone, 
  MapPin,
  Headphones,
  Users,
  HelpCircle
} from '@/components/icons';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';
import { useBranding } from '@/hooks/useBrandingSettings';
import { hasRealValue } from '@/lib/placeholders';

const programSizes = [
  '1-10 staff',
  '11-50 staff',
  '51-200 staff',
  '201-500 staff',
  '500+ staff',
];

const roles = [
  'Registered manager',
  'Training or learning lead',
  'Care or nursing lead',
  'Owner or director',
  'Administrator',
  'Self-employed carer',
  'Other',
];

const issueTypes = [
  'Login / Account access',
  'Course content issue',
  'Technical problem',
  'Billing question',
  'Feature request',
  'Other',
];

const urgencyLevels = [
  { value: 'low', label: 'Low - General question' },
  { value: 'medium', label: 'Medium - Affecting my work' },
  { value: 'high', label: 'High - Blocking critical tasks' },
];

const faqs = [
  {
    question: "How do my staff get access to a course?",
    answer: "Your organisation buys training passes for a course, then your organisation admin allocates a pass to each member of staff. They receive an invitation by email and set a password the first time they sign in."
  },
  {
    question: "Can one person buy a single course?",
    answer: "Yes. Self-employed carers can buy a course for themselves from the course page and start straight away."
  },
  {
    question: "How do we prove completion to an inspector?",
    answer: "Every completed course issues a certificate with a verification code. Anyone can check that code on our verification page, and organisation admins can see completion for their whole team in the organisation portal."
  },
  {
    question: "Do practical courses need a face-to-face session?",
    answer: "Some do. Those courses show a practical sign-off step, which a trainer completes with the learner before the competency certificate is issued."
  },
  {
    question: "What happens when training expires?",
    answer: "Courses with a renewal period show a renewal date, and learners and organisation admins can see what is due or overdue on their renewals view."
  }
];

export default function Contact() {
  const branding = useBranding();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') === 'support' ? 'support' : 'sales';
  const [activeTab, setActiveTab] = useState<string>(requestedTab);

  // Keep the URL and the visible tab in step, so "Contact Support" links land
  // on the support form rather than sales.
  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const contactRows = [
    hasRealValue(branding.contactEmail)
      ? { label: 'Email', value: branding.contactEmail, href: `mailto:${branding.contactEmail}`, icon: Mail }
      : null,
    hasRealValue(branding.contactPhone)
      ? { label: 'Phone', value: branding.contactPhone, href: `tel:${branding.contactPhone.replace(/\s+/g, '')}`, icon: Phone }
      : null,
    hasRealValue(branding.contactAddress)
      ? { label: 'Address', value: branding.contactAddress, href: undefined, icon: MapPin }
      : null,
  ].filter(Boolean) as { label: string; value: string; href?: string; icon: React.ComponentType<{ className?: string }> }[];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedType, setSubmittedType] = useState<'sales' | 'support'>('sales');
  
  // Sales form state
  const [salesForm, setSalesForm] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
    programSize: '',
    message: '',
    wantsDemo: false,
  });

  // Support form state
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    issueType: '',
    urgency: '',
    message: '',
  });

  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSubmittedType('sales');
    setIsSubmitted(true);
    toast.success('Thank you! Our sales team will be in touch soon.');
    setIsSubmitting(false);
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSubmittedType('support');
    setIsSubmitted(true);
    toast.success('Support request submitted! We\'ll respond as soon as possible.');
    setIsSubmitting(false);
  };

  const handleSalesChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSalesForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSupportChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSupportForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (isSubmitted) {
    return (
      <MarketingLayout 
        title="Contact" 
        description="Contact Special People Training for demos, support, partnerships, or general questions."
      >
        <div className="container mx-auto max-w-xl px-6 py-24">
          <Card className="text-center">
            <CardContent className="pt-12 pb-12">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {submittedType === 'sales' 
                  ? 'Thank you for reaching out!' 
                  : 'Support request received!'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {submittedType === 'sales'
                  ? 'Our sales team will review your request and get back to you within 1-2 business days.'
                  : 'Our support team will review your issue and respond as soon as possible.'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setIsSubmitted(false)} variant="outline">
                  Submit Another
                </Button>
                <Button onClick={() => window.location.href = '/'}>
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout 
      title="Contact" 
      description="Contact Special People Training for demos, support, partnerships, or general questions."
    >
      <PageHero 
        badge="Contact Us" 
        title="We're here to help" 
        subtitle="Whether you're exploring the platform, need support, or want to partner—send a message and we'll respond soon."
      />

      {/* Contact Forms */}
      <section className="py-16 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Forms */}
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="sales" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Sales & Demos
                  </TabsTrigger>
                  <TabsTrigger value="support" className="flex items-center gap-2">
                    <Headphones className="h-4 w-4" />
                    Support
                  </TabsTrigger>
                </TabsList>

                {/* Sales Form */}
                <TabsContent value="sales">
                  <Card>
                    <CardHeader>
                      <CardTitle>Request a Demo</CardTitle>
                      <CardDescription>
                        Tell us about your program and we'll show you how Special People Training can help.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSalesSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="sales-name">Name *</Label>
                            <Input
                              id="sales-name"
                              name="name"
                              value={salesForm.name}
                              onChange={handleSalesChange}
                              required
                              placeholder="Your full name"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sales-email">Email *</Label>
                            <Input
                              id="sales-email"
                              name="email"
                              type="email"
                              value={salesForm.email}
                              onChange={handleSalesChange}
                              required
                              placeholder="you@organization.com"
                              maxLength={255}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sales-organization">Organization *</Label>
                          <Input
                            id="sales-organization"
                            name="organization"
                            value={salesForm.organization}
                            onChange={handleSalesChange}
                            required
                            placeholder="School, clinic, or program name"
                            maxLength={200}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="sales-role">Your Role *</Label>
                            <Select 
                              value={salesForm.role} 
                              onValueChange={(value) => setSalesForm(prev => ({ ...prev, role: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select your role" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {roles.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sales-size">Program Size</Label>
                            <Select 
                              value={salesForm.programSize} 
                              onValueChange={(value) => setSalesForm(prev => ({ ...prev, programSize: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Number of learners" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {programSizes.map((size) => (
                                  <SelectItem key={size} value={size}>
                                    {size}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sales-message">Message</Label>
                          <Textarea
                            id="sales-message"
                            name="message"
                            value={salesForm.message}
                            onChange={handleSalesChange}
                            placeholder="Tell us about your training needs, goals, or questions..."
                            rows={4}
                            maxLength={1000}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="wants-demo" 
                            checked={salesForm.wantsDemo}
                            onCheckedChange={(checked) => 
                              setSalesForm(prev => ({ ...prev, wantsDemo: checked === true }))
                            }
                          />
                          <Label htmlFor="wants-demo" className="text-sm font-normal cursor-pointer">
                            I'd like a live demo of the platform
                          </Label>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={isSubmitting || !salesForm.name || !salesForm.email || !salesForm.organization || !salesForm.role}
                        >
                          {isSubmitting ? 'Submitting...' : (
                            <>
                              Request a Demo
                              <Send className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          We typically respond within 1-2 business days.
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Support Form */}
                <TabsContent value="support">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Support</CardTitle>
                      <CardDescription>
                        Having an issue? Let us know and we'll help you resolve it.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSupportSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="support-name">Name *</Label>
                            <Input
                              id="support-name"
                              name="name"
                              value={supportForm.name}
                              onChange={handleSupportChange}
                              required
                              placeholder="Your full name"
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="support-email">Email *</Label>
                            <Input
                              id="support-email"
                              name="email"
                              type="email"
                              value={supportForm.email}
                              onChange={handleSupportChange}
                              required
                              placeholder="you@email.com"
                              maxLength={255}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="support-issue">Issue Type *</Label>
                            <Select 
                              value={supportForm.issueType} 
                              onValueChange={(value) => setSupportForm(prev => ({ ...prev, issueType: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="What's the issue?" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {issueTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="support-urgency">Urgency *</Label>
                            <Select 
                              value={supportForm.urgency} 
                              onValueChange={(value) => setSupportForm(prev => ({ ...prev, urgency: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="How urgent?" />
                              </SelectTrigger>
                              <SelectContent className="bg-background border z-50">
                                {urgencyLevels.map((level) => (
                                  <SelectItem key={level.value} value={level.value}>
                                    {level.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="support-message">Describe the Issue *</Label>
                          <Textarea
                            id="support-message"
                            name="message"
                            value={supportForm.message}
                            onChange={handleSupportChange}
                            required
                            placeholder="Please describe what's happening, what you expected, and any error messages..."
                            rows={5}
                            maxLength={2000}
                          />
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full"
                          disabled={isSubmitting || !supportForm.name || !supportForm.email || !supportForm.issueType || !supportForm.urgency || !supportForm.message}
                        >
                          {isSubmitting ? 'Submitting...' : (
                            <>
                              Contact Support
                              <Send className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          Include screenshots when possible. We'll respond as soon as we can.
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Contact Info Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contactRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Send us a message using the form and we'll come back to you by email.
                    </p>
                  ) : (
                    contactRows.map((row) => (
                      <div key={row.label} className="flex items-start gap-3">
                        <row.icon className="h-5 w-5 text-primary mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm">{row.label}</p>
                          {row.href ? (
                            <a
                              href={row.href}
                              className="text-muted-foreground text-sm hover:text-foreground break-words"
                            >
                              {row.value}
                            </a>
                          ) : (
                            <p className="text-muted-foreground text-sm break-words">{row.value}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <p className="font-medium text-foreground">Looking for answers now?</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check our Help Centre for guides, FAQs, and troubleshooting tips.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/help-center">Visit Help Centre</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <FAQSection 
        title="Frequently Asked Questions"
        subtitle="Quick answers to common questions about getting started."
        faqs={faqs}
      />

      {/* Bottom CTA */}
      <section className="py-12 px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Looking for answers now?
          </h2>
          <p className="text-muted-foreground mb-6">
            Browse our Help Centre for guides, tutorials, and troubleshooting tips.
          </p>
          <Button asChild>
            <Link to="/help-center">Visit Help Centre</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
