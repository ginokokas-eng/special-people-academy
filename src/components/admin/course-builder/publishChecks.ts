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
  type CarouselPayload,
  type HotGraphicPayload,
  type VideoPayload,
  validateScenario,
  validateReflection,
  type ReflectionPayload,
  validateVisibility,
  type BlockPayload,
  type BlockType,
  type ScenarioPayload,


} from '@/components/course-learn/blocks/types';
import { parsePoolConfig, poolIsFillable } from '@/lib/questionBank';


export interface PublishCheck {
  id: string;
  label: string;
  passed: boolean;
  /** Plain-English fix, shown only when the check fails. */
  detail?: string;
  /** Which Course Builder tab fixes it. */
  tab: string;
  /** 'warning' checks are advisory and never block publishing. */
  severity?: 'error' | 'warning';
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
          .select('id, lesson_id, block_type, payload, order_index')
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
        .select('quiz_id, question_type, question_payload')
        .in('quiz_id', quizzes.map((q) => q.id))
    : ({ data: [] } as { data: { quiz_id: string }[] });

  // Pool questions draw from the shared bank at attempt time, so publishing is
  // only safe when the bank still holds enough matching questions.
  const poolRows = ((questionsRes.data || []) as {
    quiz_id: string;
    question_type?: string | null;
    question_payload?: unknown;
  }[])
    .filter((r) => r.question_type === 'pool')
    .map((r) => ({ quiz_id: r.quiz_id, pool: parsePoolConfig(r.question_payload) }));

  const underfilledPools: string[] = [];
  for (const row of poolRows) {
    const quizLessonId = quizzes.find((q) => q.id === row.quiz_id)?.lesson_id;
    const lessonTitle = quizLessons.find((l) => l.id === quizLessonId)?.title ?? 'Assessment';
    if (!row.pool) {
      underfilledPools.push(`${lessonTitle} (pool is not set up)`);
      continue;
    }
    const { count } = await supabase
      .from('question_bank')
      .select('id', { count: 'exact', head: true })
      .is('org_id', null)
      .overlaps('tags', row.pool.pool_tags);
    if (!poolIsFillable(count ?? 0, row.pool.draw_count)) {
      underfilledPools.push(
        `${lessonTitle} — pool "${row.pool.pool_tags.join(', ')}" needs ${row.pool.draw_count}, bank has ${count ?? 0}`
      );
    }
  }


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
    id: string;
    lesson_id: string;
    block_type?: string | null;
    payload?: unknown;
    order_index?: number | null;
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

  const badScenarioLessons = new Set<string>();
  for (const row of blockRows) {
    if (row.block_type !== 'scenario') continue;
    if (validateScenario((row.payload || {}) as ScenarioPayload).length > 0)
      badScenarioLessons.add(row.lesson_id);
  }

  const badHotGraphics = [...badHotGraphicLessons].map(lessonTitle);
  checks.push({
    id: 'hot_graphic',
    label: 'Labelled images are ready',
    passed: badHotGraphics.length === 0,
    detail: `A labelled image needs a picture, alt text and at least one point with wording. Please check: ${names(badHotGraphics)}.`,
    tab: 'Modules & Lessons → Edit content',
  });

  // Conditional blocks ("show this only if…") must point backwards at a real,
  // eligible activity — otherwise a learner could never see them.
  const badVisibilityLessons = new Set<string>();
  const byLesson = new Map<string, typeof blockRows>();
  for (const row of blockRows) {
    const list = byLesson.get(row.lesson_id) || [];
    list.push(row);
    byLesson.set(row.lesson_id, list);
  }
  for (const [lessonId, rows] of byLesson) {
    const ordered = [...rows]
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((r) => ({
        id: r.id,
        block_type: r.block_type as BlockType,
        payload: (r.payload || {}) as BlockPayload,
      }));
    if (validateVisibility(ordered).length > 0) badVisibilityLessons.add(lessonId);
  }
  const badVisibility = [...badVisibilityLessons].map(lessonTitle);
  checks.push({
    id: 'block_visibility',
    label: 'Conditional blocks point at a real activity',
    passed: badVisibility.length === 0,
    detail: `A block set to “show only if…” must follow the activity it waits on, and that activity must be one learners take part in. Please check: ${names(badVisibility)}.`,
    tab: 'Modules & Lessons → Edit content',
  });

  // Reflective answers need a question before anyone can answer them.
  const badReflectionLessons = new Set<string>();
  for (const row of blockRows) {
    if (row.block_type !== 'reflection') continue;
    if (validateReflection((row.payload || {}) as ReflectionPayload).length > 0)
      badReflectionLessons.add(row.lesson_id);
  }
  const badReflections = [...badReflectionLessons].map(lessonTitle);
  checks.push({
    id: 'reflection',
    label: 'Reflective answers are ready',
    passed: badReflections.length === 0,
    detail: `A reflective answer needs the question learners write about, and a sensible minimum word count. Please check: ${names(badReflections)}.`,
    tab: 'Modules & Lessons → Edit content',
  });

  const badScenarios = [...badScenarioLessons].map(lessonTitle);
  checks.push({
    id: 'scenario',
    label: 'Scenarios are complete',
    passed: badScenarios.length === 0,
    detail: `Every step needs wording, each decision needs at least two choices that lead somewhere, and an ending must be reachable. Please check: ${names(badScenarios)}.`,
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

  checks.push({
    id: 'quiz-pools',
    label: 'Random question pools can be filled',
    passed: underfilledPools.length === 0,
    detail: `Add more matching questions to the question bank, or lower how many are drawn: ${names(underfilledPools)}.`,
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

  /* ------------------------- f. standards coverage ----------------------- */
  const lessonIds = lessons.map((l) => l.id);
  const [courseLinks, lessonLinks] = await Promise.all([
    supabase.from('standard_links').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
    lessonIds.length
      ? supabase
          .from('standard_links')
          .select('id', { count: 'exact', head: true })
          .in('lesson_id', lessonIds)
      : Promise.resolve({ count: 0 } as { count: number }),
  ]);
  const linkedStandards = (courseLinks.count ?? 0) + (lessonLinks.count ?? 0);
  checks.push({
    id: 'standards',
    label: 'Standards are linked to this course',
    passed: linkedStandards > 0,
    detail:
      'Reports cannot show the areas this training evidences until you link at least one standard, on the course or on a lesson.',
    tab: 'Overview',
    severity: 'warning',
  });

  return checks;
}
