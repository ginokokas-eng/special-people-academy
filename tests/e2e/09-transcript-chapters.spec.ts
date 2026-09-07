import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { accessTokenFromState, apiFor, select } from './support/api';
import { fixturesDir, learnerStatePath, loadRun, staffStatePath } from './support/env';

/**
 * Transcript sections (chapters): staff author them on an uploaded video, learners
 * use them to jump around the video, read one section, and search inside it.
 *
 * The run's own video block is a YouTube link, which cannot carry a transcript, so
 * this spec adds a small block lesson with an uploaded clip to the run's course.
 */

test.describe.configure({ mode: 'serial' });
test.use({ storageState: staffStatePath });

const SEGMENTS = [
  { start: 0, end: 0.8, text: 'You arrive at the house and knock on the door.' },
  { start: 0.8, end: 1.5, text: 'Nobody answers, so you use the key safe.' },
  { start: 1.5, end: 2.2, text: 'Inside you find Margaret on the floor beside her bed.' },
  { start: 2.2, end: 3, text: 'Check for injuries before you try to move her.' },
];

let lessonId = '';
let mediaPath = '';

async function openTranscript(page: Page, courseId: string) {
  // 02 normally enrols the learner through Start Course; enrol here too so this
  // spec also works on its own (a duplicate enrolment is a harmless 409).
  const learnerApi = await apiFor(learnerStatePath);
  const learnerId = JSON.parse(
    Buffer.from(accessTokenFromState(learnerStatePath).split('.')[1], 'base64').toString(),
  ).sub as string;
  await learnerApi.post('/rest/v1/enrollments', { data: { user_id: learnerId, course_id: courseId } });
  await page.goto(`/courses/${courseId}/learn`);
  const hub = page.getByTestId(`hub-lesson-${lessonId}`);
  const tab = page.getByRole('tab', { name: /Transcript/ });
  await hub.or(tab).first().waitFor({ timeout: 20_000 });
  if (await hub.isVisible()) await hub.click();
  await tab.click();
  await page.getByText('Sections', { exact: true }).waitFor({ timeout: 20_000 });
}

test('staff adds sections to an uploaded video', async ({ page }) => {
  test.slow();
  const run = loadRun();
  const api = await apiFor(staffStatePath);

  // A block lesson in the same module as lesson A, holding an uploaded clip.
  const [{ module_id }] = await select<{ module_id: string | null }[]>(
    api,
    `lessons?id=eq.${run.lessonAId}&select=module_id`,
  );
  const lessonRes = await api.post('/rest/v1/lessons', {
    data: {
      course_id: run.courseId,
      module_id,
      title: 'E2E sections lesson',
      lesson_type: 'blocks',
      order_index: 50,
      duration_minutes: 1,
      is_required: false,
    },
    headers: { Prefer: 'return=representation' },
  });
  expect(lessonRes.ok(), await lessonRes.text()).toBeTruthy();
  lessonId = ((await lessonRes.json()) as { id: string }[])[0].id;

  mediaPath = `${run.courseId}/${lessonId}/${randomUUID()}.mp4`;
  const upload = await api.post(`/storage/v1/object/lesson-media/${mediaPath}`, {
    headers: { 'Content-Type': 'video/mp4' },
    data: fs.readFileSync(path.join(fixturesDir, 'clip.mp4')),
  });
  expect(upload.ok(), `clip upload failed: ${await upload.text()}`).toBeTruthy();

  const blocks = await api.post('/rest/v1/lesson_blocks', {
    data: [
      {
        lesson_id: lessonId,
        order_index: 0,
        block_type: 'video',
        contributes_to_completion: true,
        payload: { source: 'storage', path: mediaPath, file_name: 'clip.mp4', title: 'Sections clip', lock_seek: false },
      },
    ],
  });
  expect(blocks.ok(), await blocks.text()).toBeTruthy();
  const transcript = await api.post('/rest/v1/lesson_transcripts', {
    headers: { Prefer: 'resolution=merge-duplicates' },
    data: {
      lesson_id: lessonId,
      language_code: 'en',
      language_label: 'English',
      transcript_text: SEGMENTS.map((s) => s.text).join(' '),
      segments: SEGMENTS,
    },
  });
  expect(transcript.ok(), await transcript.text()).toBeTruthy();

  // ---- the sections panel inside the video block form ----------------------
  await page.goto(`/admin-portal/courses/${run.courseId}/lessons/${lessonId}/content`);
  await page.getByText('Video sections').waitFor({ timeout: 20_000 });
  const add = page.getByRole('button', { name: 'Add a section' });
  await add.click();
  await page.locator('#chapter-time-0').fill('0:00');
  await page.locator('#chapter-title-0').fill('Arriving at the house');
  await add.click();
  await page.locator('#chapter-time-1').fill('0:02');
  await page.locator('#chapter-title-1').fill('Checking for injuries');
  const saved = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/lesson_transcripts') && r.request().method() === 'PATCH',
    { timeout: 15_000 },
  );
  await page.getByRole('button', { name: 'Save sections' }).click();
  expect((await saved).status(), 'saving sections should succeed').toBeLessThan(300);
  await expect(page.getByText('Sections saved')).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page.locator('#chapter-title-0')).toHaveValue('Arriving at the house', { timeout: 20_000 });
  await expect(page.locator('#chapter-title-1')).toHaveValue('Checking for injuries');
  // 0:02 snaps to the nearest transcript timing (2.2 s), which still displays as 0:02.
  const [row] = await select<{ chapters: { start: number; title: string }[] }[]>(
    api,
    `lesson_transcripts?lesson_id=eq.${lessonId}&select=chapters`,
  );
  expect(row.chapters.map((c) => c.start)).toEqual([0, 2.2]);
});

