export const VAULT_GRACE_MS = 2 * 60 * 1000;
type Clock = {
  now: () => number;
  schedule: (callback: () => void, delay: number) => () => void;
};
const browserClock: Clock = {
  now: () => Date.now(),
  schedule(callback, delay) {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
};
/** Keys stay in memory. Check elapsed time on return because iOS may suspend timers. */
export function createBackgroundLock(
  lock: () => void,
  clock: Clock = browserClock,
) {
  let hiddenAt: number | null = null;
  let cancel: (() => void) | undefined;
  function clearTimer() {
    cancel?.();
    cancel = undefined;
  }
  function hide() {
    if (hiddenAt !== null) return; // pagehide + visibilitychange must not extend the window.
    hiddenAt = clock.now();
    cancel = clock.schedule(() => {
      if (hiddenAt !== null) {
        hiddenAt = null;
        cancel = undefined;
        lock();
      }
    }, VAULT_GRACE_MS);
  }
  function show() {
    clearTimer();
    if (hiddenAt !== null) {
      const elapsed = clock.now() - hiddenAt;
      hiddenAt = null;
      if (elapsed >= VAULT_GRACE_MS || elapsed < 0) lock();
    }
  }
  function dispose() {
    clearTimer();
    hiddenAt = null;
  }
  return { hide, show, dispose };
}
