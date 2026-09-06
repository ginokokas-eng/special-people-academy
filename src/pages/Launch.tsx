/**
 * /launch — the landing page a third-party LMS's SCORM launcher iframes.
 *
 * It NEVER renders a sign-in form and never inherits an existing session: the
 * only way in is a one-shot token in the URL, minted by
 * lms-api?resource=launch and exchanged here for a single-use magic link.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle } from '@/components/icons';
import { enterLmsMode, isAllowedFrameOrigin, referrerOrigin } from '@/lib/lmsBridge';

type LaunchState = 'starting' | 'error';

const GENERIC_ERROR =
  'We could not start this training. Please close this window and open it again from your learning system.';

export default function Launch() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const [state, setState] = useState<LaunchState>('starting');
  const [message, setMessage] = useState(GENERIC_ERROR);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = params.get('t');

    // Clear the token from the address bar before anything else, so it cannot
    // be copied out of history or leaked in a referrer.
    if (token && typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/launch');
    }

    const run = async () => {
      if (!token) {
        setMessage(
          'This page can only be opened from your learning system. Please start the training there.',
        );
        setState('error');
        return;
      }

      const { data, error } = await supabase.functions.invoke('consume-launch-token', {
        body: { token },
      });

      if (error || !data?.token_hash || !data?.course_id) {
        setMessage(
          'This training link has already been used or has expired. Close this window and open the training again from your learning system.',
        );
        setState('error');
        return;
      }

      // If the launch key restricts embedding, honour that here too — the
      // response header cannot be set from the client.
      const origins: string[] = Array.isArray(data.allowed_frame_origins)
        ? data.allowed_frame_origins
        : [];
      const framed = typeof window !== 'undefined' && window.parent !== window;
      if (framed && !isAllowedFrameOrigin(referrerOrigin(), origins)) {
        setMessage(
          'This training cannot be opened from this website. Ask your training administrator to check the settings for your learning system.',
        );
        setState('error');
        return;
      }

      // Sign the learner in with the one-shot magic link.
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash as string,
        type: 'email',
      });
      if (otpError) {
        setMessage(GENERIC_ERROR);
        setState('error');
        return;
      }

      enterLmsMode(referrerOrigin());
      navigate(`/courses/${data.course_id}/learn?scorm=1`, { replace: true });
    };

    void run().catch(() => {
      setMessage(GENERIC_ERROR);
      setState('error');
    });
  }, [navigate, params]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        {state === 'starting' ? (
          <>
            <Loader2 className="mx-auto mb-4 h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-foreground">Starting your training…</h1>
            <p className="mt-2 text-sm text-muted-foreground">This usually takes a few seconds.</p>
          </>
        ) : (
          <>
            <AlertTriangle className="mx-auto mb-4 h-7 w-7 text-destructive" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-foreground">We could not start this training</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          </>
        )}
      </div>
    </main>
  );
}
