import { expect, test } from '@playwright/test';
import { learnerStatePath, loadRun, staffStatePath } from './support/env';
import { addBlock, videoFixture } from './support/authoring';

/**
 * Optional (needs a real upload): authors a video block from the local fixture
 * with one checkpoint, then checks the learner sees the checkpoint overlay and
 * cannot seek past an unanswered cue.
 *
 * Skipped unless E2E_VIDEO=1, because it uploads to storage.
 */

test.skip(process.env.E2E_VIDEO !== '1', 'set E2E_VIDEO=1 to exercise the upload + checkpoint path');
test.describe.configure({ mode: 'serial' });
