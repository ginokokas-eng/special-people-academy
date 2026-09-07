import { expect, test } from '@playwright/test';
import { learnerStatePath, loadRun } from './support/env';

/**
 * Plays the authored lesson end to end: every interactive block is satisfied,
 * then "mark complete" must become enabled.
 */

test.use({ storageState: learnerStatePath });

test('learner completes every interactive block', async ({ page }) => {
  test.slow();
  const run = loadRun();

  await page.goto(`/courses/${run.courseId}/learn`);
  await expect(page.getByTestId(`hub-lesson-${run.lessonAId}`)).toBeVisible({ timeout: 20_000 });
  await page.getByTestId(`hub-lesson-${run.lessonAId}`).click();
  await expect(page.getByTestId('learner-block-0-text')).toBeVisible();

  // flip card, accordion, card deck: presentational interactions
  await page.getByTestId('flipcard-0').click();
  await page.getByTestId('accordion-item-0').click();
  await page.getByTestId('carddeck-card-0').click().catch(() => {});
  await page.getByTestId('carousel-next').click().catch(() => {});
  await page.getByTestId('hotspot-0').click().catch(() => {});

  // MCQ self-grades on selection; the first option is the correct one.
  const mcq = page.getByTestId(/learner-block-\d+-mcq/).first();
  await mcq.getByTestId('mcq-option-0').click();
  await expect(mcq.getByText(/correct/i).first()).toBeVisible();

  // Drag match is tap-to-place: pick the token, then the target, then check.
  const drag = page.getByTestId(/learner-block-\d+-drag_match/).first();
  await drag.getByTestId('dragmatch-token-0').click();
  await drag.getByTestId('dragmatch-target-0').click();
  await drag.getByTestId('check-answer').click();

  // Checklist steps
  for (const box of await page.getByRole('checkbox').all()) {
    await box.check().catch(() => {});
  }

  // Scenario: walk the first choice until no choices remain.
  const scenario = page.getByTestId(/learner-block-\d+-scenario/).first();
  for (let i = 0; i < 6; i++) {
    const choice = scenario.getByTestId('scenario-choice-0');
    if (!(await choice.isVisible().catch(() => false))) break;
    await choice.click();
  }

  // Reflection: long enough to pass the minimum word count.
  await page
    .getByTestId('reflection-text')
    .fill(
      'On my next shift I would stop the feed, check the tube for kinks, flush gently with water and tell the nurse in charge straight away.',
    );
  await page.getByTestId('reflection-submit').click();
  await expect(page.getByTestId('reflection-mark')).toBeVisible({ timeout: 20_000 });

  await expect(page.getByTestId('mark-complete')).toBeEnabled({ timeout: 20_000 });
  await page.getByTestId('mark-complete').click();

  await page.goto(`/courses/${run.courseId}/learn`);
  await expect(page.getByTestId(`hub-lesson-status-${run.lessonAId}`)).toContainText(/complete/i);
});
