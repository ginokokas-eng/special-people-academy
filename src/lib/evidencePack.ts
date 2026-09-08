/**
 * Learner evidence pack — model layer (wave 2, part 6a).
 *
 * Pure functions only: they take the raw jsonb returned by
 * `public.get_learner_evidence_pack` and prepare everything the PDF renderer in
 * 6b needs (en-GB dates, sort order, signature and verification lines, counts).
 * No Supabase calls, no rendering, no React.
 */

/* ------------------------------- raw payload ------------------------------- */

export interface RawEvidenceOrganisation {
  id: string;
  name: string;
}

export interface RawEvidenceLearner {
  user_id: string;
  name: string | null;
  email: string | null;
  organisation: RawEvidenceOrganisation | null;
}

export interface RawEvidenceCertificate {
  certificate_number: string | null;
  certificate_type: string | null;
  issued_at: string | null;
  expires_at: string | null;
  verification_code: string | null;
}

export interface RawEvidenceStandard {
  framework: string | null;
  code: string | null;
  title: string | null;
  lesson_titles: string[] | null;
}

export interface RawEvidenceCourse {
  course_id: string;
  title: string | null;
  category: string | null;
  level: string | null;
  delivery_type: string | null;
  cpd_hours: number | null;
  enrolled_at: string | null;
  completed_at: string | null;
  lessons_total: number | null;
  lessons_completed: number | null;
  certificate: RawEvidenceCertificate | null;
  standards: RawEvidenceStandard[] | null;
}

export interface RawEvidenceMark {
  outcome: string | null;
  assessor_name: string | null;
  signed_at: string | null;
  criteria: Record<string, unknown> | null;
  comment: string | null;
}

export interface RawEvidenceReflection {
  course_title: string | null;
  lesson_title: string | null;
  block_id: string;
  prompt: string | null;
  criteria_labels: string[] | null;
  learner_answer: string | null;
  answered_at: string | null;
  mark: RawEvidenceMark | null;
}

export interface RawEvidenceChecklist {
  course_title: string | null;
  lesson_title: string | null;
  block_id: string;
  heading: string | null;
  steps: string[] | null;
  outcome: string | null;
  assessor_name: string | null;
  signed_at: string | null;
  criteria: Record<string, unknown> | null;
  comment: string | null;
}

export interface RawEvidenceQuizResult {
  course_title: string | null;
  quiz_title: string | null;
  passing_score: number | null;
  attempts: number | null;
  best_score: number | null;
  best_passed: boolean | null;
  latest_score: number | null;
  latest_passed: boolean | null;
  latest_at: string | null;
}

export interface RawEvidencePractical {
  course_title: string | null;
  session_date: string | null;
  location: string | null;
  attended: boolean | null;
  competency_outcome: string | null;
  marked_at: string | null;
  marked_by_name: string | null;
  notes: string | null;
}

export type EvidenceSignoffKind = 'competency' | 'bls' | 'medication' | 'respiratory';

export interface RawEvidenceDomain {
  name: string | null;
  result: boolean | null;
  comments: string | null;
}

export interface RawEvidenceSignoff {
  kind: EvidenceSignoffKind;
  course_title: string | null;
  outcome: string | null;
  assessed_at: string | null;
  assessor_name: string | null;
  assessor_notes: string | null;
  action_plan: string | null;
  reassessment_date: string | null;
  attempt_number: number | null;
  location: string | null;
  domains: RawEvidenceDomain[] | null;
}

export interface RawEvidenceStandardSummary {
  framework: string | null;
  code: string | null;
  title: string | null;
  courses: string[] | null;
  evidence_count: number | null;
}

export interface RawEvidencePack {
  generated_at?: string | null;
  filters?: { course_id: string | null; standard_id: string | null } | null;
  learner?: RawEvidenceLearner | null;
  courses?: RawEvidenceCourse[] | null;
  reflections?: RawEvidenceReflection[] | null;
  checklists?: RawEvidenceChecklist[] | null;
  quiz_results?: RawEvidenceQuizResult[] | null;
  practical?: RawEvidencePractical[] | null;
  signoffs?: RawEvidenceSignoff[] | null;
  standards_summary?: RawEvidenceStandardSummary[] | null;
}

/* --------------------------------- model ---------------------------------- */

export interface EvidenceCertificate extends RawEvidenceCertificate {
  issuedLabel: string;
  expiresLabel: string;
  /** "Verify at www.specialpeopleacademy.com/verify/<code>" — empty without a code. */
  verificationLine: string;
}

