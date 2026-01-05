import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ArrowLeft, ArrowRight, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const jobLevels = [
  'C-level',
  'VP/SVP/EVP',
  'Director',
  'Manager',
  'Non-Manager',
];

const jobFunctions = [
  'Chief Executive Officer',
  'E-commerce',
  'Finance',
  'Human Resources',
  'Information Technology',
  'Learning & Development',
  'Marketing',
  'Operations',
  'Procurement',
  'Product',
  'Sales',
  'Training',
  'Other',
];

export default function Contact() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    companyWebsite: '',
    jobLevel: '',
    jobFunction: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitted(true);
    toast.success('Thank you! Our sales team will contact you shortly.');
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const canProceedToStep2 = formData.firstName && formData.lastName && formData.phone;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 pb-16">
          <div className="container mx-auto max-w-xl px-6 py-24">
            <Card className="text-center">
              <CardContent className="pt-12 pb-12">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">
                  Thank you for reaching out!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Our sales team will review your information and get back to you within 24 hours.
                </p>
                <Button onClick={() => window.location.href = '/'}>
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="container mx-auto max-w-xl px-6 py-12">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          <Card>
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Contact Sales</CardTitle>
              <CardDescription className="text-base">
                {step === 1 
                  ? 'How can we reach you? Please provide your contact information.'
                  : 'Tell us about your role and organization.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {step === 1 && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First name *</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last name *</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite">Company website</Label>
                      <Input
                        id="companyWebsite"
                        name="companyWebsite"
                        type="url"
                        value={formData.companyWebsite}
                        onChange={handleChange}
                        placeholder="https://yourcompany.com"
                      />
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="button" 
                        className="w-full"
                        onClick={() => setStep(2)}
                        disabled={!canProceedToStep2}
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="jobLevel">Job level *</Label>
                      <Select 
                        value={formData.jobLevel} 
                        onValueChange={(value) => handleSelectChange('jobLevel', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a job level" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobLevels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jobFunction">Job function *</Label>
                      <Select 
                        value={formData.jobFunction} 
                        onValueChange={(value) => handleSelectChange('jobFunction', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a job function" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobFunctions.map((func) => (
                            <SelectItem key={func} value={func}>
                              {func}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">
                        Anything else? <span className="text-muted-foreground font-normal">Optional</span>
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us about your training needs, team size, or any questions you have..."
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep(1)}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={isSubmitting || !formData.jobLevel || !formData.jobFunction}
                      >
                        {isSubmitting ? 'Submitting...' : (
                          <>
                            Submit
                            <Send className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </form>

              <p className="text-xs text-muted-foreground text-center mt-6">
                Special People Academy will handle your data pursuant to its{' '}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}