import { describe, expect, it } from 'vitest';
import {
  extractLintTexts,
  fleschKincaidGrade,
  lintBlock,
  lintLesson,
  LINT_CAPS_WHITELIST,
  type LintBlockInput,
  type LintCode,
} from './contentLint';
import type { BlockPayload } from '@/components/course-learn/blocks/types';

const block = (block_type: LintBlockInput['block_type'], payload: unknown): LintBlockInput => ({
  block_type,
  payload: payload as BlockPayload,
});

const codes = (input: LintBlockInput): LintCode[] => lintBlock(input, 0).map((i) => i.code);

describe('extractLintTexts', () => {
  it('returns only declared text paths, with array indexes', () => {
    const texts = extractLintTexts(
      block('carousel', {
        heading: 'Setting up',
        items: [
          { id: 'a', title: 'Wash hands', text: 'Use soap.', alt: 'A carer washing hands' },
        ],
      }),
    );
    expect(texts.map((t) => t.path)).toEqual([
      'heading',
      'items[0].title',
      'items[0].text',
      'items[0].alt',
    ]);
  });

  it('never lints ids, urls or storage paths', () => {
    const texts = extractLintTexts(
      block('hot_graphic', {
        heading: 'The pump',
        alt: 'A feeding pump on a stand',
        image: { source: 'storage', path: 'course-1/lesson-2/9f8e7d6c.png', file_name: 'pump.png' },
        hotspots: [{ id: 'e8b1f2c3-1111-2222-3333-444455556666', x: 10, y: 10, title: 'Clamp', text: 'Close it.' }],
      }),
    );
    const joined = texts.map((t) => t.text).join(' | ');
    expect(joined).not.toContain('course-1/lesson-2');
    expect(joined).not.toContain('pump.png');
    expect(joined).not.toContain('e8b1f2c3');
  });
});

describe('long-sentence', () => {
  it('flags a sentence over 25 words', () => {
    const long =
      'When you are getting ready to give a feed you should always take a moment to check the label on the bag and confirm the resident name matches the care plan exactly.';
    expect(codes(block('text', { text: long }))).toContain('long-sentence');
  });

  it('does not flag short sentences or two-word bullets', () => {
    expect(codes(block('text', { text: 'Check the label.\n- Wash hands\n- Dry hands' }))).not.toContain(
      'long-sentence',
    );
  });
});

describe('long-paragraph', () => {
  const sentence = 'Check the label before every feed and record it. ';
  it('flags a paragraph over 120 words', () => {
    const para = sentence.repeat(20);
    expect(codes(block('text', { text: para }))).toContain('long-paragraph');
  });
  it('leaves a normal paragraph alone', () => {
    expect(codes(block('text', { text: sentence.repeat(3) }))).not.toContain('long-paragraph');
  });
});

describe('missing-alt', () => {
  it('flags empty alt on an image', () => {
    expect(codes(block('image', { url: 'https://x/y.png', alt: '' }))).toContain('missing-alt');
  });
  it('flags alt that is just the file name', () => {
    expect(
      codes(
        block('image', {
          alt: 'pump.png',
          media: { source: 'storage', path: 'c/l/1.png', file_name: 'pump.png' },
        }),
      ),
    ).toContain('missing-alt');
  });
  it('flags a carousel slide image with no alt', () => {
    expect(
      codes(
        block('carousel', {
          items: [{ id: 'a', title: 'Slide', text: 'Body', media: { source: 'url', url: 'https://x/a.png' } }],
        }),
      ),
    ).toContain('missing-alt');
  });
  it('accepts a real description', () => {
    expect(
      codes(block('hot_graphic', { alt: 'A feeding pump on a drip stand', hotspots: [] })),
    ).not.toContain('missing-alt');
  });
});

