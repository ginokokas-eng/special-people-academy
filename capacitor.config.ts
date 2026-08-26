import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Special People Academy — Android shell.
 * The web build is BUNDLED into the app (the Ariadne house pattern) — the
 * Lovable preview origin is auth-gated, so a hosted server.url cannot work
 * until the site has a published public domain.
 */
const config: CapacitorConfig = {
  appId: 'uk.org.specialpeople.academy',
  appName: 'Special People Academy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#00000000',
    },
    SafeArea: {
      // Dark bar content on the light violet canvas; the plugin injects the
      // --safe-area-inset-* CSS variables Android omits on targetSdk 35/36.
      statusBarStyle: 'LIGHT',
      navigationBarStyle: 'LIGHT',
      offset: 0,
    },
  },
};

export default config;
