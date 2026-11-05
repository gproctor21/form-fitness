import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHealthImport, mergeHealthDays, localDate } from "./health.ts";
const raw = (days: unknown) => JSON.stringify({ version: 1, days });
const day = { date: "2025-01-01", source: "Test source", steps: 1234 };
test("validates source, calendar dates, units, numbers and unsupported fields", () => {
  assert.deepEqual(parseHealthImport(raw([day])).days, [day]);
  for (const invalid of [
    { ...day, date: "2025-02-30" },
    { ...day, date: "2999-01-01" },
    { ...day, source: "" },
    { ...day, steps: "1234" },
    { ...day, steps: 1.5 },
    { ...day, steps: -1 },
    { ...day, weightKg: 0 },
    { ...day, sleepHours: 25 },
    { ...day, unknown: 4 },
  ])
    assert.throws(() => parseHealthImport(raw([invalid])));
  assert.throws(() => parseHealthImport(raw([day, day])));
  assert.throws(() =>
    parseHealthImport(raw([{ date: day.date, source: day.source }])),
  );
  assert.throws(() => parseHealthImport(raw([])));
  assert.throws(() => parseHealthImport("not json"));
  assert.throws(() => parseHealthImport(" ".repeat(1_000_001)));
  assert.match(localDate(), /^\d{4}-\d{2}-\d{2}$/);
});
test("reimport replaces a full day, never doubles totals or combines sources", () => {
  const first = mergeHealthDays(
    [],
    parseHealthImport(raw([{ ...day, weightKg: 75 }])),
    "2025-01-02T12:00:00Z",
  );
  const second = mergeHealthDays(
    first,
    parseHealthImport(
      raw([{ ...day, steps: 1400, source: "Other test source" }]),
    ),
    "2025-01-03T12:00:00Z",
  );
  assert.equal(second.length, 1);
  assert.equal(second[0].steps, 1400);
  assert.equal(second[0].source, "Other test source");
  assert.equal(second[0].weightKg, undefined);
  assert.equal(second[0].importedAt, "2025-01-03T12:00:00Z");
  assert.equal(first[0].steps, 1234);
});
