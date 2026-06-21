import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  Download,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Link as LinkIcon,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResourceDownload } from './useResourceDownload';
import type { LearnResource, LearnLesson } from './types';

interface Props {
  courseId: string;
  resources: LearnResource[];
  lessons: LearnLesson[];
}

/** Friendly, learner-facing file-type label — never a storage path. */
function typeLabel(type: string): string {
  switch (type) {
    case 'pdf':
      return 'PDF';
    case 'spreadsheet':
    case 'excel':
      return 'Spreadsheet';
    case 'image':
      return 'Image';
    case 'link':
    case 'url':
      return 'Link';
    case 'doc':
    case 'document':
      return 'Document';
    default:
      return 'Document';
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-destructive" />;
    case 'spreadsheet':
    case 'excel':
      return <FileSpreadsheet className="h-5 w-5 text-status-success-foreground" />;
    case 'image':
      return <FileImage className="h-5 w-5 text-primary" />;
    case 'link':
    case 'url':
      return <LinkIcon className="h-5 w-5 text-primary" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

export function MobileResources({ courseId, resources, lessons }: Props) {
  if (resources.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Paperclip className="mx-auto mb-3 h-8 w-8 opacity-50" />
        <p className="text-sm">No resources have been added for this course yet.</p>
      </div>
    );
  }

  // Lesson groups follow lesson order; a general group holds course-level items.
  const groups: Array<{ key: string; title: string; items: LearnResource[] }> = [];
  lessons.forEach((l) => {
    const items = resources.filter((r) => r.lesson_id === l.id);
    if (items.length > 0) groups.push({ key: l.id, title: l.title, items });
  });
  const courseLevel = resources.filter((r) => !r.lesson_id);
  if (courseLevel.length > 0) {
    groups.push({ key: 'course', title: 'General course resources', items: courseLevel });
  }

  return (
    <div className="-mx-4 -mt-1 divide-y border-y">
      {groups.map((g, i) => (
        <ResourceGroup
          key={g.key}
          title={g.title}
          items={g.items}
          courseId={courseId}
          defaultOpen={i === 0}
        />
      ))}
    </div>
  );
}

function ResourceGroup({
  title,
  items,
  courseId,
  defaultOpen,
}: {
  title: string;
  items: LearnResource[];
  courseId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { download, downloadingId } = useResourceDownload(courseId);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {items.length} resource{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-muted/20 px-3 pb-3 pt-1">
          {items.map((r) => {
            const isLink = r.resource_type === 'link' || r.resource_type === 'url';
            const busy = downloadingId === r.id;
            return (
              <div
                key={r.id}
                className="mb-2 flex items-start gap-3 rounded-lg border bg-card p-3 last:mb-0"
              >
                <div className="flex-shrink-0 rounded-lg bg-muted p-2">{typeIcon(r.resource_type)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-foreground">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{typeLabel(r.resource_type)}</p>
                  {r.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                  )}
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => download(r.id, r.title)}
                      disabled={busy}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isLink ? (
                        <ExternalLink className="h-3.5 w-3.5" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      {isLink ? 'Open' : 'View'}
                    </button>
                    {!isLink && (
                      <button
                        onClick={() => download(r.id, r.title)}
                        disabled={busy}
                        aria-label={`Download ${r.title}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
