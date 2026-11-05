import { useState } from "react";
import { Heart, ShieldCheck, Upload } from "lucide-react";
import {
  healthLabels,
  parseHealthImport,
  type HealthImport,
  type SavedHealthDay,
} from "./health";
export function HealthPanel({
  days,
  onSave,
  busy,
}: {
  days: SavedHealthDay[];
  onSave: (data: HealthImport) => Promise<void>;
  busy: boolean;
}) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<HealthImport | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function read(file?: File) {
    if (!file) return;
    setPreview(null);
    setSaved(false);
    try {
      if (file.size > 1_000_000)
        throw new Error("Choose a file smaller than 1 MB.");
      const text = await file.text();
      setRaw(text);
      setPreview(parseHealthImport(text));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read this file.");
    }
  }
  function review() {
    setSaved(false);
    try {
      setPreview(parseHealthImport(raw));
      setError("");
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "Invalid summary");
    }
  }
  return (
    <section className="panel health-panel">
      <Heart size={28} />
      <h2>Bring your Health data into FORM.</h2>
      <p>
        Use Apple Shortcuts on your iPhone to read Health and save a daily JSON
        summary to Files. Import it here, review the values, and save them to
        your encrypted vault. This is a manual import, not continuous sync.
      </p>
      <details className="setup-guide">
        <summary>Set up your first iPhone Shortcut</summary>
        <ol>
          <li>
            Open Shortcuts and create a shortcut named{" "}
            <strong>Export to FORM</strong>.
          </li>
          <li>
            Add <strong>Find Health Samples</strong>. Choose{" "}
            <strong>Steps</strong>, a date window for one calendar day, and a
            single source (for example, your Apple Watch). Grant read access
            when iOS asks. Do not combine overlapping phone and watch samples.
          </li>
          <li>
            Add <strong>Count</strong> for those samples and stop if the result
            is zero. Add <strong>Calculate Statistics</strong>, choose{" "}
            <strong>Sum</strong>, and explicitly select the original Health
            Samples as input.
          </li>
          <li>
            Add a <strong>Dictionary</strong> with Text entries{" "}
            <code>date</code> (the selected day formatted{" "}
            <code>yyyy-MM-dd</code>) and <code>source</code> (your selected
            device), plus a Number entry <code>steps</code> set to that Sum.
          </li>
          <li>
            Add that Dictionary to a <strong>List</strong>. Add another{" "}
            <strong>Dictionary</strong> with Number <code>version</code> = 1 and
            Array <code>days</code> = the List.
          </li>
          <li>
            Use <strong>Get Text from Input</strong> on the final Dictionary,
            then <strong>Set Name</strong> to <code>form-health.json</code> and{" "}
            <strong>Save File</strong>. Run it and save to Files.
          </li>
          <li>
            Return to FORM, unlock your vault, choose that file below, review
            the readings, then tap <strong>Save Health summary</strong>.
          </li>
        </ol>
        <p>
          Start with steps for one completed day. Confirm the selected source
          and units in Shortcuts before adding other metrics. Raw sample sums
          may differ from Apple Health’s combined totals. See the full{" "}
          <a
            href={`${import.meta.env.BASE_URL}health-shortcuts-guide.html`}
            target="_blank"
            rel="noreferrer"
          >
            setup and field guide ↗
          </a>
          .
        </p>
      </details>
      <label className="file-button">
        <Upload size={17} /> Choose Health summary
        <input
          type="file"
          accept="application/json,.json"
          disabled={busy}
          onChange={(e) => void read(e.target.files?.[0])}
        />
      </label>
      <details>
        <summary>Or paste a Shortcut’s JSON output</summary>
        <label>
          Health summary JSON
          <textarea
            value={raw}
            maxLength={1_000_000}
            onChange={(e) => {
              setRaw(e.target.value);
              setPreview(null);
              setSaved(false);
            }}
            rows={7}
            spellCheck={false}
          />
        </label>
        <button onClick={review} disabled={!raw || busy}>
          Review summary
        </button>
      </details>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {preview && (
        <div className="import-review">
          <h3>
            Review {preview.days.length}{" "}
            {preview.days.length === 1 ? "day" : "days"}
          </h3>
          <p>
            Existing summaries for these dates will be replaced completely,
            including previously saved fields. Totals are never added together.
            Only save values you recognize.
          </p>
          {preview.days.map((d) => (
            <article key={d.date} className="health-day">
              <h3>{d.date}</h3>
              <p>Source: {d.source}</p>
              <dl>
                {Object.entries(healthLabels)
                  .filter(([k]) => k in d)
                  .map(([k, label]) => (
                    <div key={k}>
                      <dt>{label}</dt>
                      <dd>{d[k as keyof typeof d]}</dd>
                    </div>
                  ))}
              </dl>
            </article>
          ))}
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              try {
                setError("");
                await onSave(preview);
                setPreview(null);
                setRaw("");
                setSaved(true);
              } catch {
                setError(
                  "Could not save. Check storage space and unlock your vault again if needed.",
                );
              }
            }}
          >
            {busy ? "Saving…" : "Save Health summary"}
          </button>
        </div>
      )}
      {saved && (
        <p role="status">Health summary saved in your encrypted vault.</p>
      )}
      <div className="privacy-line">
        <ShieldCheck size={16} /> Files stay on this device. No Health data is
        uploaded.
      </div>
      <h3>Imported history</h3>
      {!days.length ? (
        <p>No Health summaries imported yet.</p>
      ) : (
        days.map((d) => (
          <article className="health-day" key={d.date}>
            <h3>{d.date}</h3>
            <p>
              {d.source} · Imported {new Date(d.importedAt).toLocaleString()}
            </p>
            <dl>
              {Object.entries(healthLabels)
                .filter(([k]) => k in d)
                .map(([k, label]) => (
                  <div key={k}>
                    <dt>{label}</dt>
                    <dd>{d[k as keyof typeof d]}</dd>
                  </div>
                ))}
            </dl>
          </article>
        ))
      )}
    </section>
  );
}