test.describe('learner', () => {
  test.use({ storageState: learnerStatePath });

  test('learner jumps, reads one section and searches the video', async ({ page }) => {
    test.slow();
    const run = loadRun();
    await openTranscript(page, run.courseId);

    const chapterButtons = page.getByRole('button', { name: /^Play from \d+:\d\d: / });
    await expect(chapterButtons).toHaveCount(2);

    // The uploaded clip registers its player with the page, so the buttons become live.
    await expect(chapterButtons.first()).toBeEnabled({ timeout: 30_000 });
    await page.waitForFunction(() => {
      const v = document.querySelector('video');
      return !!v && v.readyState >= 1;
    }, null, { timeout: 30_000 });
    await chapterButtons.nth(1).click();
    await expect
      .poll(() => page.evaluate(() => document.querySelector('video')?.currentTime ?? -1), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(2);

    // Read one section: only its timings stay on screen.
    await page.getByRole('button', { name: 'Read', exact: true }).nth(1).click();
    await expect(page.getByRole('button', { name: 'Show the whole video' })).toBeVisible();
    await expect(page.getByText('Check for injuries before you try to move her.')).toBeVisible();
    await expect(page.getByText('You arrive at the house and knock on the door.')).toBeHidden();
    await page.getByRole('button', { name: 'Show the whole video' }).click();
    await expect(page.getByText('You arrive at the house and knock on the door.')).toBeVisible();

    // Search inside the video names the section of each match.
    await page.getByLabel('Search the transcript').fill('injur');
    await expect(page.getByText('1 match in 1 section')).toBeVisible();
    await expect(page.getByText('Checking for injuries', { exact: true })).toBeVisible();
  });
});

test('sections lesson media is removed', async () => {
  // e2e_delete_course removes the lesson, its blocks and transcript; the uploaded
  // object is ours to delete.
  if (!mediaPath) test.skip(true, 'nothing was uploaded');
  const api = await apiFor(staffStatePath);
  // The bulk endpoint takes a JSON body, which suits the API context's JSON content type.
  const res = await api.delete('/storage/v1/object/lesson-media', { data: { prefixes: [mediaPath] } });
  expect(res.ok(), await res.text()).toBeTruthy();
  const left = await select<unknown[]>(api, `lesson_transcripts?lesson_id=eq.${lessonId}&select=id`);
  expect(left.length, 'the transcript row stays until teardown deletes the course').toBe(1);
});