describe('heading-order', () => {
  it('flags a level jump', () => {
    expect(codes(block('text', { text: '## Before the feed\n\n#### Clamp the line' }))).toContain(
      'heading-order',
    );
  });
  it('accepts one level at a time', () => {
    expect(codes(block('text', { text: '## Before the feed\n\n### Clamp the line' }))).not.toContain(
      'heading-order',
    );
  });
});

describe('vague-link', () => {
  it('flags "click here"', () => {
    expect(codes(block('text', { text: 'For the checklist [click here](https://x/y).' }))).toContain(
      'vague-link',
    );
  });
  it('accepts a named link', () => {
    expect(
      codes(block('text', { text: 'Read the [feeding pump checklist](https://x/y).' })),
    ).not.toContain('vague-link');
  });
});

describe('all-caps', () => {
  it('does not flag whitelisted house style', () => {
    expect(codes(block('callout', { title: 'STOP AND ESCALATE', text: 'DO NOT continue the feed.' }))).not.toContain(
      'all-caps',
    );
  });
  it('does not flag a SCENARIO: line', () => {
    expect(codes(block('text', { text: 'SCENARIO: A RESIDENT REFUSES THE FEED' }))).not.toContain(
      'all-caps',
    );
  });
  it('flags shouting', () => {
    expect(codes(block('text', { text: 'PLEASE READ THIS NOW' }))).toContain('all-caps');
  });
  it('exports the whitelist used by the panel copy', () => {
    expect(LINT_CAPS_WHITELIST).toContain('STOP AND ESCALATE');
    expect(LINT_CAPS_WHITELIST).toContain('IDDSI');
  });
});

describe('reading age (advisory)', () => {
  const plain =
    'Wash your hands. Check the label. Ask the person if they are ready. Give the feed slowly. Write it down.';
  const clinical =
    'Confirm nasogastric tube position by pH aspirate verification before commencing administration of the prescribed enteral nutrition regimen.';

  it('scores clinical vocabulary at a higher grade than plain wording', () => {
    expect(fleschKincaidGrade(clinical)).toBeGreaterThan(fleschKincaidGrade(plain));
  });

  it('reports reading age as info only, above 14', () => {
    const result = lintLesson([block('text', { text: clinical.repeat(3) })]);
    const issue = result.issues.find((i) => i.code === 'reading-age');
    expect(issue?.severity).toBe('info');
    expect(result.stats.readingAge).toBeGreaterThan(14);
  });

  it('says nothing for plain wording', () => {
    const result = lintLesson([block('text', { text: plain })]);
    expect(result.issues.some((i) => i.code === 'reading-age')).toBe(false);
  });
});

describe('duration-mismatch', () => {
  const body = 'Check the label before every feed and record what you gave. '.repeat(30); // ~300 words

  it('flags a lesson set far shorter than the wording', () => {
    const result = lintLesson([block('text', { text: body })], { durationSeconds: 30 });
    expect(result.issues.some((i) => i.code === 'duration-mismatch')).toBe(true);
  });

  it('flags a lesson set far longer than the wording', () => {
    const result = lintLesson([block('text', { text: body })], { durationMinutes: 30 });
    expect(result.issues.some((i) => i.code === 'duration-mismatch')).toBe(true);
  });

  it('stays quiet within 2x', () => {
    const result = lintLesson([block('text', { text: body })], { durationMinutes: 2 });
    expect(result.issues.some((i) => i.code === 'duration-mismatch')).toBe(false);
  });

  it('stays quiet when no duration is set', () => {
    const result = lintLesson([block('text', { text: body })]);
    expect(result.issues.some((i) => i.code === 'duration-mismatch')).toBe(false);
  });
});

describe('lintLesson stats', () => {
  it('reports words, sentences and the longest sentence', () => {
    const result = lintLesson([block('text', { text: 'One two three. Four five six seven.' })]);
    expect(result.stats.words).toBe(7);
    expect(result.stats.sentences).toBe(2);
    expect(result.stats.longestSentence).toBe(4);
  });
});
