import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@/components/icons';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  VIDEO_ACCEPT,
  VIDEO_ALLOWED_EXT,
  VIDEO_MAX_MB,
  type AccordionPayload,
  type BlockPayload,
  type CalloutPayload,
  type CardDeckPayload,
  type ImagePayload,
  type TextPayload,
  type VideoPayload,
} from '@/components/course-learn/blocks/types';

interface FormProps<T extends BlockPayload> {
  payload: T;
  onChange: (payload: T) => void;
  idPrefix: string;
}

export function TextBlockForm({ payload, onChange, idPrefix }: FormProps<TextPayload>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-heading`}>Heading (optional)</Label>
        <Input
          id={`${idPrefix}-heading`}
          value={payload.heading ?? ''}
          placeholder="e.g. Before you start"
          onChange={(e) => onChange({ ...payload, heading: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-text`}>Text</Label>
        <Textarea
          id={`${idPrefix}-text`}
          rows={6}
          value={payload.text ?? ''}
          placeholder={'Write a paragraph.\n\nLeave a blank line for a new paragraph.\n- Start a line with a dash for a bullet'}
          onChange={(e) => onChange({ ...payload, text: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Blank line = new paragraph. Lines starting with “-” become bullet points.
        </p>
      </div>
    </div>
  );
}

export function CalloutBlockForm({ payload, onChange, idPrefix }: FormProps<CalloutPayload>) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-variant`}>Style</Label>
          <Select
            value={payload.variant}
            onValueChange={(v) => onChange({ ...payload, variant: v as CalloutPayload['variant'] })}
          >
            <SelectTrigger id={`${idPrefix}-variant`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Good to know</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
              <SelectItem value="warning">Important</SelectItem>
              <SelectItem value="success">Good practice</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-title`}>Title (optional)</Label>
          <Input
            id={`${idPrefix}-title`}
            value={payload.title ?? ''}
            placeholder="Defaults to the style name"
            onChange={(e) => onChange({ ...payload, title: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-text`}>Text</Label>
        <Textarea
          id={`${idPrefix}-text`}
          rows={4}
          value={payload.text ?? ''}
          onChange={(e) => onChange({ ...payload, text: e.target.value })}
        />
      </div>
    </div>
  );
}

export function CardDeckBlockForm({ payload, onChange, idPrefix }: FormProps<CardDeckPayload>) {
  const cards = payload.cards ?? [];

  const updateCard = (id: string, patch: Partial<{ front: string; back: string }>) =>
    onChange({ ...payload, cards: cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-heading`}>Heading (optional)</Label>
          <Input
            id={`${idPrefix}-heading`}
            value={payload.heading ?? ''}
            onChange={(e) => onChange({ ...payload, heading: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-instruction`}>Instruction</Label>
          <Input
            id={`${idPrefix}-instruction`}
            value={payload.instruction ?? ''}
            placeholder="Tap each card to reveal the answer."
            onChange={(e) => onChange({ ...payload, instruction: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3">
        {cards.map((card, i) => (
          <div key={card.id} className="rounded-md border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Card {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...payload, cards: cards.filter((c) => c.id !== card.id) })}
                disabled={cards.length <= 1}
                aria-label={`Remove card ${i + 1}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-front-${card.id}`}>Front (prompt)</Label>
                <Input
                  id={`${idPrefix}-front-${card.id}`}
                  value={card.front}
                  onChange={(e) => updateCard(card.id, { front: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-back-${card.id}`}>Back (reveal)</Label>
                <Textarea
                  id={`${idPrefix}-back-${card.id}`}
                  rows={2}
                  value={card.back}
                  onChange={(e) => updateCard(card.id, { back: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            ...payload,
            cards: [...cards, { id: crypto.randomUUID(), front: '', back: '' }],
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" /> Add card
      </Button>
    </div>
  );
}

export function ImageBlockForm({ payload, onChange, idPrefix }: FormProps<ImagePayload>) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-url`}>Image URL</Label>
        <Input
          id={`${idPrefix}-url`}
          value={payload.url ?? ''}
          placeholder="https://…"
          onChange={(e) => onChange({ ...payload, url: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-alt`}>Alt text (describes the image)</Label>
        <Input
          id={`${idPrefix}-alt`}
          value={payload.alt ?? ''}
          placeholder="e.g. Nurse checking a feeding tube position"
          onChange={(e) => onChange({ ...payload, alt: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-caption`}>Caption (optional)</Label>
        <Input
          id={`${idPrefix}-caption`}
          value={payload.caption ?? ''}
          onChange={(e) => onChange({ ...payload, caption: e.target.value })}
        />
      </div>
    </div>
  );
}

/* -------------------------------- accordion ------------------------------- */

export function AccordionBlockForm({ payload, onChange, idPrefix }: FormProps<AccordionPayload>) {
  const items = payload.items ?? [];

  const updateItem = (id: string, patch: Partial<{ title: string; body: string }>) =>
    onChange({ ...payload, items: items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...payload, items: next });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-heading`}>Heading (optional)</Label>
        <Input
          id={`${idPrefix}-heading`}
          value={payload.heading ?? ''}
          placeholder="e.g. Common questions"
          onChange={(e) => onChange({ ...payload, heading: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-md border bg-muted/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Section {i + 1}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move section ${i + 1} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  aria-label={`Move section ${i + 1} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange({ ...payload, items: items.filter((it) => it.id !== item.id) })
                  }
                  disabled={items.length <= 1}
                  aria-label={`Remove section ${i + 1}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-title-${item.id}`}>Section title</Label>
                <Input
                  id={`${idPrefix}-title-${item.id}`}
                  value={item.title}
                  onChange={(e) => updateItem(item.id, { title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-body-${item.id}`}>Section text</Label>
                <Textarea
                  id={`${idPrefix}-body-${item.id}`}
                  rows={4}
                  value={item.body}
                  onChange={(e) => updateItem(item.id, { body: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Blank line = new paragraph. Lines starting with “-” become bullet points.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            ...payload,
            items: [...items, { id: crypto.randomUUID(), title: '', body: '' }],
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" /> Add section
      </Button>
    </div>
  );
}

/* ---------------------------------- video --------------------------------- */

interface VideoFormProps extends FormProps<VideoPayload> {
  /** Needed to build the storage path {course_id}/{lesson_id}/{uuid}.{ext}. */
  courseId?: string;
  lessonId?: string;
}

export function VideoBlockForm({
  payload,
  onChange,
  idPrefix,
  courseId,
  lessonId,
}: VideoFormProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const source = payload.source === 'url' ? 'url' : 'storage';

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!(VIDEO_ALLOWED_EXT as readonly string[]).includes(ext)) {
      setError(`That file type isn’t supported. Use MP4, WebM or MOV.`);
      return;
    }
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
      setError(`That file is too large. The limit is ${VIDEO_MAX_MB} MB per video.`);
      return;
    }
    if (!courseId || !lessonId) {
      setError('Save the lesson first, then upload a video.');
      return;
    }

    const path = `${courseId}/${lessonId}/${crypto.randomUUID()}.${ext}`;
    setUploading(true);
    setProgress(8);
    // Supabase JS v2 has no upload progress event; show a determinate-looking
    // ramp so authors know something is happening on large files.
    const ramp = setInterval(() => setProgress((p) => (p < 90 ? p + 3 : p)), 400);
    try {
      const { error: uploadError } = await supabase.storage
        .from('lesson-media')
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;
      setProgress(100);
      onChange({ ...payload, source: 'storage', path, file_name: file.name, url: '' });
      toast.success('Video uploaded');
    } catch (err) {
      console.error('Video upload failed:', err);
      setError('Upload failed. Please check your connection and try again.');
    } finally {
      clearInterval(ramp);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={source === 'storage' ? 'default' : 'outline'}
          onClick={() => onChange({ ...payload, source: 'storage' })}
        >
          Upload a file
        </Button>
        <Button
          type="button"
          size="sm"
          variant={source === 'url' ? 'default' : 'outline'}
          onClick={() => onChange({ ...payload, source: 'url' })}
        >
          Paste a link
        </Button>
      </div>

      {source === 'storage' ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-file`}>Video file</Label>
          <Input
            id={`${idPrefix}-file`}
            ref={inputRef}
            type="file"
            accept={VIDEO_ACCEPT}
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground">
            MP4, WebM or MOV — up to {VIDEO_MAX_MB} MB. Videos are stored privately and only
            enrolled learners can play them.
          </p>
          {uploading && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
            </div>
          )}
          {payload.path && !uploading && (
            <p className="text-xs text-success">
              Uploaded: {payload.file_name || payload.path.split('/').pop()}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-video-url`}>Video link</Label>
          <Input
            id={`${idPrefix}-video-url`}
            value={payload.url ?? ''}
            placeholder="https://youtu.be/… or https://…/video.mp4"
            onChange={(e) => onChange({ ...payload, source: 'url', url: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            YouTube, Vimeo or a direct video file link. YouTube and Vimeo play in their own player,
            so they can’t report when the video finishes — learners confirm they’ve watched it.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-video-title`}>Title (optional)</Label>
          <Input
            id={`${idPrefix}-video-title`}
            value={payload.title ?? ''}
            onChange={(e) => onChange({ ...payload, title: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-video-caption`}>Caption (optional)</Label>
          <Input
            id={`${idPrefix}-video-caption`}
            value={payload.caption ?? ''}
            onChange={(e) => onChange({ ...payload, caption: e.target.value })}
          />
        </div>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