export interface EvidenceCourse {
  courseId: string;
  title: string;
  category: string;
  level: string;
  deliveryType: string;
  cpdHours: number | null;
  enrolledAt: string | null;
  enrolledLabel: string;
  completedAt: string | null;
  completedLabel: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  progressLabel: string;
  certificate: EvidenceCertificate | null;
  standards: { framework: string; code: string; title: string; lessonTitles: string[] }[];
}

export interface EvidenceReflection {
  blockId: string;
  courseTitle: string;
  lessonTitle: string;
  prompt: string;
  criteriaLabels: string[];
  learnerAnswer: string;
  answeredAt: string | null;
  answeredLabel: string;
  mark: {
    outcome: string;
    assessorName: string;
    signedAt: string | null;
    signedLabel: string;
    /** "Signed electronically by <name>, <date>". */
    signatureLine: string;
    criteria: Record<string, unknown>;
    comment: string;
  } | null;
}

export interface EvidenceChecklist {
  blockId: string;
  courseTitle: string;
  lessonTitle: string;
  heading: string;
  steps: string[];
  /** Raw stored outcome, e.g. 'competent'. */
  outcome: string;
  /** Human label, e.g. 'Competent'. */
  outcomeLabel: string;
  assessorName: string;
  signedAt: string | null;
  signedLabel: string;
  signatureLine: string;
  criteria: Record<string, unknown>;
  comment: string;
}


export interface EvidenceQuizResult {
  courseTitle: string;
  quizTitle: string;
  passingScore: number | null;
  attempts: number;
  bestScore: number | null;
  bestPassed: boolean;
  latestScore: number | null;
  latestPassed: boolean;
  latestAt: string | null;
  latestLabel: string;
  resultLabel: string;
}

export interface EvidencePractical {
  courseTitle: string;
  sessionDate: string | null;
  sessionLabel: string;
  location: string;
  attended: boolean;
  competencyOutcome: string;
  markedAt: string | null;
  markedByName: string;
  signatureLine: string;
  notes: string;
}

export interface EvidenceSignoff {
  kind: EvidenceSignoffKind;
  kindLabel: string;
  courseTitle: string;
  outcome: string;
  assessedAt: string | null;
  assessedLabel: string;
  assessorName: string;
  assessorNotes: string;
  actionPlan: string;
  reassessmentDate: string | null;
  reassessmentLabel: string;
  attemptNumber: number | null;
  location: string;
  signatureLine: string;
  domains: { name: string; result: boolean | null; resultLabel: string; comments: string }[];
}

export interface EvidenceStandardSummary {
  framework: string;
  code: string;
  title: string;
  courses: string[];
  evidenceCount: number;
}

export interface EvidenceModel {
  generatedAt: string | null;
  generatedLabel: string;
  filters: { courseId: string | null; standardId: string | null };
  learner: {
    userId: string;
    name: string;
    email: string;
    organisationId: string | null;
    organisationName: string;
  };
  courses: EvidenceCourse[];
  reflections: EvidenceReflection[];
  checklists: EvidenceChecklist[];
  quizResults: EvidenceQuizResult[];
  practical: EvidencePractical[];
  signoffs: EvidenceSignoff[];
  standardsSummary: EvidenceStandardSummary[];
}

/* -------------------------------- helpers --------------------------------- */

export const VERIFY_HOST = 'www.specialpeopleacademy.com';

const SIGNOFF_LABELS: Record<EvidenceSignoffKind, string> = {
  competency: 'Enteral feeding competency',
  bls: 'Basic life support competency',
  medication: 'Medication competency',
  respiratory: 'Respiratory care competency',
};

const text = (value: string | null | undefined): string => (value ?? '').trim();
const list = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);
const num = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/** en-GB long date, e.g. 8 September 2026. Empty string for anything unparseable. */
export function formatEvidenceDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** "Signed electronically by <name>, <date>" — empty without a name. */
export function signatureLine(name: string | null | undefined, iso: string | null | undefined): string {
  const who = text(name);
  if (!who) return '';
  const when = formatEvidenceDate(iso);
  return when ? `Signed electronically by ${who}, ${when}` : `Signed electronically by ${who}`;
}

/** "Verify at www.specialpeopleacademy.com/verify/<code>" — empty without a code. */
export function verificationLine(code: string | null | undefined): string {
  const value = text(code);
  return value ? `Verify at ${VERIFY_HOST}/verify/${value}` : '';
}

const byTitle = (a: string, b: string) => a.localeCompare(b, 'en-GB');
const dateValue = (iso: string | null): number => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/* ------------------------------ model builder ------------------------------ */

