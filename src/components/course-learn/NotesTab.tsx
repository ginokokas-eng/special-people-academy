import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Pencil, Trash2, StickyNote, Save, X, Clock, Play } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { formatTime } from './useLearnerPrefs';
import type { LearnLesson, MediaController } from './types';

interface Note {
  id: string;
  body: string;
  lesson_id: string | null;
  timestamp_seconds: number | null;
  created_at: string;
}

const sb = supabase as any;

export function NotesTab({
  courseId,
  activeLesson,
  lessons,
  canSeek,
  controllerRef,
}: {
  courseId: string;
  activeLesson: LearnLesson | undefined;
  lessons: LearnLesson[];
  canSeek: boolean;
  controllerRef: React.MutableRefObject<MediaController | null>;
}) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [attachToLesson, setAttachToLesson] = useState(true);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const lessonTitle = (id: string | null) =>
    id ? lessons.find((l) => l.id === id)?.title : null;

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await sb
      .from('learner_notes')
      .select('id, body, lesson_id, timestamp_seconds, created_at')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error loading notes', error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  }, [user, courseId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const takeNoteAtCurrentTime = () => {
    const t = controllerRef.current?.getCurrentTime?.() ?? 0;
    setTimestamp(Math.floor(t));
    setAttachToLesson(true);
  };

  const addNote = async () => {
    if (!user || !body.trim()) return;
    setSaving(true);
    const { error } = await sb.from('learner_notes').insert({
      user_id: user.id,
      course_id: courseId,
      lesson_id: attachToLesson && activeLesson ? activeLesson.id : null,
      timestamp_seconds: attachToLesson ? timestamp : null,
      body: body.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error('Could not save note');
      return;
    }
    setBody('');
    setTimestamp(null);
    toast.success('Note saved');
    fetchNotes();
  };

  const saveEdit = async (id: string) => {
    if (!editBody.trim()) return;
    const { error } = await sb
      .from('learner_notes')
      .update({ body: editBody.trim() })
      .eq('id', id);
    if (error) {
      toast.error('Could not update note');
      return;
    }
    setEditingId(null);
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    const ok = await confirmDialog({
      title: 'Delete note?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await sb.from('learner_notes').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete note');
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-card p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a private note for yourself…"
          className="min-h-24 resize-y"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {activeLesson && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={attachToLesson} onCheckedChange={(c) => setAttachToLesson(!!c)} />
                Attach to "{activeLesson.title}"
              </label>
            )}
            {canSeek && (
              <Button type="button" variant="outline" size="sm" onClick={takeNoteAtCurrentTime}>
                <Clock className="mr-1 h-3.5 w-3.5" /> Note at current time
              </Button>
            )}
            {timestamp != null && (
              <Badge variant="secondary" className="gap-1">
                {formatTime(timestamp)}
                <button onClick={() => setTimestamp(null)} aria-label="Remove timestamp">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
          <Button onClick={addNote} disabled={saving || !body.trim()}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Save note
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : notes.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          <StickyNote className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No notes yet. Your private notes will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {note.timestamp_seconds != null && (
                    <button
                      onClick={() =>
                        canSeek &&
                        note.lesson_id === activeLesson?.id &&
                        controllerRef.current?.seekTo(note.timestamp_seconds!)
                      }
                      disabled={!canSeek || note.lesson_id !== activeLesson?.id}
                      className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary disabled:cursor-default disabled:opacity-60"
                    >
                      {canSeek && note.lesson_id === activeLesson?.id && <Play className="h-3 w-3" />}
                      {formatTime(note.timestamp_seconds)}
                    </button>
                  )}
                  {lessonTitle(note.lesson_id) && (
                    <Badge variant="outline" className="text-xs">
                      {lessonTitle(note.lesson_id)}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                </div>
                {editingId !== note.id && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingId(note.id);
                        setEditBody(note.body);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteNote(note.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="min-h-20"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => saveEdit(note.id)}>
                      <Save className="mr-1 h-3.5 w-3.5" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="mr-1 h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-line text-sm text-foreground">{note.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
