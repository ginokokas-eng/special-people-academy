import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const programSizes = [
  '1-10 learners',
  '11-50 learners',
  '51-200 learners',
  '201-500 learners',
  '500+ learners',
];

const roles = [
  'Educator / Teacher',
  'Program Manager',
  'Therapist / Clinician',
  'Administrator',
  'Family Member',
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
    question: "How do I start a trial?",
    answer: "You can start a free trial by clicking 'Start Free Trial' on our homepage or pricing page. No credit card required—just create an account and explore the platform."
  },
  {
    question: "Can you help us import existing plans?",
    answer: "Yes! Our team can help you migrate existing learner plans, skill libraries, or curriculum content. Contact us for a consultation on your specific data needs."
  },
  {
    question: "Do you offer training?",
    answer: "We provide onboarding support, webinars, and help center resources for all users. Enterprise customers also receive dedicated training sessions for their teams."
  },
  {
    question: "Can families and staff collaborate?",
    answer: "Absolutely. Our platform supports shared visibility between educators, therapists, and family members—so everyone stays informed on learner progress."
  },
  {
    question: "Do you provide accessibility accommodations?",
    answer: "Yes. We're committed to accessibility throughout our platform and our interactions. Let us know what accommodations you need for demos, calls, or using the product."
  }
];

export default function Contact() {
  const [activeTab, setActiveTab] = useState('sales');
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
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Forms */}
            <div className="lg:col-span-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                        <div className="grid sm:grid-cols-2 gap-4">
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

                        <div className="grid sm:grid-cols-2 gap-4">
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
                        <div className="grid sm:grid-cols-2 gap-4">
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

                        <div className="grid sm:grid-cols-2 gap-4">
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
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-sm">Support</p>
                      <p className="text-muted-foreground text-sm">[Support Email]</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-sm">Sales</p>
                      <p className="text-muted-foreground text-sm">[Sales Email]</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-sm">Phone</p>
                      <p className="text-muted-foreground text-sm">[Phone Number]</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground text-sm">Address</p>
                      <p className="text-muted-foreground text-sm">[Company Address]</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <p className="font-medium text-foreground">Looking for answers now?</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Check our Help Center for guides, FAQs, and troubleshooting tips.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/help-center">Visit Help Center</Link>
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
            Browse our Help Center for guides, tutorials, and troubleshooting tips.
          </p>
          <Button asChild>
            <Link to="/help-center">Visit Help Center</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
