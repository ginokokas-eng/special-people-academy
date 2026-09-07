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
    // Options render as buttons; wait for this question before answering it.
    await expect(page.getByText(`Question ${q + 1} of 3`)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Correct answer/ }).click();
    await expect(page.getByTestId('quiz-check')).toBeEnabled();
    await page.getByTestId('quiz-check').click();
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 15_000 });
    // After feedback either Next (more questions) or the submit button (last question) appears.
    const submit = page.getByTestId('quiz-submit');
    const next = page.getByRole('button', { name: /^next/i });
    await expect(submit.or(next)).toBeVisible({ timeout: 15_000 });
    // The submit button is present on EVERY question (it opens an 'unanswered questions' prompt
    // when used early); advance with Next while it exists and submit only on the last question.
    if (await next.isVisible()) {
      await next.click();
      continue;
    }
    await submit.click();
    break;
  }

  await expect(page.getByTestId('quiz-result')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('quiz-result')).toContainText(/%/);
});
