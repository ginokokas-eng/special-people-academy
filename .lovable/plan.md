# Block-based lesson editor — recommended architecture

Design consultation. No code changes in this plan.

## Recommendations at a glance

| Question | Recommendation |
| --- | --- |
| 1. Storage | `lesson_blocks` table (not a JSONB column on `lessons`) |
| 2. lesson_type | New `lesson_type = 'blocks'`; leave `text`/`scenario`/`pdf`/`resource` rendering as-is |
| 3. Completion | Yes — switch to `is_required` with an exact-parity backfill; one real risk to handle (see below) |
| 4. Authoring UX | Dedicated full-page editor route per lesson, launched from the lesson row in CourseModulesTab |
| 5. Drag-and-drop | dnd-kit, bucket/target answer key, tap-to-select + keyboard path built in from day one (not retrofitted) |
| 6. Media | Storage upload from the editor into a new private `lesson-media` bucket, served through a signed-URL edge function like `download-resource` |
| 7. Responses | New `lesson_block_responses` table; leave `quiz_attempts` for graded quiz lessons only |

---

## 1. Block storage — `lesson_blocks` table

```sql
create table public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  order_index integer not null,
  block_type text not null,          -- 'text' | 'callout' | 'card_deck' | 'image' | 'video' | 'accordion' | 'mcq' | 'drag_match' | 'flip_cards' | 'checklist'
  payload jsonb not null default '{}'::jsonb,
  is_graded boolean not null default false,
  contributes_to_completion boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lesson_blocks_lesson_order_idx on public.lesson_blocks(lesson_id, order_index);

grant select on public.lesson_blocks to authenticated;
grant all on public.lesson_blocks to service_role;
alter table public.lesson_blocks enable row level security;
-- read: enrolled learners (public.is_enrolled) or admins/trainers (public.is_ops_training_admin)
-- write: is_ops_training_admin only
```

Reasoning:

- **Per-block progress and graded responses need stable block IDs.** A JSONB array gives you positional identity only; any reorder or insert silently re-keys every stored learner response. This is decisive — you explicitly want per-block completion signals and drag-and-drop attempt records.
- **RLS granularity.** Row-level policies on `lesson_blocks` let you gate content by enrolment via the existing `is_enrolled()` security-definer function. With JSONB on `lessons` the whole block body inherits the current `lessons` read policy, and `lessons` is read on the public course-detail page.
- **Concurrent edits.** Two authors in a JSONB column = last-write-wins over the entire lesson. Row-per-block limits collisions to the same block.
- **Query cost is a non-issue.** `CourseLearn.tsx` already runs a handful of sequential fetches per course (lessons, quiz question counts, resources, progress). One extra indexed query, `select … from lesson_blocks where lesson_id in (…) order by lesson_id, order_index`, batched for the whole course, adds one round trip. Keep the payload of each block small (media by reference, not inline base64).
- **Reordering:** integer `order_index` rewritten as a batch upsert on save, matching how `modules`/`lessons` already do it.

Follow the same `update_updated_at_column()` trigger convention as the rest of the schema.

## 2. lesson_type integration — add `'blocks'`

Add `'blocks'` to `LESSON_TYPE_VALUES` and to the `CourseLearn.tsx` render switch. Do **not** repurpose `text`/`scenario`.

Reasoning: `text`/`scenario`/`pdf` currently fall through to a single `description` paragraph, and several places branch on the type string — completion gating in the edge function, `lessonMeta.tsx` labels, the mobile mark-complete button visibility (`MobileCoursePlayer.tsx:313-320`), and the "has content" gating in `CourseLearn.tsx:134-140`. Overloading `text` means every one of those call sites has to ask "does this text lesson have blocks or not?", and legacy text lessons would change behaviour with no author action. A distinct type keeps video/scorm/quiz/practical untouched, keeps SCORM upload and the SCORM player completely out of scope, and gives authors a clear choice in the builder. Existing text lessons can be migrated later by an author-initiated "convert to blocks" action that seeds one Text block from `description`.

Also in this phase: fix `normalizeLessonType()` (`CourseModulesTab.tsx:83`, used at `:137`). It coerces any unknown type to `'video'`, so editing a `resource` lesson silently rewrites it — and once `'blocks'` exists, the same bug would destroy block lessons on any dialog save. Fix: add `'resource'` and `'blocks'` to the allowed list, and make the fallback preserve the stored value rather than defaulting to `video` (fall back to `'text'` only when the value is null/empty).

## 3. Completion gating — switch to `is_required`, with one caveat

The proposal is sound. Backfill:

