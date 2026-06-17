## Goal

Make the HeyGen → SCORM workflow self-explanatory inside the admin Course Builder, so admins clearly understand the two steps:

1. **Upload** a HeyGen SCORM 1.2 ZIP in the **SCORM** tab.
2. **Attach** that uploaded package to a **SCORM lesson** in the **Modules & Lessons** tab.

No backend changes. The existing `scorm_packages` schema, `upload-scorm` / `serve-scorm` edge functions, storage buckets, and SCORM player stay exactly as they are. This is purely UI/copy/affordance work in two components.

## Changes

### 1. `src/components/admin/ScormPackageManager.tsx` (Step 1 clarity)
- Rewrite the existing help alert into an explicit **numbered two-step** workflow so it reads as a sequence, with the second step clearly pointing the admin to the **Modules & Lessons** tab:
  - Step 1 — In HeyGen: export the video as SCORM (ZIP) → choose **SCORM 1.2** → set completion threshold (e.g. 80% watched).
  - Step 2 — Upload the ZIP here, then go to **Modules & Lessons** and attach it to a SCORM lesson.
- In the upload dialog, add a short helper line clarifying that only true SCORM 1.2 ZIPs are accepted (not raw MP4 exports) and that the launch file is detected automatically.
- On each uploaded package row, surface a subtle hint that it's now selectable as a SCORM lesson in Modules & Lessons (keep the existing "Ready" badge).

### 2. `src/components/admin/course-builder/CourseModulesTab.tsx` (Step 2 clarity)
- When the lesson **Type** is set to **SCORM Package**, improve the existing SCORM section in the lesson dialog:
  - Add a one-line explanation that this attaches a package already uploaded in the SCORM tab.
  - Keep the existing empty-state message ("No SCORM packages uploaded. Go to the SCORM tab to upload one first.") and make it visually clear (info styling).
  - When a package is selected, show a small confirmation hint (package attached); when none is selected on a SCORM lesson, show a gentle "no package attached yet" note.
- In the lesson list rows, for lessons of type `scorm`, show a small status indicator distinguishing **package attached** vs **no package attached yet**, so admins can spot unfinished SCORM lessons at a glance. (Uses the already-fetched `scorm_package_id`; no new query.)

## Out of scope / non-goals
- No database migration, no edge function edits, no changes to `scorm_packages` or storage buckets.
- No new MP4/video import path, no HeyGen API integration.
- No changes to the learner-facing SCORM player.

## Technical notes
- `CourseModulesTab` already loads `scormPackages` and reads `scorm_package_id`, so the attached/not-attached status and labels can be derived client-side with no extra fetching.
- All copy uses existing `Alert`, `Badge`, and muted-text patterns and semantic tokens already present in both files — no new dependencies.
