import { useEffect } from 'react';

const MESSAGE = 'You have unsaved changes. Leave this page and discard them?';

/**
 * Warns before losing unsaved work.
 *
 * - `beforeunload` covers reloads and closing the tab.
 * - A capture-phase click listener covers in-app <Link>/<a> navigation
 *   (this app uses BrowserRouter, so react-router's useBlocker is unavailable).
 * - `popstate` covers browser back/forward by restoring the current entry when
 *   the user cancels.
 */
export function useUnsavedChangesGuard(active: boolean, message = MESSAGE) {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    const onClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]') as
        | HTMLAnchorElement
        | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href') ?? '';
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (anchor.href === window.location.href) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onPopState = () => {
      if (!window.confirm(message)) {
        window.history.forward();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClickCapture, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClickCapture, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, [active, message]);
}
