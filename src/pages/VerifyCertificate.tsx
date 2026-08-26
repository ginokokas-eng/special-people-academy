import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, SearchX, ShieldAlert, ShieldCheck } from '@/components/icons';
import { cn } from '@/lib/utils';
import logoMark from '@/assets/logo.svg';

interface VerifiedCertificate {
  learner_name: string;
  course_title: string;
  certificate_number: string;
  certificate_type: string;
  issued_at: string;
  expires_at: string | null;
  status: 'valid' | 'expiring_soon' | 'expired' | string;
}

const fmt = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

const TYPE_LABEL: Record<string, string> = {
  completion: 'Certificate of completion',
  competency: 'Certificate of competency',
};

/**
 * Public certificate verification. Unauthenticated by design — the code itself
 * is the credential — so this page shows the learner name, course, issue and
 * expiry dates and validity ONLY. Never any other personal data.
 *
 * The audience is an inspector or employer checking a document, so the page is
 * built to read as an official record: clear verdict first, details after.
 */
export default function VerifyCertificate() {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<VerifiedCertificate | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('verify_certificate', { _code: code ?? '' });
      if (cancelled) return;
      if (error) console.error('verification error', error);
      setCert(Array.isArray(data) && data.length > 0 ? (data[0] as VerifiedCertificate) : null);
      setCheckedAt(new Date());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const expired = cert?.status === 'expired';
  const expiringSoon = cert?.status === 'expiring_soon';

  return (
    <div className="learner-surface min-h-screen">
      <Helmet>
        <title>Verify a certificate | Special People Academy</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Check whether a Special People Academy training certificate is genuine and still valid."
        />
      </Helmet>

      <div className="mx-auto max-w-[560px] px-5 py-12 sm:py-16">
        {/* Issuer identity — who is doing the verifying. */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src={logoMark} alt="" className="h-9 w-9" />
          <div className="text-left leading-tight">
            <p className="text-[13px] font-semibold text-foreground">Special People Academy</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--learner-kicker))]">
              Certificate verification
            </p>
          </div>
        </div>

        {loading ? (
          <div className="learner-card flex flex-col items-center gap-4 p-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Checking this code against our records…</p>
            <div className="w-full space-y-2.5 pt-2" aria-hidden="true">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
          </div>
        ) : !cert ? (
          <div className="learner-card flex flex-col items-center gap-3 p-8 text-center sm:p-10">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
              aria-hidden="true"
            >
              <SearchX className="h-6 w-6" />
            </span>
            <h1 className="font-display text-[22px] tracking-tight text-foreground">No certificate found</h1>
            <p className="max-w-[380px] text-sm leading-relaxed text-muted-foreground">
              Nothing in our records matches the code{' '}
              <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{code}</span>.
              Check it against the code printed on the certificate — every genuine certificate carries one.
            </p>
          </div>
        ) : (
          <div className="learner-card overflow-hidden">
            {/* Verdict band — the answer, before any detail. */}
            <div
              className={cn(
                'flex items-center gap-3.5 px-6 py-5 sm:px-8',
                expired ? 'bg-muted' : 'bg-[hsl(var(--success)/0.1)]',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                  expired
                    ? 'bg-muted-foreground/10 text-muted-foreground'
                    : 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
                )}
                aria-hidden="true"
              >
                {expired ? <ShieldAlert className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
              </span>
              <div>
                <h1 className="font-display text-[22px] leading-tight tracking-tight text-foreground">
                  {expired ? 'Certificate expired' : 'Valid certificate'}
                </h1>
                <p className="text-[13px] leading-snug text-muted-foreground">
                  {expired
                    ? `Genuine, but its validity ended on ${fmt(cert.expires_at)}.`
                    : 'Issued by Special People Academy and currently in date.'}
                </p>
              </div>
            </div>

            {expiringSoon && (
              <p className="border-t border-border/40 bg-[hsl(var(--warning)/0.1)] px-6 py-2.5 text-[13px] font-medium text-[hsl(var(--warning))] sm:px-8">
                Expires soon — valid until {fmt(cert.expires_at)}.
              </p>
            )}

            <dl className="space-y-4 px-6 py-6 text-sm sm:px-8">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Awarded to</dt>
                <dd className="text-right font-medium text-foreground">{cert.learner_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Course</dt>
                <dd className="text-right font-medium text-foreground">{cert.course_title}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="text-right text-foreground">
                  {TYPE_LABEL[cert.certificate_type] ?? cert.certificate_type}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Certificate number</dt>
                <dd className="text-right font-mono text-[13px] text-foreground">{cert.certificate_number}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Issued</dt>
                <dd className="text-right text-foreground tabular-nums">{fmt(cert.issued_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{expired ? 'Expired' : 'Expires'}</dt>
                <dd className="text-right text-foreground tabular-nums">
                  {cert.expires_at ? fmt(cert.expires_at) : 'No expiry'}
                </dd>
              </div>
            </dl>

            <p className="border-t border-border/40 px-6 py-3.5 text-xs text-muted-foreground sm:px-8">
              Verification code <span className="font-mono">{code}</span>
              {checkedAt && <> · checked {checkedAt.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}</>}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground/80">
          This page confirms certificates issued by{' '}
          <Link to="/" className="underline underline-offset-2 hover:text-foreground">
            Special People Academy
          </Link>
          . The result reflects our records at the moment you load it.
        </p>
      </div>
    </div>
  );
}
