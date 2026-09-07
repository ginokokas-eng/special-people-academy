/**
 * clone-course-media
 *
 * Second half of course duplication. `clone_course` copies the rows but leaves
 * every uploaded file where it was, so a freshly copied course still points at
 * the SOURCE course's folder — and `lesson-media-url` authorises on the course
 * id inside the path, so its learners would be refused. This function copies the
 * objects into the copy's own folder and rewrites the paths that held them.
 *
 * SCORM packages and course thumbnail_url are deliberately NOT copied: they are
 * shared, read-only references and are not served through the lesson-media
 * course-id path check.
 *
 * Payload rewrites are housekeeping, not a content change, so lessons.
 * content_version is never bumped here.
 *
 * Request:  { course_id }  — the CLONE's id.
 * Response: { copied, skipped, failed: [{ path, error }], remaining }
 */
import { adminClient, corsHeaders, json, requireOpsTrainingAdmin, resolveUser } from '../_shared/staff-auth.ts';

const BUCKET = 'lesson-media';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Every string value anywhere inside a payload that starts with `prefix`. */
function collectPaths(value: Json, prefix: string, out: Set<string>): void {
  if (typeof value === 'string') {
    if (value.startsWith(prefix)) out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, prefix, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectPaths(item, prefix, out);
  }
}

/** Returns a deep copy with every string swapped through `map`. */
function rewritePaths(value: Json, map: Map<string, string>): Json {
  if (typeof value === 'string') return map.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => rewritePaths(item, map));
  if (value && typeof value === 'object') {
    const next: { [key: string]: Json } = {};
    for (const [key, item] of Object.entries(value)) next[key] = rewritePaths(item, map);
    return next;
  }
  return value;
}

const fileName = (path: string) => path.split('/').pop() ?? path;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const caller = await resolveUser(req);
    if (!caller) return json({ error: 'Not signed in' }, 401);
    if (!(await requireOpsTrainingAdmin(caller.client, caller.userId))) {
      return json({ error: 'Training admin role required' }, 403);
    }

    const body = (await req.json().catch(() => ({}))) as { course_id?: string };
    const cloneId = String(body.course_id ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(cloneId)) return json({ error: 'Missing course_id' }, 400);

    const admin = adminClient();

    const { data: course, error: courseError } = await admin
      .from('courses')
      .select('id, cloned_from_course_id')
      .eq('id', cloneId)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) return json({ error: 'Course not found' }, 404);
    if (!course.cloned_from_course_id) {
      return json({ error: 'This course is not a copy, so there is nothing to copy over.' }, 400);
    }
    const sourceId = course.cloned_from_course_id as string;
    const prefix = `${sourceId}/`;

    const { data: lessons, error: lessonsError } = await admin
      .from('lessons')
      .select('id')
      .eq('course_id', cloneId);
    if (lessonsError) throw lessonsError;
    const lessonIds = (lessons ?? []).map((l) => l.id as string);
    if (!lessonIds.length) return json({ copied: 0, skipped: 0, failed: [], remaining: 0 });

    const { data: blocks, error: blocksError } = await admin
      .from('lesson_blocks')
      .select('id, lesson_id, payload')
      .in('lesson_id', lessonIds);
    if (blocksError) throw blocksError;

    const { data: sources, error: sourcesError } = await admin
      .from('lesson_video_sources')
      .select('id, lesson_id, source_url')
      .in('lesson_id', lessonIds);
    if (sourcesError) throw sourcesError;

    /* ---------------------- what needs copying, and where --------------------- */
    // Keyed by old path; the destination lesson is the row's own (copied) lesson.
    const plan = new Map<string, string>();
    const perBlock = new Map<string, string[]>();

    for (const block of blocks ?? []) {
      const found = new Set<string>();
      collectPaths((block.payload ?? {}) as Json, prefix, found);
      if (!found.size) continue;
      perBlock.set(block.id as string, [...found]);
      for (const path of found) {
        plan.set(path, `${cloneId}/${block.lesson_id}/${fileName(path)}`);
      }
    }

    const videoRows: { id: string; oldPath: string; newPath: string }[] = [];
    for (const row of sources ?? []) {
      const url = String(row.source_url ?? '');
      // Only storage paths are ours to copy; http(s) links stay as they are.
      if (/^https?:\/\//i.test(url) || !url.startsWith(prefix)) continue;
      const newPath = `${cloneId}/${row.lesson_id}/${fileName(url)}`;
      plan.set(url, newPath);
      videoRows.push({ id: row.id as string, oldPath: url, newPath });
    }

    /* ------------------------------- copy files ------------------------------ */
    let copied = 0;
    let skipped = 0;
    const failed: { path: string; error: string }[] = [];
    const done = new Map<string, string>();

    for (const [oldPath, newPath] of plan) {
      const { error } = await admin.storage.from(BUCKET).copy(oldPath, newPath);
      if (!error) {
        copied += 1;
        done.set(oldPath, newPath);
        continue;
      }
      const message = error.message ?? String(error);
      // A re-run finds the destination already there: keep going and rewrite.
      if (/exист|exists|duplicate|resource already/i.test(message)) {
        skipped += 1;
        done.set(oldPath, newPath);
        continue;
      }
      console.error('clone-course-media copy failed:', oldPath, message);
      failed.push({ path: oldPath, error: message });
    }

    /* ------------------------------ rewrite rows ----------------------------- */
    for (const block of blocks ?? []) {
      const paths = perBlock.get(block.id as string);
      if (!paths?.length) continue;
      const map = new Map<string, string>();
      for (const path of paths) {
        const to = done.get(path);
        if (to) map.set(path, to);
      }
      if (!map.size) continue;
      const next = rewritePaths((block.payload ?? {}) as Json, map);
      const { error } = await admin
        .from('lesson_blocks')
        .update({ payload: next as never })
        .eq('id', block.id);
      if (error) failed.push({ path: paths[0], error: error.message });
    }

    for (const row of videoRows) {
      if (!done.has(row.oldPath)) continue;
      const { error } = await admin
        .from('lesson_video_sources')
        .update({ source_url: row.newPath })
        .eq('id', row.id);
      if (error) failed.push({ path: row.oldPath, error: error.message });
    }

    /* --------------------------- what is still stale -------------------------- */
    const { data: afterBlocks } = await admin
      .from('lesson_blocks')
      .select('payload')
      .in('lesson_id', lessonIds);
    const { data: afterSources } = await admin
      .from('lesson_video_sources')
      .select('source_url')
      .in('lesson_id', lessonIds);

    const stale = new Set<string>();
    for (const block of afterBlocks ?? []) collectPaths((block.payload ?? {}) as Json, prefix, stale);
    for (const row of afterSources ?? []) {
      const url = String(row.source_url ?? '');
      if (!/^https?:\/\//i.test(url) && url.startsWith(prefix)) stale.add(url);
    }

    return json({ copied, skipped, failed, remaining: stale.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('clone-course-media failed:', message);
    return json({ error: 'The files could not be copied. Please try again.' }, 500);
  }
});
