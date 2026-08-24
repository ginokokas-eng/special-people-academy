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
};

export default config;
