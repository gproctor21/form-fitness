export type HealthDay = {
  date: string;
  source: string;
  steps?: number;
  activeEnergyKcal?: number;
  restingHeartRateBpm?: number;
  sleepHours?: number;
  dietaryEnergyKcal?: number;
  weightKg?: number;
};
export type HealthImport = { version: 1; days: HealthDay[] };
export type SavedHealthDay = HealthDay & { importedAt: string };
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const ranges: Record<string, [number, number]> = {
  steps: [0, 200000],
  activeEnergyKcal: [0, 20000],
  restingHeartRateBpm: [15, 300],
  sleepHours: [0, 24],
  dietaryEnergyKcal: [0, 30000],
  weightKg: [1, 700],
};
export function parseHealthImport(raw: string): HealthImport {
  if (raw.length > 1_000_000)
    throw new Error("Choose a daily summary smaller than 1 MB.");
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    throw new Error(
      "This is not valid JSON. Choose the FORM summary saved by your Shortcut.",
    );
  }
  if (
    !input ||
    typeof input !== "object" ||
    !("version" in input) ||
    input.version !== 1 ||
    !("days" in input) ||
    !Array.isArray(input.days) ||
    input.days.length < 1 ||
    input.days.length > 366
  )
    throw new Error("Use a version 1 FORM export with 1–366 daily summaries.");
  const dates = new Set<string>();
  const days = input.days.map((day: unknown) => {
    if (!day || typeof day !== "object" || Array.isArray(day))
      throw new Error("Each day needs a date and source.");
    const obj = day as Record<string, unknown>;
    if (
      typeof obj.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(obj.date) ||
      !Number.isFinite(Date.parse(obj.date)) ||
      new Date(obj.date).toISOString().slice(0, 10) !== obj.date ||
      obj.date > localDate()
    )
      throw new Error(
        "Dates must be valid YYYY-MM-DD values, today or earlier.",
      );
    if (dates.has(obj.date))
      throw new Error(
        "Use only one summary per date. Choose one source for each metric to avoid double counting.",
      );
    dates.add(obj.date);
    if (
      typeof obj.source !== "string" ||
      obj.source.trim().length < 1 ||
      obj.source.length > 200
    )
      throw new Error("Every day needs a source label of 1–200 characters.");
    const result: HealthDay = { date: obj.date, source: obj.source.trim() };
    let count = 0;
    for (const [key, value] of Object.entries(obj)) {
      if (key === "date" || key === "source") continue;
      if (!Object.hasOwn(ranges, key))
        throw new Error(
          `Unsupported field: ${key}. Import daily summaries, not raw Health samples.`,
        );
      const [min, max] = ranges[key];
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max ||
        (key === "steps" && !Number.isInteger(value))
      )
        throw new Error(`Invalid ${key}. Check its value and unit.`);
      (result as unknown as Record<string, unknown>)[key] = value;
      count++;
    }
    if (!count)
      throw new Error(
        "Each day needs at least one reading. Omit unavailable readings instead of using zero.",
      );
    return result;
  });
  return {
    version: 1,
    days: days.sort((a, b) => b.date.localeCompare(a.date)),
  };
}
export function mergeHealthDays(
  existing: SavedHealthDay[],
  incoming: HealthImport,
  importedAt = new Date().toISOString(),
): SavedHealthDay[] {
  const byDate = new Map(existing.map((d) => [d.date, d]));
  // One complete summary per date: replace, never add totals or silently mix sources.
  for (const day of incoming.days) byDate.set(day.date, { ...day, importedAt });
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date));
}
export const healthLabels: Record<
  keyof Omit<HealthDay, "date" | "source">,
  string
> = {
  steps: "Steps",
  activeEnergyKcal: "Active energy (kcal)",
  restingHeartRateBpm: "Resting heart rate (bpm)",
  sleepHours: "Sleep (hours)",
  dietaryEnergyKcal: "Dietary energy (kcal)",
  weightKg: "Weight (kg)",
};