```sql
update public.lessons
set is_required = (lesson_type in ('scorm','video'));
alter table public.lessons alter column is_required set default false;
```

Then `check-course-completion` selects `id, lesson_type, is_required` and filters on `is_required = true` instead of the hardcoded type list. Everything else in that function (graded-quiz rules, practical sign-off, certificate insert) stays as it is.

Parity check and risks:

- **`lessons.is_required` is currently NOT NULL with a default of true** in the schema. Any lesson created before the backfill may already carry `true` for text/scenario/resource rows — that is precisely why the backfill must be an unconditional `set`, not a `where is_required is null`. After the backfill the required set is byte-for-byte the current type list, so no existing enrollment gains or loses a certificate at cutover.
- **The real retroactive risk is afterwards, not at cutover:** the moment an author marks an existing lesson required (or adds a required block lesson to a live course), every already-certified learner on that course is fine (certificates are never revoked — `certificates` denies UPDATE/DELETE), but learners mid-course see their progress requirement grow. Recommend a warning in the builder when toggling `is_required` on a course that has active enrollments, and treating "add required lesson to a published course" as a deliberate act.
- **Client-side progress bars do not use this rule.** `CourseLearn.tsx`, `MobileCoursePlayer.tsx`, `MyCourses.tsx`, `Dashboard.tsx`, and `MyLearning.tsx` compute percentages from *all* lessons. Today that already disagrees with the edge function; once `is_required` is the source of truth, align these to count required lessons only, or learners will hit 100% without a certificate (or vice versa). Worth folding into P1.
- **Per-block roll-up:** a block lesson is complete when every block with `contributes_to_completion = true` has a satisfying signal. Compute that client-side from `lesson_block_responses`, then write the existing single row via the current `lesson_progress` upsert (`onConflict: 'lesson_id,user_id'`) and call `check-course-completion` — exactly the path `markComplete` already uses. No change to `lesson_progress` shape, so nothing downstream breaks.

## 4. Authoring UX — dedicated editor page

Add a route such as `/admin/courses/:courseId/lessons/:lessonId/content`, reached from a "Edit content" button on each lesson row in `CourseModulesTab.tsx`. Keep the existing dialog for lesson metadata (title, type, duration, required).

Reasoning: side-by-side live preview needs real width, and the preview must mount the actual learner components — that is hard to do credibly inside a modal that is already nested in a tabbed editor. A route also gives non-technical staff an unambiguous mental model ("this screen is the lesson"), survives refreshes, and is linkable for review. Layout: left column = ordered block list with add/duplicate/reorder/delete; right column = `<LessonBlocks />`, the same component the learner page renders, in a `preview` mode that disables progress writes. Reusing the renderer is what makes preview = reality; do not build a second preview renderer.

Proposed files:

```text
src/pages/admin/LessonContentEditor.tsx        route shell, load/save, dirty state
src/components/admin/lesson-blocks/
  BlockList.tsx                                ordered list, dnd-kit reorder
  BlockPalette.tsx                             "add block" picker
  forms/TextBlockForm.tsx  CalloutBlockForm.tsx  CardDeckBlockForm.tsx  ImageBlockForm.tsx …
src/components/course-learn/blocks/
  LessonBlocks.tsx                             renders ordered blocks, owns progress signals
  TextBlock.tsx  CalloutBlock.tsx  CardDeckBlock.tsx  ImageBlock.tsx …
  types.ts                                     payload types per block_type (discriminated union)
  useBlockProgress.ts                          per-block signal state + lesson roll-up
```

## 5. Drag-and-drop block

Payload / answer key:

```json
{
  "prompt": "Match each step to when it happens",
  "targets": [{ "id": "t1", "label": "Before feeding" }, { "id": "t2", "label": "After feeding" }],
  "items":   [{ "id": "i1", "label": "Check tube position", "target_id": "t1" }],
  "shuffle": true,
  "feedback": { "correct": "…", "incorrect": "…" }
}
```

Grading is a pure client-side comparison of `item.target_id`; the attempt (item→target map, correct count, attempt number) is persisted to `lesson_block_responses`. These are formative checks inside a lesson, not exam questions, so client grading is acceptable — do not use this block for anything that gates a certificate on its own score.

Library: **dnd-kit**, and use it for the author-side block reordering too so there is one drag dependency. Its keyboard sensor gives you an operable keyboard path for free.

Accessibility / touch path (build with the block, not after): every item is a button. Tap/Enter selects it ("Check tube position selected"), then tap/Enter on a target places it; tapping a placed item returns it to the pool. `aria-live` announcements on select/place/remove. On `MobileCoursePlayer` prefer this tap mode as the default interaction — long-press-then-drag inside a vertically scrolling page is the single most common failure mode here.

