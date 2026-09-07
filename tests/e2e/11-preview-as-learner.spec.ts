import { expect, test } from '@playwright/test';
import { apiFor, select } from './support/api';
import { loadRun, staffStatePath } from './support/env';

/**
 * Preview as a learner, on a phone frame, with reduced motion and a chosen
 * language — and never persisting anything.
 *
 * The preview renders in a same-origin iframe so Tailwind's viewport breakpoints
 * behave as they do on a phone. This spec proves the device size, the
 * reduced-motion attribute, a DRAFT translation being visible to staff only in
 * the preview, and — the important part — that interacting inside the frame
 * writes nothing.
 */

test.use({ storageState: staffStatePath });
test.describe.configure({ mode: 'serial' });

const RO_TEXT = 'Text tradus pentru previzualizare';

test('staff preview a lesson on a phone frame without writing anything', async ({ page }) => {
  test.slow();
  const run = loadRun();
  const api = await apiFor(staffStatePath);

  // ---- seed a DRAFT Romanian translation for the lesson's first text block --
  const textBlocks = await select<{ id: string }>(
    api,
    `lesson_blocks?lesson_id=eq.${run.lessonAId}&block_type=eq.text&select=id&order=order_index.asc&limit=1`,
  );
  expect(textBlocks.length, 'lesson A should hold a text block').toBe(1);
  const blockId = textBlocks[0].id;

  const seed = await api.post('/rest/v1/lesson_translations', {
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
    data: {
      lesson_id: run.lessonAId,
      lang: 'ro',
      block_id: blockId,
      // The frame never verifies the hash — it only overlays text.
      source_hash: 'e2e-preview',
      overrides: { text: RO_TEXT },
      status: 'draft',
    },
  });
  expect(seed.ok(), await seed.text()).toBeTruthy();

  // Nothing formative exists for this staff user on this lesson yet.
  const before = await select<{ id: string }>(
    api,
    `lesson_block_responses?lesson_id=eq.${run.lessonAId}&select=id`,
  );
  expect(before.length).toBe(0);

  // ---- watch for any write the preview must never make ---------------------
  const writes: string[] = [];
  page.on('request', (req) => {
    const method = req.method();
    if (method !== 'POST' && method !== 'PATCH') return;
    const url = req.url();
    if (
      /\/rest\/v1\/(lesson_block_responses|lesson_progress|block_marks)/.test(url)
    ) {
      writes.push(`${method} ${url}`);
    }
  });

  await page.goto(`/admin-portal/courses/${run.courseId}/lessons/${run.lessonAId}/content`);
  const frame = page.getByTestId('preview-frame');
  await expect(frame).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('preview-toolbar')).toBeVisible();

  // ---- phone size ---------------------------------------------------------
  await page.getByTestId('preview-device-phone').click();
  await expect
    .poll(async () => Math.round((await frame.boundingBox())!.width), { timeout: 10_000 })
    .toBe(390);

  // ---- reduced motion: assert the attribute, not visible motion -----------
  await page.getByTestId('preview-motion').click();
  await expect
    .poll(
      async () =>
        await page
          .frameLocator('[data-testid="preview-frame"]')
          .locator('html')
          .getAttribute('data-motion'),
      { timeout: 15_000 },
    )
    .toBe('reduce');

  // ---- the previewed language, drafts included ----------------------------
  await page.getByTestId('preview-lang').selectOption('ro');
  const inFrame = page.frameLocator('[data-testid="preview-frame"]');
  await expect(inFrame.getByText(RO_TEXT).first()).toBeVisible({ timeout: 20_000 });
  await expect(inFrame.getByTestId('preview-lang-chip')).toContainText('draft');

  // ---- interact inside the frame ------------------------------------------
  const mcq = inFrame.locator('[data-testid^="learner-block-"][data-testid$="-mcq"]').first();
  await mcq.getByTestId('mcq-option-0').click();
  const flip = inFrame.getByTestId('flipcard-0').first();
  await flip.click().catch(() => {});

  // give any stray request a moment to appear
  await page.waitForTimeout(1500);
  expect(writes, `preview wrote to the learner tables: ${writes.join(', ')}`).toEqual([]);

  const after = await select<{ id: string }>(
    api,
    `lesson_block_responses?lesson_id=eq.${run.lessonAId}&select=id`,
  );
  expect(after.length).toBe(0);

  // ---- clean up (teardown deletes the course anyway) ----------------------
  await api.delete(
    `/rest/v1/lesson_translations?lesson_id=eq.${run.lessonAId}&lang=eq.ro&block_id=eq.${blockId}`,
  );
});
