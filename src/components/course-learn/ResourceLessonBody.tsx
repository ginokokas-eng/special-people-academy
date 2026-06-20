import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, CheckCircle2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { LearnLesson } from './types';

interface Props {
  lesson: LearnLesson;
  onMarkRead: (lessonId: string) => void;
}

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

/** Parse plain reading content into headings, paragraphs and bullet lists. */
export function parseResourceContent(content: string): Block[] {
  const blocks: Block[] = [];
  const chunks = content.replace(/\r\n/g, '\n').split(/\n\s*\n/);
  for (const raw of chunks) {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const bulletLines = lines.filter((l) => /^[•\-*]\s+/.test(l));
    if (bulletLines.length === lines.length) {
      blocks.push({ kind: 'list', items: lines.map((l) => l.replace(/^[•\-*]\s+/, '')) });
      continue;
    }
    if (lines.length === 1) {
      const t = lines[0];
      const looksLikeHeading = t.length < 60 && !/[.:]$/.test(t);
      blocks.push(looksLikeHeading ? { kind: 'heading', text: t } : { kind: 'paragraph', text: t });
      continue;
    }
    blocks.push({ kind: 'paragraph', text: lines.join(' ') });
  }
  return blocks;
}

/**
 * Renders a resource / reading lesson: short summary, structured on-page
 * reading content, an optional footer note, a Download PDF button (generated
 * client-side from the content) and a "Mark as read" button. Resource lessons
 * never count as video duration and never gate course completion.
 */
export function ResourceLessonBody({ lesson, onMarkRead }: Props) {
  const summary = lesson.description?.trim() || '';
  const content = lesson.content?.trim() || '';
  const footer = lesson.footer_note?.trim() || '';
  const required = !!lesson.is_required;
  const blocks = content ? parseResourceContent(content) : [];
  const fileName =
    lesson.pdf_filename?.trim() || `${slugify(lesson.title) || 'resource'}.pdf`;

  const downloadPdf = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const marginX = 52;
      const marginTop = 40;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - marginX * 2;
      let y = marginTop;

      const ensureSpace = (lineHeight: number) => {
        if (y + lineHeight > pageHeight - marginTop) {
          doc.addPage();
          y = marginTop;
        }
      };

      const write = (
        text: string,
        opts: { size: number; style: 'normal' | 'bold' | 'italic'; gapAfter: number; indent?: number }
      ) => {
        doc.setFont('helvetica', opts.style);
        doc.setFontSize(opts.size);
        const lineHeight = opts.size * 1.22;
        const indent = opts.indent ?? 0;
        const wrapped = doc.splitTextToSize(text, maxWidth - indent);
        for (const line of wrapped) {
          ensureSpace(lineHeight);
          doc.text(line, marginX + indent, y);
          y += lineHeight;
        }
        y += opts.gapAfter;
      };

      write(lesson.title, { size: 16, style: 'bold', gapAfter: 4 });
      if (summary) write(summary, { size: 9.5, style: 'italic', gapAfter: 7 });

      for (const block of blocks) {
        if (block.kind === 'heading') {
          y += 1;
          write(block.text, { size: 11.5, style: 'bold', gapAfter: 2.5 });
        } else if (block.kind === 'paragraph') {
          write(block.text, { size: 10, style: 'normal', gapAfter: 4 });
        } else {
          for (const item of block.items) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const lineHeight = 10 * 1.22;
            const wrapped = doc.splitTextToSize(item, maxWidth - 18);
            wrapped.forEach((line: string, i: number) => {
              ensureSpace(lineHeight);
              if (i === 0) doc.text('•', marginX + 4, y);
              doc.text(line, marginX + 18, y);
              y += lineHeight;
            });
          }
          y += 4;
        }
      }


      if (footer) {
        y += 4;
        ensureSpace(24);
        doc.setDrawColor(180);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 10;
        write(footer, { size: 9, style: 'italic', gapAfter: 0 });
      }


      doc.save(fileName);
      toast.success('Downloading PDF');
    } catch (err) {
      console.error('PDF generation failed', err);
      toast.error('Could not generate PDF');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-2 text-sm font-medium text-primary">
            <BookOpen className="h-4 w-4" /> Reading
          </span>
          {required && (
            <Badge variant="outline" className="border-primary/40 text-primary">
              Required reading
            </Badge>
          )}
        </div>
        {summary && <p className="mb-5 text-sm font-medium text-muted-foreground">{summary}</p>}

        {blocks.length > 0 ? (
          <div className="space-y-3 text-foreground">
            {blocks.map((block, i) => {
              if (block.kind === 'heading') {
                return (
                  <h3 key={i} className="pt-1 text-base font-semibold text-foreground">
                    {block.text}
                  </h3>
                );
              }
              if (block.kind === 'list') {
                return (
                  <ul key={i} className="ml-1 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                    {block.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="text-sm leading-relaxed">
                  {block.text}
                </p>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground">This resource has no reading content yet.</p>
        )}

        {footer && (
          <p className="mt-6 border-t pt-3 text-xs italic text-muted-foreground">{footer}</p>
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
