# Wave 2, Parts 5–8 — recommendations

Answers below are grounded in reads of this repo (LessonContentEditor.tsx, CopilotPanel.tsx, author-lesson-blocks/index.ts, generate-certificate/index.ts, CoursePreview.tsx, playwright.config.ts, the e2e cleanup migration).

## Part 5 — Insights → copilot rewrite loop

**Q5.1 — use a dedicated `rewrite_question` mode.** `improve_block` today takes `{ mode, lesson_id, input: { block_type, payload, instruction } }` and the reply lands as *drafts* in CopilotPanel (`toDraftItems`), which are then **appended** via `onAccept` → `addBlocks`. It has no output constraints beyond the strict flat block schema, so nothing stops the model rewriting the correct answer. Add `rewrite_question` to `MODES` with input `{ block_type, payload, stats: { attempts, pct_correct, option_tallies, top_distractor } }` and a server-side validator that rejects the reply unless: same option count, the correct option's text is byte-identical, `correct_index`/correct flag unchanged, and only distractor text, per-option feedback and explanation differ (stem allowed to change but flagged in the diff shown to staff). Reason: the guarantee has to be enforced where the JSON is parsed, not in a prompt.

**Q5.2 — URL contract `?block=<id>&copilot=rewrite`.** LessonContentEditor has no focus-by-id today: blocks live in one `blocks` state array rendered as a flat list of forms, no per-block `ref` and no expand/collapse index. Part 5 must add a `focusBlockId` (from `useSearchParams`) that scrolls the matching form into view and highlights it — small but real work in `BlockList.tsx`/editor. Build the instruction text **client-side in LessonInsightsView** from the already-loaded stat row (percentages and option tallies only, never learner ids) and hand it over via router state or a compact query param; the edge function then only ever receives aggregates.

**Q5.3 — replace-in-place needs a new callback.** Current accept flow is append-only (`onAccept(accepted[])` → `addBlocks`). Add `onReplace(blockClientId, { block_type, payload })` used when the panel was opened in rewrite mode for a specific block, keeping the same `client_id` (and therefore the same row id on save) so `lesson_block_item_stats` and `block_comments` stay attached. Material-change default: `materialChangeDefault` already diffs saved vs current blocks, so a payload swap will flip it to true on its own — but pre-set it explicitly and pre-fill the save note ("Rewritten from Insights — 62% wrong, top distractor 'X'").

**Q5.4 — block MCQs only in Part 5.** Insights is built entirely on `lesson_block_item_stats` / `get_org_lesson_block_stats` / `get_lesson_block_learner_detail`; assessment questions live in `quiz_questions` with per-attempt `question_snapshot`, which has no item-analysis aggregate yet. A quiz rewrite path needs its own stats function first — keep it out of Part 5 and make it a later build.

**Q5.5 — agree, global stats.** Org-scoped numbers are for the org's own reporting; content edits are global, and small org cohorts would be statistically meaningless.

## Part 6 — Learner evidence pack

**Q6.1 — plainly: there is no PDF today.** `generate-certificate` builds an SVG string, uploads it to `certificates/{user_id}/{certificate.id}.svg` with `contentType: 'image/svg+xml'`, and stores that path in `pdf_path`. The column name is the only "PDF" in the system.

**Q6.2 — render client-side with pdf-lib.** Reasons specific here: edge deploys have been hard to verify from this environment; the evidence pack is staff/learner-initiated with a session already in the browser; pdf-lib's standard Helvetica covers UK English; and there are no signature images to embed (see Q6.3). Because the certificate is SVG, do **not** try to embed it — print the certificate number, issue/expiry dates and the `/verify/<code>` line as text instead (an SVG→PDF rasteriser in the browser is a trap).

**Q6.3 — the RPC list is close; corrections:** `block_marks` holds `assessor_name`, `signed_at`, `criteria` json — typed name and timestamp only, **no drawn signature**, so print "Signed electronically by <name>, <date>". Reflections need the learner answer from `lesson_block_responses.response` joined to the mark by block id; keep the lesson/module titles so the pack reads as a story. Standards come from `standard_links` + `standards`; `get_learner_standard_evidence` already exists — call it inside the RPC rather than re-deriving. Add: course delivery type and CPD hours, practical attendance (`practical_attendance` + `practical_sessions`) which your list omits, and the four sign-off tables (`competency_signoffs`, `bls_`, `medication_`, `respiratory_`) which have ~29–31 columns each — select an explicit named subset, never `*`. Fences as you describe, via `is_platform_staff()` / `is_org_admin_of_member()` / `auth.uid() = _user`.

**Q6.4 — entry points.** Admin `Learners.tsx` and the org portal learner detail are straightforward row actions. Learner self-service should go on the course/certificate surface the learner already uses (`CertificateTab`) as well as My Courses, since `/my-learning` now redirects. Course and standard filters map to the RPC's two optional args.

**Q6.5 — testing.** `buildEvidenceModel(sections)` as a pure vitest unit is right. Playwright trap: the config has no `acceptDownloads`/artifact dir set explicitly and `workers: 1` with a shared course — use `page.waitForEvent('download')`, save via `download.path()`, and assert the first five bytes are `%PDF-`; a blob-URL anchor click still fires the download event, but only if the anchor has a `download` attribute.

