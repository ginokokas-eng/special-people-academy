import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  MessageCircleQuestion,
  Trash2,
  Plus,
  CornerDownRight,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import type { LearnLesson } from './types';

const sb = supabase as any;

interface Reply {
  id: string;
  body: string;
  user_id: string;
  is_instructor_reply: boolean;
  created_at: string;
}
interface Question {
  id: string;
  title: string;
  body: string;
  user_id: string;
  lesson_id: string | null;
  created_at: string;
  replies: Reply[];
}

export function QnaTab({
  courseId,
  activeLesson,
}: {
  courseId: string;
  activeLesson: LearnLesson | undefined;
}) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAsk, setShowAsk] = useState(false);
  const [title, setTitle] = useState('');
  const [qBody, setQBody] = useState('');
  const [attach, setAttach] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: qs, error } = await sb
      .from('course_questions')
      .select('id, title, body, user_id, lesson_id, created_at')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Q&A load error', error);
      setLoading(false);
      return;
    }
    const qIds = (qs || []).map((q: any) => q.id);
    let replies: Reply[] = [];
    if (qIds.length) {
      const { data: rs } = await sb
        .from('course_question_replies')
        .select('id, body, user_id, is_instructor_reply, created_at, question_id')
        .in('question_id', qIds)
        .order('created_at', { ascending: true });
      replies = rs || [];
    }
    const merged: Question[] = (qs || []).map((q: any) => ({
      ...q,
      replies: replies.filter((r: any) => r.question_id === q.id),
    }));
    setQuestions(merged);

    const userIds = Array.from(
      new Set([
        ...(qs || []).map((q: any) => q.user_id),
        ...replies.map((r) => r.user_id),
      ])
    );
    if (userIds.length) {
      const { data: profiles } = await sb
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        map[p.user_id] = p.full_name || 'Learner';
      });
      setNames(map);
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const askQuestion = async () => {
    if (!user || !title.trim() || !qBody.trim()) return;
    setSaving(true);
    const { error } = await sb.from('course_questions').insert({
      course_id: courseId,
      user_id: user.id,
      lesson_id: attach && activeLesson ? activeLesson.id : null,
      title: title.trim(),
      body: qBody.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error('Could not post question');
      return;
    }
    setTitle('');
    setQBody('');
    setShowAsk(false);
    toast.success('Question posted');
    fetchData();
  };

  const deleteQuestion = async (id: string) => {
    const ok = await confirmDialog({
      title: 'Delete question?',
      description: 'This will remove the question and its replies.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const { error } = await sb.from('course_questions').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete question');
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {questions.length} {questions.length === 1 ? 'question' : 'questions'}
        </p>
        <Button size="sm" onClick={() => setShowAsk((s) => !s)}>
          <Plus className="h-4 w-4 mr-1" /> Ask a question
        </Button>
      </div>

      {showAsk && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Question title"
          />
          <Textarea
            value={qBody}
            onChange={(e) => setQBody(e.target.value)}
            placeholder="Describe your question…"
            className="min-h-20"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {activeLesson && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={attach}
                  onChange={(e) => setAttach(e.target.checked)}
                  className="accent-primary"
                />
                Attach to "{activeLesson.title}"
              </label>
            )}
            <Button onClick={askQuestion} disabled={saving || !title.trim() || !qBody.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Post question
            </Button>
          </div>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <MessageCircleQuestion className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No questions yet. Be the first to ask.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              names={names}
              currentUserId={user?.id}
              onReplyPosted={fetchData}
              onDelete={() => deleteQuestion(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  q,
  names,
  currentUserId,
  onReplyPosted,
  onDelete,
}: {
  q: Question;
  names: Record<string, string>;
  currentUserId: string | undefined;
  onReplyPosted: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);

  const postReply = async () => {
    if (!currentUserId || !reply.trim()) return;
    setPosting(true);
    const { error } = await sb.from('course_question_replies').insert({
      question_id: q.id,
      user_id: currentUserId,
      body: reply.trim(),
    });
    setPosting(false);
    if (error) {
      toast.error('Could not post reply');
      return;
    }
    setReply('');
    onReplyPosted();
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-medium text-foreground">{q.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {names[q.user_id] || 'Learner'} · {new Date(q.created_at).toLocaleDateString()}
          </p>
        </div>
        {q.user_id === currentUserId && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <p className="text-sm text-foreground/90 whitespace-pre-line mt-2">{q.body}</p>

      <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
        <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          {q.replies.length} {q.replies.length === 1 ? 'reply' : 'replies'}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          {q.replies.map((r) => (
            <div key={r.id} className="flex gap-2 pl-2 border-l-2 border-muted">
              <CornerDownRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{names[r.user_id] || 'Learner'}</span>
                  {r.is_instructor_reply && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px]">
                      Trainer
                    </Badge>
                  )}{' '}
                  · {new Date(r.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-foreground/90 whitespace-pre-line mt-0.5">{r.body}</p>
              </div>
            </div>
          ))}
          <div className="flex items-end gap-2 pt-1">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply…"
              className="min-h-10 resize-y"
            />
            <Button size="sm" onClick={postReply} disabled={posting || !reply.trim()}>
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reply'}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
