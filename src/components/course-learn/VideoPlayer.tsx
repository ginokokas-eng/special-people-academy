import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  Captions,
  CaptionsOff,
  FileText,
  RectangleHorizontal,
  SkipBack,
  SkipForward,
  Check,
  Keyboard,
  Info,
  Flag,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SPEED_OPTIONS, formatTime, type LearnerPrefs } from './useLearnerPrefs';
import type { LessonVideoSource, MediaController } from './types';

interface Props {
  title: string;
  sources: LessonVideoSource[];
  fallbackUrl: string | null;
  vttUrl?: string | null;
  prefs: LearnerPrefs;
  setPrefs: (p: Partial<LearnerPrefs>) => void;
  theatre: boolean;
  hasCaptions: boolean;
  onToggleTheatre: () => void;
  onToggleTranscript: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onEnded?: () => void;
  onContentInfo: () => void;
  onReport: (time: number) => void;
  controllerRef: React.MutableRefObject<MediaController | null>;
}

interface QualityOption {
  label: string;
  url: string;
  type?: string;
}

export function VideoPlayer({
  title,
  sources,
  fallbackUrl,
  vttUrl,
  prefs,
  setPrefs,
  theatre,
  hasCaptions,
  onToggleTheatre,
  onToggleTranscript,
  onPrev,
  onNext,
  onEnded,
  onContentInfo,
  onReport,
  controllerRef,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Build the quality options. Always offer an "Auto / Original" entry.
  const qualities: QualityOption[] = [];
  if (sources.length > 0) {
    sources.forEach((s) =>
      qualities.push({ label: s.quality_label || 'Source', url: s.source_url, type: s.mime_type || undefined })
    );
  } else if (fallbackUrl) {
    qualities.push({ label: 'Auto / Original', url: fallbackUrl });
  }

  const defaultIdx = (() => {
    if (sources.length > 0) {
      const d = sources.findIndex((s) => s.is_default);
      return d >= 0 ? d : 0;
    }
    return 0;
  })();
  const [qualityIdx, setQualityIdx] = useState(defaultIdx);
  const activeSrc = qualities[qualityIdx]?.url ?? fallbackUrl ?? '';

  // Expose imperative controller for notes / transcript seeking.
  useEffect(() => {
    controllerRef.current = {
      seekTo: (s: number) => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = Math.max(0, s);
        v.play().catch(() => {});
      },
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      isAvailable: () => true,
    };
    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef]);

  // Apply persisted speed / volume on mount + source change.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = prefs.speed;
    v.volume = prefs.volume;
    v.muted = prefs.muted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSrc]);

  // Captions on/off.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const apply = () => {
      for (let i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].mode = prefs.captions ? 'showing' : 'hidden';
      }
    };
    apply();
    v.addEventListener('loadedmetadata', apply);
    return () => v.removeEventListener('loadedmetadata', apply);
  }, [prefs.captions, vttUrl, activeSrc]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
  }, []);

  const changeVolume = useCallback(
    (val: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.volume = val;
      v.muted = val === 0;
      setPrefs({ volume: val, muted: val === 0 });
    },
    [setPrefs]
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setPrefs({ muted: next });
  }, [setPrefs]);

  const setSpeed = useCallback(
    (rate: number) => {
      const v = videoRef.current;
      if (v) v.playbackRate = rate;
      setPrefs({ speed: rate });
    },
    [setPrefs]
  );

  const changeQuality = useCallback((idx: number) => {
    const v = videoRef.current;
    const time = v?.currentTime ?? 0;
    const wasPlaying = v ? !v.paused : false;
    setQualityIdx(idx);
    // restore position after the new source loads
    requestAnimationFrame(() => {
      const nv = videoRef.current;
      if (!nv) return;
      const onLoaded = () => {
        nv.currentTime = time;
        if (wasPlaying) nv.play().catch(() => {});
        nv.removeEventListener('loadedmetadata', onLoaded);
      };
      nv.addEventListener('loadedmetadata', onLoaded);
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 2800);
  }, []);

  // Keyboard shortcuts scoped to the player container.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          seekBy(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          seekBy(5);
          break;
        case 'j':
          seekBy(-10);
          break;
        case 'l':
          seekBy(10);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 't':
          onToggleTheatre();
          break;
        case 'c':
          setPrefs({ captions: !prefs.captions });
          break;
        case 'm':
          toggleMute();
          break;
        case '?':
          setShortcutsOpen(true);
          break;
        default:
          break;
      }
      showControls();
    },
    [togglePlay, seekBy, toggleFullscreen, onToggleTheatre, toggleMute, setPrefs, prefs.captions, showControls]
  );

  const VolumeIcon = prefs.muted || prefs.volume === 0 ? VolumeX : prefs.volume < 0.5 ? Volume1 : Volume2;

  if (!activeSrc) {
    return (
      <div className="aspect-video w-full rounded-lg overflow-hidden border bg-foreground/90 flex items-center justify-center text-background/70 text-sm">
        No video available for this lesson.
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseMove={showControls}
        onMouseLeave={() => playing && setControlsVisible(false)}
        className={cn(
          'group relative w-full overflow-hidden rounded-lg border bg-black outline-none focus-visible:ring-2 focus-visible:ring-primary',
          fullscreen ? 'h-screen rounded-none' : 'aspect-video'
        )}
      >
        <video
          ref={videoRef}
          key={activeSrc}
          src={activeSrc}
          className="h-full w-full bg-black"
          playsInline
          crossOrigin={vttUrl ? 'anonymous' : undefined}
          onClick={togglePlay}
          onPlay={() => {
            setPlaying(true);
            showControls();
          }}
          onPause={() => {
            setPlaying(false);
            setControlsVisible(true);
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            e.currentTarget.playbackRate = prefs.speed;
          }}
          onProgress={(e) => {
            const v = e.currentTarget;
            if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
          }}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onEnded={() => {
            setPlaying(false);
            setControlsVisible(true);
            onEnded?.();
          }}
        >
          {vttUrl && (
            <track
              kind="captions"
              src={vttUrl}
              srcLang="en"
              label="English"
              default={prefs.captions}
            />
          )}
        </video>

        {/* Buffering spinner */}
        {waiting && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-white/80" />
          </div>
        )}

        {/* Center play overlay when paused */}
        {!playing && !waiting && (
          <button
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Play className="ml-1 h-8 w-8" fill="currentColor" />
            </span>
          </button>
        )}

        {/* Control bar */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200',
            controlsVisible || !playing ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          {/* Seek bar */}
          <div className="px-1">
            <Slider
              value={[current]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={(v) => {
                const vid = videoRef.current;
                if (vid) {
                  vid.currentTime = v[0];
                  setCurrent(v[0]);
                }
              }}
              aria-label="Seek"
              className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 text-white">
            <CtrlBtn label={playing ? 'Pause (k)' : 'Play (k)'} onClick={togglePlay}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </CtrlBtn>

            {onPrev && (
              <CtrlBtn label="Previous lesson" onClick={onPrev}>
                <SkipBack className="h-4 w-4" />
              </CtrlBtn>
            )}
            {onNext && (
              <CtrlBtn label="Next lesson" onClick={onNext}>
                <SkipForward className="h-4 w-4" />
              </CtrlBtn>
            )}

            {/* Volume */}
            <div className="group/vol flex items-center">
              <CtrlBtn label="Mute (m)" onClick={toggleMute}>
                <VolumeIcon className="h-5 w-5" />
              </CtrlBtn>
              <div className="w-0 overflow-hidden transition-all duration-200 group-hover/vol:w-20">
                <Slider
                  value={[prefs.muted ? 0 : prefs.volume]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={(v) => changeVolume(v[0])}
                  aria-label="Volume"
                  className="w-20"
                />
              </div>
            </div>

            <span className="ml-1 select-none text-xs tabular-nums text-white/90">
              {formatTime(current)} / {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              {hasCaptions && (
                <CtrlBtn
                  label="Captions (c)"
                  active={prefs.captions}
                  onClick={() => setPrefs({ captions: !prefs.captions })}
                >
                  {prefs.captions ? <Captions className="h-5 w-5" /> : <CaptionsOff className="h-5 w-5" />}
                </CtrlBtn>
              )}

              <CtrlBtn label="Transcript" onClick={onToggleTranscript}>
                <FileText className="h-5 w-5" />
              </CtrlBtn>

              {/* Speed quick toggle */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex h-8 min-w-9 items-center justify-center rounded px-1.5 text-xs font-semibold text-white hover:bg-white/15"
                    aria-label="Playback speed"
                  >
                    {prefs.speed}x
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-36 p-1">
                  <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Playback speed</p>
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      {s === 1 ? 'Normal' : `${s}x`}
                      {prefs.speed === s && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Settings menu */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded text-white hover:bg-white/15"
                    aria-label="Settings"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-2">
                  <SettingsPanel
                    qualities={qualities}
                    qualityIdx={qualityIdx}
                    onQuality={changeQuality}
                    speed={prefs.speed}
                    onSpeed={setSpeed}
                    autoplay={prefs.autoplay}
                    onAutoplay={(v) => setPrefs({ autoplay: v })}
                    onShortcuts={() => setShortcutsOpen(true)}
                    onContentInfo={onContentInfo}
                    onReport={() => onReport(videoRef.current?.currentTime ?? 0)}
                  />
                </PopoverContent>
              </Popover>

              <CtrlBtn label="Theatre mode (t)" active={theatre} onClick={onToggleTheatre}>
                <RectangleHorizontal className="h-5 w-5" />
              </CtrlBtn>

              <CtrlBtn label="Fullscreen (f)" onClick={toggleFullscreen}>
                {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </CtrlBtn>
            </div>
          </div>
        </div>
      </div>

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}

function CtrlBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded text-white transition-colors hover:bg-white/15',
        active && 'text-primary'
      )}
    >
      {children}
    </button>
  );
}

function SettingsPanel({
  qualities,
  qualityIdx,
  onQuality,
  speed,
  onSpeed,
  autoplay,
  onAutoplay,
  onShortcuts,
  onContentInfo,
  onReport,
}: {
  qualities: QualityOption[];
  qualityIdx: number;
  onQuality: (i: number) => void;
  speed: number;
  onSpeed: (s: number) => void;
  autoplay: boolean;
  onAutoplay: (v: boolean) => void;
  onShortcuts: () => void;
  onContentInfo: () => void;
  onReport: () => void;
}) {
  const [view, setView] = useState<'main' | 'quality' | 'speed'>('main');

  if (view === 'quality') {
    return (
      <SubMenu title="Quality" onBack={() => setView('main')}>
        {qualities.map((q, i) => (
          <RowBtn key={i} onClick={() => onQuality(i)} active={i === qualityIdx}>
            {q.label}
          </RowBtn>
        ))}
      </SubMenu>
    );
  }
  if (view === 'speed') {
    return (
      <SubMenu title="Speed" onBack={() => setView('main')}>
        {SPEED_OPTIONS.map((s) => (
          <RowBtn key={s} onClick={() => onSpeed(s)} active={s === speed}>
            {s === 1 ? 'Normal' : `${s}x`}
          </RowBtn>
        ))}
      </SubMenu>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setView('quality')}
        className="flex w-full items-center justify-between rounded px-2 py-2 text-sm hover:bg-muted"
      >
        <span>Quality</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {qualities[qualityIdx]?.label ?? 'Auto'} <ChevronRight className="h-4 w-4" />
        </span>
      </button>
      <button
        onClick={() => setView('speed')}
        className="flex w-full items-center justify-between rounded px-2 py-2 text-sm hover:bg-muted"
      >
        <span>Speed</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {speed === 1 ? 'Normal' : `${speed}x`} <ChevronRight className="h-4 w-4" />
        </span>
      </button>
      <div className="flex items-center justify-between rounded px-2 py-2 text-sm">
        <span>Autoplay</span>
        <Switch checked={autoplay} onCheckedChange={onAutoplay} aria-label="Autoplay" />
      </div>
      <div className="my-1 border-t" />
      <RowAction icon={Keyboard} label="Keyboard shortcuts" onClick={onShortcuts} />
      <RowAction icon={Info} label="Content information" onClick={onContentInfo} />
      <RowAction icon={Flag} label="Report a problem" onClick={onReport} />
    </div>
  );
}

function SubMenu({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <button
        onClick={onBack}
        className="mb-1 flex w-full items-center gap-1 rounded px-2 py-1.5 text-sm font-semibold hover:bg-muted"
      >
        <ChevronLeft className="h-4 w-4" /> {title}
      </button>
      {children}
    </div>
  );
}

function RowBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted"
    >
      {children}
      {active && <Check className="h-4 w-4 text-primary" />}
    </button>
  );
}

function RowAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Keyboard;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" /> {label}
    </button>
  );
}

const SHORTCUTS: [string, string][] = [
  ['Space / K', 'Play or pause'],
  ['← / →', 'Seek 5 seconds'],
  ['J / L', 'Seek 10 seconds'],
  ['M', 'Mute / unmute'],
  ['C', 'Toggle captions'],
  ['T', 'Theatre mode'],
  ['F', 'Fullscreen'],
  ['?', 'Show this help'],
];

function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Click the player first, then use these keys.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{desc}</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">{key}</kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
