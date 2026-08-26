import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isNativeShell, initNativeChrome } from '@/lib/native';
import { nativeSsoHandoffSettled } from '@/hooks/useNativeSsoHandoff';

/**
 * Native boot behaviour:
 *  - session      → /my-learning (never the marketing homepage)
 *  - no session   → /native-welcome
 *
 * Runs strictly AFTER the SSO deep-link handoff has settled, so an in-flight
 * /sso navigation is never overridden.
 */
const NEVER_REDIRECT_FROM = ['/sso', '/auth', '/invite', '/verify', '/native-welcome'];

export const NativeBootGate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (!isNativeShell()) return;
    void initNativeChrome();
  }, []);

  useEffect(() => {
    if (!isNativeShell() || done.current || loading) return;

    let cancelled = false;
    (async () => {
      // Let the SSO handoff claim the launch URL first.
      await nativeSsoHandoffSettled;
      if (cancelled || done.current) return;

      const path = window.location.pathname;
      if (NEVER_REDIRECT_FROM.some((p) => path === p || path.startsWith(`${p}/`))) return;
      if (path !== '/') return; // only the boot surface is rewritten

      done.current = true;
      navigate(user ? '/my-learning' : '/native-welcome', { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate, location.pathname]);

  return null;
};
