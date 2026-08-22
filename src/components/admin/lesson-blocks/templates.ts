/**
 * Lesson starter templates.
 *
 * Picking a template seeds ordinary, fully editable blocks whose payloads carry
 * PLACEHOLDER GUIDANCE for the author to overwrite. The template choice itself
 * is never stored — once seeded, the blocks are just blocks.
 */
import {
  defaultContributesToCompletion,
  type BlockDraft,
  type BlockPayload,
  type BlockType,
} from '@/components/course-learn/blocks/types';

export type LessonTemplateId = 'blank' | 'knowledge' | 'practical' | 'assessment';

export interface LessonTemplate {
  id: LessonTemplateId;
  name: string;
  description: string;
  /** Plain-English outline shown on the card. */
  outline: string;
  build: () => BlockDraft[];
}

const uid = () => crypto.randomUUID();

function block(block_type: BlockType, payload: BlockPayload): BlockDraft {
  return {
    id: null,
    block_type,
    payload,
    contributes_to_completion: defaultContributesToCompletion(block_type),
  };
}

const introText = (heading: string, text: string) => block('text', { heading, text });

const safetyCallout = () =>
  block('callout', {
    variant: 'safety',
    title: 'Safety non-negotiables',
    text:
      'List the things a learner must never do, and the point at which they stop and escalate.\nOne short line per point, starting with a dash.',
  });

const knowledgeCheck = (question: string) => {
  const correct = uid();
  return block('mcq', {
    question,
    options: [
      { id: correct, label: 'The correct answer — replace this' },
      { id: uid(), label: 'A believable but wrong answer' },
      { id: uid(), label: 'Another believable but wrong answer' },
    ],
    correct_id: correct,
    explanation: 'Explain in one or two sentences why the correct answer is correct.',
  });
};

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start with nothing and add blocks yourself.',
    outline: 'No blocks — build it your way.',
    build: () => [],
  },
  {
    id: 'knowledge',
    name: 'Knowledge lesson',
    description: 'Teach a topic, then check understanding.',
    outline: 'Text → Video → Safety callout → Card deck → Knowledge check',
    build: () => [
      introText(
        'What this lesson covers',
        'Explain in 2–3 sentences why this matters on shift.\n\nBy the end of this lesson you will be able to:\n- Replace with the first thing they will be able to do\n- Replace with the second\n- Replace with the third'
      ),
      block('video', {
        source: 'storage',
        path: '',
        url: '',
        title: 'Add the teaching video',
        caption: 'Upload an MP4/WebM/MOV, or paste a YouTube, Vimeo or direct link.',
      }),
      safetyCallout(),
      block('card_deck', {
        heading: 'Key terms',
        instruction: 'Tap each card to reveal the answer.',
        cards: [
          { id: uid(), front: 'Term or question', back: 'Plain-English explanation.' },
          { id: uid(), front: 'Second term', back: 'Plain-English explanation.' },
        ],
      }),
      knowledgeCheck('Write one question that checks the most important point in this lesson.'),
    ],
  },
  {
    id: 'practical',
    name: 'Practical skill lesson',
    description: 'Prepare learners for a hands-on assessment.',
    outline: 'Text → Demonstration video → Practical checklist → Safety callout → Knowledge check',
    build: () => [
      introText(
        'Why this matters',
        'Describe, in 2–3 sentences, the real situation on shift where this skill is used and what good practice looks like.'
      ),
      block('video', {
        source: 'storage',
        path: '',
        url: '',
        title: 'Demonstration',
        caption: 'Show the skill being performed correctly, start to finish.',
      }),
      block('checklist', {
        heading: 'Steps you will be assessed on',
        caption: 'Your assessor completes the real sign-off in person.',
        steps: [
          {
            id: uid(),
            step_title: 'First step',
            instruction: 'What the learner does, in plain language.',
            safety_note: 'Anything they must check before moving on.',
          },
          {
            id: uid(),
            step_title: 'Second step',
            instruction: 'What the learner does next.',
            safety_note: '',
          },
        ],
      }),
      safetyCallout(),
      knowledgeCheck('Write one question about the safest way to carry out this skill.'),
    ],
  },
  {
    id: 'assessment',
    name: 'Assessment practice',
    description: 'Revision and practice before the graded assessment.',
    outline: 'Text → Flip cards → Knowledge check → Matching activity',
    build: () => {
      const targetA = uid();
      const targetB = uid();
      return [
        introText(
          'What to revise',
          'Tell learners what the assessment covers and how to prepare.\n\nFocus on:\n- First area to revise\n- Second area to revise'
        ),
        block('flip_cards', {
          heading: 'Quick revision',
          instruction: 'Tap a card to flip it over.',
          cards: [
            { id: uid(), front: 'Prompt on the front', back: 'Answer on the back.' },
            { id: uid(), front: 'Second prompt', back: 'Answer on the back.' },
          ],
        }),
        knowledgeCheck('Write a practice question in the same style as the real assessment.'),
        block('drag_match', {
          prompt: 'Match each item to the right group.',
          targets: [
            { id: targetA, label: 'First group' },
            { id: targetB, label: 'Second group' },
          ],
          items: [
            { id: uid(), label: 'Item that belongs in the first group', target_id: targetA },
            { id: uid(), label: 'Item that belongs in the second group', target_id: targetB },
          ],
          shuffle: true,
          feedback: {
            correct: 'That’s right — well matched.',
            incorrect: 'Not quite. The ones that don’t match are back in the list — try again.',
          },
        }),
      ];
    },
  },
];
