import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Award, Loader2 } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logoMark from '@/assets/logo.svg';

/**
 * /invite?token=… — organisation invitation acceptance.
 *
 * The raw token is captured from the URL and stripped immediately (so it can't
 * survive in history or a shared link), then held in memory while we ask the
 * invitee for their full name. Name + token are handed to the
 * accept-org-invitation edge function, which does ALL validation, name
 * normalisation and seat binding server-side.
 *
 * The function replies with a single-use token_hash; we verify it here to
 * establish the session, exactly like /sso, then land on the course.
 *
 * This is the first thing an invited employee ever sees of the Academy, so it
 * carries the full brand treatment.
 */

type Status = 'name' | 'working' | 'error';

/** Mirrors the server-side normaliser: strip control chars, collapse spaces. */
function cleanName(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function InviteAccept() {
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>('name');
  const [message, setMessage] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);


  const fail = (text: string) => {
    setMessage(text);
    setStatus('error');
  };

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search.replace(/^\?/, ''));
    const token = params.get('token');
    // Strip the token from the address bar before anything else.
    window.history.replaceState(null, '', window.location.pathname);
    tokenRef.current = token;

    if (!token) {
      fail('This invitation link is incomplete. Ask your manager to send it again.');
    }
  }, []);

  const redeem = async () => {
    const token = tokenRef.current;
    if (!token) {
      fail('This invitation link is incomplete. Ask your manager to send it again.');
      return;
    }

    const name = cleanName(fullName);
    if (name.length < 2 || name.length > 100) {
      setNameError('Please enter your full name (2–100 characters).');
      return;
    }
    setNameError(null);

    // A password is what makes the mobile app usable later: invited staff are
    // provisioned without one, so this is their only chance to choose it up front.
    if (password.length < 8 || password.length > 72) {
      setPasswordError('Please choose a password of at least 8 characters.');
      return;
    }
    setPasswordError(null);
    setStatus('working');

    const { data, error } = await supabase.functions.invoke('accept-org-invitation', {
      body: { token, display_name: name, password },
    });


    if (error) {
      let detail = '';
      try {
        const body = error.context?.body;
        if (typeof body === 'string') detail = (JSON.parse(body) as { message?: string }).message ?? '';
      } catch {
        detail = '';
      }
      fail(detail || 'We couldn’t accept this invitation. Ask your manager to send a new one.');
      return;
    }
    if (!data?.ok || !data?.token_hash) {
      fail(data?.message ?? 'This invitation link is no longer valid.');
      return;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash as string,
      type: 'email',
    });
    if (verifyError) {
      fail('We couldn’t start your session. Please open the invitation link again.');
      return;
    }

    navigate((data.next as string) || '/my-learning', { replace: true });
  };

  return (
    <div className="learner-surface flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Helmet>
        <title>Accepting your invitation | Academy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src={logoMark} alt="" className="h-11 w-11" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--learner-kicker))]">
            Special People Academy
          </p>
        </div>

        <div key={status} className="learner-card material-in p-7 sm:p-8">
          {status === 'name' && (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                void redeem();
              }}
            >
              <div className="space-y-1.5 text-center">
                <h1 className="font-display text-[24px] leading-tight tracking-tight text-foreground">
                  Welcome to your training
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your workplace has set up a course for you. Tell us your name and choose a
                  password.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-full-name">Your full name</Label>
                <Input
                  id="invite-full-name"
                  autoFocus
                  autoComplete="name"
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? 'invite-name-error' : 'invite-name-hint'}
                  placeholder="e.g. Alex Morgan"
                  className="h-11 rounded-[10px]"
                />
                {nameError && (
                  <p id="invite-name-error" className="text-sm text-[hsl(var(--destructive-ink))]">
                    {nameError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-password">Choose a password</Label>
                <Input
                  id="invite-password"
                  type="password"
                  autoComplete="new-password"
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? 'invite-password-error' : 'invite-password-hint'}
                  placeholder="At least 8 characters"
                  className="h-11 rounded-[10px]"
                />
                {passwordError ? (
                  <p id="invite-password-error" className="text-sm text-[hsl(var(--destructive-ink))]">
                    {passwordError}
                  </p>
                ) : (
                  <p id="invite-password-hint" className="text-xs text-muted-foreground">
                    You'll use this to sign in on the web and in the mobile app.
                  </p>
                )}
              </div>



              <Button type="submit" className="pressable h-11 w-full rounded-[10px] text-[15px] font-semibold">
                Continue to my course
              </Button>

              <p
                id="invite-name-hint"
                className="flex items-start gap-2 rounded-xl bg-[hsl(var(--learner-wash)/0.05)] px-3.5 py-3 text-left text-xs leading-relaxed text-muted-foreground"
              >
                <Award className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                Your name is printed on your certificate exactly as you type it here, so write it as it
                should appear.
              </p>
            </form>
          )}

          {status === 'working' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
              <h1 className="font-display text-[20px] tracking-tight text-foreground">
                Setting up your training…
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We’re adding your course and signing you in. This only takes a moment.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning-ink))]"
                aria-hidden="true"
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h1 className="font-display text-[20px] tracking-tight text-foreground">
                We couldn’t open this invitation
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
              <Button
                variant="outline"
                className="pressable mt-1 rounded-full"
                onClick={() => navigate('/auth', { replace: true })}
              >
                Go to sign in
              </Button>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Care training by Special People Academy
        </p>
      </div>
    </div>
  );
}
