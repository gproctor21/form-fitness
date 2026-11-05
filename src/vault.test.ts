import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveKey, open, seal } from "./vault.ts";
test("encrypted journal round-trips; wrong passwords and tampering are rejected", async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey("a long test passphrase", salt);
  const journal = {
    workouts: [
      {
        id: "test",
        name: "Personal session",
        date: "2026-11-05",
        minutes: 30,
        kind: "Strength" as const,
      },
    ],
  };
  const envelope = await seal(journal, key, salt);
  assert.ok(!JSON.stringify(envelope).includes("Personal session"));
  assert.deepEqual(
    (await open(envelope, "a long test passphrase")).journal,
    journal,
  );
  await assert.rejects(open(envelope, "an incorrect passphrase"));
  await assert.rejects(
    open(
      { ...envelope, ciphertext: "AAAA" + envelope.ciphertext.slice(4) },
      "a long test passphrase",
    ),
  );
  const next = await seal(journal, key, salt);
  assert.notEqual(envelope.iv, next.iv);
});

test("keeps Health imports encrypted and preserves older workout-only vaults", async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey("health test passphrase", salt);
  const journal = {
    workouts: [],
    healthDays: [
      {
        date: "2025-01-01",
        source: "Private Health test source",
        steps: 1000,
        importedAt: "2025-01-02T12:00:00Z",
      },
    ],
  };
  const envelope = await seal(journal, key, salt);
  assert.ok(!JSON.stringify(envelope).includes("Private Health test source"));
  assert.deepEqual(
    (await open(envelope, "health test passphrase")).journal,
    journal,
  );
  const old = await seal({ workouts: [] }, key, salt);
  assert.deepEqual((await open(old, "health test passphrase")).journal, {
    workouts: [],
  });
});
