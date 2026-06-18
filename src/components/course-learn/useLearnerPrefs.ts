import { useCallback, useEffect, useState } from 'react';

export interface LearnerPrefs {
  speed: number;
  captions: boolean;
  theatre: boolean;
  autoplay: boolean;
  volume: number;
  muted: boolean;
}

const STORAGE_KEY = 'spta:player-prefs';

const DEFAULTS: LearnerPrefs = {
  speed: 1,
  captions: false,
  theatre: false,
  autoplay: true,
  volume: 1,
  muted: false,
};

function read(): LearnerPrefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function useLearnerPrefs() {
  const [prefs, setPrefsState] = useState<LearnerPrefs>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore quota / private mode errors */
    }
  }, [prefs]);

  const setPrefs = useCallback((partial: Partial<LearnerPrefs>) => {
    setPrefsState((prev) => ({ ...prev, ...partial }));
  }, []);

  return { prefs, setPrefs };
}

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
