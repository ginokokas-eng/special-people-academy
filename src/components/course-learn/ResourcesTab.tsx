import { Download, Loader2, FileText, FileSpreadsheet, FileImage, File, Paperclip } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useResourceDownload } from './useResourceDownload';
import type { LearnResource, LearnLesson } from './types';

function icon(type: string) {
  switch (type) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-destructive" />;
    case 'spreadsheet':
    case 'excel':
      return <FileSpreadsheet className="h-5 w-5 text-status-success-foreground" />;
    case 'image':
      return <FileImage className="h-5 w-5 text-primary" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

export function ResourcesTab({
  courseId,
  resources,
  lessons,
}: {
  courseId: string;
  resources: LearnResource[];
  lessons: LearnLesson[];
}) {
  const { download, downloadingId } = useResourceDownload(courseId);
  const courseLevel = resources.filter((r) => !r.lesson_id);
  const lessonLevel = resources.filter((r) => r.lesson_id);
  const lessonTitle = (id: string | null) => lessons.find((l) => l.id === id)?.title || 'Lesson';

  if (resources.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No resources have been added to this course yet.</p>
      </div>
    );
  }

  const Row = ({ r }: { r: LearnResource }) => (
    <button
      onClick={() => download(r.id, r.title)}
      disabled={downloadingId === r.id}
      className="w-full flex items-start gap-4 p-4 rounded-lg border bg-card text-left hover:bg-muted/50 hover:border-primary/30 transition-colors"
    >
      <div className="flex-shrink-0 p-2.5 bg-muted rounded-lg">{icon(r.resource_type)}</div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-medium text-foreground">{r.title}</h4>
          <Badge variant="outline" className="uppercase text-xs">
            {r.resource_type}
          </Badge>
          {r.lesson_id && (
            <Badge variant="secondary" className="text-xs">
              {lessonTitle(r.lesson_id)}
            </Badge>
          )}
        </div>
        {r.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
        )}
      </div>
      <div className="flex-shrink-0 p-1 text-muted-foreground">
        {downloadingId === r.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      {courseLevel.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Course resources</h4>
          <div className="space-y-3">
            {courseLevel.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </div>
        </div>
      )}
      {lessonLevel.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Lesson resources</h4>
          <div className="space-y-3">
            {lessonLevel.map((r) => (
              <Row key={r.id} r={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
