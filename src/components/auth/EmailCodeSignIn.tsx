import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import { useRedirectSettings } from '@/hooks/useRedirectSettings';
import { toast } from 'sonner';
import { z } from 'zod';

const emailShape = z.string().regex(/^[^\s@]+@[^\s@]+$/, 'Please enter a valid email address');

interface EmailCodeSignInProps {
  /** Email typed in the password form, carried across so it isn't retyped. */
  email: string;
  onEmailChange: (value: string) => void;
  /** Return to the password form. */
  onCancel: () => void;
}

/**
 * Passwordless sign-in by emailed link.
 *
 * This is the route into the app for invited organisation staff, who are
 * created without a password they ever see and may not have a Google account.
 *
 * It deliberately does NOT ask for a typed code: the managed auth email that
 * `signInWithOtp` triggers contains only a one-time login link — no `{{ .Token }}`
 * — so a code field could never be completed. If editable templates are set up
 * later (own sender domain), a code step can be reinstated here.
 */
export function EmailCodeSignIn({ email, onEmailChange, onCancel }: EmailCodeSignInProps) {
  const { sendEmailCode } = useAuth();
  const { loginRedirectUrl } = useRedirectSettings();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestLink = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const parsed = emailShape.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setBusy(true);
    const { error } = await sendEmailCode(email, loginRedirectUrl);
    setBusy(false);

    if (error) {
      // A missing account must not be distinguishable from a delivered link.
      if (/signups? not allowed|user not found/i.test(error.message)) {
        setSent(true);
        toast.success('If that email has an account, a sign-in link is on its way.');
        return;
      }
      toast.error(error.message);
      return;
    }

    setSent(true);
    toast.success('Check your email for your sign-in link.');
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-sm font-medium text-foreground">Check your email for the link</p>
          <p className="mt-1 text-xs text-muted-foreground">
            We've sent a sign-in link to {email}. Open it on this device and you'll be signed
            straight in. The link expires shortly, so use it soon.
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setSent(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Change email
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void requestLink()}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send another link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={requestLink} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code-email">Email</Label>
        <Input
          id="code-email"
          type="email"
          autoFocus
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          We'll email you a sign-in link — no password needed.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
        Email me a sign-in link
      </Button>
      <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Use my password instead
      </Button>
    </form>
  );
}
