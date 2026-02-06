import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Video, Loader2, ExternalLink, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  lesson_type: string;
  module_id: string | null;
}

interface Module {
  id: string;
  title: string;
}

interface CourseVideoTabProps {
  courseId: string;
}

export function CourseVideoTab({ courseId }: CourseVideoTabProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      const [lessonsRes, modulesRes] = await Promise.all([
        supabase.from('lessons').select('id, title, video_url, lesson_type, module_id').eq('course_id', courseId).order('order_index'),
        supabase.from('modules').select('id, title').eq('course_id', courseId).order('order_index'),
      ]);

      if (lessonsRes.error) throw lessonsRes.error;
      if (modulesRes.error) throw modulesRes.error;

      const videoLessons = (lessonsRes.data || []).filter(l => l.lesson_type === 'video');
      setLessons(videoLessons);
      setModules(modulesRes.data || []);

      const urls: Record<string, string> = {};
      videoLessons.forEach(lesson => {
        urls[lesson.id] = lesson.video_url || '';
      });
      setVideoUrls(urls);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load video lessons');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVideo = async (lessonId: string) => {
    setSaving(lessonId);
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ video_url: videoUrls[lessonId] || null })
        .eq('id', lessonId);

      if (error) throw error;
      toast.success('Video URL saved');
    } catch (error) {
      console.error('Error saving video URL:', error);
      toast.error('Failed to save video URL');
    } finally {
      setSaving(null);
    }
  };

  const getModuleName = (moduleId: string | null) => {
    if (!moduleId) return 'No Module';
    return modules.find(m => m.id === moduleId)?.title || 'Unknown Module';
  };

  const getEmbedUrl = (url: string) => {
    // Convert YouTube URLs to embed format
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Convert Vimeo URLs to embed format
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No video lessons in this course</p>
            <p className="text-sm">Add video lessons in the Modules & Lessons tab first</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Video Lessons</CardTitle>
          <CardDescription>Add or update video URLs for your lessons. Supports YouTube, Vimeo, and direct video links.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{lesson.title}</h4>
                  <p className="text-sm text-muted-foreground">{getModuleName(lesson.module_id)}</p>
                </div>
                {videoUrls[lesson.id] && (
                  <a
                    href={videoUrls[lesson.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={videoUrls[lesson.id] || ''}
                  onChange={(e) => setVideoUrls({ ...videoUrls, [lesson.id]: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... or Vimeo URL"
                />
                <Button
                  onClick={() => handleSaveVideo(lesson.id)}
                  disabled={saving === lesson.id}
                >
                  {saving === lesson.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {videoUrls[lesson.id] && (
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <iframe
                    src={getEmbedUrl(videoUrls[lesson.id])}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
