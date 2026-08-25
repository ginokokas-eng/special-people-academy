import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck, Award } from '@/components/icons';

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

const statusLabel: Record<string, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
};

/**
 * Public certificate verification. Unauthenticated by design — the code itself
 * is the credential — so this page shows the learner name, course, issue and
 * expiry dates and validity ONLY. Never any other personal data.
 */
export default function VerifyCertificate() {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<VerifiedCertificate | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc('verify_certificate', { _code: code ?? '' });
      if (cancelled) return;
      if (error) console.error('verification error', error);
      setCert(Array.isArray(data) && data.length > 0 ? (data[0] as VerifiedCertificate) : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Verify a certificate | Special People Academy</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Check whether a Special People Academy training certificate is genuine and still valid."
        />
      </Helmet>

      <div className="mx-auto max-w-[640px] px-4 py-16 md:px-6">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Certificate verification</h1>
            <p className="text-sm text-muted-foreground">
              Code <span className="font-mono">{code}</span>
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-primary" />
              {loading ? 'Checking…' : cert ? 'Certificate found' : 'Not found'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !cert ? (
              <p className="text-sm text-muted-foreground">
                No certificate matches this code. Please check the code on the certificate and try again.
              </p>
            ) : (
              <dl className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Learner</dt>
                  <dd className="font-medium text-right">{cert.learner_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Course</dt>
                  <dd className="font-medium text-right">{cert.course_title}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Issued</dt>
                  <dd className="text-right">{fmt(cert.issued_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Expires</dt>
                  <dd className="text-right">{cert.expires_at ? fmt(cert.expires_at) : 'No expiry'}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t pt-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={cert.status === 'expired' ? 'outline' : 'secondary'}>
                      {statusLabel[cert.status] ?? cert.status}
                    </Badge>
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
