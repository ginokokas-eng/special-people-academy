# Browser end-to-end suite (Playwright)

Click-tests the real app: staff author a lesson containing every block type,
publish the course, a learner plays it and takes the graded quiz, staff mark the
reflection and read Lesson Insights, then the run's data is deleted.

Runs against a dev server and the **live Supabase project** — it creates and then
deletes real rows, so only run it with the two dedicated accounts below.

## One-time setup (operator)

1. Create two long-lived accounts:
   - `e2e-staff@…`
   - `e2e-learner@…`

   **Email confirmation is ON for this project**, so `global.setup.ts` cannot
   create usable accounts on its own — sign each one up once and confirm its
   email (click the link in the inbox) before the first run. `global.setup.ts`
   fails loudly with this instruction if a password sign-in returns no session.

2. Grant the staff account its roles once, with SQL. Course/module/lesson writes
   are gated on the **`admin`** role, the admin routes on `ops_training_admin`,
   and the marking queue on `trainer` — all three are needed:

   ```sql
   insert into public.user_roles (user_id, role)
   select u.id, r
   from auth.users u,
        unnest(array['admin','ops_training_admin','trainer']::app_role[]) as r
   where u.email = 'e2e-staff@example.com'
   on conflict (user_id, role) do nothing;
   ```

3. Copy the env template and fill it in:

   ```bash
   cp .env.e2e.example .env.e2e
   ```

## Running

The dev server usually already occupies 8080, so run the suite against its own
port and point the suite at it:

```bash
npm run dev -- --port 8089 --strictPort      # terminal 1
E2E_BASE_URL=http://localhost:8089 npm run test:e2e   # terminal 2
```

With no `E2E_BASE_URL`, the config boots `npm run dev` on 8080 itself.

```bash
npm run test:e2e            # whole suite (boots npm run dev unless E2E_BASE_URL is set)
npm run test:e2e:setup      # just sign in and refresh tests/e2e/.auth/*.json
npm run test:e2e:ui         # interactive
E2E_VIDEO=1 npm run test:e2e -- 08-video-checkpoints
```

Individual actions (clicks, fills) time out after **15 s**
(`use.actionTimeout`), tests after 90 s, expectations after 15 s.


Specs run in file order with one worker because they share one authored course:

| Spec | What it proves |
| --- | --- |
| `00-smoke-auth` | both sessions land on the right pages (fails fast on missing roles) |
| `01-author-all-blocks` | staff author all 14 block types, a quiz, and publish; learner enrolled |
| `02-learner-plays-lesson` | every interactive block can be satisfied and the lesson completed |
| `03-quiz-session` | start → check → submit → result through the session RPCs |
| `04-reflection-marking` | the reflection reaches the marking queue and can be marked |
| `05-insights` | Lesson Insights shows the learner's answers |
| `06-question-bank-roundtrip` | MCQ → bank → picker → back into the lesson |
| `08-video-checkpoints` | optional: uploaded video + checkpoint gate (`E2E_VIDEO=1`) |
| `09-transcript-chapters` | staff rename/add transcript sections; learner reads one section and searches |
| `10-clone-course` | Duplicate makes a draft copy; counts and remapped rules match, and its files are copied into the copy's own folder |
| `11-preview-as-learner` | staff preview a lesson in a phone frame: 390px wide, reduced-motion attribute, draft Romanian overlay, and no learner writes |
| `12-insights-rewrite` | the weak-question prompt in Insights deep-links into the editor, highlights the block and opens the rewrite tab (`E2E_AI=1` also runs the AI draft) |
| `99-teardown` | deletes the run's uploaded files, its course (and any clone) via `e2e_delete_course`, and any question-bank rows it created |


## Teardown

`e2e_delete_course(_course_id uuid)` is `SECURITY DEFINER` and refuses anything
that is not (a) called by an ops training admin and (b) a course whose title
starts with `E2E `. It returns per-table delete counts. If a run dies mid-way,
call it for each leftover course:

```sql
select c.title, public.e2e_delete_course(c.id)
from public.courses c
where c.title like 'E2E %';
```


## Fixtures

`fixtures/clip.mp4` (3s H.264/AAC) and `fixtures/hotgraphic.png` (640×400) are
committed. Regenerate with:

```bash
ffmpeg -f lavfi -i testsrc=size=640x360:rate=30:duration=3 -f lavfi \
  -i sine=frequency=440:duration=3 -c:v libx264 -pix_fmt yuv420p -c:a aac \
  tests/e2e/fixtures/clip.mp4
```

## Selector convention

Stable roles and labels first (`getByRole('button', { name: 'Create Course' })`).
`data-testid` only where labels are dynamic or repeated:

- authoring: `block-palette-<type>`, `block-form-<type>-<field>-block-<index>[-<i>]`
  (every block form is mounted at once, hence the `block-<index>` suffix),
  `save-content-open`, `save-content`, `publish-course`, `bank-save-question`,
  `block-palette-from-bank`, `bank-picker-insert-<id>`
- learner: `hub-lesson-<id>`, `hub-lesson-status-<id>`, `learner-block-<index>-<type>`,
  `mcq-option-<i>`, `dragmatch-token-<i>` / `dragmatch-target-<i>` / `check-answer`,
  `flipcard-<i>`, `accordion-item-<i>`, `carddeck-card-<i>`, `carousel-prev` /
  `carousel-next`, `hotspot-<i>`, `scenario-choice-<i>`, `reflection-text` /
  `reflection-submit` / `reflection-mark`, `learner-video`, `video-checkpoint`,
  `checkpoint-option-<i>`, `mark-complete`
- transcript: `transcript-chapters-suggest` / `transcript-chapters-add` /
  `transcript-chapters-save` / `transcript-chapter-row-<i>` (staff);
  `transcript-chapters`, `transcript-chapter-<i>`, `transcript-chapter-read-<i>`,
  `transcript-chapters-show-all`, `transcript-search-summary`,
  `transcript-seek-status` (learner)
- cloning: `course-duplicate-<id>`, `clone-title`, `clone-translations`,
  `clone-confirm`, `clone-media-progress`, `clone-banner`, `clone-media-retry`
- quiz: `quiz-start`, `quiz-check`, `quiz-submit`, `quiz-result`
- staff review: `marking-row-<blockId>-<userId>`, `marking-open`,
  `marking-outcome-met`, `marking-save`, `insights-lesson-select`,
  `insights-block-card-<blockType>`, `insights-learner-row`, `bank-row-<id>`,
  `bank-usage-count-<id>`

## Known flakiness and how the specs wait

- **Radix Select** never settles instantly in headless: `chooseOption()` clicks the
  trigger, picks `role=option`, then waits for the listbox to disappear.
- **Scroll reveal / card flips / trickle veils**: the config sets
  `reducedMotion: 'reduce'`, which skips reveal animation; trickle rows still
  need the previous block satisfied, so specs work top to bottom.
- **Toasts** are asserted with `.first()` and a generous timeout; they are never
  used as the only proof of a write where a durable UI change exists.
- **Uploads** (`08`) are opt-in because storage latency dominates.
