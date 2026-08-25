import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from '@/components/icons';

/**
 * /sso — Ariadne single sign-on callback.
 *
 * The exchange result arrives either in the URL FRAGMENT (the web hand-off, so
 * the token can't leak into logs or history):
 *   /sso#token_hash=...&type=email&next=/my-learning&expires_at=...&nonce=...
 * or in the QUERY STRING, which is how the native Android hand-off delivers it
 * (an intent URI carries its payload in the query):
 *   /sso?token_hash=...&type=email&next=/my-learning
 *
 * The fragment wins when both are present. Either way the URL is stripped
 * immediately after reading.
 *
 * This screen only establishes the session. No auth UI, no role logic.
 */

const NONCE_KEY = 'academy_sso_nonce';

/** Internal-path validation: single leading slash, no scheme, no host. */
function safeNext(raw: string | null): string {
  if (!raw) return '/my-learning';
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return '/my-learning';
  if (value.includes(':') || value.includes('\\')) return '/my-learning';
  return value;
}

export default function SsoCallback() {
  const navigate = useNavigate();
  const ranRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const fragmentParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const queryParams = new URLSearchParams(window.location.search.replace(/^\?/, ''));
    // Fragment first (web hand-off), query second (native intent hand-off).
    const source = fragmentParams.get('token_hash') ? fragmentParams : queryParams;

    const tokenHash = source.get('token_hash');
    const expiresAt = source.get('expires_at');
    const nonce = source.get('nonce');
    const next = safeNext(source.get('next'));

    // Clear BOTH the fragment and the query immediately — the token_hash must
    // not survive in history, the address bar or any later share.
    window.history.replaceState(null, '', window.location.pathname);

    const expectedNonce = sessionStorage.getItem(NONCE_KEY);
    sessionStorage.removeItem(NONCE_KEY);


    const run = async () => {
      if (!tokenHash) {
        setError('missing');
        return;
      }

      if (expectedNonce) {
        if (nonce !== expectedNonce) {
          console.warn('[sso] nonce mismatch — refusing sign-in');
          setError('invalid');
          return;
        }
      } else if (!nonce) {
        // The app flow did not set a nonce. Allowed for now, logged so we can
        // tighten this once every caller sends one.
        console.warn('[sso] no nonce present on sign-in link');
      }

      if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
        setError('expired');
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });

      if (verifyError) {
        console.warn('[sso] verifyOtp failed:', verifyError.message);
        setError('expired');
        return;
      }

      navigate(next, { replace: true });
    };

    void run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Helmet>
        <title>Signing you in | Academy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="w-full max-w-sm text-center space-y-4">
        {!error ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto" aria-hidden="true" />
            <h1 className="text-lg font-semibold text-foreground">Signing you in…</h1>
            <p className="text-sm text-muted-foreground">
              Connecting your training account. This only takes a moment.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground">We couldn’t sign you in</h1>
            <p className="text-sm text-muted-foreground">
              This sign-in link has expired — go back to the Ariadne app and try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
