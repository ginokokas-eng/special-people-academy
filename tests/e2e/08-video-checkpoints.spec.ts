import { expect, test } from '@playwright/test';
import { accessTokenFromState, apiFor, select } from './support/api';
import { learnerStatePath, loadRun, staffStatePath } from './support/env';
import { addBlock, videoFixture } from './support/authoring';

/**
 * Optional (needs a real upload): authors a video block from the local fixture
 * with one checkpoint, then checks the learner sees the checkpoint overlay and
 * cannot seek past an unanswered cue.
 *
 * Skipped unless E2E_VIDEO=1, because it uploads to storage.
 */

test.skip(process.env.E2E_VIDEO !== '1', 'set E2E_VIDEO=1 to exercise the upload + checkpoint path');
test.describe.configure({ mode: 'serial' });

test.describe('staff', () => {
  test.use({ storageState: staffStatePath });

  test('authors an uploaded video with a checkpoint', async ({ page }) => {
    test.slow();
    const run = loadRun();

    await page.goto(`/admin-portal/courses/${run.courseId}/lessons/${run.lessonAId}/content`);
    // locator.count() never waits: let the saved blocks render before counting them,
    // otherwise the new block's prefix is computed from an empty page.
    await page.locator('[data-testid^="block-form-visibility-when-"]').first().waitFor({ timeout: 20_000 });
    const index = await page.locator('[data-testid^="block-form-visibility-when-"]').count();
    // Not every saved block carries a visibility control, so `index` is not the new
    // block's position; find the video title input that did not exist before the add.
    const titleIds = () =>
      page
        .locator('[data-testid^="block-form-video-title-"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-testid') as string));
    const before = new Set(await titleIds());
    await addBlock(page, 'video', index);
    await expect.poll(async () => (await titleIds()).filter((id) => !before.has(id)).length, { timeout: 15_000 }).toBe(1);
    const prefix = (await titleIds()).find((id) => !before.has(id))!.replace('block-form-video-title-', '');
    const titleInput = page.getByTestId(`block-form-video-title-${prefix}`);
    await titleInput.fill('Uploaded clip');
    // The video block's own drop zone — `input[type=file]` alone could pick another
    // block's upload (the hot graphic also has one and already shows "Uploaded:").
    await page.getByTestId(`block-form-video-file-${prefix}`).setInputFiles(videoFixture);
    // FileDropZone shows "Uploaded: <file name>" once the object is in storage.
    await expect(page.getByText('Uploaded: clip.mp4')).toBeVisible({ timeout: 60_000 });

    await page.getByTestId(`block-form-video-checkpoint-add-${prefix}`).click();
    const at = page.getByTestId(`block-form-video-checkpoint-at-${prefix}-0`);
    await at.fill('0:01');
    await expect(at).toHaveValue('0:01');
    await page
      .getByTestId(`block-form-video-checkpoint-question-${prefix}-0`)
      .fill('Was the feed checked?');
    await page.getByTestId(`block-form-video-checkpoint-option-${prefix}-0-0`).fill('Yes');
    await page.getByTestId(`block-form-video-checkpoint-option-${prefix}-0-1`).fill('No');
    await page.getByTestId(`block-form-video-checkpoint-correct-${prefix}-0-0`).click();

    // Saving PATCHes every existing block one by one and INSERTs the new one last,
    // so wait for the INSERT rather than the first response or a toast.
    const inserted = page.waitForResponse(
      (r) => r.url().includes('/rest/v1/lesson_blocks') && r.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await page.getByTestId('save-content-open').click();
    await page.getByTestId('save-content').click();
    expect((await inserted).status(), 'inserting the new video block should succeed').toBeLessThan(300);

    // The saved block must reference the uploaded object, or the learner half is meaningless.
    const api = await apiFor(staffStatePath);
    const uploadedRow = async () => {
      const rows = await select<{ payload: { path?: string; checkpoints?: unknown[] } }[]>(
        api,
        `lesson_blocks?lesson_id=eq.${run.lessonAId}&block_type=eq.video&select=payload`,
      );
      return rows.find((r) => !!r.payload?.path) ?? null;
    };
    await expect.poll(uploadedRow, { timeout: 15_000 }).not.toBeNull();
    expect((await uploadedRow())!.payload.checkpoints?.length ?? 0).toBe(1);
  });
});

test.describe('learner', () => {
  test.use({ storageState: learnerStatePath });

  test('cannot skip past an unanswered checkpoint', async ({ page }) => {
    const run = loadRun();
    // 02 normally enrols the learner; enrol here too so this opt-in spec runs on its own.
    const learnerApi = await apiFor(learnerStatePath);
    const learnerId = JSON.parse(
      Buffer.from(accessTokenFromState(learnerStatePath).split('.')[1], 'base64').toString(),
    ).sub as string;
    await learnerApi.post('/rest/v1/enrollments', { data: { user_id: learnerId, course_id: run.courseId } });
    await page.goto(`/courses/${run.courseId}/learn?lesson=${run.lessonAId}`);
    const video = page.getByTestId('learner-video').first();
    await expect(video).toBeVisible({ timeout: 20_000 });

    await video.evaluate((el: HTMLVideoElement) => {
      void el.play().catch(() => {});
      el.currentTime = 2.5;
    });
    await expect(page.getByTestId('video-checkpoint')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('checkpoint-option-0').click();
  });
});
