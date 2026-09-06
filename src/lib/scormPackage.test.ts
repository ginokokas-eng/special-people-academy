import { describe, it, expect } from 'vitest';
import {
  buildLauncherHtml,
  buildManifest,
  buildReadme,
  escapeXml,
  scormIdentifier,
} from './scormPackage';

const options = {
  courseId: '11111111-2222-3333-4444-555555555555',
  courseTitle: 'Safe & Sound <Care> "Basics"',
  organisationName: 'Bright Futures Care',
  launchKey: 'lk_abcdefghijklmnopqrstuvwxyz',
  functionsUrl: 'https://example.functions.supabase.co/functions/v1/',
  anonKey: 'anon-key',
};

describe('escapeXml', () => {
  it('escapes every XML-significant character', () => {
    expect(escapeXml(`a&b<c>d"e'f`)).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
});

describe('scormIdentifier', () => {
  it('produces a safe identifier from a uuid', () => {
    expect(scormIdentifier('RES', options.courseId)).toBe(
      'RES_11111111_2222_3333_4444_555555555555',
    );
  });

  it('falls back when nothing usable remains', () => {
    expect(scormIdentifier('ORG', '---')).toBe('ORG_course');
  });
});

describe('buildManifest', () => {
  const xml = buildManifest(options);

  it('declares SCORM 1.2 with a single sco resource', () => {
    expect(xml).toContain('<schemaversion>1.2</schemaversion>');
    expect(xml).toContain('adlcp:scormtype="sco"');
    expect(xml).toContain('href="index.html"');
    expect(xml.match(/<resource /g)).toHaveLength(1);
  });

  it('escapes the course title rather than emitting raw markup', () => {
    expect(xml).toContain('Safe &amp; Sound &lt;Care&gt;');
    expect(xml).not.toContain('<Care>');
  });
});

describe('buildLauncherHtml', () => {
  const html = buildLauncherHtml(options);

  it('bakes the launch key and posts it as a header, not a query string', () => {
    expect(html).toContain(options.launchKey);
    expect(html).toContain("'x-launch-key': CFG.launchKey");
    expect(html).toContain('resource=launch');
  });

  it('mirrors the bridge status mapping', () => {
    expect(html).toContain("'cmi.core.lesson_status', 'incomplete'");
    expect(html).toContain("msg.passed ? 'passed' : 'failed'");
  });

  it('only accepts messages from the academy bridge', () => {
    expect(html).toContain("data.source !== 'special-people-academy'");
  });
});

describe('buildReadme', () => {
  it('states the launch-key trade-off in plain words', () => {
    const text = buildReadme(options);
    expect(text).toContain('KEEP THIS PACKAGE PRIVATE');
    expect(text).toContain('revoke the key');
    expect(text).toContain(options.organisationName);
  });
});
