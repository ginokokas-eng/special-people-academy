import { expect, test } from '@playwright/test';
import { loadRun, staffStatePath } from './support/env';

/**
 * Insights → copilot rewrite loop. The thresholds are forced through query
 * parameters so the weak-question prompt appears for the one MCQ the run
 * authored, whatever the learner scored.
 *
 * The AI call itself is only exercised when E2E_AI=1 — the deep link, the
 * highlighted block and the rewrite tab are checked every run.
 */

test.use({ storageState: staffStatePath });

test('staff follow the Insights prompt into the copilot rewrite tab', async ({ page }) => {
  const run = loadRun();

  // Open the Insights tab through the URL: switching tabs by click rewrites the
  // search params and would drop the threshold overrides.
  await page.goto(
    `/admin-portal/courses/${run.courseId}/edit?tab=insights&rewrite_threshold=101&rewrite_min_learners=1`,
  );
  await page.getByTestId('insights-lesson-select').click();
  await page.getByRole('option', { name: 'All blocks' }).click();

  await expect(page.getByTestId('insights-block-card-mcq')).toBeVisible({ timeout: 20_000 });

  const cta = page.getByTestId('insights-rewrite-cta').first();
  await expect(cta).toBeVisible();
  await cta.click();

  // The editor opens on the block, highlighted, with the rewrite tab showing.
  await expect(page).toHaveURL(/copilot=rewrite|\/content/);
  await expect(page.getByTestId('block-form-focused')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('rewrite-tab')).toBeVisible();
  await expect(page.getByTestId('rewrite-stats')).toContainText('%');

  if (process.env.E2E_AI !== '1') return;

  await page.getByTestId('rewrite-run').click();
  await expect(page.getByTestId('rewrite-diff')).toBeVisible({ timeout: 120_000 });

  // Accept: the block is replaced in place (same id), never appended, and the
  // save note is pre-filled so the change is recorded as material.
  const blocksBefore = await page.locator('[data-testid^="block-form-visibility-when-"]').count();
  await page.getByTestId('rewrite-accept').click();
  await expect(page.getByText('Question rewritten')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('rewrite-diff')).toBeHidden();
  expect(await page.locator('[data-testid^="block-form-visibility-when-"]').count()).toBe(blocksBefore);

  await page.getByTestId('save-content-open').click();
  // The note is the "change-note" input inside the save dialog.
  await expect(page.locator('#change-note')).toHaveValue(/Rewritten from Insights/);
  const patched = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/lesson_blocks') && r.request().method() === 'PATCH',
    { timeout: 30_000 },
  );
  await page.getByTestId('save-content').click();
  expect((await patched).status(), 'saving the rewritten block should succeed').toBeLessThan(300);
});
