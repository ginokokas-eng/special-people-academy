import { expect, test } from '@playwright/test';
import { learnerStatePath, staffStatePath } from './support/env';

/**
 * Cheapest possible failure: if the two saved sessions do not land on the pages
 * every other spec assumes, stop here rather than 200 lines into authoring.
 */

test.describe('staff session', () => {
  test.use({ storageState: staffStatePath });

  test('reaches Course Builder and the marking page', async ({ page }) => {
    await page.goto('/admin-portal/courses');
    await expect(page.getByRole('heading', { name: 'Course Builder' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Course' })).toBeVisible();

    await page.goto('/admin-portal/trainer');
    await expect(page.getByRole('heading', { name: 'Marking' })).toBeVisible();
  });
});

test.describe('learner session', () => {
  test.use({ storageState: learnerStatePath });

  test('reaches the dashboard and is not staff', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/auth/);
    await page.goto('/admin-portal/courses');
    await expect(page.getByRole('heading', { name: 'Course Builder' })).toBeHidden();
  });
});
