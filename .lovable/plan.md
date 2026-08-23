# Phase 6 — Adapt parity

Four authoring/presentation patterns, plus two riders. Nothing here changes SCORM, quizzes, transcripts, or the completion model. One additive migration only.

## 1. Half-width layouts

Agreed: `layout?: 'full' | 'half'` inside the payload, no migration. Absent = full, so every existing block is untouched.

Recommended answers to your open questions:

- **Allowed on**: text, callout, image, flip_cards, mcq, plus the two new blocks (carousel, hot_graphic) — a hot graphic paired with explanatory text is the classic Adapt pairing. **Full-only**: video (checkpoint overlay and fullscreen need width), drag_match (drop-target hit areas), card_deck (it already has its own internal 2-col grid), checklist, accordion. The width toggle simply does not appear for full-only types, which is clearer than a disabled control.
- **Orphan half** (a half whose neighbour is full, or the last block): renders full width. Silent, predictable, never a broken-looking half-empty row. The editor shows the same outcome so authors are never surprised.
- **Grouping algorithm** (renderer, single pass over the ordered blocks):
  ```text
  i = 0
  while i < blocks.length:
    a = blocks[i]
    if halfAllowed(a) and a.layout == 'half'
       and blocks[i+1] exists and halfAllowed(b) and b.layout == 'half':
         emit pair-row(a, b); i += 2
    else:
         emit full-row(a);    i += 1
  ```
  A pair renders as `grid grid-cols-1 md:grid-cols-2 gap-6 items-start`; mobile stacks by construction. Rows are computed with `useMemo` on the block list.
- **Reveal interaction**: `RevealOnScroll` moves to wrap the **row**, not the block, so a pair fades in together instead of racing. Stagger index becomes the row index.
- **Completion**: unchanged. Signals stay keyed by block id; layout is presentation only.
- **Editor**: keep the current single-column block list (re-ordering stays simple). Each half-eligible block gets a small segmented control "Full width / Half width", and when a block forms a valid pair the two rows show a linked left-edge accent plus one label: "Side by side with the block below/above". An unpaired half shows "Will show full width until another half-width block sits next to it." No drag-into-columns UI — that is where non-technical authors get lost.

## 2. Narrative carousel block (`carousel`)

Payload: `{ heading?, instruction?, items: [{ id, image?: MediaRef, title, text }] }`, where `MediaRef` is the shared shape from the image section below.

- Renderer: one item visible; prev/next buttons; dot indicators that are real buttons ("Go to item 3 of 5"); swipe on touch via pointer events (threshold ~40px, ignore vertical-dominant gestures so page scroll still works).
- Completion switch defaults ON (same as card deck). Done-signal = every item viewed (item 1 counts as viewed on mount). `n/m viewed` badge, matching the existing deck/accordion badge style.
- Keyboard: the viewport is a `role="group"` with left/right arrow handling when focused; slide text lives in an `aria-live="polite"` region announcing "Item 3 of 5: <title>".
- Prefers-reduced-motion: cross-fade replaced with an instant swap.
- Not persisted (formative-view only, like card deck). `persistsResponse` stays false.

## 3. Hot graphic block (`hot_graphic`)

Payload: `{ heading?, instruction?, image: MediaRef, alt: string, hotspots: [{ id, x: number, y: number, title, text }] }` with `x`/`y` as 0–100 percentages of the rendered image box.

- Editor: image first, then click-to-place pins on a positioned wrapper (`(e.clientX - rect.left) / rect.width * 100`, clamped 2–98 so pins never clip). Pins are draggable with pointer events; each has a numbered chip and an inline title/text form beneath the image. Keyboard fallback in the form: numeric X/Y % inputs, so a pin can always be placed without a mouse.
- Learner: pins are `<button>` elements rendered in payload order (author order = DOM order = reading order), absolutely positioned with `left: x%; top: y%` and `translate(-50%,-50%)`. Tap opens a shadcn `Popover` (focus-managed by Radix, Esc closes, focus returns to the pin). Explored pins switch to a "found" token style (filled + check). `n/m explored` badge; completion default ON, done = all opened.
- **List view fallback** is not optional and not screen-reader-only: a visible "View as list" toggle renders the same hotspots as an accordion, and opening an item marks it explored identically. This is the reduced-dexterity and small-screen path (below `md` it defaults to list view, with the image still shown above as a plain figure — tiny pins on a phone are a usability trap).
- Image `alt` is required for publish (see checks).

## 4. Image handling — uploads with the video privacy model

Reuse `lesson-media` + `lesson-media-url`. The edge function's path validation is `{course_uuid}/{lesson_uuid}/{uuid}.{ext}` and extension-agnostic, so images sign with no server change. You widen `storage.buckets.allowed_mime_types` yourself; the plan assumes that is done.

Shared media reference, replacing URL-only strings in the new blocks:

```ts
export interface MediaRef {
  source: 'storage' | 'url';
  path?: string;   // lesson-media object path
  url?: string;    // pasted external URL (secondary, kept)
  file_name?: string;
}
```

- `useSignedMediaUrl(ref)` hook: returns `{ url, loading, error, refresh }`. For `source: 'url'` it returns the URL synchronously. For storage it invokes `lesson-media-url`, caches per path in a **module-level Map with an expiry timestamp** (TTL 60 min server-side; treat as stale at 50 min) so ten hotspot images in one lesson do not fire ten identical invocations and a re-render never re-signs. On `<img onError>` it invalidates that cache entry once and re-signs — the same "re-mint on failure" behaviour BlockVideo already uses.
- **Signed-URL `<img>` sanity check**: a signed URL is a stable string for its TTL, so the browser caches the response normally and React re-renders reuse it — churn only appears if the URL is re-signed on every render, which the cache prevents. Keys must be the object path (never the signed URL) or React remounts the `<img>` and re-downloads. Long lessons open for over an hour will hit expiry mid-session; the `onError` re-sign covers it.
- Upload UI: extract the existing video uploader's file-picker/progress into a shared `MediaUploadField` used by video, image, carousel items, and hot graphic. Limits for images: 10 MB, `image/png|jpeg|webp`. URL-paste stays as a secondary "or paste a link" affordance.
- Existing `image` block: `ImagePayload` gains optional `MediaRef` fields while `url` keeps working, so no data migration and no risk to published lessons.

