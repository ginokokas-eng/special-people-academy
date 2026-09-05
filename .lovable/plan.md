# Third-pass audit — learner second tier

Every cause below was checked against the code and the live database today. Where your diagnosis was slightly off I say so.

## M. Five different progress numbers (confirmed, four separate rules)

| Surface | Rule in code | Enteral Feeding result |
| --- | --- | --- |
| Dashboard | required lessons only (`src/pages/Dashboard.tsx`, uses the shared rule) | 31% |
| Course page hero + right sidebar | **all** lessons: `lessons.filter(completed)/lessons.length` (`CourseDetail.tsx` ~line 579) | 24% |
| Course page content header | same all-lessons count | 13/54 |
| Course page left "Your Progress" card | **not lesson progress at all** — `CourseProgressTracker` scores three milestones (all lessons done / all quizzes passed / practical done) as 0 or 1 each | 0% |
| Lesson hub + module rings | required lessons only via `requiredProgress()` | 12/39 |
| Hub sidebar module line | all lessons in the module | 2/2 vs 1 of 1 |

Correction to your reading: the 0% card is not reading a different *field*, it is a milestone checklist rendered as a percentage — with 54 lessons it can only ever show 0% until literally everything is done.

Fix (one rule, one place):
- `CourseDetail` computes progress with `requiredProgress()` over the same lesson list, and the content header prints `x/y required lessons`.
- `CourseContentSidebar` module/section lines switch to `requiredProgress()` so hub sidebar and hub cards agree.
- Remove the left "Your Progress / Overall completion" card from the course page; keep the requirement checklist rows (lessons / assessments / practical / certificate) as a checklist with no percentage, since that is the actual certificate gate.
- Dashboard already correct — no change.

## N. Durations (confirmed)

`lessonMeta`/`CourseContent` read `duration_seconds` only, so the 26 resource lessons you filled with `duration_minutes` contribute nothing (645 s → "11 min"). The hero prints `courses.duration_minutes` (180 → "3h"); IPC, Medication Awareness and Respiratory have 0 there and print "0 min".

Fix:
- One helper `lessonDurationSeconds(l) = l.duration_seconds ?? (l.duration_minutes ?? 0) * 60`, used by the course-page totals, module rows, hub sidebar and the catalogue card.
- Hero falls back to the summed lesson duration when `courses.duration_minutes` is null or 0.
- Pluralise lesson counts and hide the duration segment entirely when the total is 0 (no "0 min", no dash).

## O. Deep link ignored (cause is different from your proposal)

The `?lesson=` param *is* read (`CourseLearn.tsx` line 128). The problem is that Module 3 Knowledge Check has **0 questions**, and `visibleLessons` drops quiz lessons with no questions (line 149); `activeLesson` then silently falls back to `visibleLessons[0]`, which is the Pre-Course Knowledge Check. All ten module knowledge checks in this course have 0 questions, so the same trap applies to every one of them.

Fix:
- No silent fallback: when `?lesson=` names a lesson that exists but is not learner-visible, show a small "This lesson isn't available yet" panel with a link back to the hub, keeping the URL honest.
- When the id matches nothing at all, drop the param and show the hub.

## P. Quiz sentinels (confirmed)

`attempts_allowed = 99` is stored as "effectively unlimited", and `passing_score = 0` marks an ungraded self-check; the UI prints both literally.

Fix:
- Treat `attempts_allowed` null, 0 or >= 99 as unlimited: "Unlimited attempts", no "x of y remaining", no last-attempt warning.
- Hide the pass-mark tile and the "pass mark 0%" line in `QuizPlayer` when the quiz is ungraded (`isUngraded` already exists in `QuizContainer`).

Where quiz completion comes from: the lesson tick is a `lesson_progress` row written when the learner submits (ungraded check) or passes (graded), and is completely independent of `quiz_attempts` rows — so "Completed" plus "99 of 99 remaining" is not a contradiction, just bad copy. The unlimited-attempts change removes the clash.

