import { describe, expect, it } from 'vitest';
import {
  buildEvidenceModel,
  evidenceFileName,
  formatEvidenceDate,
  signatureLine,
  summariseEvidence,
  verificationLine,
  type RawEvidencePack,
} from './evidencePack';

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
      course_id: 'c2',
      title: 'Medication support',
      category: 'Clinical',
      level: 'Level 3',
      delivery_type: 'blended',
      cpd_hours: 4,
      enrolled_at: '2026-01-05T09:00:00+00:00',
      completed_at: null,
      lessons_total: 8,
      lessons_completed: 3,
      certificate: null,
      standards: [],
    },
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
        {
          framework: 'CSTF',
          code: '1.2',
          title: 'Nutrition and hydration',
          lesson_titles: ['Tube types', 'Flushing'],
        },
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
      learner_answer: 'I would stop the feed and call the nurse.',
      answered_at: '2026-02-10T10:00:00+00:00',
      mark: {
        outcome: 'met',
        assessor_name: 'Peter Ops',
        signed_at: '2026-02-12T11:00:00+00:00',
        criteria: { 'Recognises red flags': true },
        comment: 'Clear answer.',
      },
    },
    {
      course_title: 'Medication support',
      lesson_title: 'Refusal',
      block_id: 'b2',
      prompt: 'What do you record?',
      criteria_labels: null,
      learner_answer: 'Record on the MAR chart.',
      answered_at: '2026-03-01T10:00:00+00:00',
      mark: null,
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
      criteria: { 'Wash hands': true },
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
    {
      course_title: 'Medication support',
      quiz_title: 'Knowledge check',
      passing_score: 80,
      attempts: 0,
      best_score: null,
      best_passed: null,
      latest_score: null,
      latest_passed: null,
      latest_at: null,
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
        { name: 'Documentation standard', result: null, comments: null },
      ],
    },
  ],
  standards_summary: [
    { framework: 'CSTF', code: '1.2', title: 'Nutrition and hydration', courses: ['Enteral feeding'], evidence_count: 3 },
  ],
};

describe('formatEvidenceDate', () => {
  it('formats UK long dates', () => {
    expect(formatEvidenceDate('2026-09-08T10:15:00+00:00')).toBe('8 September 2026');
    expect(formatEvidenceDate('2026-02-20')).toBe('20 February 2026');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(formatEvidenceDate(null)).toBe('');
    expect(formatEvidenceDate(undefined)).toBe('');
    expect(formatEvidenceDate('not a date')).toBe('');
  });
});

describe('signature and verification lines', () => {
  it('names the assessor and the date', () => {
    expect(signatureLine('Peter Ops', '2026-02-12T11:00:00+00:00')).toBe(
      'Signed electronically by Peter Ops, 12 February 2026',
    );
  });

  it('drops the date when there is none, and the line when there is no name', () => {
    expect(signatureLine('Peter Ops', null)).toBe('Signed electronically by Peter Ops');
    expect(signatureLine(null, '2026-02-12T11:00:00+00:00')).toBe('');
  });

  it('builds a verify URL only from a code', () => {
    expect(verificationLine('ABC123')).toBe(
      'Verify at www.specialpeopleacademy.com/verify/ABC123',
    );
    expect(verificationLine(null)).toBe('');
  });
});

