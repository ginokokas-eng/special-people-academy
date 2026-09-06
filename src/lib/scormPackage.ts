/**
 * SCORM 1.2 launcher package generator (thin launcher only).
 *
 * The generated package contains NO course content. It is a single SCO whose
 * only job is to:
 *   1. find the hosting LMS's SCORM API up the frame chain and LMSInitialize
 *   2. read cmi.core.student_id / student_name
 *   3. POST lms-api?resource=launch with the organisation launch key baked in
 *   4. iframe the returned one-shot launch_url full size
 *   5. translate our postMessage events into cmi.core.lesson_status / score.raw
 *
 * There is no offline packaging and no xAPI here by design.
 */

export interface ScormPackageOptions {
  courseId: string;
  courseTitle: string;
  organisationName: string;
  launchKey: string;
  functionsUrl: string;
  anonKey: string;
  passMark?: number;
}

/** XML text escaping for titles and identifiers. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** SCORM identifiers must start with a letter/underscore and stay alphanumeric. */
export function scormIdentifier(prefix: string, raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `${prefix}_${cleaned || 'course'}`.slice(0, 96);
}

export function buildManifest(options: Pick<ScormPackageOptions, 'courseId' | 'courseTitle'>): string {
  const manifestId = scormIdentifier('MANIFEST', options.courseId);
  const orgId = scormIdentifier('ORG', options.courseId);
  const itemId = scormIdentifier('ITEM', options.courseId);
  const resId = scormIdentifier('RES', options.courseId);
  const title = escapeXml(options.courseTitle);

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${title}</title>
      <item identifier="${itemId}" identifierref="${resId}" isvisible="true">
        <title>${title}</title>
        <adlcp:masteryscore>80</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${resId}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
`;
}

export function buildLauncherHtml(options: ScormPackageOptions): string {
  const passMark = options.passMark ?? 80;
  const cfg = JSON.stringify(
    {
      courseId: options.courseId,
      courseTitle: options.courseTitle,
      functionsUrl: options.functionsUrl.replace(/\/+$/, ''),
      anonKey: options.anonKey,
      launchKey: options.launchKey,
      passMark,
    },
    null,
    2,
  );

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeXml(options.courseTitle)}</title>
<style>
  html, body { margin:0; padding:0; height:100%; background:#f6f5fb; font-family: system-ui, sans-serif; }
  iframe { border:0; width:100%; height:100%; display:block; }
  .msg { padding:2rem; max-width:36rem; margin:0 auto; color:#2c2740; line-height:1.5; }
</style>
</head>
<body>
<div id="root" class="msg">Starting your training…</div>
<script>
var CFG = ${cfg};

/* ---- SCORM 1.2 API discovery up the frame chain ---- */
function findAPI(win) {
  var tries = 0;
  while (win && !win.API && win.parent && win.parent !== win && tries < 20) {
    tries++; win = win.parent;
  }
  return win ? win.API : null;
}
var API = findAPI(window) || (window.opener ? findAPI(window.opener) : null);
function lms(fn) { try { return API && API[fn] ? API[fn].apply(API, [].slice.call(arguments, 1)) : null; } catch (e) { return null; } }

lms('LMSInitialize', '');
var studentId = lms('LMSGetValue', 'cmi.core.student_id') || '';
var studentName = lms('LMSGetValue', 'cmi.core.student_name') || '';

/* SCORM sends "Surname, Forename" — flip it for a human-readable name. */
function tidyName(raw) {
  if (!raw) return null;
  var parts = String(raw).split(',');
  return (parts.length === 2 ? parts[1].trim() + ' ' + parts[0].trim() : String(raw).trim()) || null;
}

/* student_id is only an email in some LMSs; ask the learner if it is not. */
function resolveEmail() {
  if (/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(studentId)) return studentId;
  var typed = window.prompt('Enter your work email address to start this training:');
  return typed && typed.indexOf('@') > 0 ? typed.trim() : null;
}

function fail(text) {
  document.getElementById('root').textContent = text;
}

/* ---- status mapping (kept identical to src/lib/lmsBridge.ts) ---- */
function applyStatus(msg) {
  var pct = Math.max(0, Math.min(100, Math.round(msg.percent || 0)));
  if (msg.type === 'heartbeat') return;
  if (msg.type === 'lesson_completed' || msg.type === 'score') {
    lms('LMSSetValue', 'cmi.core.lesson_status', 'incomplete');
    lms('LMSSetValue', 'cmi.core.score.raw', String(pct));
  } else if (msg.type === 'course_completed') {
    var score = typeof msg.score === 'number' ? Math.round(msg.score) : pct;
    var status;
    if (typeof msg.passed === 'boolean') status = msg.passed ? 'passed' : 'failed';
    else if (typeof msg.score === 'number') status = score >= CFG.passMark ? 'passed' : 'failed';
    else status = 'completed';
    lms('LMSSetValue', 'cmi.core.lesson_status', status);
    lms('LMSSetValue', 'cmi.core.score.raw', String(score));
  }
  lms('LMSCommit', '');
}

window.addEventListener('message', function (event) {
  var data = event.data;
  if (!data || data.source !== 'special-people-academy') return;
  if (data.course_id && data.course_id !== CFG.courseId) return;
  applyStatus(data);
});

window.addEventListener('unload', function () { lms('LMSFinish', ''); });

var email = resolveEmail();
if (!email) {
  fail('We could not identify you. Ask your training administrator to add your email address to your learning record.');
} else {
  fetch(CFG.functionsUrl + '/lms-api?resource=launch', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-launch-key': CFG.launchKey,
      'apikey': CFG.anonKey
    },
    body: JSON.stringify({
      course_id: CFG.courseId,
      learner_email: email,
      learner_name: tidyName(studentName),
      external_id: studentId || null
    })
  })
    .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
    .then(function (res) {
      if (!res.ok || !res.body || !res.body.launch_url) {
        var code = (res.body && res.body.error) || 'launch_failed';
        if (code === 'no_seat_available') return fail('There are no free places left on your organisation\\'s licence for this course. Contact your training administrator.');
        if (code === 'course_not_licensed') return fail('Your organisation does not currently hold a licence for this course.');
        if (code === 'key_revoked') return fail('This launcher has been switched off. Ask your training administrator for an updated package.');
        return fail('We could not start this training. Please try again shortly.');
      }
      var frame = document.createElement('iframe');
      frame.setAttribute('allow', 'fullscreen; autoplay');
      frame.setAttribute('title', CFG.courseTitle);
      frame.src = res.body.launch_url;
      document.body.innerHTML = '';
      document.body.appendChild(frame);
      lms('LMSSetValue', 'cmi.core.lesson_status', 'incomplete');
      lms('LMSCommit', '');
    })
    .catch(function () { fail('We could not reach the Academy. Check your internet connection and try again.'); });
}
</script>
</body>
</html>
`;
}

