import { expect, test } from '@playwright/test';
import { apiFor, select } from './support/api';
import { learnerStatePath, loadRun, staffStatePath } from './support/env';

/**
 * Transcript sections (chapters).
 *
 * The transcript itself is seeded through the Data API — transcription is an AI
 * call and is not what this spec is about. It then proves the staff review panel
 * saves an edited section, and that a learner can narrow the transcript to one
 * section and see section context in search results.
 */

test.describe.configure({ mode: 'serial' });

const SEGMENTS = [
  { start: 0, end: 4, text: 'Welcome to this lesson on checking a feed.' },
  { start: 4, end: 9, text: 'First, wash your hands and put on gloves.' },
  { start: 9, end: 14, text: 'Next, check the giving set for kinks.' },
  { start: 14, end: 20, text: 'Finally, record what you have done.' },
];

const CHAPTERS = [
  { start: 0, title: 'Before you start' },
  { start: 9, title: 'Checking the set' },
];

test.describe('staff', () => {
  test.use({ storageState: staffStatePath });

  test('seed a transcript and rename a section', async ({ page }) => {
    const run = loadRun();
    const api = await apiFor(staffStatePath);

    const seed = await api.post('/rest/v1/lesson_transcripts', {
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      data: {
        lesson_id: run.lessonAId,
        language_code: 'en',
        language_label: 'English',
        transcript_text: SEGMENTS.map((s) => s.text).join(' '),
        segments: SEGMENTS,
        chapters: CHAPTERS,
      },
    });
    expect(seed.ok(), await seed.text()).toBeTruthy();

    await page.goto(`/admin-portal/courses/${run.courseId}/lessons/${run.lessonAId}/content`);
    const firstRow = page.getByTestId('transcript-chapter-row-0');
    await expect(firstRow).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('transcript-chapters-suggest')).toBeVisible();

    await page.locator('#chapter-title-0').fill('Getting ready');
    await page.getByTestId('transcript-chapters-add').click();
    await expect(page.getByTestId('transcript-chapter-row-2')).toBeVisible();
    await page.locator('#chapter-time-2').fill('0:14');
    await page.locator('#chapter-title-2').fill('Recording it');

    await page.getByTestId('transcript-chapters-save').click();
    await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 20_000 });

    const [saved] = await select<{ chapters: { start: number; title: string }[] }>(
      api,
      `lesson_transcripts?lesson_id=eq.${run.lessonAId}&language_code=eq.en&select=chapters`,
    );
    expect(saved.chapters.map((c) => c.title)).toEqual([
      'Getting ready',
      'Checking the set',
      'Recording it',
    ]);
  });
});

test.describe('learner', () => {
  test.use({ storageState: learnerStatePath });

  test('can read one section and search with section context', async ({ page }) => {
    const run = loadRun();
    await page.goto(`/courses/${run.courseId}/learn?lesson=${run.lessonAId}`);

    await page.getByRole('tab', { name: /transcript/i }).click();
    await expect(page.getByTestId('transcript-chapters')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('transcript-chapter-0')).toContainText('Getting ready');

    // Narrow to the middle section: only its lines stay on screen.
    await page.getByTestId('transcript-chapter-read-1').click();
    await expect(page.getByText('Next, check the giving set for kinks.')).toBeVisible();
    await expect(page.getByText('First, wash your hands and put on gloves.')).toBeHidden();

    await page.getByTestId('transcript-chapters-show-all').click();
    await expect(page.getByText('First, wash your hands and put on gloves.')).toBeVisible();

    await page.getByLabel('Search the transcript').fill('giving set');
    await expect(page.getByTestId('transcript-search-summary')).toContainText(/section/i);
    await expect(page.getByText('Checking the set').first()).toBeVisible();
  });
});

test.describe('cleanup', () => {
  test.use({ storageState: staffStatePath });

  test('the seeded transcript is removed', async () => {
    const run = loadRun();
    const api = await apiFor(staffStatePath);
    const res = await api.delete(`/rest/v1/lesson_transcripts?lesson_id=eq.${run.lessonAId}`);
    expect(res.ok(), await res.text()).toBeTruthy();
  });
});
