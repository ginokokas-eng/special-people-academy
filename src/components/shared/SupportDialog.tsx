import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Mail, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPPORT_EMAIL = 'training@specialpeople.org.uk';

export const SupportDialog = ({ open, onOpenChange }: SupportDialogProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    toast({ title: 'Email copied', description: 'Support email copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            Get in touch with our training team for help or enquiries.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
            <Mail className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground break-all">{SUPPORT_EMAIL}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied' : 'Copy Email'}
            </Button>
            <Button asChild className="flex-1 gap-2">
              <a href={`mailto:${SUPPORT_EMAIL}`}>
                <Mail className="h-4 w-4" />
                Email Support
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
