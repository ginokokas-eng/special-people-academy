import { expect, test } from '@playwright/test';
import { apiFor, select } from './support/api';
import { learnerStatePath, loadRun, staffStatePath } from './support/env';

/**
 * Takes the graded quiz through the session RPCs (start → per-question check →
 * submit → result). Questions are never read from quiz_questions by the client,
 * so the spec drives it purely through the UI.
 */

test.use({ storageState: learnerStatePath });

test('learner takes the graded quiz and sees a result', async ({ page }) => {
  const run = loadRun();

  const staff = await apiFor(staffStatePath);
  const [quizLesson] = await select<{ id: string }>(
    staff,
    `lessons?course_id=eq.${run.courseId}&lesson_type=eq.quiz&select=id`,
  );
  expect(quizLesson, 'the authoring spec should have created a quiz lesson').toBeTruthy();

  await page.goto(`/courses/${run.courseId}/quiz?lesson=${quizLesson.id}`);
  await page.getByTestId('quiz-start').click();

  for (let q = 0; q < 3; q++) {
    await page.getByRole('radio').first().check().catch(async () => {
      await page.getByRole('button', { name: 'Correct answer' }).first().click();
    });
    await page.getByTestId('quiz-check').click();
    const submit = page.getByTestId('quiz-submit');
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      break;
    }
    await page.getByRole('button', { name: /next/i }).click().catch(() => {});
  }

  await expect(page.getByTestId('quiz-result')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('quiz-result')).toContainText(/%/);
});