describe('buildEvidenceModel', () => {
  const model = buildEvidenceModel(raw);

  it('carries the header, learner and organisation', () => {
    expect(model.generatedLabel).toBe('8 September 2026');
    expect(model.learner).toMatchObject({
      name: 'Jane Smith',
      email: 'jane@example.com',
      organisationName: 'Special People',
      organisationId: 'o1',
    });
    expect(model.filters).toEqual({ courseId: null, standardId: null });
  });

  it('sorts courses by title and describes progress and certificates', () => {
    expect(model.courses.map((c) => c.title)).toEqual(['Enteral feeding', 'Medication support']);
    const [feeding, medication] = model.courses;
    expect(feeding.progressLabel).toBe('10 of 10 lessons completed');
    expect(feeding.completedLabel).toBe('2 March 2026');
    expect(feeding.certificate?.issuedLabel).toBe('3 March 2026');
    expect(feeding.certificate?.expiresLabel).toBe('3 March 2027');
    expect(feeding.certificate?.verificationLine).toContain('/verify/ABC123');
    expect(feeding.standards[0].lessonTitles).toEqual(['Tube types', 'Flushing']);
    expect(medication.certificate).toBeNull();
    expect(medication.progressLabel).toBe('3 of 8 lessons completed');
  });

  it('orders reflections newest first and signs the marked one', () => {
    expect(model.reflections.map((r) => r.blockId)).toEqual(['b2', 'b1']);
    const marked = model.reflections.find((r) => r.blockId === 'b1');
    expect(marked?.mark?.signatureLine).toBe(
      'Signed electronically by Peter Ops, 12 February 2026',
    );
    expect(marked?.criteriaLabels).toEqual(['Recognises red flags']);
    expect(model.reflections.find((r) => r.blockId === 'b2')?.mark).toBeNull();
    expect(model.reflections.find((r) => r.blockId === 'b2')?.criteriaLabels).toEqual([]);
  });

  it('keeps checklist steps, criteria and the signature', () => {
    const [checklist] = model.checklists;
    expect(checklist.steps).toEqual(['Wash hands', 'Prime the line']);
    expect(checklist.criteria).toEqual({ 'Wash hands': true });
    expect(checklist.signatureLine).toBe('Signed electronically by Peter Ops, 12 February 2026');
    expect(checklist.comment).toBe('');
  });

  it('labels quiz outcomes honestly', () => {
    expect(model.quizResults.map((q) => q.resultLabel)).toEqual([
      'Passed — best score 90%',
      'Not attempted',
    ]);
    expect(model.quizResults[1].bestPassed).toBe(false);
    expect(model.quizResults[1].attempts).toBe(0);
  });

  it('carries practical attendance with a trainer signature', () => {
    const [practical] = model.practical;
    expect(practical.sessionLabel).toBe('20 February 2026');
    expect(practical.attended).toBe(true);
    expect(practical.signatureLine).toBe('Signed electronically by Sam Trainer, 20 February 2026');
  });

  it('labels sign-off domains including the unassessed ones', () => {
    const [signoff] = model.signoffs;
    expect(signoff.kindLabel).toBe('Enteral feeding competency');
    expect(signoff.domains.map((d) => d.resultLabel)).toEqual(['Met', 'Not yet met', 'Not assessed']);
    expect(signoff.reassessmentLabel).toBe('20 February 2027');
    expect(signoff.actionPlan).toBe('');
  });

  it('carries the standards summary', () => {
    expect(model.standardsSummary).toEqual([
      {
        framework: 'CSTF',
        code: '1.2',
        title: 'Nutrition and hydration',
        courses: ['Enteral feeding'],
        evidenceCount: 3,
      },
    ]);
  });

  it('never returns null arrays for an empty learner', () => {
    const empty = buildEvidenceModel({ generated_at: '2026-09-08T00:00:00+00:00' });
    expect(empty.courses).toEqual([]);
    expect(empty.reflections).toEqual([]);
    expect(empty.checklists).toEqual([]);
    expect(empty.quizResults).toEqual([]);
    expect(empty.practical).toEqual([]);
    expect(empty.signoffs).toEqual([]);
    expect(empty.standardsSummary).toEqual([]);
    expect(empty.learner.name).toBe('');
    expect(buildEvidenceModel(null).generatedLabel).toBe('');
  });
});

describe('evidenceFileName', () => {
  it('slugs the learner name and dates the file', () => {
    expect(evidenceFileName(buildEvidenceModel(raw))).toBe(
      'evidence-pack-jane-smith-2026-09-08.pdf',
    );
  });

  it('falls back to the email, then to "learner"', () => {
    const emailOnly = buildEvidenceModel({
      generated_at: '2026-09-08T00:00:00+00:00',
      learner: { user_id: 'u1', name: null, email: 'joe.bloggs@example.com', organisation: null },
    });
    expect(evidenceFileName(emailOnly)).toBe(
      'evidence-pack-joe-bloggs-example-com-2026-09-08.pdf',
    );
    const nameless = buildEvidenceModel({
      generated_at: '2026-09-08T00:00:00+00:00',
      learner: { user_id: 'u1', name: null, email: null, organisation: null },
    });
    expect(evidenceFileName(nameless)).toBe('evidence-pack-learner-2026-09-08.pdf');
  });
});

describe('summariseEvidence', () => {
  it('counts each section', () => {
    expect(summariseEvidence(buildEvidenceModel(raw))).toEqual({
      courses: 2,
      reflections: 2,
      reflectionsMarked: 1,
      checklists: 1,
      quizResults: 2,
      practical: 1,
      signoffs: 1,
      standards: 1,
      certificates: 1,
      isEmpty: false,
    });
  });

  it('flags a learner with nothing to show', () => {
    expect(summariseEvidence(buildEvidenceModel({})).isEmpty).toBe(true);
  });
});
