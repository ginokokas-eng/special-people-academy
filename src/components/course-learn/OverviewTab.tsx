import type { LearnCourse, LearnLesson } from './types';

export function OverviewTab({
  course,
  activeLesson,
}: {
  course: LearnCourse;
  activeLesson: LearnLesson | undefined;
}) {
  return (
    <div className="space-y-6">
      {activeLesson && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{activeLesson.title}</h3>
          {activeLesson.description ? (
            <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
              {activeLesson.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No description for this lesson.</p>
          )}
        </div>
      )}

      {course.scope_notes && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h4 className="text-sm font-semibold text-destructive mb-1">Scope &amp; Safety</h4>
          <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
            {course.scope_notes}
          </p>
        </div>
      )}

      <div className="border-t pt-5">
        <h4 className="text-sm font-semibold text-foreground mb-2">About this course</h4>
        {course.overview || course.description ? (
          <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
            {course.overview || course.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No course overview available.</p>
        )}
      </div>
    </div>
  );
}
