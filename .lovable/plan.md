# Investigation findings — current authoring, player, AI and integration surface

No code changes are proposed here. This is the inventory you asked for, with open questions at the end.

## 1. Admin authoring UI

- `src/pages/admin/CourseEditor.tsx:187-230` — tabbed editor: Overview / Modules & Lessons / Resources / Video / Quiz Builder / SCORM / Publishing.
- `src/components/admin/course-builder/CourseModulesTab.tsx` — creates/edits modules and lessons.
  - `:59` `const LESSON_TYPE_VALUES = ['video','text','pdf','quiz','practical','scenario','scorm'] as const;`
  - Lesson insert/update payload (`:224-233`, `:261-270`) writes only `title, description, lesson_type, duration_minutes, duration_seconds, order_index, scorm_package_id`.
  - There is **no editor for `lessons.content`**, `footer_note`, `pdf_filename`, `is_required`, and `resource` / `certificate` are not offered as lesson types.
- `src/components/admin/course-builder/CourseVideoTab.tsx:72-88` — the only place `video_url` is written, and only for `lesson_type === 'video'`.
- `src/components/admin/course-builder/CourseQuizTab.tsx` — full UI authoring: `:142-160` creates a `quizzes` row on a `quiz` lesson; `:202-238` inserts `quiz_questions` (`question, question_type, options[], correct_answer, explanation, order_index`).
- `src/components/admin/course-builder/CourseResourcesTab.tsx`, `src/components/admin/ScormPackageManager.tsx`, `LessonDurationAudit.tsx` — resources, SCORM packages, duration audit.

**Answer:** an admin can create a lesson *shell* end-to-end (video, quiz, practical, scorm, and text/pdf/scenario with only a `description`). Rich lesson bodies (`content`) and the `resource` lesson type are learner-rendered but have **no authoring UI** — those rows are seeded via SQL/direct DB writes.

## 2. Lesson player

`src/pages/CourseLearn.tsx` branches on `activeLesson.lesson_type`:

- `:649` `video` → `<VideoPlayer />`
- `:554` + `:357-433` `scorm` → creates/loads `scorm_registrations`, renders launch HTML in an iframe with the SCORM 1.2 API installed
- `:676` `quiz` → CTA card to `/courses/:id/quiz`
- `:694` `practical` → static practical-session card
- `:707` `resource` → `<ResourceLessonBody lesson={activeLesson} onMarkRead={markComplete} />`
- `:711-722` fallback (`text`, `pdf`, `scenario`) → `activeLesson.description` in a `whitespace-pre-line` div

`src/components/course-learn/lessonMeta.tsx:100-127` labels the full handled set: `video, scorm, quiz, resource, practical, certificate, text, pdf, scenario`.

`lessons.content` is **neither markdown nor HTML nor JSON** — it is plain text with a lightweight convention, parsed in `ResourceLessonBody.tsx:26-47`:

```js
const chunks = content.replace(/\r\n/g, '\n').split(/\n\s*\n/);
// bullet lines starting with •/-/* -> list; short unpunctuated single line -> heading
```

Rendered as React text nodes (`<p>{block.text}</p>`), no `dangerouslySetInnerHTML`, so raw HTML would display literally.

## 3. SCORM

- Upload: `ScormPackageManager.tsx:63-91` → `supabase.functions.invoke('upload-scorm')`.
- `supabase/functions/upload-scorm/index.ts` — `:71` zip → `scorm` bucket; `:84-92` parses `imsmanifest.xml` (JSZip); `:167-170` extracts every file into `scorm-extracted`; `:186` inserts `scorm_packages` (`storage_zip_path`, `launch_path`, `version`, `title`).
- Serving: `supabase/functions/serve-scorm/index.ts` (content-types, range support), called with `?token=` (`CourseLearn.tsx:403`, `ScormPlayer.tsx:80`).
- Runtime host: `src/pages/ScormPlayer.tsx` (standalone) and inline in `CourseLearn.tsx:342-433`; the SCORM 1.2 API shim is `src/lib/scorm-api.ts` (`LMSInitialize/GetValue/SetValue/Commit`).

## 4. Edge functions (20)

