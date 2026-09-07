import { expect, test } from '@playwright/test';
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

test('staff authors an uploaded video with a checkpoint', async ({ page }) => {
  test.slow();
  const run = loadRun();
  await page.context().addCookies([]);

  await page.goto(`/admin-portal/courses/${run.courseId}/lessons/${run.lessonAId}/content`);
  const index = await page.locator('[data-testid^="learner-block-"], [data-testid^="block-form-"]').count();
  const prefix = await addBlock(page, 'video', index);
  await page.getByTestId(`block-form-video-title-${prefix}`).fill('Uploaded clip');
  await page.locator('input[type="file"]').last().setInputFiles(videoFixture);
  await expect(page.getByText(/uploaded|ready/i).first()).toBeVisible({ timeout: 60_000 });

  await page.getByTestId(`block-form-video-checkpoint-add-${prefix}`).click();
  await page.getByTestId(`block-form-video-checkpoint-at-${prefix}-0`).fill('1');
  await page.getByTestId(`block-form-video-checkpoint-question-${prefix}-0`).fill('Was the feed checked?');
  await page.getByTestId(`block-form-video-checkpoint-option-${prefix}-0-0`).fill('Yes');
  await page.getByTestId(`block-form-video-checkpoint-option-${prefix}-0-1`).fill('No');
  await page.getByTestId(`block-form-video-checkpoint-correct-${prefix}-0-0`).click();

  await page.getByTestId('save-content-open').click();
  await page.getByTestId('save-content').click();
  await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 20_000 });
});

test.describe('learner', () => {
  test.use({ storageState: learnerStatePath });

  test('cannot skip past an unanswered checkpoint', async ({ page }) => {
    const run = loadRun();
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

test.use({ storageState: staffStatePath });
