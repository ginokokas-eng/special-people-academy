import { CheckCircle2, Award } from 'lucide-react';
import type { LearnCourse, LearnLesson } from './types';

export function OverviewTab({
  course,
  activeLesson,
  competencyAssessors = [],
}: {
  course: LearnCourse;
  activeLesson: LearnLesson | undefined;
  competencyAssessors?: string[];
}) {
  const outcomes = Array.isArray(course.learning_outcomes) ? course.learning_outcomes : [];
  const assessorLabel =
    competencyAssessors.length > 0 ? competencyAssessors.join(' or ') : 'an authorised assessor';

  const pathwaySteps = [
    'Complete all required SCORM/video lessons',
    'Pass the Final Assessment with 80% or above',
    'Receive Certificate of Completion',
    ...(course.requires_practical_signoff
      ? ['Complete practical competency sign-off if required']
      : []),
    `Receive Competency Sign-Off Certificate only when marked Competent by ${assessorLabel}`,
  ];

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
        <h4 className="text-sm font-semibold text-foreground mb-2">Course purpose</h4>
        {course.overview || course.description ? (
          <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
            {course.overview || course.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No course overview available.</p>
        )}
      </div>

      {outcomes.length > 0 && (
        <div className="border-t pt-5">
          <h4 className="text-sm font-semibold text-foreground mb-3">Learning outcomes</h4>
          <ul className="space-y-2">
            {outcomes.map((outcome, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-success-foreground" />
                <span className="leading-relaxed">{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {course.has_certificate && (
        <div className="border-t pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Certification pathway</h4>
          </div>
          <ol className="space-y-2">
            {pathwaySteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
