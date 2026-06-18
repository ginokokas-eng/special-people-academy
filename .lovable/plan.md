# Import Enteral Feeding Quiz & Assessment Content

## Goal
Load the assessment content from the uploaded pack into the existing Enteral Feeding course. This is **additive and non-destructive** — no rebuild of the course, modules, lessons, SCORM player, or sign-off flow.

## What the pack actually contains
- **One final quiz**: 15 MCQs with options A–D, a correct option, and a rationale.
- **One practical checklist**: 15 trainer-assessed competency items (already broadly covered by the existing competency sign-off flow).
- No per-module question banks.

## Proposed work

### 1. Populate the Final Knowledge Assessment quiz (main change)
The course has a `Final Knowledge Assessment` quiz lesson with no `quizzes` row and no questions. Via a data migration:
- Create a `quizzes` row linked to that lesson: title "Final Knowledge Assessment", `passing_score = 80`, `attempts_allowed = 2` (matches the pack's certificate rules).
- Insert the 15 `quiz_questions`:
  - `question`, `options` (jsonb array of the 4 options), `correct_answer` (A→0, B→1, C→2, D→3), `explanation` = rationale, `order_index` 0–14.
- Idempotent: skip if a quiz with questions already exists for that lesson, so re-running is safe.

This makes the existing quiz player (`QuizContainer`/`QuizPlayer`) and certificate completion check (`check-course-completion`) work end-to-end, since they already look for passing quiz attempts.

### 2. Empty "Module N Knowledge Check" lessons (decision needed)
The pack has no per-module questions. Options:
- **(A) Leave them as-is** (recommended — additive, no guesswork, no invented clinical content).
- **(B) Hide/remove the empty module quiz lessons** so learners don't hit blank quizzes.
- **(C) I author module-level questions** by splitting the 15 final-quiz items across modules (introduces content not in the pack).

I recommend **(A)** unless you say otherwise.

### 3. Practical sign-off checklist (decision needed)
The existing `competency_signoffs` table + trainer `CompetencySignoffDialog` already implement a 7-area boolean checklist with a Competent / Not Yet Competent outcome. The pack's 15-item list is more granular. Options:
- **(A) No change** — current sign-off already satisfies the competency-certificate rule (recommended for a no-rebuild pass).
- **(B) Expand the checklist to the pack's 15 items** — this needs new boolean columns/migration + dialog UI changes (larger, touches the trainer flow).

I recommend **(A)** for this task; (B) can be a follow-up if you want full parity.

## Technical notes
- A single Supabase data migration inserts the quiz + 15 questions (no schema changes for option A on both decisions).
- Correct-option letter → integer index conversion handled in the migration.
- No changes to SCORM, Stripe, Outlook, certificates, course builder, or routing.

## Verification
- Query the new `quizzes`/`quiz_questions` rows to confirm 15 questions, correct indices, 80% pass, 2 attempts.
- Load the Final Knowledge Assessment in the learner player and confirm it renders, scores, and a pass records a `quiz_attempts` row.

## Open questions
1. For the empty module knowledge checks — leave as-is (A), hide them (B), or author module questions (C)?
2. For the practical checklist — keep the current 7-area sign-off (A), or expand to the 15-item version (B)?
