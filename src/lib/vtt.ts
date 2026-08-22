/**
 * Client-side WebVTT building.
 *
 * Caption files are NEVER written to the private media bucket: the player takes
 * `vttUrl` as a plain <track src> and cannot sign it. Instead we build the VTT
 * from stored transcript segments at render time and hand the player a Blob URL.
 */

import type { TranscriptSegment } from '@/components/course-learn/types';

function stamp(seconds: number): string {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function segmentsToVtt(segments: TranscriptSegment[]): string {
  const lines: string[] = ['WEBVTT', ''];
  segments.forEach((seg, i) => {
    const next = segments[i + 1];
    const end = seg.end ?? (next ? next.start : seg.start + 4);
    if (!(end > seg.start)) return;
    lines.push(String(i + 1));
    lines.push(`${stamp(seg.start)} --> ${stamp(end)}`);
    lines.push(seg.text.replace(/\r?\n/g, ' ').trim());
    lines.push('');
  });
  return lines.join('\n');
}

/** Returns an object URL for the caption track — revoke it when unmounting. */
export function segmentsToVttUrl(segments: TranscriptSegment[] | null | undefined): string | null {
  if (!segments || segments.length === 0) return null;
  const vtt = segmentsToVtt(segments);
  if (!vtt.includes('-->')) return null;
  return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
}