export function buildEvidenceModel(raw: RawEvidencePack | null | undefined): EvidenceModel {
  const pack = raw ?? {};
  const learner = pack.learner ?? null;

  const courses: EvidenceCourse[] = list(pack.courses)
    .map((c) => {
      const cert = c.certificate;
      return {
        courseId: c.course_id,
        title: text(c.title),
        category: text(c.category),
        level: text(c.level),
        deliveryType: text(c.delivery_type),
        cpdHours: typeof c.cpd_hours === 'number' ? c.cpd_hours : null,
        enrolledAt: c.enrolled_at ?? null,
        enrolledLabel: formatEvidenceDate(c.enrolled_at),
        completedAt: c.completed_at ?? null,
        completedLabel: formatEvidenceDate(c.completed_at),
        lessonsTotal: num(c.lessons_total),
        lessonsCompleted: num(c.lessons_completed),
        progressLabel: `${num(c.lessons_completed)} of ${num(c.lessons_total)} lessons completed`,
        certificate: cert
          ? {
              ...cert,
              issuedLabel: formatEvidenceDate(cert.issued_at),
              expiresLabel: formatEvidenceDate(cert.expires_at),
              verificationLine: verificationLine(cert.verification_code),
            }
          : null,
        standards: list(c.standards).map((s) => ({
          framework: text(s.framework),
          code: text(s.code),
          title: text(s.title),
          lessonTitles: list(s.lesson_titles).map((t) => text(t)),
        })),
      };
    })
    .sort((a, b) => byTitle(a.title, b.title));

  const reflections: EvidenceReflection[] = list(pack.reflections)
    .map((r) => ({
      blockId: r.block_id,
      courseTitle: text(r.course_title),
      lessonTitle: text(r.lesson_title),
      prompt: text(r.prompt),
      criteriaLabels: list(r.criteria_labels).map((c) => text(c)),
      learnerAnswer: text(r.learner_answer),
      answeredAt: r.answered_at ?? null,
      answeredLabel: formatEvidenceDate(r.answered_at),
      mark: r.mark
        ? {
            outcome: text(r.mark.outcome),
            assessorName: text(r.mark.assessor_name),
            signedAt: r.mark.signed_at ?? null,
            signedLabel: formatEvidenceDate(r.mark.signed_at),
            signatureLine: signatureLine(r.mark.assessor_name, r.mark.signed_at),
            criteria: r.mark.criteria ?? {},
            comment: text(r.mark.comment),
          }
        : null,
    }))
    .sort(
      (a, b) =>
        dateValue(b.mark?.signedAt ?? b.answeredAt) - dateValue(a.mark?.signedAt ?? a.answeredAt),
    );

  const checklists: EvidenceChecklist[] = list(pack.checklists)
    .map((c) => ({
      blockId: c.block_id,
      courseTitle: text(c.course_title),
      lessonTitle: text(c.lesson_title),
      heading: text(c.heading),
      steps: list(c.steps).map((s) => text(s)),
      outcome: text(c.outcome),
      assessorName: text(c.assessor_name),
      signedAt: c.signed_at ?? null,
      signedLabel: formatEvidenceDate(c.signed_at),
      signatureLine: signatureLine(c.assessor_name, c.signed_at),
      criteria: c.criteria ?? {},
      comment: text(c.comment),
    }))
    .sort((a, b) => dateValue(b.signedAt) - dateValue(a.signedAt));

  const quizResults: EvidenceQuizResult[] = list(pack.quiz_results)
    .map((q) => {
      const best = typeof q.best_score === 'number' ? q.best_score : null;
      return {
        courseTitle: text(q.course_title),
        quizTitle: text(q.quiz_title),
        passingScore: typeof q.passing_score === 'number' ? q.passing_score : null,
        attempts: num(q.attempts),
        bestScore: best,
        bestPassed: q.best_passed === true,
        latestScore: typeof q.latest_score === 'number' ? q.latest_score : null,
        latestPassed: q.latest_passed === true,
        latestAt: q.latest_at ?? null,
        latestLabel: formatEvidenceDate(q.latest_at),
        resultLabel:
          best === null
            ? 'Not attempted'
            : `${q.best_passed === true ? 'Passed' : 'Not yet passed'} — best score ${best}%`,
      };
    })
    .sort((a, b) => byTitle(a.courseTitle, b.courseTitle) || byTitle(a.quizTitle, b.quizTitle));

  const practical: EvidencePractical[] = list(pack.practical)
    .map((p) => ({
      courseTitle: text(p.course_title),
      sessionDate: p.session_date ?? null,
      sessionLabel: formatEvidenceDate(p.session_date),
      location: text(p.location),
      attended: p.attended === true,
      competencyOutcome: text(p.competency_outcome),
      markedAt: p.marked_at ?? null,
      markedByName: text(p.marked_by_name),
      signatureLine: signatureLine(p.marked_by_name, p.marked_at),
      notes: text(p.notes),
    }))
    .sort((a, b) => dateValue(b.sessionDate) - dateValue(a.sessionDate));

  const signoffs: EvidenceSignoff[] = list(pack.signoffs)
    .map((s) => ({
      kind: s.kind,
      kindLabel: SIGNOFF_LABELS[s.kind] ?? 'Competency sign-off',
      courseTitle: text(s.course_title),
      outcome: text(s.outcome),
      assessedAt: s.assessed_at ?? null,
      assessedLabel: formatEvidenceDate(s.assessed_at),
      assessorName: text(s.assessor_name),
      assessorNotes: text(s.assessor_notes),
      actionPlan: text(s.action_plan),
      reassessmentDate: s.reassessment_date ?? null,
      reassessmentLabel: formatEvidenceDate(s.reassessment_date),
      attemptNumber: typeof s.attempt_number === 'number' ? s.attempt_number : null,
      location: text(s.location),
      signatureLine: signatureLine(s.assessor_name, s.assessed_at),
      domains: list(s.domains).map((d) => ({
        name: text(d.name),
        result: typeof d.result === 'boolean' ? d.result : null,
        resultLabel: d.result === true ? 'Met' : d.result === false ? 'Not yet met' : 'Not assessed',
        comments: text(d.comments),
      })),
    }))
    .sort((a, b) => dateValue(b.assessedAt) - dateValue(a.assessedAt));

  const standardsSummary: EvidenceStandardSummary[] = list(pack.standards_summary)
    .map((s) => ({
      framework: text(s.framework),
      code: text(s.code),
      title: text(s.title),
      courses: list(s.courses).map((c) => text(c)),
      evidenceCount: num(s.evidence_count),
    }))
    .sort((a, b) => byTitle(a.framework, b.framework) || byTitle(a.code, b.code));

  return {
    generatedAt: pack.generated_at ?? null,
    generatedLabel: formatEvidenceDate(pack.generated_at),
    filters: {
      courseId: pack.filters?.course_id ?? null,
      standardId: pack.filters?.standard_id ?? null,
    },
    learner: {
      userId: text(learner?.user_id),
      name: text(learner?.name) || text(learner?.email),
      email: text(learner?.email),
      organisationId: learner?.organisation?.id ?? null,
      organisationName: text(learner?.organisation?.name),
    },
    courses,
    reflections,
    checklists,
    quizResults,
    practical,
    signoffs,
    standardsSummary,
  };
}

