import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from '@/components/icons';
import { Button } from '@/components/ui/button';

/**
 * /invite?token=… — organisation invitation acceptance.
 *
 * The raw token is handed straight to the accept-org-invitation edge function
 * (which does ALL validation and seat binding server-side) and stripped from
 * the URL immediately so it can't survive in history or a shared link.
 *
 * The function replies with a single-use token_hash; we verify it here to
 * establish the session, exactly like /sso, then land on the course.
 */

type Status = 'working' | 'error';

export default function InviteAccept() {
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [status, setStatus] = useState<Status>('working');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search.replace(/^\?/, ''));
    const token = params.get('token');
    // Strip the token from the address bar before anything else.
    window.history.replaceState(null, '', window.location.pathname);

    const fail = (text: string) => {
      setMessage(text);
      setStatus('error');
    };

    const run = async () => {
      if (!token) {
        fail('This invitation link is incomplete. Ask your manager to send it again.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('accept-org-invitation', {
        body: { token },
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

    void run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Helmet>
        <title>Accepting your invitation | Academy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="w-full max-w-sm text-center space-y-4">
        {status === 'working' ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-foreground">Setting up your training…</h1>
            <p className="text-sm text-muted-foreground">
              We’re adding your course and signing you in. This only takes a moment.
            </p>
          </>
        ) : (
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
