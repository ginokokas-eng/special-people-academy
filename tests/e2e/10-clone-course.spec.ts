import { expect, test } from '@playwright/test';
import { apiFor, select } from './support/api';
import { loadRun, saveRun, staffStatePath } from './support/env';

/**
 * Duplicating a course.
 *
 * Runs after 01 (which authors the course this copies) and before 99, which
 * deletes the clone through the same guarded cleanup RPC.
 */

test.use({ storageState: staffStatePath });
test.describe.configure({ mode: 'serial' });

interface CountRow {
  id: string;
}

async function countFor(
  api: Awaited<ReturnType<typeof apiFor>>,
  pathAndQuery: string,
): Promise<number> {
  const rows = await select<CountRow>(api, pathAndQuery);
  return rows.length;
}

test('staff duplicate a course into a draft copy', async ({ page }) => {
  const run = loadRun();

  await page.goto('/admin-portal/courses');
  await page.getByPlaceholder('Search courses...').fill(run.courseTitle);
  await expect(page.getByText(run.courseTitle, { exact: true })).toBeVisible();

  // Row actions menu → Duplicate.
  const row = page.getByRole('row', { hasText: run.courseTitle }).first();
  await row.getByRole('button').last().click();
  await page.getByTestId(`course-duplicate-${run.courseId}`).click();


  const titleInput = page.getByTestId('clone-title');
  await expect(titleInput).toBeVisible();
  const defaultTitle = await titleInput.inputValue();
  expect(defaultTitle, 'the cleanup guard only matches titles starting with "E2E "').toMatch(
    /^E2E /,
  );
  await expect(page.getByTestId('clone-translations')).toBeVisible();

  const cloneResponse = page.waitForResponse(
    (res) => res.url().includes('/rest/v1/rpc/clone_course') && res.request().method() === 'POST',
  );
  await page.getByTestId('clone-confirm').click();
  const body = (await (await cloneResponse).json()) as { course_id: string };
  const cloneCourseId = body.course_id;
  expect(cloneCourseId).toBeTruthy();

  await expect(page).toHaveURL(new RegExp(`/admin-portal/courses/${cloneCourseId}/edit`));
  await expect(page.getByTestId('clone-banner')).toBeVisible();

  // Record it straight away so teardown removes it even if the checks below fail.
  saveRun({ ...run, cloneCourseId });

  /* ------------------------------- data checks ------------------------------ */
  const api = await apiFor(staffStatePath);

  const [srcCourse] = await select<{ id: string }>(
    api,
    `courses?id=eq.${run.courseId}&select=id`,
  );
  expect(srcCourse).toBeTruthy();

  const [clone] = await select<{ is_published: boolean; status: string; cloned_from_course_id: string }>(
    api,
    `courses?id=eq.${cloneCourseId}&select=is_published,status,cloned_from_course_id`,
  );
  expect(clone.is_published).toBe(false);
  expect(clone.status).toBe('draft');
  expect(clone.cloned_from_course_id).toBe(run.courseId);

  const srcLessons = await select<{ id: string }>(
    api,
    `lessons?course_id=eq.${run.courseId}&select=id`,
  );
  const cloneLessons = await select<{ id: string }>(
    api,
    `lessons?course_id=eq.${cloneCourseId}&select=id`,
  );
  expect(cloneLessons.length).toBe(srcLessons.length);

  expect(await countFor(api, `modules?course_id=eq.${cloneCourseId}&select=id`)).toBe(
    await countFor(api, `modules?course_id=eq.${run.courseId}&select=id`),
  );

  const srcLessonIds = srcLessons.map((l) => l.id).join(',');
  const cloneLessonIds = cloneLessons.map((l) => l.id).join(',');

  const srcBlocks = await select<{ id: string; payload: Record<string, unknown> }>(
    api,
    `lesson_blocks?lesson_id=in.(${srcLessonIds})&select=id,payload`,
  );
  const cloneBlocks = await select<{ id: string; payload: { visibility?: { block_id?: string } } }>(
    api,
    `lesson_blocks?lesson_id=in.(${cloneLessonIds})&select=id,payload`,
  );
  expect(cloneBlocks.length).toBe(srcBlocks.length);

  // Every conditional rule in the copy points at a block inside the copy.
  const cloneBlockIds = new Set(cloneBlocks.map((b) => b.id));
  for (const block of cloneBlocks) {
    const target = block.payload?.visibility?.block_id;
    if (target) expect(cloneBlockIds.has(target)).toBe(true);
  }

  const srcQuizzes = await select<{ id: string }>(
    api,
    `quizzes?lesson_id=in.(${srcLessonIds})&select=id`,
  );
  const cloneQuizzes = await select<{ id: string }>(
    api,
    `quizzes?lesson_id=in.(${cloneLessonIds})&select=id`,
  );
  expect(cloneQuizzes.length).toBe(srcQuizzes.length);

  if (srcQuizzes.length) {
    const srcQuizIds = srcQuizzes.map((q) => q.id).join(',');
    const cloneQuizIds = cloneQuizzes.map((q) => q.id).join(',');
    expect(await countFor(api, `quiz_questions?quiz_id=in.(${cloneQuizIds})&select=id`)).toBe(
      await countFor(api, `quiz_questions?quiz_id=in.(${srcQuizIds})&select=id`),
    );
  }

  const srcStandardLinks =
    (await countFor(api, `standard_links?course_id=eq.${run.courseId}&select=id`)) +
    (await countFor(api, `standard_links?lesson_id=in.(${srcLessonIds})&select=id`));
  const cloneStandardLinks =
    (await countFor(api, `standard_links?course_id=eq.${cloneCourseId}&select=id`)) +
    (await countFor(api, `standard_links?lesson_id=in.(${cloneLessonIds})&select=id`));
  expect(cloneStandardLinks).toBe(srcStandardLinks);

  // Copied translations must never claim to be reviewed.
  const cloneTranslations = await select<{ status: string }>(
    api,
    `lesson_translations?lesson_id=in.(${cloneLessonIds})&select=status`,
  );
  for (const row of cloneTranslations) expect(row.status).toBe('draft');
});
