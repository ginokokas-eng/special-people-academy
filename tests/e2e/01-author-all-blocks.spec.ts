import { expect, test } from '@playwright/test';
import { apiFor } from './support/api';
import { ALL_BLOCK_TYPES, addBlock, chooseOption, fillBlock } from './support/authoring';
import { learnerStatePath, saveRun, staffStatePath } from './support/env';
import { accessTokenFromState } from './support/api';

/**
 * Authors, through the real editor, one course containing:
 *   - a "blocks" lesson holding EVERY block type
 *   - a "quiz" lesson with three MCQs (pass mark 67, two attempts)
 * then publishes it and enrols the learner account.
 *
 * The course is always titled "E2E <runId>" so 99-teardown can delete it via the
 * guarded e2e_delete_course RPC.
 */

test.use({ storageState: staffStatePath });
test.describe.configure({ mode: 'serial' });

const runId = `${Date.now()}`;
const courseTitle = `E2E ${runId}`;

test('staff authors and publishes a course with all 14 block types', async ({ page }) => {
  test.slow();

  // ---- create the course -------------------------------------------------
  await page.goto('/admin-portal/courses');
  await page.getByRole('button', { name: 'Create Course' }).click();
  await expect(page).toHaveURL(/\/admin-portal\/courses\/[0-9a-f-]{36}\/edit/, { timeout: 20_000 });
  const courseId = page.url().match(/courses\/([0-9a-f-]{36})\/edit/)![1];

  // ---- Overview: everything publishChecks' "basics" needs ----------------
  await page.getByLabel('Title').fill(courseTitle);
  await page.getByLabel('Short Description').fill('An automated end-to-end course. Safe to delete.');
  await page.getByLabel('Category').fill('Clinical Skills');
  await page.getByLabel('Duration (minutes)').fill('30');
  await page.getByPlaceholder('Add a learning outcome...').fill('Recognise a blocked feeding tube');
  await page.getByRole('button', { name: /^Add$/ }).first().click();
  await expect(page.getByText('Recognise a blocked feeding tube')).toBeVisible();

  // ---- Modules & Lessons -------------------------------------------------
  await page.getByRole('tab', { name: 'Modules & Lessons' }).click();
  await page.getByRole('button', { name: 'Add Module' }).click();
  await page.getByLabel('Title').fill('Module one');
  await page.getByRole('button', { name: /^(Create|Save)$/ }).click();
  await expect(page.getByText('Module one')).toBeVisible();

  await page.getByRole('button', { name: 'Add Lesson' }).first().click();
  await page.getByLabel('Title').fill('All blocks');
  await chooseOption(page, 'lesson-type-select', 'Interactive lesson (blocks)').catch(async () => {
    await page.getByLabel('Type').click();
    await page.getByRole('option', { name: 'Interactive lesson (blocks)' }).click();
  });
  await page.getByLabel('Required for completion').check().catch(() => {});
  await page.getByRole('button', { name: /^(Create|Save)$/ }).click();
  await expect(page.getByText('All blocks')).toBeVisible();

  await page.getByRole('button', { name: 'Add Lesson' }).first().click();
  await page.getByLabel('Title').fill('Knowledge check');
  await page.getByLabel('Type').click();
  await page.getByRole('option', { name: 'Quiz' }).click();
  await page.getByRole('button', { name: /^(Create|Save)$/ }).click();
  await expect(page.getByText('Knowledge check')).toBeVisible();

  // ---- block editor: one of every type ----------------------------------
  await page.getByRole('link', { name: 'Edit content' }).first().click();
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]{36}\/content/);
  const lessonAId = page.url().match(/lessons\/([0-9a-f-]{36})\/content/)![1];

  for (const [index, type] of ALL_BLOCK_TYPES.entries()) {
    const prefix = await addBlock(page, type, index);
    await fillBlock(page, type, prefix, runId);
  }

  await page.getByTestId('save-content-open').click();
  await page.getByTestId('save-content').click();
  await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 20_000 });

  // ---- quiz: three MCQs, pass mark 67, two attempts ----------------------
  await page.goto(`/admin-portal/courses/${courseId}/edit`);
  await page.getByRole('tab', { name: 'Quiz Builder' }).click();
  await page.getByRole('button', { name: 'Knowledge check' }).click();
  await page.getByRole('button', { name: 'Create Quiz' }).click();
  await page.getByLabel('Title').fill(`E2E quiz ${runId}`);
  await page.getByLabel('Passing Score (%)').fill('67');
  await page.getByLabel('Attempts Allowed').fill('2');
  await page.getByRole('button', { name: /^Create$/ }).click();

  for (let q = 1; q <= 3; q++) {
    await page.getByRole('button', { name: 'Add Question' }).first().click();
    await page.getByLabel('Question').fill(`E2E question ${q}: which answer is correct?`);
    for (let o = 1; o <= 4; o++) {
      await page.getByPlaceholder(`Option ${o}`).fill(o === 1 ? 'Correct answer' : `Wrong ${o}`);
    }
    await page.getByRole('radio').first().check();
    await page.getByRole('button', { name: 'Add Question' }).last().click();
    await expect(page.getByText(`E2E question ${q}`)).toBeVisible();
  }

  // ---- publish -----------------------------------------------------------
  await page.getByRole('tab', { name: 'Publishing' }).click();
  await page.getByLabel('Change Status').click();
  await page.getByRole('option', { name: 'Submit for Review' }).click();
  await expect(page.getByTestId('publish-course')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('publish-course').click();
  await expect(page.getByText(/published/i).first()).toBeVisible({ timeout: 20_000 });

  // ---- give the learner access ------------------------------------------
  const api = await apiFor(staffStatePath);
  const learnerId = JSON.parse(
    Buffer.from(accessTokenFromState(learnerStatePath).split('.')[1], 'base64').toString(),
  ).sub as string;
  const res = await api.post('/rest/v1/enrollments', {
    data: { user_id: learnerId, course_id: courseId },
    headers: { Prefer: 'return=representation' },
  });
  expect(res.ok(), `enrolling the learner failed: ${await res.text()}`).toBeTruthy();

  saveRun({ runId, courseId, courseTitle, orgName: `E2E ${runId}`, lessonAId });
});
