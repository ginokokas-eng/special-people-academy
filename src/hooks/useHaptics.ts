import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNativeShell } from '@/lib/native';

/**
 * Haptics, gated on the learner's own preference (Profile → Accessibility →
 * Haptic feedback) and on running inside the Capacitor shell. Every call is
 * fire-and-forget: a device without a vibrator must never throw.
 *
 * Where the design uses them — and nowhere else:
 *   selection  — picking a quiz answer, toggling a download
 *   success    — lesson marked complete, quiz passed, download finished
 *   warning    — wrong answer on the final attempt
 *   impact     — pull-to-refresh release on Learn
 *
 * Do NOT fire on: navigation, scrolling, tab switches, or opening a screen.
 */
const enabled = () => isNativeShell() && localStorage.getItem('spa.haptics') !== 'off';

const safe = (fn: () => Promise<unknown>) => {
  if (!enabled()) return;
  void fn().catch(() => {});
};

export const haptics = {
  selection: () => safe(() => Haptics.selectionStart().then(() => Haptics.selectionEnd())),
  success: () => safe(() => Haptics.notification({ type: NotificationType.Success })),
  warning: () => safe(() => Haptics.notification({ type: NotificationType.Warning })),
  impact: () => safe(() => Haptics.impact({ style: ImpactStyle.Light })),
};

export const useHaptics = () => haptics;