Also in scope:
- Completed quiz card in the lesson view: button becomes "Review answers" (and shows the best score when an attempt exists) instead of "Start Assessment".
- Quiz page leaving the learner shell is **not deliberate** — `QuizPage` renders the public `Navbar`/`Footer`. Wrap it in the learn chrome with a "Back to lesson" link.
- Print the lesson title once on the quiz lesson view (keep the hero, drop the card and overview-tab repeats).

## Q. Compliance tab empty for the internal org (confirmed, precise cause)

The RPC is already called unconditionally, and it returns 185 rows. The table's columns come from `licensedCourses`, which is built only from `licences` (`OrgPortal.tsx` line 226) — 0 licences means 0 columns, so the empty state fires.

Fix:
- Build the course column list from the union of licence courses and the `course_id`/`course_title` pairs the matrix already returns.
- Derive the empty state from `matrixByLearner.length` only, and word it without mentioning licences ("No one has been assigned training yet").

## R. Sign Up (confirmed)

`initialTab` is derived from `location.pathname === '/sign-up'`, so `?mode=signup` is ignored.

Fix: read `mode` from the query string as well; keep the `/sign-up` path working. Replace "John Doe" with "Your full name" and show the password rule (8–72 characters) that the code already enforces.

**Product decision to make:** self-signup now creates an account with no entitlement. Recommendation — keep the tab (self-serve individual purchase is the planned path B) but add a line under it: "Invited by your employer? Use the link in your invitation email." Removing the tab is also defensible; say which you want and I will follow it.

## S. Data (no code)

- Falls Prevention "test" lesson (`80dd646a…`) — required, no blocks, blocks 100% for every learner. No reason to keep it; delete.
- EFAW published with zero lessons — unpublish until it has content, otherwise it is buyable/enrollable and instantly "complete".

Both are data changes and need your go-ahead; I will do them in the build turn if you approve.

## T. Smaller (confirmed)

- Hub shows two back links: the top bar's "← Course" and `CourseHome`'s "Course page" (two places, lines 247 and 274). Keep the top-bar one, drop the in-page ones.
- Sidebar module titles: add `title` attributes on truncated titles.
- `/auth`: sticky header ghosting — give the auth card top spacing clear of the header.

## Prioritised list for one build turn

1. M — one progress rule everywhere; drop the duplicate progress card.
2. Q — compliance columns from the matrix, licence-free empty copy.
3. O — honest deep-link handling, no silent fallback.
4. P — unlimited attempts, hidden pass mark, "Review answers", quiz page inside the learn shell, single lesson title.
5. N — shared duration helper, hero fallback, pluralisation, zero-hiding.
6. R — `?mode=signup`, placeholder, password rule, invitation hint.
7. T — single back link, title tooltips, `/auth` spacing.
8. S — data cleanup (delete the "test" lesson, unpublish EFAW) if approved.

Out of scope: completion/gating logic in `check-course-completion`, media or SCORM config, merging My Courses and My Learning, quiz authoring (the empty knowledge checks stay hidden rather than being authored here).

## Technical notes

Files expected to change: `src/pages/CourseDetail.tsx`, `src/components/course-detail/CourseContent.tsx`, `CourseSidebar.tsx`, `CourseProgressTracker.tsx`, `CourseHero.tsx`, `src/components/course-learn/CourseContentSidebar.tsx`, `CourseHome.tsx`, `lessonMeta.tsx`, `src/pages/CourseLearn.tsx`, `src/pages/QuizPage.tsx`, `src/components/quiz/QuizContainer.tsx`, `QuizPlayer.tsx`, `src/pages/org/OrgPortal.tsx`, `src/pages/Auth.tsx`, plus a small duration helper next to `src/lib/progress.ts`. No migrations; the data items in S are direct row updates.
