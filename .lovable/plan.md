# Phase 5 — "The interactive feel": architecture recommendation

Three features, in the build order I recommend at the end. No rebuild; all additive.

---

## Feature A — In-video checkpoint questions

### A1. Payload — agreed, with two additions

Extend `VideoPayload` in `src/components/course-learn/blocks/types.ts`:

```ts
export interface VideoCheckpoint {
  id: string;
  at_s: number;            // cue time in seconds
  question: string;
  options: { id: string; label: string }[];
  correct_id: string;
  explanation?: string;
}

// VideoPayload gains:
checkpoints?: VideoCheckpoint[];   // optional -> every existing block stays valid
lock_seek?: boolean;               // author switch, default true
```

`checkpoints` optional is important: existing rows in `lesson_blocks` are untouched and
`defaultPayload('video')` keeps working. Sort by `at_s` at render time, not on save.

Authoring UI lives in the existing Video block form (`forms/BlockForms.tsx`) as a
"Checkpoint questions" section under the transcript panel: add/remove checkpoint, a
`mm:ss` timestamp field, question, 2-4 options with a correct radio, explanation.
"Use current player time" is cheap **only in the editor's learner preview**, where a
`MediaController` already exists — I'd wire it there and omit it from the form's own
(non-playing) card rather than instantiate a second player.

Author validation (blocks save, same style as other forms): `at_s` > 0 and < duration
if known, unique-ish times (warn within 1s), >= 2 options, one correct, no blank labels.

### A2. Recording — one row per block. Agree, no schema change.

`lesson_block_responses` has `unique(user_id, block_id)`; `response` is jsonb. Store:

```json
{ "kind": "video_checkpoints",
  "checkpoints": { "<cp_id>": { "selected_id": "...", "is_correct": true, "attempts": 2 } } }
```

- `is_correct` on the row = every answered checkpoint correct on first attempt? No —
  keep it simple and consistent with MCQ: `is_correct = all checkpoints eventually correct`.
- `attempt_count` on the row = total attempts across checkpoints (the hook already
  increments per `record()` call, which matches "one attempt = one submit").
- `state = 'complete'` once every authored checkpoint has a correct answer.

A separate table is not worth it: trainer reporting today reads nothing per-checkpoint,
and a jsonb key set is queryable if that changes. `persistsResponse('video')` becomes
true **only when the payload has checkpoints** — so I'll make that a payload-aware
helper rather than a type-only switch.

### A3. Seek lock — implementable, but the controller needs widening

`MediaController` currently exposes `seekTo / getCurrentTime / isAvailable` only, and
the overlay must render *inside* `containerRef` in `VideoPlayer.tsx` to survive
fullscreen. So:

1. Extend `MediaController` with `pause()`, `play()`, `getDuration()`.
2. Add two optional props to `VideoPlayer`: `overlay?: React.ReactNode` (rendered as the
   top-most child of `containerRef`, above the controls layer, below nothing) and
   `seekCeiling?: number | null`. When `seekCeiling` is set, VideoPlayer clamps: the
   scrub slider `max` stays real but any commit above the ceiling snaps back, and it
   guards `onSeeking` on the `<video>` element itself (keyboard/gesture seeks and
   the mobile skip buttons all funnel through it).
3. `BlockVideo` owns checkpoint state, computes `seekCeiling` = earliest unanswered
   `at_s` (or `null` when complete/preview), watches `onTimeUpdate` and pauses + shows
   the overlay when `current >= at_s` for the earliest unanswered cue.

Notes/risks:
- VideoPlayer already remounts on quality change and restores `currentTime`; the
  overlay state lives in `BlockVideo` (the parent), so it survives that remount.
- `MobileCoursePlayer` renders the same `VideoPlayer`, so it inherits the overlay for
  free — but its skip/±10s buttons must respect the ceiling (same guard, item 2).
- Fullscreen: overlay inside `containerRef` = correct and required. Tap targets sized
  for mobile; overlay is scrollable when the question is long in landscape.
- Embed sources (YouTube/Vimeo iframes) cannot pause or report time. Checkpoints are
  **hidden and disabled for `source: 'url'` embeds**, with an author-side notice in the
  form. This is the honest limit; do not fake it.

### A4 / A5 — confirmed as described

- Checkpoints always record (when not `preview`). When `contributes_to_completion` is
  ON for the video block, `onWatched` only fires true on *ended AND all checkpoints
  answered*; `LessonBlocks`' pending reason for video becomes "watch the video and
  answer its questions" when the payload has checkpoints.
- Wrong answer = feedback + explanation + retry, `attempts` incremented, playback stays
  paused until correct. Nothing touches `quizzes` / `quiz_attempts`.
- `preview` records nothing, exactly like MCQ/matching.

### Files (A)