export function buildReadme(options: ScormPackageOptions): string {
  return `Special People Academy — SCORM 1.2 launcher
==========================================

Course:        ${options.courseTitle}
Organisation:  ${options.organisationName}
Standard:      SCORM 1.2, single SCO

HOW TO UPLOAD
1. In your learning system, add a new SCORM 1.2 course / activity.
2. Upload this ZIP file exactly as it is (do not unzip it first).
3. Publish the activity to your learners.

WHAT LEARNERS SEE
The activity opens the Academy inside your learning system. Learners never see
a separate sign-in screen — their place is created and their licence seat is
taken automatically the first time they open it.

WHAT YOUR LEARNING SYSTEM RECORDS
- Progress through the course is reported as "incomplete" with a score.
- Finishing the course is reported as "passed", "failed" or "completed".
- If a message is missed, your system can also read progress from the Academy
  API (resource=launch-status).

IMPORTANT — KEEP THIS PACKAGE PRIVATE
This package contains this organisation's launch key. Anyone with the package
can start learners against your licence. If it leaks, revoke the key here and
issue a new package.
`;
}

/** Lazily loads JSZip and returns the packaged .zip blob. */
export async function buildScormPackageZip(options: ScormPackageOptions): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file('imsmanifest.xml', buildManifest(options));
  zip.file('index.html', buildLauncherHtml(options));
  zip.file('README.txt', buildReadme(options));
  return zip.generateAsync({ type: 'blob' });
}
