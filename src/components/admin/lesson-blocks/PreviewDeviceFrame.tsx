import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { TRANSLATION_LANGUAGES } from '@/lib/translation';
import type { LessonBlock } from '@/components/course-learn/blocks/types';

/** Where an author's device/motion/language choice is remembered. */
const PREFS_KEY = 'academy_preview_prefs';

type Device = 'phone' | 'tablet' | 'desktop';

const DEVICES: Record<Exclude<Device, 'desktop'>, { width: number; height: number; label: string }> = {
  phone: { width: 390, height: 844, label: 'Phone 390×844' },
  tablet: { width: 768, height: 1024, label: 'Tablet 768×1024' },
};

interface Prefs {
  device: Device;
  reduceMotion: boolean;
  lang: string | null;
}

function readPrefs(): Prefs {
  const fallback: Prefs = { device: 'phone', reduceMotion: false, lang: null };
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      device: parsed.device === 'tablet' || parsed.device === 'desktop' ? parsed.device : 'phone',
      reduceMotion: !!parsed.reduceMotion,
      lang: typeof parsed.lang === 'string' ? parsed.lang : null,
    };
  } catch {
    return fallback;
  }
}

export interface TranslationStatusSummary {
  /** 'draft' | 'reviewed' per language code; missing = not translated. */
  [lang: string]: 'draft' | 'reviewed';
}

interface Props {
  courseId?: string;
  lessonId?: string;
  blocks: LessonBlock[];
  trickleEnabled: boolean;
  /** Per-language status summary from this lesson's translation rows. */
  translationStatus: TranslationStatusSummary;
}

/**
 * The learner preview, inside a real viewport.
 *
 * Tailwind breakpoints are viewport-based, so a narrowed <div> would keep the
 * desktop layout. The preview therefore lives in a same-origin iframe sized to
 * the chosen device, and the editor keeps posting the UNSAVED blocks into it —
 * the whole point being that authors see their edits live. Nothing is written.
 */
export function PreviewDeviceFrame({
  courseId,
  lessonId,
  blocks,
  trickleEnabled,
  translationStatus,
}: Props) {
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);
  const [reloadKey, setReloadKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* a private window simply forgets the choice */
    }
  }, [prefs]);

  const src = useMemo(() => {
    if (!courseId || !lessonId) return '';
    const query = new URLSearchParams();
    if (prefs.reduceMotion) query.set('motion', 'reduce');
    if (prefs.lang) {
      query.set('lang', prefs.lang);
      query.set('drafts', '1');
    }
    const qs = query.toString();
    return `/admin-portal/courses/${courseId}/lessons/${lessonId}/preview-frame${qs ? `?${qs}` : ''}`;
  }, [courseId, lessonId, prefs.reduceMotion, prefs.lang]);

  const post = useCallback(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: 'academy-preview',
        blocks,
        trickleEnabled,
        lang: prefs.lang,
        drafts: true,
      },
      window.location.origin
    );
  }, [blocks, trickleEnabled, prefs.lang]);

  // Debounced so typing in the editor does not flood the frame.
  useEffect(() => {
    const timer = window.setTimeout(post, 300);
    return () => window.clearTimeout(timer);
  }, [post]);

  // The frame asks for a payload as soon as it mounts.
  useEffect(() => {
    const onReady = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if ((event.data as { type?: string })?.type === 'academy-preview-ready') post();
    };
    window.addEventListener('message', onReady);
    return () => window.removeEventListener('message', onReady);
  }, [post]);

  const device = prefs.device;
  const size = device === 'desktop' ? null : DEVICES[device];

  const langLabel = (code: string) => {
    const language = TRANSLATION_LANGUAGES.find((l) => l.code === code);
    const status = translationStatus[code];
    const suffix = status ? `(${status})` : '(not translated)';
    return `${language?.label ?? code} ${suffix}`;
  };

  return (
    <div className="space-y-3">
      <div
        data-testid="preview-toolbar"
        className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2"
      >
        <div className="flex items-center gap-1">
          {(['phone', 'tablet', 'desktop'] as Device[]).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={device === key ? 'secondary' : 'ghost'}
              data-testid={`preview-device-${key}`}
              aria-pressed={device === key}
              onClick={() => setPrefs((p) => ({ ...p, device: key }))}
            >
              {key === 'phone' ? 'Phone' : key === 'tablet' ? 'Tablet' : 'Desktop'}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="preview-motion"
            data-testid="preview-motion"
            checked={prefs.reduceMotion}
            onCheckedChange={(checked) => setPrefs((p) => ({ ...p, reduceMotion: checked }))}
          />
          <Label htmlFor="preview-motion" className="text-xs">
            Reduce motion
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="preview-lang" className="text-xs">
            Language
          </Label>
          <select
            id="preview-lang"
            data-testid="preview-lang"
            className="h-8 rounded-md border bg-background px-2 text-xs"
            value={prefs.lang ?? ''}
            onChange={(e) => setPrefs((p) => ({ ...p, lang: e.target.value || null }))}
          >
            <option value="">English</option>
            {TRANSLATION_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} disabled={!translationStatus[l.code]}>
                {langLabel(l.code)}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          data-testid="preview-reload"
          onClick={() => setReloadKey((k) => k + 1)}
        >
          Reload
        </Button>
      </div>

      {src ? (
        <div
          className={cn(
            'mx-auto',
            size ? 'rounded-[2rem] border bg-muted p-2 shadow-sm' : 'w-full'
          )}
          style={size ? { width: size.width + 16 } : undefined}
        >
          <iframe
            key={`${src}-${reloadKey}`}
            ref={frameRef}
            data-testid="preview-frame"
            title="Learner preview"
            src={src}
            onLoad={post}
            className={cn('block w-full bg-background', size ? 'rounded-[1.6rem]' : 'rounded-lg border')}
            style={size ? { width: size.width, height: size.height } : { height: '80vh' }}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Save the lesson to preview it.</p>
      )}
    </div>
  );
}
