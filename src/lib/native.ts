/**
 * Native platform detection + one-time native chrome setup.
 *
 * Everything here is a no-op on the web: `Capacitor.isNativePlatform()` returns
 * false in a browser, and the plugin imports are dynamic so the web bundle
 * never boots the native bridge.
 */
import { Capacitor } from '@capacitor/core';

let cached: boolean | null = null;

/** True only inside the Capacitor shell (Android/iOS). */
export function isNative(): boolean {
  if (cached === null) {
    try {
      cached = Capacitor.isNativePlatform();
    } catch {
      cached = false;
    }
  }
  return cached;
}

/** Allows the Playwright native-flag pass (and manual QA) to force the shell. */
export function isNativeShell(): boolean {
  if (typeof window !== 'undefined') {
    const forced = (window as unknown as { __FORCE_NATIVE_SHELL__?: boolean }).__FORCE_NATIVE_SHELL__;
    if (forced === true) return true;
  }
  return isNative();
}

/** Hook form, for components that need to branch on the shell. */
export function useIsNative(): boolean {
  return isNativeShell();
}

let chromeInitialised = false;

/**
 * Draw behind the status bar and make the safe-area CSS variables available.
 *
 * On targetSdk 35/36 Android reports ZERO webview safe-area insets, so
 * env(safe-area-inset-*) alone is not enough — @capacitor-community/safe-area
 * injects `--safe-area-inset-*` variables that our chrome reads through a
 * max(env(), var()) fallback.
 */
export async function initNativeChrome(): Promise<void> {
  if (chromeInitialised || !isNative()) return;
  chromeInitialised = true;

  try {
    // This version of the plugin injects the --safe-area-inset-* CSS variables
    // automatically (configured in capacitor.config.ts); we only set bar styles.
    const { SafeArea, SystemBarsStyle } = await import('@capacitor-community/safe-area');
    await SafeArea.setSystemBarsStyle({ style: SystemBarsStyle.Light }); // dark icons on light violet
  } catch {
    // Plugin unavailable (older shell / not synced yet) — CSS env() fallback applies.
  }

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Light }); // dark icons on the light violet canvas
  } catch {
    // Not available — nothing to configure.
  }
}
