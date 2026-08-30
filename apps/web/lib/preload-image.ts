// A freshly-uploaded Google Drive-hosted image can fail to load for a
// while after upload - confirmed to sometimes take well over 30 seconds,
// though it has ALWAYS eventually succeeded in testing (CDN propagation
// delay, not a genuinely missing file). Use this before swapping a local
// preview (object URL) over to the real server URL, so the user doesn't
// see a broken-image flash right after a successful upload - the local
// preview just stays up a little longer instead.
//
// This can't retry forever like RetryImage does (the caller awaits it),
// so it gives up after a generous ~95s and lets the caller proceed anyway
// - whatever eventually renders the real URL (RetryImage/RetryNextImage)
// keeps its own indefinite retry going regardless.
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 20000, 20000, 20000];

export function preloadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let attempt = 0;
    const tryLoad = () => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => {
        if (attempt < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[attempt];
          attempt += 1;
          setTimeout(tryLoad, delay);
        } else {
          resolve(false);
        }
      };
      img.src = url;
    };
    tryLoad();
  });
}