## 6. Image / Video blocks — upload, private bucket, signed URLs

Upload from the editor. URL paste stays available as a secondary option (and is how `CourseVideoTab` works today), but non-technical staff should not have to host files themselves.

- New **private** bucket `lesson-media`, paths `{course_id}/{lesson_id}/{uuid}.{ext}`.
- RLS on `storage.objects`: insert/update/delete for `is_ops_training_admin()`; no direct learner select.
- Learner reads go through a signed-URL edge function modelled on `download-resource` (verify claims → check `is_enrolled` → `createSignedUrl`), which is exactly how `course-resources` and `scorm` are already served. This keeps content enrolment-gated and consistent; a public bucket would leak paid course media.
- Video block uses the existing `VideoPlayer.tsx` (already has the mobile control set and skeleton/fade wrapper) with a signed source. Signed URLs expire — refresh on `error`/expiry rather than caching for a whole session.
- SCORM upload/serving is untouched.

## 7. Learner responses — new table

```sql
create table public.lesson_block_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_id uuid not null references public.lesson_blocks(id) on delete cascade,
  state text not null default 'in_progress',  -- 'in_progress' | 'complete'
  is_correct boolean,
  attempt_count integer not null default 0,
  response jsonb,                             -- selected option / item→target map / viewed card ids
  updated_at timestamptz not null default now(),
  unique (user_id, block_id)
);
grant select, insert, update on public.lesson_block_responses to authenticated;
grant all on public.lesson_block_responses to service_role;
alter table public.lesson_block_responses enable row level security;
-- learners read/write their own rows; admins/trainers read all
```

Reasoning: `quiz_attempts` is shaped for whole-quiz submissions (`quiz_id`, `score`, `passed`, answers blob), is referenced by the attempt-limit trigger and the pass/fail escalation logic, and is FK'd to `quizzes.lesson_id`. Forcing per-block checks through it would require a synthetic quiz row per block and would pollute attempt limits and escalation. Keep `quiz_attempts` for graded quiz lessons; use `lesson_block_responses` for in-lesson formative signals, including drag-and-drop attempts and "cards viewed" state.

## Phasing — agreed, with two additions

- **P1** `is_required` switch + backfill + `normalizeLessonType` fix + `lesson_blocks` schema + Text/Callout/Card deck/Image + editor page + learner renderer. **Add:** align the client-side progress percentages to required lessons only (see §3), and add `'blocks'` and `'resource'` to the builder's type list so `resource` lessons become editable at all.
- **P2** Video block + `lesson-media` bucket + signed-URL function; Accordion.
- **P3** MCQ check, Drag-and-drop, Flip cards, Practical checklist + `lesson_block_responses` + roll-up completion.
- **P4** Templates + publish validation.

`lesson_block_responses` lands in P3 because P1's Text/Callout/Card deck signals can be satisfied by the existing `lesson_progress` row (marked read). If you want per-card "all cards viewed" persistence in P1, pull the table forward.

## Existing code paths you may have missed

- `MobileCoursePlayer.tsx` receives the rendered body as a `lessonBody` prop from `CourseLearn.tsx`. So the block renderer plugs in **once**, inside `renderLessonBody` in `CourseLearn.tsx`, and mobile inherits it. Only the mobile mark-complete button condition (`:313-320`) and `lessonTypeLabel` need a `'blocks'` case.
- `src/components/course-learn/lessonMeta.tsx` owns the learner-facing type labels and per-type meta ("Video · 1 min", "5 questions"). Needs a `'blocks'` label and a duration/estimate rule — likely authored duration, since blocks have no intrinsic length.
- `src/components/course-detail/CourseContent.tsx` renders the public curriculum with its own type labels and duration maths; a new type shows up here too.
- `src/components/course-learn/types.ts` `LearnLesson` needs the block payload (or a `has_blocks` flag) added.
- `lessons.content` / `footer_note` / `pdf_filename` / `resource_page_count` exist for `resource` lessons and the PDF download in `useResourceDownload.ts`. Decide whether block lessons get a PDF export (learners currently expect it for reading lessons) — if yes, that is real work and should be its own phase item, not implied by P1.
- `supabase/functions/lms-api` exposes `lesson_count` to Ariadne and `progress` joins `lesson_progress`. Block lessons will count toward `lesson_count`; the progress payload shape is unchanged because roll-up still writes one `lesson_progress` row.
- `src/pages/admin/CoursePreview.tsx` is a separate admin preview surface and will need the new renderer too, or it will show an empty body for block lessons.
