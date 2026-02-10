import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScormApiAdapter } from '@/lib/scorm-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function ScormPlayer() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [registration, setRegistration] = useState<any>(null);
  const [scormPackage, setScormPackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('not_attempted');
  const [iframeSrc, setIframeSrc] = useState('');
  const apiRef = useRef<ScormApiAdapter | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user && registrationId) {
      loadRegistration();
    }
  }, [user, authLoading, registrationId]);

  const loadRegistration = async () => {
    try {
      const { data: reg, error: regError } = await supabase
        .from('scorm_registrations')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (regError || !reg) {
        toast.error('Registration not found');
        navigate(-1);
        return;
      }

      if (reg.user_id !== user!.id) {
        toast.error('Access denied');
        navigate(-1);
        return;
      }

      setRegistration(reg);
      setStatus(reg.status);

      // Fetch package
      const { data: pkg, error: pkgError } = await supabase
        .from('scorm_packages')
        .select('*')
        .eq('id', reg.scorm_package_id)
        .single();

      if (pkgError || !pkg) {
        toast.error('SCORM package not found');
        navigate(-1);
        return;
      }

      setScormPackage(pkg);

      // Build iframe URL from public storage
      const { data: publicUrl } = supabase.storage
        .from('scorm-extracted')
        .getPublicUrl(`${pkg.storage_extracted_path}/${pkg.launch_path}`);

      setIframeSrc(publicUrl.publicUrl);

      // Create SCORM API adapter
      const adapter = new ScormApiAdapter({
        registrationId: reg.id,
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
        },
        onComplete: () => {
          handleScormComplete(reg);
        },
      });

      await adapter.loadSavedData(reg);
      adapter.install();
      apiRef.current = adapter;

      // Update status to in_progress if not_attempted
      if (reg.status === 'not_attempted') {
        await supabase
          .from('scorm_registrations')
          .update({ status: 'in_progress' })
          .eq('id', reg.id);
        setStatus('in_progress');
      }
    } catch (err) {
      console.error('Error loading SCORM:', err);
      toast.error('Failed to load SCORM content');
    } finally {
      setLoading(false);
    }
  };

  const handleScormComplete = useCallback(async (reg: any) => {
    if (!reg.lesson_id) return;
    
    try {
      // Mark lesson as complete in lesson_progress
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: reg.user_id,
          lesson_id: reg.lesson_id,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'lesson_id,user_id' });

      if (error) {
        console.error('Error marking lesson complete:', error);
      }

      // Check course completion
      if (reg.course_id) {
        try {
          await supabase.functions.invoke('check-course-completion', {
            body: { userId: reg.user_id, courseId: reg.course_id },
          });
        } catch (e) {
          console.error('Error checking course completion:', e);
        }
      }

      toast.success('SCORM module completed!');
    } catch (err) {
      console.error('Completion error:', err);
    }
  }, []);

  const handleExit = async () => {
    if (apiRef.current) {
      await apiRef.current.forceCommit();
      apiRef.current.uninstall();
    }
    // Navigate back
    if (registration?.course_id) {
      navigate(`/courses/${registration.course_id}`);
    } else {
      navigate('/my-learning');
    }
  };

  const statusLabel: Record<string, string> = {
    'not attempted': 'Not Started',
    'incomplete': 'In Progress',
    'in_progress': 'In Progress',
    'not_attempted': 'Not Started',
    'completed': 'Completed',
    'passed': 'Passed',
    'failed': 'Failed',
    'browsed': 'In Progress',
  };

  const statusColor: Record<string, string> = {
    'completed': 'bg-green-100 text-green-800',
    'passed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold truncate max-w-md">
            {scormPackage?.title || 'SCORM Content'}
          </h1>
          <Badge
            variant="outline"
            className={`text-xs ${statusColor[status] || ''}`}
          >
            {status === 'completed' || status === 'passed' ? (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            ) : (
              <Clock className="h-3 w-3 mr-1" />
            )}
            {statusLabel[status] || status}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleExit}>
          <X className="h-4 w-4 mr-1" />
          Exit
        </Button>
      </div>

      {/* SCORM iframe */}
      <div className="flex-1">
        {iframeSrc && (
          <iframe
            src={iframeSrc}
            className="w-full h-full border-0"
            title="SCORM Content"
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}
      </div>
    </div>
  );
}
