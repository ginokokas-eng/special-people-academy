import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Native SSO handoff (Android/iOS Capacitor shell).
 *
 * The Ariadne carer app launches the Academy with an EXPLICIT intent:
 *   uk.org.specialpeople.academy://sso?token_hash=...&type=email&next=/my-learning
 *
 * Two delivery channels have to be covered:
 *  - cold start: the intent was consumed before React mounted -> App.getLaunchUrl()
 *  - warm start: the process is reused (launchMode=singleTask) -> 'appUrlOpen'
 *
 * Both can fire for the same URL, and the magic-link token_hash is SINGLE USE,
 * so a duplicate hand-off would fail verifyOtp and show the error screen on an
 * otherwise successful sign-in. Everything is therefore deduped on the raw URL.
 *
 * The full query string is forwarded VERBATIM to the existing /sso route so the
 * SsoCallback -> supabase.auth.verifyOtp flow runs unchanged.
 */

/** Module-level so a remount can never re-handle a consumed link. */
const handledUrls = new Set<string>();

/**
 * Resolves once the launch-URL check has finished (or was impossible), so the
 * native boot gate can never redirect over an in-flight /sso navigation.
 * Behaviour of the handoff itself is unchanged.
 */
let resolveSettled: () => void = () => {};
export const nativeSsoHandoffSettled = new Promise<void>((resolve) => {
  resolveSettled = resolve;
});


function ssoTargetFor(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  // Custom scheme: uk.org.specialpeople.academy://sso?...
  // Also tolerate a path-style host (…://host/sso) and https App Links.
  const host = parsed.host.toLowerCase();
  const path = parsed.pathname.replace(/\/+$/, '').toLowerCase();
  const isSso = host === 'sso' || path === '/sso' || path.endsWith('/sso');
  if (!isSso) return null;

  // The token may arrive in the query (natural for an intent URI) or in the
  // fragment (what sso-from-ariadne mints). Preserve whichever is present.
  const query = parsed.search.replace(/^\?/, '');
  const fragment = parsed.hash.replace(/^#/, '');
  const payload = query || fragment;
  if (!payload) return null;

  return `/sso?${payload}`;
}

export function useNativeSsoHandoff() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | null = null;

    const handle = (rawUrl: string | undefined | null) => {
      if (cancelled || !rawUrl) return;
      if (handledUrls.has(rawUrl)) return;
      const target = ssoTargetFor(rawUrl);
      if (!target) return;
      handledUrls.add(rawUrl);
      navigate(target, { replace: true });
    };

    (async () => {
      let CapApp: typeof import('@capacitor/app').App;
      try {
        // Dynamic import so the web build never pulls the native bridge in on boot.
        ({ App: CapApp } = await import('@capacitor/app'));
      } catch {
        resolveSettled();
        return;
      }
      if (cancelled) {
        resolveSettled();
        return;
      }

      try {
        const listener = await CapApp.addListener('appUrlOpen', (event) => {
          handle(event?.url);
        });
        removeListener = () => {
          void listener.remove();
        };
      } catch {
        // Not running in a native shell — nothing to listen for.
      }

      try {
        const launch = await CapApp.getLaunchUrl();
        handle(launch?.url);
      } catch {
        // No launch URL (normal launcher start, or web).
      } finally {
        resolveSettled();
      }
    })();


    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [navigate]);
}

/** Mount-once component wrapper, used inside BrowserRouter. */
export function NativeSsoHandoff() {
  useNativeSsoHandoff();
  return null;
}
