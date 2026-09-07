import { expect, test } from '@playwright/test';
import { accessTokenFromState, apiFor } from './support/api';
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
  // A seat grants entitlement; the learner still enrols themselves via Start Course on first visit.
  // NB: locator.isVisible() never waits — use waitFor() so a cold page load is not mistaken for 'no button'.
  const hubCard = page.getByTestId(`hub-lesson-${run.lessonAId}`);
  const start = page.getByRole('button', { name: /^Start course$/i }).first();
  const startShown = await start
    .or(hubCard)
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => start.isVisible())
    .catch(() => false);
  if (startShown) {
    // Start Course enrols the learner (POST enrollments) but stays on the course overview;
    // wait for that write, then open the module hub ourselves.
    const enrolWrite = page
      .waitForResponse((r) => r.url().includes('/rest/v1/enrollments') && r.request().method() === 'POST', {
        timeout: 10_000,
      })
      .catch(() => null);
    await start.click();
    await enrolWrite;
    await page.goto(`/courses/${run.courseId}/learn`);
    const hubShown = await hubCard
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!hubShown) {
      // Last resort: self-enrol through the Data API (policy 'Users can enrol where entitled').
      const learnerApi = await apiFor(learnerStatePath);
      const learnerId = JSON.parse(
        Buffer.from(accessTokenFromState(learnerStatePath).split('.')[1], 'base64').toString(),
      ).sub as string;
      const enrol = await learnerApi.post('/rest/v1/enrollments', { data: { user_id: learnerId, course_id: run.courseId } });
      const body = await enrol.text();
      expect(enrol.ok() || body.includes('23505'), `self-enrol failed: ${body}`).toBeTruthy();
      await page.goto(`/courses/${run.courseId}/learn`);
    }
  }
  await expect(page.getByTestId(`hub-lesson-${run.lessonAId}`)).toBeVisible({ timeout: 20_000 });
  await page.getByTestId(`hub-lesson-${run.lessonAId}`).click();
  await expect(page.getByTestId('learner-block-0-text')).toBeVisible();

  // flip card, accordion, card deck: presentational interactions
  // Every card, section, slide and pin must be visited — the gates count all of them.
  for (const el of await page.getByTestId(/^flipcard-\d+$/).all()) await el.click();
  for (const el of await page.getByTestId(/^accordion-item-\d+$/).all()) await el.click();
  for (const el of await page.getByTestId(/^carddeck-card-\d+$/).all()) await el.click();
  for (let i = 0; i < 12; i++) {
    const next = page.getByTestId('carousel-next');
    if (!(await next.isEnabled().catch(() => false))) break;
    await next.click();
  }
  for (const el of await page.getByTestId(/^hotspot-\d+$/).all()) {
    await el.click();
    await page.keyboard.press('Escape').catch(() => {});
  }

  // MCQ self-grades on selection; the first option is the correct one.
  const mcq = page.getByTestId(/learner-block-\d+-mcq/).first();
  await mcq.getByTestId('mcq-option-0').click();
  await expect(mcq.getByText(/correct/i).first()).toBeVisible();

  // Drag match is tap-to-place: pick the token, then the target, then check.
  const drag = page.getByTestId(/learner-block-\d+-drag_match/).first();
  // Place every token: `dragmatch-target-<i>` is the drop-zone container; the actual
  // tap-to-place control is the button inside it. The authored block maps item 0 → target 0.
  const tokens = await drag.getByTestId(/^dragmatch-token-\d+$/).count();
  // A restored, already-correct answer locks the tokens; nothing to place then.
  const alreadySolved = tokens > 0 && (await drag.getByTestId(/^dragmatch-token-\d+$/).first().isDisabled());
  for (let i = 0; i < (alreadySolved ? 0 : tokens); i++) {
    const token = drag.getByTestId(/^dragmatch-token-\d+$/).first();
    const placeHere = drag.getByTestId('dragmatch-target-0').getByRole('button', { name: 'Place here' });
    await token.click();
    await expect(placeHere).toBeVisible();
    await placeHere.click();
  }
  if (!alreadySolved) {
    await expect(drag.getByTestId('check-answer')).toBeEnabled();
    await drag.getByTestId('check-answer').click();
  }

  // Checklist steps
  for (const box of await page.getByRole('checkbox').all()) {
    await box.check().catch(() => {});
  }

  // Scenario: walk the first choice until no choices remain.
  const scenario = page.getByTestId(/learner-block-\d+-scenario/).first();
  // Each decision reveals feedback and a Continue button; outcome nodes also need Continue.
  // Walk choice 0 (the default scenario's safe path) until an ending is reached.
  const ending = scenario.getByText(/Your path|Try again from the start/i).first();
  for (let i = 0; i < 12; i++) {
    const choice = scenario.getByTestId('scenario-choice-0');
    const cont = scenario.getByRole('button', { name: /^Continue/ });
    // Wait for whichever comes next: the ending, a Continue button, or the next decision.
    await ending.or(cont).or(choice).first().waitFor({ state: 'visible', timeout: 15_000 });
    if (await ending.isVisible()) break;
    if (await cont.isVisible()) {
      await cont.click();
      continue;
    }
    if ((await choice.isVisible()) && (await choice.isEnabled())) {
      await choice.click();
      continue;
    }
    await page.waitForTimeout(300); // feedback is rendering; Continue follows
  }
  await expect(scenario.getByText(/Your path|Try again from the start/i).first()).toBeVisible({ timeout: 10_000 });

  // Reflection: long enough to pass the minimum word count.
  // A submitted reflection restores read-only; only write when the box is still editable.
  if (await page.getByTestId('reflection-text').isEditable()) {
    await page
      .getByTestId('reflection-text')
      .fill(
        'On my next shift I would stop the feed, check the tube for kinks, flush gently with water and tell the nurse in charge straight away.',
      );
    await page.getByTestId('reflection-submit').click();
  }
  await expect(page.getByTestId('reflection-mark')).toBeVisible({ timeout: 20_000 });

  if (!(await page.getByTestId('mark-complete').isEnabled())) {
    // Surface the lesson's own explanation of what is still pending.
    const strip = await page.getByText(/to finish|still to|activit/i).allTextContents().catch(() => []);
    console.log('mark-complete disabled; page says:', strip.join(' | '));
  }
  await expect(page.getByTestId('mark-complete')).toBeEnabled({ timeout: 20_000 });
  // Wait for the lesson_progress write; the app then returns to the hub itself (P10 return loop).
  const progressWrite = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/lesson_progress') && r.request().method() !== 'GET' && r.ok(),
    { timeout: 30_000 },
  );
  await page.getByTestId('mark-complete').click();
  await progressWrite;
  const hubStatus = page.getByTestId(`hub-lesson-status-${run.lessonAId}`);
  if (!(await hubStatus.isVisible({ timeout: 8_000 }).catch(() => false))) {
    await page.goto(`/courses/${run.courseId}/learn`);
  }
  await expect(hubStatus).toContainText(/complete/i, { timeout: 20_000 });
});
