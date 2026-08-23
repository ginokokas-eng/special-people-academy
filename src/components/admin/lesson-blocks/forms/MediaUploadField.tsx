import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  IMAGE_ACCEPT,
  IMAGE_ALLOWED_EXT,
  IMAGE_MAX_MB,
  type MediaRef,
} from '@/components/course-learn/blocks/types';

interface Props {
  value?: MediaRef | null;
  onChange: (media: MediaRef) => void;
  idPrefix: string;
  label?: string;
  /** Needed to build the storage path {course_id}/{lesson_id}/{uuid}.{ext}. */
  courseId?: string;
  lessonId?: string;
}

/**
 * Shared image picker for block payloads. Uploads to the PRIVATE `lesson-media`
 * bucket (same privacy model as lesson video); pasting a link stays available as
 * a secondary option.
 */
export function MediaUploadField({
  value,
  onChange,
  idPrefix,
  label = 'Image',
  courseId,
  lessonId,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const source = value?.source === 'url' ? 'url' : 'storage';

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!(IMAGE_ALLOWED_EXT as readonly string[]).includes(ext)) {
      setError('That file type isn’t supported. Use PNG, JPG or WebP.');
      return;
    }
    if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
      setError(`That image is too large. The limit is ${IMAGE_MAX_MB} MB.`);
      return;
    }
    if (!courseId || !lessonId) {
      setError('Save the lesson first, then upload an image.');
      return;
    }

    const path = `${courseId}/${lessonId}/${crypto.randomUUID()}.${ext}`;
    setUploading(true);
    setProgress(10);
    const ramp = setInterval(() => setProgress((p) => (p < 90 ? p + 6 : p)), 250);
    try {
      const { error: uploadError } = await supabase.storage
        .from('lesson-media')
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;
      setProgress(100);
      onChange({ source: 'storage', path, file_name: file.name, url: '' });
      toast.success('Image uploaded');
    } catch (err) {
      console.error('Image upload failed:', err);
      setError('Upload failed. Please check your connection and try again.');
    } finally {
      clearInterval(ramp);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={source === 'storage' ? 'default' : 'outline'}
            onClick={() => onChange({ ...(value ?? {}), source: 'storage' })}
          >
            Upload
          </Button>
          <Button
            type="button"
            size="sm"
            variant={source === 'url' ? 'default' : 'outline'}
            onClick={() => onChange({ ...(value ?? {}), source: 'url' })}
          >
            Paste a link
          </Button>
        </div>
      </div>

      {source === 'storage' ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-image-file`} className="sr-only">
            {label} file
          </Label>
          <Input
            id={`${idPrefix}-image-file`}
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            PNG, JPG or WebP — up to {IMAGE_MAX_MB} MB. Images are stored privately and only
            enrolled learners can see them.
          </p>
          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
            </div>
          )}
          {value?.path && !uploading && (
            <p className="text-xs text-success">
              Uploaded: {value.file_name || value.path.split('/').pop()}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-image-url`} className="sr-only">
            {label} link
          </Label>
          <Input
            id={`${idPrefix}-image-url`}
            value={value?.url ?? ''}
            placeholder="https://…/photo.jpg"
            onChange={(e) => onChange({ source: 'url', url: e.target.value })}
          />
        </div>
      )}

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