## 5. Trickle mode

`lessons.trickle_enabled boolean not null default false` — one additive migration, and the right home: it is a per-lesson authoring choice, exactly like `is_required`. (A payload key would be wrong — it is not a property of any one block.)

Mechanics, presentation only:

- A **gating block** = `contributes_to_completion && isInteractive(type)` — the exact same set that already drives the Mark-as-complete roll-up. Trickle introduces no new state; it reads the existing `deckState` signal map.
- Rows (post-pairing) are cut into stretches at each gating row. Stretch *k* is visible when every gating row before it is satisfied. Content in the first unsatisfied stretch's tail is veiled.
- Veil = the rows are still mounted but wrapped in a container with `aria-hidden="true"`, `inert`-style pointer-events off, low opacity and a short blur, capped in height, with a clear affordance card: "Complete the activity above to continue." Mounted-but-hidden keeps block state and avoids layout jumps; `aria-hidden` keeps screen readers out of unavailable content.
- Reveal animation reuses the reduced-motion rules already in `RevealOnScroll`; with reduced motion the veil simply disappears without transition. RevealOnScroll and trickle do not conflict because trickle gates whole rows and reveal animates rows as they enter view — a row that is unveiled then scrolled to animates once.
- Editor preview: veils render so the author sees the pacing, with a persistent "Preview: trickle shown, not enforced" banner and a "Reveal all" toggle. Preview writes nothing, unchanged.
- `MobileCoursePlayer` uses the same `LessonBlocks` renderer, so trickle applies with no mobile-specific work beyond checking the veil affordance's tap size.
- Learners who already completed the lesson see everything unveiled (same treatment as `lessonCompleted` in the video seek-lock).

## 6. Riders

- **`delivery_type` humanising**: single helper `formatDeliveryType()` (title-case with an explicit map: `online_self_paced` → "Online (self-paced)", `blended` → "Blended", `in-person`/`in_person` → "In person", `virtual_classroom` → "Live virtual classroom"), used by every surface that prints the raw value — course cards, course list, course detail hero/sidebar, admin tables. Values in the database are not rewritten.
- **Publish checks** (added to `evaluatePublishChecks`, same shape as existing rows): carousel blocks have ≥1 item and every item has a title or text; hot graphic blocks have an image and ≥1 hotspot, each hotspot has a title, and the image has alt text. Both point at "Modules & Lessons → Edit content".

## Risks you did not list

1. **Half-width + hot graphic**: pins are percentage-positioned, so a narrow column shrinks the image and pins crowd together. Enforce a minimum rendered image width and auto-fall back to list view under it.
2. **Carousel inside a half column**: images at half width plus `object-contain` produce very short slides. Fix the slide media box with an aspect ratio so slides do not jump height as the learner clicks through.
3. **Trickle + a gating video with `lock_seek`**: two gates stack, and a learner who cannot finish the video sees nothing below. Keep the veil affordance explicit about *which* activity is blocking (name it), or the lesson looks broken.
4. **Trickle hiding the Mark-as-complete button** is fine, but the disabled-reason text must stay visible above the veil, otherwise the learner has no instruction at all.
5. **Signed image URLs in a printed/exported view** (certificates, PDFs) expire; do not reuse `MediaRef` anywhere that persists a rendered URL.
6. **Pointer-event conflicts**: carousel swipe inside a page that also drag-scrolls, and pin dragging inside `RevealOnScroll`'s transform. Reveal must stay opacity-only for hot graphic and carousel, exactly as it already is for video and drag_match.
7. **Orphan-half churn while authoring**: an author toggling widths sees layout reflow on every click. The editor's pairing hint must update instantly so the reflow reads as intentional.

## Build order

1. **Foundation** — `MediaRef`, `useSignedMediaUrl`, shared `MediaUploadField`; retrofit the existing image block to accept uploads. Everything else depends on this.
2. **Half-width layouts** — payload key, row-grouping in the renderer, editor toggle + pairing hint. Do this before the new blocks so they are born layout-aware.
3. **Hot graphic** — the heaviest block (placement editor, popovers, list-view fallback).
4. **Carousel** — smaller, reuses the media field and the badge/completion pattern.
5. **Trickle mode** — the one migration, veil mechanics, editor preview banner, mobile check.
6. **Riders** — delivery-type helper, publish checks for the two new blocks.

## Technical notes

- New block types `carousel` and `hot_graphic` are added to `BLOCK_TYPES`, `BLOCK_LABELS`, `BLOCK_DESCRIPTIONS`, `defaultPayload`, `isInteractive`, and `defaultContributesToCompletion` (both ON). `persistsResponse` stays false for both, so `lesson_block_responses` is untouched.
- `lesson_blocks.block_type` accepts these only if a CHECK constraint restricts it — verify before build; if one exists, the same migration as `trickle_enabled` widens it (the earlier `lessons_lesson_type_check` incident is the precedent).
- Completion roll-up in `LessonBlocks` gains two new `reasons` strings ("view every slide", "explore every hotspot"); no change to the roll-up logic itself.
- Typecheck before finishing; P1–P5, transcripts, SCORM, and quizzes stay untouched.
