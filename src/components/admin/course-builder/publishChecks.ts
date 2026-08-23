/**
 * Publish readiness checks.
 *
 * Computed live from the course's own data — nothing is stored and nothing is
 * auto-fixed. Enforced ONLY on the transition to published; already-published
 * courses are never unpublished by these rules.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  checkpointIssues,
  supportsCheckpoints,
  videoCheckpoints,
  type VideoPayload,
} from '@/components/course-learn/blocks/types';

export interface PublishCheck {
  id: string;
  label: string;
  passed: boolean;
  /** Plain-English fix, shown only when the check fails. */
  detail?: string;
  /** Which Course Builder tab fixes it. */
  tab: string;
}

interface LessonRow {
  id: string;
  title: string;
  lesson_type: string | null;
  description: string | null;
  content: string | null;
  video_url: string | null;
  scorm_package_id: string | null;
  is_required: boolean;
}

const names = (list: string[], max = 3) =>
  list.slice(0, max).join(', ') + (list.length > max ? ` and ${list.length - max} more` : '');

export async function evaluatePublishChecks(courseId: string): Promise<PublishCheck[]> {
  const [courseRes, lessonsRes] = await Promise.all([
    supabase
      .from('courses')
      .select(
        'title, description, learning_outcomes, duration_minutes, category, requires_practical_signoff, delivery_type, has_certificate, pass_mark'
      )
      .eq('id', courseId)
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('id, title, lesson_type, description, content, video_url, scorm_package_id, is_required')
      .eq('course_id', courseId),
  ]);

  if (courseRes.error) throw courseRes.error;
  if (lessonsRes.error) throw lessonsRes.error;

  const course = courseRes.data;
  const lessons = (lessonsRes.data || []) as LessonRow[];
  const typeOf = (l: LessonRow) => (l.lesson_type || 'video').toLowerCase();

  const blockLessons = lessons.filter((l) => typeOf(l) === 'blocks');
  const videoLessons = lessons.filter((l) => typeOf(l) === 'video');
  const quizLessons = lessons.filter((l) => typeOf(l) === 'quiz');
  const scormLessons = lessons.filter((l) => typeOf(l) === 'scorm');
  const readingLessons = lessons.filter((l) => ['text', 'scenario', 'pdf'].includes(typeOf(l)));
  const resourceLessons = lessons.filter((l) => typeOf(l) === 'resource');
  const practicalLessons = lessons.filter((l) => typeOf(l) === 'practical');

  const [blocksRes, sourcesRes, quizzesRes] = await Promise.all([
    blockLessons.length
      ? supabase
          .from('lesson_blocks')
          .select('lesson_id, block_type, payload')
          .in('lesson_id', blockLessons.map((l) => l.id))
      : Promise.resolve({ data: [], error: null } as const),
    videoLessons.length
      ? supabase
          .from('lesson_video_sources')
          .select('lesson_id, is_default')
          .in('lesson_id', videoLessons.map((l) => l.id))
      : Promise.resolve({ data: [], error: null } as const),
    quizLessons.length
      ? supabase
          .from('quizzes')
          .select('id, lesson_id')
          .in('lesson_id', quizLessons.map((l) => l.id))
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  const quizzes = (quizzesRes.data || []) as { id: string; lesson_id: string }[];
  const questionsRes = quizzes.length
    ? await supabase
        .from('quiz_questions')
        .select('quiz_id')
        .in('quiz_id', quizzes.map((q) => q.id))
    : ({ data: [] } as { data: { quiz_id: string }[] });

  const blockCount = new Set((blocksRes.data || []).map((r) => r.lesson_id));
  const sourceLessons = new Set(
    ((sourcesRes.data || []) as { lesson_id: string; is_default: boolean }[])
      .filter((r) => r.is_default)
      .map((r) => r.lesson_id)
  );
  const quizWithQuestions = new Set((questionsRes.data || []).map((r) => r.quiz_id));
  const quizLessonsWithQuestions = new Set(
    quizzes.filter((q) => quizWithQuestions.has(q.id)).map((q) => q.lesson_id)
  );

  const checks: PublishCheck[] = [];

  /* ------------------------------ a. basics ------------------------------ */
  const outcomes = Array.isArray(course?.learning_outcomes) ? course!.learning_outcomes : [];
  const missingBasics: string[] = [];
  if (!course?.title?.trim()) missingBasics.push('title');
  if (!course?.description?.trim()) missingBasics.push('description');
  if (!outcomes.length) missingBasics.push('learning outcomes');
  if (!course?.duration_minutes || course.duration_minutes <= 0) missingBasics.push('duration');
  if (!course?.category?.trim() || course.category === 'Uncategorized')
    missingBasics.push('category');

  checks.push({
    id: 'basics',
    label: 'Course basics are filled in',
    passed: missingBasics.length === 0,
    detail: `Still to add: ${missingBasics.join(', ')}.`,
    tab: 'Overview',
  });

  /* -------------------------- b. content integrity ----------------------- */
  const emptyBlocks = blockLessons.filter((l) => !blockCount.has(l.id)).map((l) => l.title);
  checks.push({
    id: 'blocks',
    label: 'Interactive lessons have content',
    passed: emptyBlocks.length === 0,
    detail: `No blocks added yet in: ${names(emptyBlocks)}.`,
    tab: 'Modules & Lessons → Edit content',
  });

  // Checkpoint questions must be answerable: they need an uploaded video (we
  // cannot pause a YouTube/Vimeo embed) and a valid question setup.
  const blockRows = (blocksRes.data || []) as {
    lesson_id: string;
    block_type?: string | null;
    payload?: unknown;
  }[];
  const lessonTitle = (id: string) => lessons.find((l) => l.id === id)?.title || 'Untitled lesson';
  const badCheckpointLessons = new Set<string>();
  for (const row of blockRows) {
    if (row.block_type !== 'video') continue;
    const payload = (row.payload || {}) as VideoPayload;
    const cps = videoCheckpoints(payload);
    if (!cps.length) continue;
    if (!supportsCheckpoints(payload)) {
      badCheckpointLessons.add(row.lesson_id);
      continue;
    }
    if (cps.some((cp) => checkpointIssues(cp).length > 0)) badCheckpointLessons.add(row.lesson_id);
  }
  const badCheckpoints = [...badCheckpointLessons].map(lessonTitle);
  checks.push({
    id: 'checkpoints',
    label: 'Checkpoint questions are complete',
    passed: badCheckpoints.length === 0,
    detail: `Checkpoint questions need an uploaded video, a question, 2–4 options and a correct answer. Please check: ${names(badCheckpoints)}.`,
    tab: 'Modules & Lessons → Edit content',
  });

  // Story carousels need slides, and a labelled image needs a picture, alt text
  // and at least one point — otherwise learners meet an empty activity.
  const badCarouselLessons = new Set<string>();
  const badHotGraphicLessons = new Set<string>();
  for (const row of blockRows) {
    if (row.block_type === 'carousel') {
      const payload = (row.payload || {}) as CarouselPayload;
      const items = payload.items ?? [];
      const usable = items.filter((it) => it.title?.trim() || it.text?.trim() || it.media);
      if (!usable.length) badCarouselLessons.add(row.lesson_id);
    }
    if (row.block_type === 'hot_graphic') {
      const payload = (row.payload || {}) as HotGraphicPayload;
      const hasImage = !!(payload.image?.path || payload.image?.url?.trim());
      const spots = payload.hotspots ?? [];
      const spotsOk = spots.length > 0 && spots.every((s) => s.title?.trim() || s.text?.trim());
      if (!hasImage || !payload.alt?.trim() || !spotsOk) badHotGraphicLessons.add(row.lesson_id);
    }
  }
  const badCarousels = [...badCarouselLessons].map(lessonTitle);
  checks.push({
    id: 'carousel',
    label: 'Story carousels have slides',
    passed: badCarousels.length === 0,
    detail: `Add at least one slide with a title or text in: ${names(badCarousels)}.`,
    tab: 'Modules & Lessons → Edit content',
  });

  const badHotGraphics = [...badHotGraphicLessons].map(lessonTitle);
  checks.push({
    id: 'hot_graphic',
    label: 'Labelled images are ready',
    passed: badHotGraphics.length === 0,
    detail: `A labelled image needs a picture, alt text and at least one point with wording. Please check: ${names(badHotGraphics)}.`,
    tab: 'Modules & Lessons → Edit content',
  });



  const noVideo = videoLessons
    .filter((l) => !l.video_url?.trim() && !sourceLessons.has(l.id))
    .map((l) => l.title);
  checks.push({
    id: 'video',
    label: 'Video lessons have a playable video',
    passed: noVideo.length === 0,
    detail: `No video attached to: ${names(noVideo)}.`,
    tab: 'Video',
  });

  const noQuestions = quizLessons
    .filter((l) => !quizLessonsWithQuestions.has(l.id))
    .map((l) => l.title);
  checks.push({
    id: 'quiz',
    label: 'Assessments have at least one question',
    passed: noQuestions.length === 0,
    detail: `No questions yet in: ${names(noQuestions)}.`,
    tab: 'Quiz Builder',
  });

  const noPackage = scormLessons.filter((l) => !l.scorm_package_id).map((l) => l.title);
  checks.push({
    id: 'scorm',
    label: 'Packaged lessons have a package attached',
    passed: noPackage.length === 0,
    detail: `No package attached to: ${names(noPackage)}.`,
    tab: 'Modules & Lessons',
  });

  const noReading = readingLessons.filter((l) => !l.description?.trim()).map((l) => l.title);
  checks.push({
    id: 'reading',
    label: 'Reading and scenario lessons have text',
    passed: noReading.length === 0,
    detail: `Description is empty in: ${names(noReading)}.`,
    tab: 'Modules & Lessons',
  });

  const noResource = resourceLessons.filter((l) => !l.content?.trim()).map((l) => l.title);
  checks.push({
    id: 'resource',
    label: 'Resource lessons have content',
    passed: noResource.length === 0,
    detail: `Content is empty in: ${names(noResource)}.`,
    tab: 'Modules & Lessons → Edit content',
  });

  /* ------------------------ c. completion soundness ---------------------- */
  checks.push({
    id: 'required',
    label: 'At least one lesson is marked required',
    passed: lessons.some((l) => l.is_required),
    detail:
      lessons.length === 0
        ? 'This course has no lessons yet.'
        : 'Mark the lessons learners must complete as required, or the course can never be completed.',
    tab: 'Modules & Lessons',
  });

  /* --------------------------- d. practical need ------------------------- */
  const needsPractical =
    Boolean(course?.requires_practical_signoff) ||
    (course?.delivery_type || '').toLowerCase() === 'blended';
  if (needsPractical) {
    checks.push({
      id: 'practical',
      label: 'A practical session lesson exists',
      passed: practicalLessons.length > 0,
      detail:
        'This course needs a practical sign-off, so it must include at least one practical lesson.',
      tab: 'Modules & Lessons',
    });
  }

  /* ----------------------------- e. pass mark ---------------------------- */
  if (course?.has_certificate && quizLessons.length > 0) {
    checks.push({
      id: 'pass_mark',
      label: 'Pass mark is set for the assessment',
      passed: Boolean(course.pass_mark && course.pass_mark > 0),
      detail: 'Certificated courses with an assessment need a pass mark above 0.',
      tab: 'Overview',
    });
  }

  return checks;
}
