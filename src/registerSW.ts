/**
 * Safe ServiceWorker registration that handles sandboxed iframes (e.g. AI Studio preview)
 * and automatically updates installed PWA apps when a new build is deployed.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;

  try {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      return;
    }

    if ('serviceWorker' in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/', updateViaCache: 'none' })
          .then((registration) => {
            registration.update().catch(() => {});
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          })
          .catch(() => {});
      });
    }
  } catch {
    // Suppress any environment errors
  }
}
