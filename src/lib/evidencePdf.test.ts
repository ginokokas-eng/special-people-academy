import { describe, expect, it } from 'vitest';
import { buildEvidenceModel, type RawEvidencePack } from './evidencePack';
import { renderEvidencePdf } from './evidencePdf';

const raw: RawEvidencePack = {
  generated_at: '2026-09-08T10:15:00+00:00',
  filters: { course_id: null, standard_id: null },
  learner: {
    user_id: 'u1',
    name: 'Jane Smith',
    email: 'jane@example.com',
    organisation: { id: 'o1', name: 'Special People' },
  },
  courses: [
    {
      course_id: 'c1',
      title: 'Enteral feeding',
      category: 'Clinical',
      level: 'Level 3',
      delivery_type: 'blended',
      cpd_hours: 6,
      enrolled_at: '2026-02-01T09:00:00+00:00',
      completed_at: '2026-03-02T16:30:00+00:00',
      lessons_total: 10,
      lessons_completed: 10,
      certificate: {
        certificate_number: 'SPA-0001',
        certificate_type: 'completion',
        issued_at: '2026-03-03T09:00:00+00:00',
        expires_at: '2027-03-03T09:00:00+00:00',
        verification_code: 'ABC123',
      },
      standards: [
        { framework: 'CSTF', code: '1.2', title: 'Nutrition', lesson_titles: ['Tube types'] },
      ],
    },
  ],
  reflections: [
    {
      course_title: 'Enteral feeding',
      lesson_title: 'Escalation',
      block_id: 'b1',
      prompt: 'Describe when you would stop and escalate.',
      criteria_labels: ['Recognises red flags'],
      learner_answer:
        'I would stop the feed, sit the person upright, check for signs of distress and call the nurse straight away, then record what I saw. '.repeat(
          6,
        ),
      answered_at: '2026-02-10T10:00:00+00:00',
      mark: {
        outcome: 'met',
        assessor_name: 'Peter Ops',
        signed_at: '2026-02-12T11:00:00+00:00',
        criteria: { 'Recognises red flags': true, 'Records accurately': false },
        comment: 'Clear answer.',
      },
    },
  ],
  checklists: [
    {
      course_title: 'Enteral feeding',
      lesson_title: 'Pump set-up',
      block_id: 'b3',
      heading: 'Pump set-up steps',
      steps: ['Wash hands', 'Prime the line'],
      outcome: 'met',
      assessor_name: 'Peter Ops',
      signed_at: '2026-02-12T12:00:00+00:00',
      criteria: { 'Wash hands': true, 'Prime the line': false },
      comment: null,
    },
  ],
  quiz_results: [
    {
      course_title: 'Enteral feeding',
      quiz_title: 'Final assessment',
      passing_score: 80,
      attempts: 2,
      best_score: 90,
      best_passed: true,
      latest_score: 90,
      latest_passed: true,
      latest_at: '2026-03-02T15:00:00+00:00',
    },
  ],
  practical: [
    {
      course_title: 'Enteral feeding',
      session_date: '2026-02-20',
      location: 'Leeds training room',
      attended: true,
      competency_outcome: 'competent',
      marked_at: '2026-02-20T16:00:00+00:00',
      marked_by_name: 'Sam Trainer',
      notes: 'Confident throughout.',
    },
  ],
  signoffs: [
    {
      kind: 'competency',
      course_title: 'Enteral feeding',
      outcome: 'competent',
      assessed_at: '2026-02-20T16:30:00+00:00',
      assessor_name: 'Sam Trainer',
      assessor_notes: 'Met all domains.',
      action_plan: null,
      reassessment_date: '2027-02-20',
      attempt_number: 1,
      location: 'Leeds training room',
      domains: [
        { name: 'Tube identification', result: true, comments: null },
        { name: 'Troubleshooting', result: false, comments: 'Revisit blockages.' },
      ],
    },
  ],
  standards_summary: [
    { framework: 'CSTF', code: '1.2', title: 'Nutrition', courses: ['Enteral feeding'], evidence_count: 3 },
  ],
};

function head(buffer: ArrayBuffer, length: number): string {
  return String.fromCharCode(...new Uint8Array(buffer).slice(0, length));
}

describe('renderEvidencePdf', () => {
  it('renders a real PDF for a full learner', async () => {
    const doc = await renderEvidencePdf(buildEvidenceModel(raw), { generatedBy: 'ops@example.com' });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(head(doc.output('arraybuffer'), 5)).toBe('%PDF-');
  });

  it('renders an empty learner without throwing', async () => {
    const doc = await renderEvidencePdf(buildEvidenceModel({}), { generatedBy: 'ops@example.com' });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(head(doc.output('arraybuffer'), 5)).toBe('%PDF-');
  });
});
