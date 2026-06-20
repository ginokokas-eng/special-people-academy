import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { LearnLesson } from './types';

interface Props {
  lesson: LearnLesson;
  onMarkRead: (lessonId: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

/**
 * Renders a resource / reading lesson: short summary, on-page reading content,
 * a Download PDF button (generated client-side from the content) and an
 * optional "Mark as read" button. Resource lessons never count as video
 * duration and never gate course completion.
 */
export function ResourceLessonBody({ lesson, onMarkRead }: Props) {
  const summary = lesson.description?.trim() || '';
  const content = lesson.content?.trim() || '';

  const downloadPdf = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const marginX = 56;
      const marginTop = 64;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - marginX * 2;
      let y = marginTop;

      const writeLines = (text: string, fontSize: number, fontStyle: 'normal' | 'bold' | 'italic', gapAfter: number) => {
        doc.setFont('helvetica', fontStyle);
        doc.setFontSize(fontSize);
        const lineHeight = fontSize * 1.4;
        const paragraphs = text.split('\n');
        for (const para of paragraphs) {
          const wrapped = para.trim() === '' ? [''] : doc.splitTextToSize(para, maxWidth);
          for (const line of wrapped) {
            if (y > pageHeight - marginTop) {
              doc.addPage();
              y = marginTop;
            }
            doc.text(line, marginX, y);
            y += lineHeight;
          }
        }
        y += gapAfter;
      };

      writeLines(lesson.title, 18, 'bold', 8);
      if (summary) writeLines(summary, 11, 'italic', 14);
      if (content) writeLines(content, 11, 'normal', 0);

      doc.save(`${slugify(lesson.title) || 'resource'}.pdf`);
      toast.success('Downloading PDF');
    } catch (err) {
      console.error('PDF generation failed', err);
      toast.error('Could not generate PDF');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
          <BookOpen className="h-4 w-4" /> Reading
        </div>
        {summary && <p className="mb-4 text-sm font-medium text-muted-foreground">{summary}</p>}
        {content ? (
          <div className="prose prose-sm max-w-none whitespace-pre-line leading-relaxed text-foreground">
            {content}
          </div>
        ) : (
          <p className="text-muted-foreground">This resource has no reading content yet.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={downloadPdf} disabled={!content}>
          <Download className="mr-1.5 h-4 w-4" /> Download PDF
        </Button>
        {lesson.completed ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-success-foreground">
            <CheckCircle2 className="h-4 w-4" /> Marked as read
          </span>
        ) : (
          <Button variant="secondary" onClick={() => onMarkRead(lesson.id)}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark as read
          </Button>
        )}
      </div>
    </div>
  );
}