## Part 7 — Course cloning

**Q7.1 — one SECURITY DEFINER RPC is right. Missing/adjust:** add `course_offerings` and `course_trainers` (a clone with no price tier or trainer looks broken), `lesson_steps`, `quizzes` settings (pass mark, attempt limit), and `refresher_schedules` config if it is course-level rather than learner-level (verify at build time). Reset `lesson_translations.status` to `'draft'` — a reviewed translation of text that may now be edited is a false claim, and learner SELECT is reviewed-only so drafts are safely invisible. Everything in your "not copied" list is correct. Add `cloned_from_course_id uuid references courses(id) on delete set null`.

**Q7.2 — media: recommend (a) copy the objects, done by an edge function called after the RPC.** Option (b) weakens `lesson-media-url`'s single clean rule (authorise on the course id in the path) and makes access depend on a recursive clone chain — that is the kind of thing that turns into a leak. SQL cannot copy storage objects, so the flow is: RPC returns the new ids plus an old→new path map, an edge function copies each object with the service role and updates the block payloads. Same treatment for `scorm_packages`. `thumbnail_url` is a simple copy — point the clone at the same image (read-only, no per-course authorisation), and only duplicate it if staff later change one.

**Q7.3 — UI.** Reuse the `BlockTransferDialog.tsx` pattern (staff dialog + select + confirm) and the existing CourseBuilder row action menu; the banner can be the same Alert style used in the editor's publish warnings.

**Q7.4 — yes, log a `clone` action** in `content_history` on the new course via `set_content_change_context`. Hundreds of blocks in one RPC is fine (it is set-based `INSERT … SELECT` inside one transaction); the media copy is the part that needs batching, which is another argument for keeping it in the edge function.

**Q7.5 — naming rule.** `e2e_delete_course` hard-refuses any title not matching `'E2E %'`. So make the dialog default `Copy of <title>` **except** when the source title starts with `E2E `, in which case default to `E2E Copy of <title>`. The spec should also set the title explicitly rather than trusting the default.

## Part 8 — Preview as learner

**Q8.1 — A now, B later (or never).** The editor already renders the real `LessonBlocks` with `preview`, and `useBlockResponse(blockId, lessonId, enabled)` short-circuits reads and writes when disabled, so design A previews *unsaved* blocks with zero persistence risk today. B buys tab/transcript/mobile-player fidelity at the cost of threading a preview flag through every write in CourseLearn — and it can only ever show saved content, which is the wrong thing while authoring. `CoursePreview.tsx` today is a read-only staff summary page (course fields, modules, accordion of lessons) that never renders blocks; it is the natural host for a *course-level* B-style walkthrough later, but Part 8 belongs in the editor's right-hand pane.

**Q8.2 — `data-motion="reduce"` on the preview root** plus an `index.css` rule zeroing `animation`/`transition` and disabling `@keyframes` beneath it. Still-animating offenders to fix by hand: `RevealOnScroll` (JS-driven class toggle — must read the attribute, not just CSS), `BlockCarousel` autoplay/scroll-behaviour, the flip-card transform, the trickle veil, and the video player's own control fades. Also note the CSS rule needs `!important` to beat Tailwind's arbitrary animation utilities.

**Q8.3 — translations.** Staff RLS reads all `lesson_translations` rows including drafts, so no policy change; `mergeTranslation` is content-agnostic and needs no flag — the preview simply fetches with `status in ('draft','reviewed')` while the learner path keeps its reviewed-only query. Label draft languages clearly in the picker.

**Q8.4** — with A, nothing. For the record, if B is ever built the flag must short-circuit: `lesson_progress` upserts, `lesson_block_responses` writes, `block_marks`, `start_quiz_attempt`/`submit_quiz_attempt`, the `enrollments` insert/prompt, `learner_notes`, and the `profiles.preferred_lang` update from the language picker.

**Q8.5 — one real trap:** `playwright.config.ts` sets `reducedMotion: 'reduce'` globally, so the OS-level preference is *always* reduced in tests and toggling the control proves nothing visually. Assert the `data-motion` attribute and the phone-frame width instead. The unchanged-count assertion is sound — take REST counts as the staff user before and after; with design A no request is even issued, which is the stronger assertion.

## Build order

1. **Part 7 (cloning)** — touches migrations, CourseBuilder/CourseEditor and a new edge function; no overlap with anything else. **Split into two builds:** 7a the RPC + dialog + navigation, 7b the media/SCORM copy function.
2. **Part 8 (preview)** — LessonContentEditor right pane, index.css, RevealOnScroll/BlockCarousel; conflicts only with Part 5's left-pane focus work, so it is safer to land Part 8's preview pane before Part 5 rewires the editor's block list.
3. **Part 5 (rewrite loop)** — CopilotPanel, LessonContentEditor, LessonInsightsView, author-lesson-blocks. This is the only part that touches Part 3's edge function (`author-lesson-blocks`, where `chapterise` just landed) — adding one mode is additive, so keep it last among the editor builds.
4. **Part 6 (evidence pack)** — one RPC, one pure model module, one renderer, three entry points; no file overlap with 5/7/8, so it can run in parallel with any of them. **Split into two builds:** 6a the RPC + `buildEvidenceModel` + vitest, 6b the PDF renderer + entry points + Playwright.
