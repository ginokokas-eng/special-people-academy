import { useCallback, useEffect, useState } from 'react';
import {
  downloadLesson,
  getEntry,
  isWifiOnly,
  offlineSupported,
  removeLesson,
  subscribeOffline,
  wouldUseMobileData,
  type DownloadState,
} from '@/lib/offline';
import { haptics } from '@/hooks/useHaptics';

/**
 * One lesson's download, as the row sees it. State lives here rather than in a
 * modal: the row shows queued → downloading n% → ready, and an error stays on
 * the row as "Retry download".
 */
export function useOfflineLesson(lessonId: string | null, courseId: string | null, path: string | null) {
  const [state, setState] = useState<DownloadState>(() =>
    lessonId && getEntry(lessonId) ? 'ready' : 'idle',
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  /** Set when a tap needs the learner to confirm spending mobile data. */
  const [confirmMobileData, setConfirmMobileData] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    const sync = () => setState(getEntry(lessonId) ? 'ready' : 'idle');
    sync();
    return subscribeOffline(sync);
  }, [lessonId]);

  const start = useCallback(async () => {
    if (!lessonId || !courseId || !path) return;
    setError(null);
    setConfirmMobileData(false);
    setState('queued');
    try {
      setState('downloading');
      await downloadLesson({ lessonId, courseId, path, onProgress: setProgress });
      setState('ready');
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    }
  }, [lessonId, courseId, path]);

  const toggle = useCallback(async () => {
    if (!lessonId || !offlineSupported()) return;
    haptics.selection();

    if (getEntry(lessonId)) {
      await removeLesson(lessonId);
      setProgress(0);
      return;
    }
    // Wifi-only is the default: on mobile data, ask rather than queue.
    if (isWifiOnly() && (await wouldUseMobileData())) {
      setConfirmMobileData(true);
      return;
    }
    await start();
  }, [lessonId, start]);

  return {
    state,
    progress,
    error,
    supported: offlineSupported(),
    confirmMobileData,
    dismissConfirm: () => setConfirmMobileData(false),
    confirmAndStart: start,
    toggle,
  };
}
