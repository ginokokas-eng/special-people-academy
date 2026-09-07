import { expect, test } from '@playwright/test';
import { loadRun, staffStatePath } from './support/env';

/**
 * Round trip: save an authored MCQ to the shared bank, see it on the bank page,
 * then insert it back into the lesson through the picker.
 */

test.use({ storageState: staffStatePath });
test.describe.configure({ mode: 'serial' });

test('an MCQ can be saved to the bank and reinserted', async ({ page }) => {
  const run = loadRun();

  await page.goto(`/admin-portal/courses/${run.courseId}/lessons/${run.lessonAId}/content`);
  await page.getByTestId('bank-save-question').first().click();
  await expect(page.getByText(/bank/i).first()).toBeVisible({ timeout: 20_000 });

  await page.goto('/admin-portal/question-bank');
  await expect(page.locator('[data-testid^="bank-row-"]').first()).toBeVisible({ timeout: 20_000 });
  const row = page.locator('[data-testid^="bank-row-"]').filter({ hasText: /giving set/i }).first();
  await expect(row, 'the question saved from the lesson should be listed').toBeVisible();

  await page.goto(`/admin-portal/courses/${run.courseId}/lessons/${run.lessonAId}/content`);
  await page.getByTestId('block-palette-from-bank').click();
  const insert = page.locator('[data-testid^="bank-picker-insert-"]').first();
  await expect(insert).toBeVisible({ timeout: 20_000 });
  await insert.click();

  await page.getByTestId('save-content-open').click();
  await page.getByTestId('save-content').click();
  await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 20_000 });
});
