import { expect, test } from '@playwright/test';
import { loadRun, staffStatePath } from './support/env';

/** Lesson Insights must show the learner's answers for the authored lesson. */

test.use({ storageState: staffStatePath });

test('staff reads Lesson Insights for the authored lesson', async ({ page }) => {
  const run = loadRun();

  await page.goto(`/admin-portal/courses/${run.courseId}/edit`);
  await page.getByRole('tab', { name: 'Insights' }).click();
  await page.getByTestId('insights-lesson-select').click();
  await page.getByRole('option', { name: 'All blocks' }).click();

  await expect(page.getByTestId('insights-block-card-mcq')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('insights-learner-row').first()).toBeVisible();
});
