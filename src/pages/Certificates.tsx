import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Download, Share2, Loader2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  pdf_path: string | null;
  course: {
    id: string;
    title: string;
    category: string;
  };
}

export default function Certificates() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          issued_at,
          pdf_path,
          course:courses(id, title, category)
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      // Transform data to match our interface
      const transformedData = (data || []).map(cert => ({
        ...cert,
        course: cert.course as { id: string; title: string; category: string },
      }));

      setCertificates(transformedData);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDownload = async (cert: Certificate) => {
    setDownloading(cert.id);
    try {
      // Call the edge function to generate/get the certificate
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { certificate_id: cert.id },
      });

      if (error) {
        console.error('Function error:', error);
        toast.error('Failed to generate certificate');
        return;
      }

      if (data?.url) {
        // Open in new tab for download/print
        window.open(data.url, '_blank');
        toast.success('Certificate opened - use Print to save as PDF');
      } else {
        toast.error('Failed to get certificate URL');
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    } finally {
      setDownloading(null);
    }
  };

  const handleShare = async (cert: Certificate) => {
    const shareText = `I've completed "${cert.course.title}" at Special People Training! Certificate ID: ${cert.certificate_number}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Certificate of Completion',
          text: shareText,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);
      toast.success('Certificate details copied to clipboard!');
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Certificates</h1>
          <p className="text-muted-foreground mt-1">View and download your earned certificates</p>
        </div>

        {certificates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No certificates yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete courses to earn certificates
              </p>
              <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="overflow-hidden">
                <div className="relative">
                  {/* Certificate preview */}
                  <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 p-8 border-b">
                    <div className="text-center space-y-4">
                      <div className="flex justify-center">
                        <div className="p-4 rounded-full bg-primary/10">
                          <GraduationCap className="h-12 w-12 text-primary" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Certificate of Completion
                        </p>
                        <h3 className="text-xl font-bold text-foreground mt-2">
                          {cert.course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {cert.course.category}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-primary">
                        <Award className="h-4 w-4" />
                        <span>Special People Training</span>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Certificate ID</p>
                        <p className="font-mono text-sm">{cert.certificate_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Issued on</p>
                        <p className="text-sm">{formatDate(cert.issued_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        size="sm"
                        onClick={() => handleDownload(cert)}
                        disabled={downloading === cert.id}
                      >
                        {downloading === cert.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        size="sm"
                        onClick={() => handleShare(cert)}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