- `blocks/types.ts` — payload types, validation helper, payload-aware `persistsResponse`.
- `course-learn/types.ts` — widen `MediaController`.
- `VideoPlayer.tsx` — `overlay` + `seekCeiling` props, seek guard, controller widening.
- `blocks/BlockVideo.tsx` — checkpoint engine + persistence via `useBlockResponse`.
- `blocks/VideoCheckpointOverlay.tsx` — new presentational overlay.
- `blocks/LessonBlocks.tsx` — pending-reason wording.
- `admin/lesson-blocks/forms/BlockForms.tsx` — authoring section.
- `admin/course-builder/publishChecks.ts` — optional check: checkpoints on an embed
  source, or a cue past the end, blocks publish.

---

## Feature B — Scroll-reveal for blocks lessons

Single shared wrapper so desktop, mobile and editor preview are identical:
`src/components/course-learn/blocks/RevealOnScroll.tsx` — one `IntersectionObserver`
per wrapper, `once: true`, `opacity`/`translateY(8px)` only, stagger via
`transitionDelay` derived from the block index (capped ~240ms). Applied in
`LessonBlocks.tsx` around each block's existing `<div key={block.id}>`.

Reduced motion: read `prefers-reduced-motion` once; when set, render children with no
wrapper classes at all (not "animate faster") — nothing observed, nothing delayed.

Blocks that would misbehave inside an animated wrapper, and the mitigations:

- **Video block**: `transform` on an ancestor creates a containing block for
  `position: fixed`, which is how fullscreen-adjacent overlays and portals behave.
  Mitigation: reveal video blocks with **opacity only, no transform**, and clear the
  inline transition/transform on completion (`onTransitionEnd`) so no stale
  `will-change`/transform remains once revealed. This matters much more now that
  Feature A puts an interactive overlay inside the player.
- **Matching activity (dnd-kit)**: drag maths uses element rects; a mid-animation drag
  would offset the drag preview. Same mitigation — opacity only for `drag_match`, and
  the animation is done long before a learner can drag.
- **Accordion/flip cards**: safe (they animate their own height/transform inside).
- **Completion signals**: unaffected — signals come from block callbacks, not visibility.
  I will *not* couple reveal to any read/complete tracking.

Zero layout shift: no `height`, `margin` or `display` animation; blocks occupy final
space from first paint (start state is `opacity: 0`, not `hidden`).

---

## Feature C — Elective module hub

**Recommendation: a state of `CourseLearn`, not a new route.** `CourseLearn` already
holds modules, lessons, progress and the `?lesson=` param in one place; a separate
route would duplicate that whole fetch. Concretely:

- `?lesson=` absent → render the hub. `?lesson=<id>` present → render the player.
  This means removing the current auto-redirect that fills in the first lesson when
  `activeLessonId` is empty (`CourseLearn.tsx` ~line 163) — that is the only behavioural
  change to existing navigation, and deep links keep working untouched.
- New `src/components/course-learn/CourseHome.tsx`: module cards (title, description,
  lesson count, required-progress ring via `requiredProgress` from `src/lib/progress.ts`
  scoped to that module's lessons), plus a header `Continue` button.
- `Continue` target: last incomplete lesson in course order = first lesson without a
  completed `lesson_progress` row (we already have the completed-id set); fall back to
  the first lesson, or to the certificate tab when everything is done.
- Clicking a module card → `setSearchParams({ lesson: firstIncompleteInModule })`.
- Uncategorised lessons (`module_id = null`) get a "Course essentials" pseudo-card so
  nothing is unreachable.
- A "Back to modules" affordance in the player (clears `?lesson=`), so the hub is a real
  place rather than a one-time screen. The existing sidebar is untouched.
- **Mobile**: `MobileCoursePlayer` gets the same rule — no `?lesson=` renders
  `MobileMyCourses`-styled module cards (reuse `CourseHome` at full width; its card grid
  is already 1-col on small screens) and the existing "Lectures" tab keeps working
  once inside a lesson. No sequencing enforced anywhere.

---

## Risks you didn't list

1. **Embed videos can't do checkpoints** (above) — the biggest scope surprise.
2. **Existing published lessons**: `checkpoints` must stay optional so nothing
   re-validates or re-gates a lesson a learner already completed. Learners who already
   completed a lesson keep `completed = true`; checkpoints must not retro-lock them —
   gate the overlay on `!completed`? No: keep the overlay (it is the content) but never
   *reduce* an existing completion.
3. **Seek lock vs "watched the video already"**: a returning learner with a saved
   complete response must get free scrubbing — hence the response load must resolve
   before the ceiling is applied (show the player, apply lock only after `loaded`).
4. **Duration audit / lessonMeta**: video-block checkpoints don't change duration
   metadata; I'll leave the audit tool alone.
5. **Reveal + fullscreen/transform** interaction (above) — mitigated by opacity-only
   reveal for video and matching blocks.
6. **Hub as default view** changes the first thing every learner sees on every course;
   worth confirming that's intended for *all* courses, not just Enteral Feeding.

## Build order

1. **A** (priority): controller/player props → overlay + engine → persistence → authoring
   → publish check. Largest and highest risk; do it while the player is fresh context.
2. **C**: independent of A, moderate surface, unlocks the "course feels like a product"
   impression.
3. **B**: last. It touches the renderer everyone else edits, and doing it after A means
   the reveal wrapper is written with the video overlay already in place.

Typecheck after each feature; no migrations in any of the three.
