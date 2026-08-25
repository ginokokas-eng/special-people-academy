import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [nameError, setNameError] = useState<string | null>(null);

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
    setStatus('working');

    const { data, error } = await supabase.functions.invoke('accept-org-invitation', {
      body: { token, display_name: name },
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
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Helmet>
        <title>Accepting your invitation | Academy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="w-full max-w-sm text-center space-y-4">
        {status === 'name' && (
          <form
            className="space-y-4 text-left"
            onSubmit={(e) => {
              e.preventDefault();
              void redeem();
            }}
          >
            <div className="text-center space-y-1">
              <h1 className="text-lg font-semibold text-foreground">Welcome to your training</h1>
              <p className="text-sm text-muted-foreground">
                Your name appears on your certificate, so please enter it as it should be printed.
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
                aria-describedby={nameError ? 'invite-name-error' : undefined}
                placeholder="e.g. Alex Morgan"
              />
              {nameError && (
                <p id="invite-name-error" className="text-sm text-destructive">
                  {nameError}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        )}

        {status === 'working' && (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-foreground">Setting up your training…</h1>
            <p className="text-sm text-muted-foreground">
              We’re adding your course and signing you in. This only takes a moment.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-lg font-semibold text-foreground">We couldn’t open this invitation</h1>
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button variant="outline" onClick={() => navigate('/auth', { replace: true })}>
              Go to sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
