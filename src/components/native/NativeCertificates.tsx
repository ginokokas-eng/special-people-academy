import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WalletCertificate } from '@/components/native/WalletCertificate';
import { FigureMark, HUE_CYCLE } from '@/components/ds/FigureMark';
import { Loader2, Award } from '@/components/icons';
import { toast } from 'sonner';

/**
 * Certificates — the native tab, built as a wallet: the thing a carer holds up
 * to a manager. The status line answers the manager's question before any card
 * is opened.
 *
 * "In date" needs an expiry date. Where a certificate has none, it is reported
 * as issued rather than guessed at — this is a compliance surface.
 */

interface WalletCert {
  id: string;
  title: string;
  number: string;
  issuedAt: string;
  expiresAt: string | null;
  inDate: boolean;
}

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry';

export function NativeCertificates() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<WalletCert[]>([]);
  const [mandatoryTotal, setMandatoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showing, setShowing] = useState<WalletCert | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [certRes, mandatoryRes] = await Promise.all([
      supabase
        .from('certificates')
        .select('id, certificate_number, issued_at, expires_at, course:courses(title)')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false }),
      supabase
        .from('enrollments')
        .select('course:courses(id, is_mandatory)')
        .eq('user_id', user.id),
    ]);

    const now = Date.now();
    setCerts(
      (certRes.data ?? []).map((c) => {
        const course = c.course as { title?: string } | null;
        const expires = c.expires_at as string | null;
        return {
          id: c.id as string,
          title: course?.title ?? 'Course',
          number: c.certificate_number as string,
          issuedAt: c.issued_at as string,
          expiresAt: expires,
          inDate: !expires || new Date(expires).getTime() > now,
        };
      }),
    );

    const mandatory = (mandatoryRes.data ?? [])
      .map((e) => e.course as { is_mandatory?: boolean } | null)
      .filter((c) => c?.is_mandatory).length;
    setMandatoryTotal(mandatory);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const inDateCount = useMemo(() => certs.filter((c) => c.inDate).length, [certs]);
  const newest = certs[0] ?? null;
  const rest = certs.slice(1);

  const share = async (cert: WalletCert) => {
    const text = `${cert.title} — certificate ${cert.number}`;
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
    try {
      if (nav.share) await nav.share({ title: cert.title, text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Certificate details copied');
      }
    } catch {
      /* dismissed */
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      {/* Status first — the manager's question, answered before anything opens. */}
      <section className="learner-card p-5">
        <p className="font-display text-[20px] leading-tight tracking-tight text-foreground">
          {mandatoryTotal > 0
            ? `${inDateCount} of ${mandatoryTotal} mandatory in date`
            : `${inDateCount} ${inDateCount === 1 ? 'certificate' : 'certificates'} in date`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Checked just now</p>
        {mandatoryTotal > 0 && (
          <div className="mt-4 flex gap-2.5">
            {HUE_CYCLE.slice(0, Math.min(mandatoryTotal, 6)).map((hue, i) => (
              <FigureMark key={hue} hue={hue} size={32} muted={i >= inDateCount} />
            ))}
          </div>
        )}
      </section>

      {newest ? (
        <>
          <section className="relative">
            {/* Two card edges behind, so the wallet reads at a glance. */}
            {rest.length > 0 && (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-2 h-4 rounded-b-[18px] bg-[#241A50]/45"
                />
                {rest.length > 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-6 -bottom-3.5 h-3.5 rounded-b-[18px] bg-[#241A50]/25"
                  />
                )}
              </>
            )}
            <div className="relative">
              <WalletCertificate
                title={newest.title}
                issuedOn={fmt(newest.issuedAt)}
                expiresOn={fmt(newest.expiresAt)}
                certificateNumber={newest.number}
                inDate={newest.inDate}
                onShow={() => setShowing(newest)}
                onShare={() => void share(newest)}
              />
            </div>
          </section>

          {rest.length > 0 && (
            <section className="space-y-2.5">
              {rest.map((c, i) => (
                <article key={c.id} className="learner-card flex items-center gap-3 p-3.5">
                  <FigureMark hue={HUE_CYCLE[(i + 1) % HUE_CYCLE.length]} size={26} muted={!c.inDate} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">Issued {fmt(c.issuedAt)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      c.inDate
                        ? 'bg-[var(--sp-success-tint)] text-[var(--sp-success-ink)]'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {c.inDate ? 'In date' : 'Expired'}
                  </span>
                </article>
              ))}
            </section>
          )}
        </>
      ) : (
        <section className="learner-card p-6 text-center">
          <span className="learner-chip mx-auto mb-3 h-11 w-11 rounded-2xl" aria-hidden="true">
            <Award className="h-5 w-5" />
          </span>
          <p className="font-display text-[18px] text-foreground">No certificates yet</p>
          <p className="mx-auto mt-1.5 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
            Finish a course and your certificate appears here — ready to show, with or without
            signal.
          </p>
        </section>
      )}

      {/* Show to manager: the card alone, no chrome, screen brightness up. */}
      {showing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${showing.title} certificate`}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#141030] p-6"
          onClick={() => setShowing(null)}
        >
          <div className="w-full max-w-[420px]">
            <WalletCertificate
              title={showing.title}
              issuedOn={fmt(showing.issuedAt)}
              expiresOn={fmt(showing.expiresAt)}
              certificateNumber={showing.number}
              inDate={showing.inDate}
              onShow={() => undefined}
              onShare={() => void share(showing)}
            />
          </div>
          <p className="text-xs text-white/60">Tap anywhere to close</p>
        </div>
      )}
    </div>
  );
}
