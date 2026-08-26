import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, Loader2, Mail } from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';

const emailShape = z.string().regex(/^[^\s@]+@[^\s@]+$/, 'Please enter a valid email address');

interface EmailCodeSignInProps {
  /** Called once a session exists, with the freshly loaded roles. */
  onSignedIn: (roles: string[]) => void;
  /** Return to the password form. */
  onCancel: () => void;
}

/**
 * Passwordless sign-in with an emailed code.
 *
 * This is the only route into the app for invited organisation staff, who are
 * created without a password they ever see and may not have a Google account.
 * A typed code (rather than a tapped link) is used deliberately: it works
 * identically inside the Android app shell, which has no deep link for email.
 */
export function EmailCodeSignIn({ onSignedIn, onCancel }: EmailCodeSignInProps) {
  const { sendEmailCode, verifyEmailCode } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const parsed = emailShape.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setBusy(true);
    const { error } = await sendEmailCode(email);
    setBusy(false);

    if (error) {
      // A missing account must not be distinguishable from a delivered code.
      if (/signups? not allowed|user not found/i.test(error.message)) {
        setStep('code');
        toast.success('If that email has an account, a code is on its way.');
        return;
      }
      toast.error(error.message);
      return;
    }

    setStep('code');
    toast.success('Check your email for your sign-in code.');
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      toast.error('Enter the 6-digit code from your email.');
      return;
    }

    setBusy(true);
    const { error, roles } = await verifyEmailCode(email, code);
    setBusy(false);

    if (error) {
      toast.error('That code is not valid or has expired. Send a new one and try again.');
      setCode('');
      return;
    }

    toast.success('Welcome back!');
    onSignedIn(roles ?? []);
  };

  if (step === 'email') {
    return (
      <form onSubmit={requestCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code-email">Email</Label>
          <Input
            id="code-email"
            type="email"
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            We'll email you a 6-digit code — no password needed.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
          Email me a sign-in code
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Use my password instead
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-code">Enter your code</Label>
        <p className="text-xs text-muted-foreground">
          Sent to {email}. The code expires shortly, so use it soon.
        </p>
        <InputOTP
          id="signin-code"
          maxLength={6}
          value={code}
          onChange={setCode}
          containerClassName="justify-center pt-1"
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setStep('email')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Change email
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void requestCode()}>
          Send a new code
        </Button>
      </div>
    </form>
  );
}
