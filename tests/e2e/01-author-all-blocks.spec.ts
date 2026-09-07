import { expect, test } from '@playwright/test';
import { apiFor, rpc } from './support/api';
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
  await page.getByLabel('Title', { exact: true }).fill(courseTitle);
  await page.getByLabel('Short Description').fill('An automated end-to-end course. Safe to delete.');
  // Category is a Radix Select whose trigger carries no accessible name (product a11y gap):
  // it is the first combobox on the Overview tab. Pick the first real category.
  await page.getByRole('combobox').first().click();
  await page.getByRole('option').filter({ hasNotText: 'Uncategorized' }).first().click();
  await expect(page.getByRole('option').first()).toBeHidden();
  await page.getByLabel('Duration (minutes)').fill('30');
  await page.getByPlaceholder('Add a learning outcome...').fill('Recognise a blocked feeding tube');
  // The add button is icon-only with no accessible name (product a11y gap); the input accepts Enter.
  await page.getByPlaceholder('Add a learning outcome...').press('Enter');
  await expect(page.getByText('Recognise a blocked feeding tube')).toBeVisible();
  // Overview fields only persist on Save Changes.
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Course saved').first()).toBeVisible({ timeout: 20_000 });

  // ---- Modules & Lessons -------------------------------------------------
  await page.getByRole('tab', { name: 'Modules & Lessons' }).click();
  await page.getByRole('button', { name: 'Add Module' }).click();
  await page.getByLabel('Title', { exact: true }).fill('Module one');
  await page.getByRole('button', { name: /^(Create|Save)$/ }).click();
  await expect(page.getByText('Module one')).toBeVisible();

  // Modules render as a collapsed accordion; expand ours so its Add Lesson button mounts.
  await page.getByRole('button', { name: /^Module 1: Module one/ }).click();
  await page.getByRole('button', { name: 'Add Lesson' }).first().click();
  await page.getByLabel('Title', { exact: true }).fill('All blocks');
  // The lesson-type Select trigger has no accessible name (product a11y gap): use the dialog's combobox.
  await page.getByRole('dialog').getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Interactive lesson (blocks)' }).click();
  // Duration field is type-specific (video only); fill it when present.
  await page.getByRole('dialog').getByRole('spinbutton', { name: 'Exact duration (seconds)' }).fill('120', { timeout: 2000 }).catch(() => {});
  await page.getByLabel('Required for completion').check().catch(() => {});
  await page.getByRole('button', { name: /^(Create|Save)$/ }).click();
  await expect(page.getByText('All blocks')).toBeVisible();

  await page.getByRole('button', { name: 'Add Lesson' }).first().click();
  await page.getByLabel('Title', { exact: true }).fill('Knowledge check');
  await page.getByRole('dialog').getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Quiz' }).click();
  await page.getByRole('dialog').getByRole('spinbutton', { name: 'Exact duration (seconds)' }).fill('120', { timeout: 2000 }).catch(() => {});
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
  const blocksSaved = page.waitForResponse(
    (r) => r.url().includes('/rest/v1/lesson_blocks') && r.request().method() !== 'GET' && r.ok(),
    { timeout: 30_000 },
  );
  await page.getByTestId('save-content').click();
  await blocksSaved;
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');

  // ---- quiz: three MCQs, pass mark 67, two attempts ----------------------
  await page.goto(`/admin-portal/courses/${courseId}/edit`);
  await page.getByRole('tab', { name: 'Quiz Builder' }).click();
  await page.getByRole('button', { name: 'Knowledge check' }).click();
  await page.getByRole('button', { name: 'Create Quiz' }).click();
  // The quiz dialog's <Label>s have no htmlFor (product a11y gap): address fields by role/order.
  {
    const dlg = page.getByRole('dialog');
    await dlg.getByRole('textbox').first().fill(`E2E quiz ${runId}`);
    await dlg.getByRole('spinbutton').nth(0).fill('67');
    await dlg.getByRole('spinbutton').nth(1).fill('2');
  }
  await page.getByRole('button', { name: /^Create$/ }).click();

  for (let q = 1; q <= 3; q++) {
    await page.getByRole('button', { name: 'Add Question' }).first().click();
    await page.getByRole('dialog').getByRole('textbox').first().fill(`E2E question ${q}: which answer is correct?`);
    for (let o = 1; o <= 4; o++) {
      await page.getByPlaceholder(`Option ${o}`).fill(o === 1 ? 'Correct answer' : `Wrong ${o}`);
    }
    await page.getByRole('dialog').getByRole('radio').first().check();
    await page.getByRole('dialog').getByRole('button', { name: 'Add Question' }).click();
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText(`E2E question ${q}`)).toBeVisible();
  }

  // ---- publish -----------------------------------------------------------
  await page.getByRole('tab', { name: 'Publishing' }).click();
  // 'Change Status' <Label> has no htmlFor (product a11y gap): use the Publishing panel's combobox.
  await page.getByRole('tabpanel', { name: 'Publishing' }).getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Submit for Review' }).click();
  await expect(page.getByTestId('publish-course')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('publish-course').click();
  await expect(page.getByText(/published/i).first()).toBeVisible({ timeout: 20_000 });

  // ---- give the learner access ------------------------------------------
  const api = await apiFor(staffStatePath);
  const learnerId = JSON.parse(
    Buffer.from(accessTokenFromState(learnerStatePath).split('.')[1], 'base64').toString(),
  ).sub as string;
  // A bare enrollment does NOT grant access: can_access_course() needs an active licence seat
  // (or an entitlement-exempt enrollment). Use the real seat path: organisation → licence → seat.
  const orgName = `E2E ${runId}`;
  const orgRes = await api.post('/rest/v1/organisations', {
    data: { name: orgName, slug: `e2e-${runId}`, kind: 'customer' },
    headers: { Prefer: 'return=representation' },
  });
  expect(orgRes.ok(), `creating the E2E organisation failed: ${await orgRes.text()}`).toBeTruthy();
  const orgId = ((await orgRes.json()) as { id: string }[])[0].id;
  const now = new Date();
  const licenceId = await rpc<string>(api, 'create_licence', {
    _organisation_id: orgId,
    _course_id: courseId,
    _offering_id: null,
    _seats_total: 5,
    _starts_at: new Date(now.getTime() - 60_000).toISOString(),
    _expires_at: new Date(now.getTime() + 365 * 86_400_000).toISOString(),
    _order_reference: `E2E-${runId}`,
  });
  await rpc(api, 'assign_seat', { _licence_id: licenceId, _user_id: learnerId });
  const canAccess = await rpc<boolean>(api, 'can_access_course', { _user: learnerId, _course: courseId });
  expect(canAccess, 'learner should have course access through the licence seat').toBeTruthy();

  saveRun({ runId, courseId, courseTitle, orgName, lessonAId });
});
