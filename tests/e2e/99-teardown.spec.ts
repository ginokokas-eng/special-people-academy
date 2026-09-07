import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import type { APIRequestContext } from '@playwright/test';
import { apiFor, rpc } from './support/api';
import { runFilePath, staffStatePath } from './support/env';

/**
 * Deletes everything the run created. The RPC is guarded twice over: staff role,
 * and a title that starts with "E2E ". Uploaded files are not part of the RPC,
 * so they are removed here straight from the bucket.
 */

test.use({ storageState: staffStatePath });
test.describe.configure({ mode: 'serial' });

const BUCKET = 'lesson-media';

interface StorageEntry {
  name: string;
  id: string | null;
}

async function listFolder(api: APIRequestContext, prefix: string): Promise<StorageEntry[]> {
  const res = await api.post(`/storage/v1/object/list/${BUCKET}`, {
    data: { prefix, limit: 1000, offset: 0 },
  });
  if (!res.ok()) return [];
  return (await res.json()) as StorageEntry[];
}

/** Every object path under `<courseId>/…` (one level of lesson folders). */
async function objectsUnderCourse(api: APIRequestContext, courseId: string): Promise<string[]> {
  const paths: string[] = [];
  for (const entry of await listFolder(api, `${courseId}/`)) {
    if (entry.id) {
      paths.push(`${courseId}/${entry.name}`);
      continue;
    }
    for (const file of await listFolder(api, `${courseId}/${entry.name}/`)) {
      if (file.id) paths.push(`${courseId}/${entry.name}/${file.name}`);
    }
  }
  return paths;
}

test('run data is deleted', async () => {
  if (!fs.existsSync(runFilePath)) test.skip(true, 'nothing was authored, nothing to delete');
  const run = JSON.parse(fs.readFileSync(runFilePath, 'utf8')) as {
    courseId: string;
    cloneCourseId?: string;
    bankQuestionIds?: string[];
  };

  const api = await apiFor(staffStatePath);

  const courseIds = [run.cloneCourseId, run.courseId].filter((id): id is string => !!id);

  // Files first: the rows that name them are about to disappear.
  const prefixes: string[] = [];
  for (const id of courseIds) prefixes.push(...(await objectsUnderCourse(api, id)));
  if (prefixes.length) {
    const res = await api.delete(`/storage/v1/object/${BUCKET}`, { data: { prefixes } });
    expect(res.ok(), `deleting ${prefixes.length} uploaded files should succeed`).toBeTruthy();
  }

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

  // Bank rows are shared, so the course delete leaves them behind.
  if (run.bankQuestionIds?.length) {
    const res = await api.delete(
      `/rest/v1/question_bank?id=in.(${run.bankQuestionIds.join(',')})`,
    );
    expect(res.ok(), 'the questions saved to the bank should be removed').toBeTruthy();
  }

  // Nothing may be left in either course's folder.
  for (const id of courseIds) {
    expect(await objectsUnderCourse(api, id), `${id} should have no files left`).toEqual([]);
  }

  fs.rmSync(runFilePath, { force: true });
});