/** ISO date part of the generated timestamp, or today. */
function fileDate(model: EvidenceModel): string {
  const iso = model.generatedAt ? new Date(model.generatedAt) : new Date();
  const date = Number.isNaN(iso.getTime()) ? new Date() : iso;
  return date.toISOString().slice(0, 10);
}

/** e.g. evidence-pack-jane-smith-2026-09-08.pdf */
export function evidenceFileName(model: EvidenceModel): string {
  const slug =
    (model.learner.name || model.learner.email || 'learner')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'learner';
  return `evidence-pack-${slug}-${fileDate(model)}.pdf`;
}

export interface EvidenceSummary {
  courses: number;
  reflections: number;
  reflectionsMarked: number;
  checklists: number;
  quizResults: number;
  practical: number;
  signoffs: number;
  standards: number;
  certificates: number;
  /** Nothing at all to show. */
  isEmpty: boolean;
}

export function summariseEvidence(model: EvidenceModel): EvidenceSummary {
  const summary = {
    courses: model.courses.length,
    reflections: model.reflections.length,
    reflectionsMarked: model.reflections.filter((r) => !!r.mark).length,
    checklists: model.checklists.length,
    quizResults: model.quizResults.length,
    practical: model.practical.length,
    signoffs: model.signoffs.length,
    standards: model.standardsSummary.length,
    certificates: model.courses.filter((c) => !!c.certificate).length,
  };
  const isEmpty =
    summary.courses +
      summary.reflections +
      summary.checklists +
      summary.quizResults +
      summary.practical +
      summary.signoffs +
      summary.standards ===
    0;
  return { ...summary, isEmpty };
}