check-course-completion (completion → certificate), check-subscription, course-assistant (**AI**), course-progress-report, create-cart-checkout, create-checkout, customer-portal, download-resource (signed URL from `course-resources`), generate-certificate (renders an **SVG**, not a real PDF), issue-competency-certificate, list-learners, lms-api (Ariadne API), outlook-create/update/cancel-event, scorm-media-probe, serve-scorm, stripe-webhook, sync-learners-from-ariadne, training-status, upload-scorm.

Only one LLM call — `supabase/functions/course-assistant/index.ts:27,148-161`:

```js
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${lovableApiKey}` },
  body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [...], temperature: 0.2 }),
});
```

So the Lovable AI gateway is enabled and in use (`LOVABLE_API_KEY` secret is present). **No text-to-speech / audio generation** and **no document parsing** exist anywhere (no docx/mammoth/pdfjs/pdf-parse); audio references are only MIME maps in `serve-scorm/index.ts:28-37` and `upload-scorm/index.ts:164`.

`supabase/config.toml` sets `verify_jwt = false` for 12 functions plus a stale `[functions.ariadne-api]` (`:41`) that has no matching directory; `lms-api` itself is absent from config, so it defaults to `verify_jwt = true`.

## 5. Storage

| Bucket | Written by |
| --- | --- |
| `branding-assets` (public) | `src/hooks/useBrandingSettings.tsx:120` — logos/brand images |
| `certificates` (private) | `generate-certificate/index.ts:337` — `${user_id}/${cert_id}.svg` |
| `course-resources` (private) | **no `.upload()` in code** — read-only via `download-resource/index.ts:121` signed URLs; files added out-of-band |
| `scorm` (private) | `upload-scorm/index.ts:71` — raw `.zip` |
| `scorm-extracted` (private) | `upload-scorm/index.ts:167` — unzipped html/js/css/media |

## 6. Progress

`CourseLearn.tsx:314-339`:

```js
await supabase.from('lesson_progress').upsert(
  { user_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
  { onConflict: 'lesson_id,user_id' }
);
// then invoke('check-course-completion')
```

Same pattern in `ScormPlayer.tsx:122-138`. `lesson_progress` is boolean-only — **no partial progress**. Intra-lesson position exists only for SCORM, in `scorm_registrations.lesson_location` / `suspend_data`, written on every commit (`src/lib/scorm-api.ts:190-223`) and restored with `cmi.core.entry = 'resume'` (`:49-70`). Video position is client-side only.

## 7. Ariadne integration (`supabase/functions/lms-api`)

Auth (`:18-20`): `x-ariadne-secret` header must equal `ARIADNE_SYNC_SECRET`.

Routing (`:32-36`): `catalog`, `register`, `enroll`, `progress`, `certificate`.

Catalog select (`:119-125`) — exact exposed course fields:

```
id, title, subtitle, description, category, level, thumbnail_url, duration_minutes,
cpd_hours, is_mandatory, is_internal, is_published, has_certificate, pass_mark,
language, delivery_type, updated_at, training_ids, programmes, mandatory_category,
evidence_type, renewal_months, warning_days
```

plus a computed `lesson_count` (`:133-148`), filtered to `is_published = true`.

- `enroll` (`:153-209`) returns `id, user_id, course_id, enrolled_at, completed_at`.
- `progress` (`:210-320`) joins `profiles`, `enrollments`, `lessons`, `lesson_progress`, `certificates`, `courses(id,title)`.
- `certificate` (`:398-419`) returns `certificate_number, certificate_type, issued_at` + signed URL.
- `training-status` — legacy per-learner status, same secret gate.
- `sync-learners-from-ariadne` — reverse direction, JWT + admin role, pulls `ARIADNE_LEARNERS_ENDPOINT` with `ARIADNE_API_KEY`.

## Open questions before any feature scoping

1. `lessons.content` is plain text with a bespoke convention and no admin editor. Would you want a richer structured content format (JSON blocks) introduced, or must new content stay compatible with the existing plain-text parser?
2. Narrated slide decks: there is no TTS anywhere today. Is generating narration audio in-platform in scope, or should narration be text/captions only at first?
3. Should generated lessons live as new native lesson types (flip-cards, drag-match) rather than SCORM packages? Nothing today renders those.
