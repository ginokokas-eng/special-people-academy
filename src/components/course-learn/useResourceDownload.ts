import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useResourceDownload(courseId: string) {
  const { user } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback(
    async (resourceId: string, title: string) => {
      if (!user) {
        toast.error('Please sign in to download resources');
        return;
      }
      setDownloadingId(resourceId);
      try {
        const { data, error } = await supabase.functions.invoke('download-resource', {
          body: { resource_id: resourceId, course_id: courseId },
        });
        if (error) throw error;
        if (data?.pending) {
          toast.info(data.message || 'This resource is being prepared. Check back soon.');
          return;
        }
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success(`Downloading: ${data.title || title}`);
        } else {
          toast.error('Unable to generate download link');
        }
      } catch (err: any) {
        console.error('Error downloading resource:', err);
        toast.error(err?.message || 'Failed to download resource');
      } finally {
        setDownloadingId(null);
      }
    },
    [user, courseId]
  );

  return { download, downloadingId };
}
