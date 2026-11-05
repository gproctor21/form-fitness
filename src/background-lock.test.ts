import { test } from "node:test";
import assert from "node:assert/strict";
import { createBackgroundLock, VAULT_GRACE_MS } from "./background-lock.ts";
function setup() {
  let now = 0,
    locks = 0;
  const timers = new Set<{ at: number; callback: () => void }>();
  const guard = createBackgroundLock(() => locks++, {
    now: () => now,
    schedule(callback, delay) {
      const t = { at: now + delay, callback };
      timers.add(t);
      return () => {
        timers.delete(t);
      };
    },
  });
  return {
    guard,
    get locks() {
      return locks;
    },
    get pending() {
      return timers.size;
    },
    advance(ms: number, run = true) {
      now += ms;
      if (run)
        for (const t of timers)
          if (t.at <= now) {
            timers.delete(t);
            t.callback();
          }
    },
  };
}
test("returning inside two minutes preserves the session and cancels the timer", () => {
  const s = setup();
  s.guard.hide();
  s.advance(VAULT_GRACE_MS - 1);
  s.guard.show();
  s.advance(VAULT_GRACE_MS);
  assert.equal(s.locks, 0);
  assert.equal(s.pending, 0);
  s.guard.hide();
  s.advance(VAULT_GRACE_MS);
  assert.equal(s.locks, 1);
});
test("returning after iOS suspends timers locks at the boundary", () => {
  const s = setup();
  s.guard.hide();
  s.advance(VAULT_GRACE_MS, false);
  assert.equal(s.locks, 0);
  s.guard.show();
  assert.equal(s.locks, 1);
  assert.equal(s.pending, 0);
});
test("duplicate hide events do not extend the grace period; cleanup cancels timers", () => {
  const s = setup();
  s.guard.hide();
  s.advance(VAULT_GRACE_MS / 2);
  s.guard.hide();
  s.advance(VAULT_GRACE_MS / 2);
  assert.equal(s.locks, 1);
  s.guard.show();
  assert.equal(s.locks, 1);
  s.guard.hide();
  s.guard.dispose();
  s.advance(VAULT_GRACE_MS);
  assert.equal(s.locks, 1);
  assert.equal(s.pending, 0);
});
