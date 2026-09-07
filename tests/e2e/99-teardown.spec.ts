import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import { apiFor, rpc } from './support/api';
import { runFilePath, staffStatePath } from './support/env';

/**
 * Deletes everything the run created. The RPC is guarded twice over: staff role,
 * and a title that starts with "E2E ".
 */

test.use({ storageState: staffStatePath });
test.describe.configure({ mode: 'serial' });

test('run data is deleted', async () => {
  if (!fs.existsSync(runFilePath)) test.skip(true, 'nothing was authored, nothing to delete');
  const run = JSON.parse(fs.readFileSync(runFilePath, 'utf8')) as {
    courseId: string;
    cloneCourseId?: string;
  };

  const api = await apiFor(staffStatePath);

  // The copy goes first: it links back to the source through
  // cloned_from_course_id (ON DELETE SET NULL, so either order is safe).
  if (run.cloneCourseId) {
    const cloneCounts = await rpc<Record<string, number>>(api, 'e2e_delete_course', {
      _course_id: run.cloneCourseId,
    });
    expect(cloneCounts, 'the cloned course should be removed too').toBeTruthy();
  }

  const counts = await rpc<Record<string, number>>(api, 'e2e_delete_course', {
    _course_id: run.courseId,
  });
  expect(counts, 'e2e_delete_course should report what it removed').toBeTruthy();

  fs.rmSync(runFilePath, { force: true });
});

