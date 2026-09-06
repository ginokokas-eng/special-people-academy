import { describe, it, expect } from 'vitest';
import {
  LMS_SOURCE,
  buildLmsMessage,
  isAllowedFrameOrigin,
  scormStatusFromMessage,
} from './lmsBridge';

describe('buildLmsMessage', () => {
  it('stamps the source and clamps the percentage', () => {
    expect(buildLmsMessage({ type: 'lesson_completed', course_id: 'c1', percent: 140 })).toEqual({
      source: LMS_SOURCE,
      type: 'lesson_completed',
      course_id: 'c1',
      percent: 100,
    });
    expect(buildLmsMessage({ type: 'heartbeat', course_id: 'c1', percent: -5 }).percent).toBe(0);
  });

  it('omits optional fields when they are absent', () => {
    const msg = buildLmsMessage({ type: 'heartbeat', course_id: 'c1' });
    expect(msg.lesson_id).toBeUndefined();
    expect(msg.score).toBeUndefined();
    expect(msg.passed).toBeUndefined();
  });

  it('keeps score and passed when supplied', () => {
    const msg = buildLmsMessage({
      type: 'score',
      course_id: 'c1',
      lesson_id: 'l1',
      percent: 80,
      score: 80,
      passed: true,
    });
    expect(msg).toMatchObject({ lesson_id: 'l1', score: 80, passed: true });
  });
});

describe('scormStatusFromMessage', () => {
  it('leaves the SCO incomplete for lesson and score events', () => {
    expect(scormStatusFromMessage({ type: 'lesson_completed', percent: 50 })).toEqual({
      lesson_status: 'incomplete',
      score_raw: 50,
    });
    expect(scormStatusFromMessage({ type: 'score', percent: 90, score: 90 })?.lesson_status).toBe(
      'incomplete',
    );
  });

  it('reports nothing for a heartbeat', () => {
    expect(scormStatusFromMessage({ type: 'heartbeat', percent: 10 })).toBeNull();
  });

  it('prefers an explicit passed flag on course completion', () => {
    expect(
      scormStatusFromMessage({ type: 'course_completed', percent: 100, score: 40, passed: true }),
    ).toEqual({ lesson_status: 'passed', score_raw: 40 });
    expect(
      scormStatusFromMessage({ type: 'course_completed', percent: 100, score: 95, passed: false })
        ?.lesson_status,
    ).toBe('failed');
  });

  it('falls back to the pass mark, then to plain completion', () => {
    expect(
      scormStatusFromMessage({ type: 'course_completed', percent: 100, score: 79 }, 80)
        ?.lesson_status,
    ).toBe('failed');
    expect(
      scormStatusFromMessage({ type: 'course_completed', percent: 100, score: 80 }, 80)
        ?.lesson_status,
    ).toBe('passed');
    expect(scormStatusFromMessage({ type: 'course_completed', percent: 100 })).toEqual({
      lesson_status: 'completed',
      score_raw: 100,
    });
  });
});

describe('isAllowedFrameOrigin', () => {
  it('treats an empty allow-list as unrestricted', () => {
    expect(isAllowedFrameOrigin(null, [])).toBe(true);
    expect(isAllowedFrameOrigin('https://lms.example.org', undefined)).toBe(true);
  });

  it('matches case-insensitively and ignores trailing slashes', () => {
    expect(isAllowedFrameOrigin('https://LMS.example.org', ['https://lms.example.org/'])).toBe(true);
  });

  it('rejects an unknown or unreadable origin when a list exists', () => {
    expect(isAllowedFrameOrigin('https://evil.example', ['https://lms.example.org'])).toBe(false);
    expect(isAllowedFrameOrigin(null, ['https://lms.example.org'])).toBe(false);
  });
});
