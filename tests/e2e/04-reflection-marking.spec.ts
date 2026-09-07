import { expect, test } from '@playwright/test';
import { staffStatePath } from './support/env';

/**
 * The reflection submitted in spec 02 must appear in the marking queue and be
 * markable. Rows are keyed block_id+user_id, so the spec finds its row by the
 * learner's answer text rather than by id.
 */

test.use({ storageState: staffStatePath });

test('staff marks the learner reflection', async ({ page }) => {
  await page.goto('/admin-portal/trainer');
  await expect(page.getByRole('heading', { name: 'Marking' })).toBeVisible();

  const row = page.locator('[data-testid^="marking-row-"]').filter({ hasText: /next shift|reflection/i }).first();
  await expect(row, 'the learner reflection from spec 02 should be awaiting marking').toBeVisible({
    timeout: 20_000,
  });

  await row.getByTestId('marking-open').click();
  await page.getByTestId('marking-outcome-met').click();
  await expect(page.getByText(/marked|saved/i).first()).toBeVisible({ timeout: 20_000 });
});
