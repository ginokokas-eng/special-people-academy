import { CheckCircle2, Award, BookOpen, Users, ListTree, ShieldAlert, GraduationCap } from 'lucide-react';
import { totalDuration } from './lessonMeta';
import type { LearnCourse, LearnLesson, LearnModule } from './types';

interface Props {
  course: LearnCourse;
  modules: LearnModule[];
  lessons: LearnLesson[];
  competencyAssessors?: string[];
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t pt-5 first:border-t-0 first:pt-0">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function MobileAbout({ course, modules, lessons, competencyAssessors = [] }: Props) {
  const outcomes = Array.isArray(course.learning_outcomes) ? course.learning_outcomes : [];
  const assessorLabel =
    competencyAssessors.length > 0 ? competencyAssessors.join(' or ') : 'an approved assessor';

  const pathwaySteps = [
    'Complete all required video lessons',
    'Pass the Final Assessment with 80% or above',
    'Receive Certificate of Completion',
    'Complete practical competency sign-off, where required',
    `Receive Competency Sign-Off Certificate when marked Competent by ${assessorLabel}`,
  ];

  const structure = modules
    .map((m) => {
      const modLessons = lessons.filter((l) => l.module_id === m.id);
      return { title: m.title, count: modLessons.length, duration: totalDuration(modLessons) };
    })
    .filter((s) => s.count > 0);

  return (
    <div className="space-y-5">
      {/* Course title */}
      <header>
        <h2 className="text-xl font-bold leading-snug text-foreground">{course.title}</h2>
        {course.subtitle && <p className="mt-1 text-sm text-muted-foreground">{course.subtitle}</p>}
      </header>

      {/* Short description */}
      {course.description && (
        <Section icon={<BookOpen className="h-4 w-4" />} title="About this course">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {course.description}
          </p>
        </Section>
      )}

      {/* Who this course is for */}
      {course.overview && (
        <Section icon={<Users className="h-4 w-4" />} title="Who this course is for">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {course.overview}
          </p>
        </Section>
      )}

      {/* What you will learn */}
      {outcomes.length > 0 && (
        <Section icon={<CheckCircle2 className="h-4 w-4" />} title="What you will learn">
          <ul className="space-y-2">
            {outcomes.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-foreground/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-success-foreground" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Course structure */}
      {structure.length > 0 && (
        <Section icon={<ListTree className="h-4 w-4" />} title="Course structure">
          <ol className="space-y-2">
            {structure.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug">{s.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {s.count} lesson{s.count === 1 ? '' : 's'}
                    {s.duration ? ` · ${s.duration}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Certification pathway */}
      {course.has_certificate && (
        <Section icon={<Award className="h-4 w-4" />} title="Certification pathway">
          <ol className="space-y-2">
            {pathwaySteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Scope and safety statement */}
      {course.scope_notes && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-semibold text-destructive">Scope &amp; safety</h3>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {course.scope_notes}
          </p>
        </div>
      )}

      {/* Trainer / assessor information */}
      {competencyAssessors.length > 0 && (
        <Section icon={<GraduationCap className="h-4 w-4" />} title="Trainer & assessor">
          <p className="text-sm leading-relaxed text-foreground/90">
            Practical competency sign-off is carried out by{' '}
            <span className="font-medium text-foreground">{assessorLabel}</span>.
          </p>
        </Section>
      )}
    </div>
  );
}
