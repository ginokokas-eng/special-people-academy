import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Award, GraduationCap, Download, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { LearnCourse } from './types';

const sb = supabase as any;

interface CertRow {
  id: string;
  certificate_number: string;
  issued_at: string;
  certificate_type: string | null;
  competency_signed_at: string | null;
}

export function CertificateTab({ course }: { course: LearnCourse }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const { data } = await sb
      .from('certificates')
      .select('id, certificate_number, issued_at, certificate_type, competency_signed_at')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .order('issued_at', { ascending: false });
    setCerts(data || []);
    setLoading(false);
  }, [user, course.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const download = async (id: string) => {
    setDownloading(id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { certificate_id: id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Certificate opened — use Print to save as PDF');
      } else {
        toast.error('Failed to get certificate');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to download certificate');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const completion = certs.find(
    (c) => !c.certificate_type || c.certificate_type === 'completion'
  );
  const competency = certs.find(
    (c) => c.certificate_type === 'competency' || c.competency_signed_at
  );

  const Card = ({
    icon,
    title,
    cert,
    note,
  }: {
    icon: React.ReactNode;
    title: string;
    cert: CertRow | undefined;
    note: string;
  }) => (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="font-semibold text-foreground">{title}</h4>
        {cert ? (
          <Badge className="ml-auto bg-status-success-bg text-status-success-foreground">Issued</Badge>
        ) : (
          <Badge variant="secondary" className="ml-auto">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        )}
      </div>
      {cert ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Certificate ID</span>
            <span className="font-mono">{cert.certificate_number}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Issued</span>
            <span>{new Date(cert.issued_at).toLocaleDateString()}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => download(cert.id)}
            disabled={downloading === cert.id}
          >
            {downloading === cert.id ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{note}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {course.certificate_details && (
        <p className="text-sm text-muted-foreground">{course.certificate_details}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          icon={<GraduationCap className="h-5 w-5 text-primary" />}
          title="Completion certificate"
          cert={completion}
          note="Complete all required lessons and assessments to earn your completion certificate."
        />
        {course.requires_practical_signoff && (
          <Card
            icon={<ShieldCheck className="h-5 w-5 text-primary" />}
            title="Competency sign-off"
            cert={competency}
            note="A trainer must complete your practical competency sign-off before this certificate is issued."
          />
        )}
      </div>
      {!course.has_certificate && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5" />
          This course does not currently offer a certificate.
        </p>
      )}
    </div>
  );
}
