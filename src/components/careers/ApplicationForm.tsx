import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';

interface ApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleTitle: string;
}

export function ApplicationForm({ open, onOpenChange, roleTitle }: ApplicationFormProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role_applied_for: roleTitle,
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('career_applications')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          role_applied_for: formData.role_applied_for,
          message: formData.message || null,
          status: 'pending',
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after dialog closes
    setTimeout(() => {
      setFormData({
        full_name: '',
        email: '',
        role_applied_for: roleTitle,
        message: '',
      });
      setSubmitted(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for {roleTitle}</DialogTitle>
          <DialogDescription>
            Submit your application and we'll get back to you within 5 business days.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Application Submitted!</h3>
            <p className="text-muted-foreground text-sm">
              Thank you for your interest. We'll review your application and contact you soon.
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Position *</Label>
              <Select 
                value={formData.role_applied_for} 
                onValueChange={(value) => setFormData({ ...formData, role_applied_for: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer Success Specialist">Customer Success Specialist</SelectItem>
                  <SelectItem value="Instructional Designer (Inclusive Learning)">Instructional Designer (Inclusive Learning)</SelectItem>
                  <SelectItem value="Full-Stack Engineer">Full-Stack Engineer</SelectItem>
                  <SelectItem value="Partnerships Manager">Partnerships Manager</SelectItem>
                  <SelectItem value="General Application">General Application</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Cover Letter / Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us why you'd be a great fit..."
                rows={4}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              By submitting, you agree to our privacy policy. We'll only use your information for hiring purposes.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Application
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
