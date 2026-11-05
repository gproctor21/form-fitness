import { useState } from "react";
import { ArrowUpRight, Copy, MessageCircle } from "lucide-react";
import { localDate, type SavedHealthDay } from "./health";
import type { Workout } from "./vault";
const PROJECT =
  "https://chatgpt.com/g/g-p-6aebcd1c6770819185f3e20e1258dc36/project";
export function CoachPanel({
  days,
  workouts,
  unlocked,
}: {
  days: SavedHealthDay[];
  workouts: Workout[];
  unlocked: boolean;
}) {
  const [status, setStatus] = useState("");
  const summary = [
    "FORM update — " + localDate(),
    "These are my imported readings and manually logged sessions, not live data. Use my Health & Fitness project context and ask about anything missing.",
    "",
    "Imported Health summaries (latest 7 days with readings):",
    ...days
      .slice(0, 7)
      .map(({ importedAt, ...d }) => JSON.stringify({ ...d, importedAt })),
    "",
    "Latest 10 manual sessions:",
    ...workouts
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
      .map(({ id, ...w }) => JSON.stringify(w)),
    "",
    "Please help me review my consistency and decide my next useful step. Do not infer missing readings or treat this as a medical diagnosis.",
  ].join("\n");
  return (
    <section className="panel coach-panel">
      <MessageCircle size={30} />
      <span className="eyebrow">YOUR EXISTING CONVERSATION</span>
      <h2>Your Health & Fitness project.</h2>
      <p>
        Continue in your existing ChatGPT project, where your project context
        remains available. FORM does not embed or automatically sync that
        project. No separate API account is needed.
      </p>
      <a
        className="button-link primary"
        href={PROJECT}
        target="_blank"
        rel="noreferrer"
      >
        Open Health & Fitness <ArrowUpRight size={18} />
      </a>
      <hr />
      <h3>Bring your latest FORM update.</h3>
      <p>
        Review the text below. Copy it and paste into a chat inside your project
        when you want ChatGPT to use these readings. Nothing is sent
        automatically.
      </p>
      {unlocked ? (
        <>
          <label>
            Summary to share
            <textarea readOnly rows={12} value={summary} />
          </label>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(summary);
                setStatus("Copied. Open your project and paste into a chat.");
              } catch {
                setStatus(
                  "Select the summary text above and copy it manually.",
                );
              }
            }}
          >
            <Copy size={17} /> Copy update
          </button>
          {status && <p role="status">{status}</p>}
        </>
      ) : (
        <p className="notice">
          Unlock your vault to prepare a summary of your private readings.
        </p>
      )}
    </section>
  );
}
