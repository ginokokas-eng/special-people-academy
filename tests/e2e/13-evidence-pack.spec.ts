import { expect, test } from '@playwright/test';
import { accessTokenFromState, apiFor, rpc } from './support/api';
import { learnerStatePath, loadRun, staffStatePath } from './support/env';

/**
 * Evidence pack data layer: `get_learner_evidence_pack` must answer for the
 * learner themselves and for training staff, refuse anyone else, and always
 * return every section as an array (never null) so the renderer in 6b is safe.
 */

test.describe.configure({ mode: 'serial' });

function userIdFrom(statePath: string): string {
  return JSON.parse(
    Buffer.from(accessTokenFromState(statePath).split('.')[1], 'base64').toString(),
  ).sub as string;
}

const SECTIONS = [
  'courses',
  'reflections',
  'checklists',
  'quiz_results',
  'practical',
  'signoffs',
  'standards_summary',
] as const;

interface Pack {
  generated_at: string;
  filters: { course_id: string | null; standard_id: string | null };
  learner: { user_id: string; name: string | null; email: string | null };
  courses: { course_id: string; title: string; lessons_total: number; lessons_completed: number }[];
  [key: string]: unknown;
}

test('the learner can pull their own pack', async () => {
  const learnerId = userIdFrom(learnerStatePath);
  const api = await apiFor(learnerStatePath);
  const pack = await rpc<Pack>(api, 'get_learner_evidence_pack', { _user: learnerId });

  expect(pack.learner.user_id).toBe(learnerId);
  expect(new Date(pack.generated_at).toString()).not.toBe('Invalid Date');
  for (const key of SECTIONS) {
    expect(Array.isArray(pack[key]), `${key} should always be an array`).toBeTruthy();
  }
});

test('training staff can pull a learner pack, filtered to one course', async () => {
  const run = loadRun();
  const learnerId = userIdFrom(learnerStatePath);
  const api = await apiFor(staffStatePath);

  const pack = await rpc<Pack>(api, 'get_learner_evidence_pack', {
    _user: learnerId,
    _course: run.courseId,
  });
  expect(pack.filters.course_id).toBe(run.courseId);
  expect(pack.courses.map((c) => c.course_id)).toEqual([run.courseId]);

  const [course] = pack.courses;
  expect(course.title, 'the run course should be named').toContain('E2E');
  expect(course.lessons_total).toBeGreaterThan(0);
  expect(course.lessons_completed).toBeGreaterThan(0);
});

test('a learner cannot pull somebody else’s pack', async () => {
  const staffId = userIdFrom(staffStatePath);
  const api = await apiFor(learnerStatePath);
  const res = await api.post('/rest/v1/rpc/get_learner_evidence_pack', {
    data: { _user: staffId },
  });
  expect(res.ok(), 'reading another learner should be refused').toBeFalsy();
  expect(await res.text()).toContain('not_allowed');
});
