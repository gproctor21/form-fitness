import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  House,
  MessageCircle,
  LockKeyhole,
  Plus,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { deriveKey, open, seal, type Journal, type Workout } from "./vault";
import "./styles.css";
import { HealthPanel } from "./HealthPanel";
import { CoachPanel } from "./CoachPanel";
import { localDate, mergeHealthDays, type HealthImport } from "./health";
const STORAGE = "form.vault.v1";
const today = localDate;
function App() {
  const [tab, setTab] = useState("Today");
  const [journal, setJournal] = useState<Journal>({ workouts: [] });
  const [unlocked, setUnlocked] = useState(false);
  const [hasVault, setHasVault] = useState(() => {
    try {
      return !!localStorage.getItem(STORAGE);
    } catch {
      return false;
    }
  });
  const [modal, setModal] = useState<"vault" | "workout" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const session = useRef<{ key: CryptoKey; salt: Uint8Array } | null>(null);
  const afterUnlock = useRef(false);
  const revision = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const {
    needRefresh: [refresh],
    updateServiceWorker,
  } = useRegisterSW();
  const lock = () => {
    revision.current++;
    session.current = null;
    setJournal({ workouts: [] });
    setUnlocked(false);
    setModal(null);
  };
  useEffect(() => {
    const hide = () => {
      if (document.hidden) lock();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  useEffect(() => {
    setError("");
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const pass = String(data.get("passphrase"));
    const attempt = revision.current;
    try {
      const stored = localStorage.getItem(STORAGE);
      if (stored) {
        const result = await open(JSON.parse(stored), pass);
        if (attempt !== revision.current || document.hidden) return;
        session.current = result;
        setJournal(result.journal);
      } else {
        if (pass.length < 12) throw new Error("Use at least 12 characters.");
        if (pass !== data.get("confirm"))
          throw new Error("Passphrases do not match.");
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await deriveKey(pass, salt);
        localStorage.setItem(
          STORAGE,
          JSON.stringify(await seal({ workouts: [] }, key, salt)),
        );
        if (attempt !== revision.current || document.hidden) return;
        session.current = { key, salt };
        setHasVault(true);
      }
      setUnlocked(true);
      setModal(afterUnlock.current ? "workout" : null);
      afterUnlock.current = false;
    } catch {
      setError(
        "Could not open or save the vault. Check your passphrase, confirmation, and available storage. New passphrases need 12 characters.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.current) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const workout: Workout = {
      id: crypto.randomUUID(),
      name: String(data.get("name")).trim(),
      date: String(data.get("date")),
      minutes: Number(data.get("minutes")),
      kind: data.get("kind") as Workout["kind"],
    };
    if (
      !workout.name ||
      !Number.isInteger(workout.minutes) ||
      workout.minutes < 1 ||
      workout.minutes > 1440 ||
      workout.date > today()
    ) {
      setError("Enter a valid workout, date, and duration.");
      setBusy(false);
      return;
    }
    const next = { ...journal, workouts: [workout, ...journal.workouts] };
    try {
      await persist(next);
      setModal(null);
      setTab("Training");
    } catch {
      setError("Storage is unavailable or full. Your workout was not saved.");
    } finally {
      setBusy(false);
    }
  }
  const log = () => {
    afterUnlock.current = true;
    setModal(unlocked ? "workout" : "vault");
  };
  async function persist(next: Journal) {
    const active = session.current;
    const attempt = revision.current;
    if (!active) throw new Error("Unlock your vault first.");
    const encrypted = await seal(next, active.key, active.salt);
    if (attempt !== revision.current || session.current !== active)
      throw new Error("Vault locked.");
    localStorage.setItem(STORAGE, JSON.stringify(encrypted));
    setJournal(next);
  }
  async function saveHealth(data: HealthImport) {
    if (busy) throw new Error("A save is already in progress.");
    setBusy(true);
    try {
      await persist({
        ...journal,
        healthDays: mergeHealthDays(journal.healthDays ?? [], data),
      });
    } finally {
      setBusy(false);
    }
  }
  const dailyHealth = journal.healthDays?.find((day) => day.date === today());
  const latestHealth = journal.healthDays?.[0];
  const completed = journal.workouts.filter((w) => w.date === today());
  const minutes = completed.reduce((sum, w) => sum + w.minutes, 0);
  function backup() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE);
    } catch {
      setError("Backup unavailable. Check storage access.");
      return;
    }
    if (!raw) return;
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "form-encrypted-backup.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      if (hasVault) throw new Error("A vault already exists.");
      if (file.size > 5_000_000) throw new Error("File too large.");
      const raw = await file.text();
      const data = JSON.parse(raw);
      if (
        data.version !== 1 ||
        !["salt", "iv", "ciphertext"].every((k) => typeof data[k] === "string")
      )
        throw new Error("Invalid backup");
      localStorage.setItem(STORAGE, raw);
      setHasVault(true);
      setError("Backup restored. Unlock with its original passphrase.");
    } catch {
      setError(
        "Could not restore this backup. Restore is available only before creating a vault.",
      );
    }
  }
  return (
    <div className="app">
      <header>
        <a
          className="wordmark"
          href="#"
          aria-label="FORM home"
          onClick={(e) => {
            e.preventDefault();
            setTab("Today");
          }}
        >
          F<span>O</span>RM<span className="brand-dot">.</span>
        </a>
        <div className="header-right">
          <span className="private">
            <span /> PERSONAL SPACE
          </span>
          <button
            className="avatar"
            onClick={() => setTab("Settings")}
            aria-label="Open settings"
          >
            G
          </button>
        </div>
      </header>
      <main>
        <div className="eyebrow date">
          {new Date()
            .toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
            .toUpperCase()}
        </div>
        <section className="heading">
          <div>
            <h1>
              {tab === "Today"
                ? "Find your form."
                : tab === "Training"
                  ? "Make it count."
                  : tab === "Health"
                    ? "Know your rhythm."
                    : tab === "Chat"
                      ? "Keep the conversation going."
                      : "Your space."}
            </h1>
            <p>
              {tab === "Today"
                ? "A little intention. A stronger everyday."
                : tab === "Training"
                  ? "Your work, recorded on your terms."
                  : "Private by design. Yours to control."}
            </p>
          </div>
          <button className="desktop-log primary" onClick={log}>
            <Plus size={18} /> Log workout
          </button>
        </section>
        {refresh && (
          <aside className="notice">
            A new version is ready. Save your work first.{" "}
            <button onClick={() => void updateServiceWorker(true)}>
              Update FORM
            </button>
          </aside>
        )}
        {tab === "Today" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="live-dot" /> YOUR NEXT CHAPTER
                </div>
                <h2>
                  Progress starts
                  <br />
                  with showing up.
                </h2>
                <p>
                  {journal.workouts.length
                    ? "Keep building on the work you’ve done."
                    : "Your first session is a fresh start."}
                  <br />
                  Build a rhythm that feels like you.
                </p>
                <button className="primary" onClick={log}>
                  Log a workout <ArrowUpRight size={19} />
                </button>
              </div>
              <div className="orbit" aria-hidden="true">
                <div className="orbit-inner">
                  <Activity size={36} strokeWidth={1.3} />
                  <span>
                    ONE DAY
                    <br />
                    AT A TIME
                  </span>
                </div>
              </div>
              <span className="hero-index">01 / THE FOUNDATION</span>
            </section>
            <div className="section-title">
              <h2>Today, at a glance</h2>
              <span>{unlocked ? "YOUR ENTRIES" : "AWAITING YOUR DATA"}</span>
            </div>
            <section className="metrics" aria-label="Daily metrics">
              {[
                {
                  label: "Training",
                  value: unlocked ? String(minutes) : "—",
                  unit: "min",
                  icon: Dumbbell,
                  note: unlocked
                    ? `${completed.length} sessions logged`
                    : "Unlock to see your sessions",
                },
                {
                  label: "Daily movement",
                  value: dailyHealth?.steps?.toLocaleString() ?? "—",
                  unit: "steps",
                  icon: Footprints,
                  note:
                    dailyHealth?.steps !== undefined
                      ? "Imported · " + dailyHealth.source
                      : "No steps imported for today",
                },
                {
                  label: "Sleep",
                  value: dailyHealth?.sleepHours?.toLocaleString() ?? "—",
                  unit: "hours",
                  icon: Heart,
                  note:
                    dailyHealth?.sleepHours !== undefined
                      ? "Imported · " + dailyHealth.date
                      : "No sleep imported for today",
                },
                {
                  label: "Nutrition",
                  value:
                    dailyHealth?.dietaryEnergyKcal?.toLocaleString() ?? "—",
                  unit: "kcal",
                  icon: Flame,
                  note:
                    dailyHealth?.dietaryEnergyKcal !== undefined
                      ? "Imported dietary energy"
                      : "No nutrition imported for today",
                },
              ].map((m) => (
                <article className="metric" key={m.label}>
                  <div className="metric-top">
                    <span>{m.label}</span>
                    <m.icon size={18} />
                  </div>
                  <div className="metric-value">
                    {m.value}
                    <small>{m.unit}</small>
                  </div>
                  <p>{m.note}</p>
                </article>
              ))}
            </section>
            <section className="lower-grid">
              <article className="panel">
                <div className="section-title">
                  <h2>Your training</h2>
                  <Dumbbell size={19} />
                </div>
                <div className="empty-icon">
                  <Plus size={25} />
                </div>
                <h3>Room for your next win.</h3>
                <p>
                  Strength, a run, or a moment to move.
                  <br />
                  Every session belongs here.
                </p>
                <button className="text-button" onClick={log}>
                  Add a session <ArrowUpRight size={16} />
                </button>
              </article>
              <article className="panel connection">
                <span className="eyebrow">BUILT AROUND YOU</span>
                <div className="connection-icon">
                  <Heart size={26} />
                </div>
                <h3>Your health. One clear view.</h3>
                <p>
                  {latestHealth
                    ? `Latest import: ${latestHealth.date} from ${latestHealth.source}.`
                    : "Bring in Apple Health readings with an iPhone Shortcut. Review each import before saving."}
                </p>
                <span className="pill">
                  {latestHealth ? "MANUAL IMPORT" : "SHORTCUTS BRIDGE"}
                </span>
                <button
                  className="text-button"
                  onClick={() => setTab("Health")}
                >
                  Import Health data <ArrowUpRight size={16} />
                </button>
                <div className="privacy-line">
                  <ShieldCheck size={16} /> No health data leaves this app.
                </div>
              </article>
            </section>
          </>
        )}
        {tab === "Training" && (
          <section className="panel training">
            <div className="section-title">
              <h2>Workout journal</h2>
              <button className="primary" onClick={log}>
                <Plus size={18} /> Add session
              </button>
            </div>
            {!unlocked ? (
              <div className="empty-state">
                <LockKeyhole />
                <h3>
                  {hasVault
                    ? "Your journal is locked."
                    : "Start your private journal."}
                </h3>
                <p>Create or unlock your vault to view your sessions.</p>
                <button
                  className="text-button"
                  onClick={() => setModal("vault")}
                >
                  {hasVault ? "Unlock journal" : "Create vault"}{" "}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            ) : journal.workouts.length === 0 ? (
              <div className="empty-state">
                <Dumbbell />
                <h3>Your first session goes here.</h3>
                <p>Only workouts you log will appear.</p>
              </div>
            ) : (
              <ul className="workouts">
                {[...journal.workouts]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((w) => (
                    <li key={w.id}>
                      <span className="workout-icon">
                        <Dumbbell size={20} />
                      </span>
                      <div>
                        <h3>{w.name}</h3>
                        <p>
                          {w.kind} · {w.date}
                        </p>
                      </div>
                      <strong>
                        {w.minutes}
                        <small> min</small>
                      </strong>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        )}
        {tab === "Health" &&
          (unlocked ? (
            <HealthPanel
              days={journal.healthDays ?? []}
              onSave={saveHealth}
              busy={busy}
            />
          ) : (
            <section className="panel">
              <Heart size={28} />
              <h2>Apple Health via Shortcuts.</h2>
              <p>
                Unlock your vault to import and review Health summaries from
                your iPhone. FORM cannot request HealthKit access from a
                website.
              </p>
              <button
                className="primary"
                onClick={() => {
                  afterUnlock.current = false;
                  setModal("vault");
                }}
              >
                {hasVault ? "Unlock vault" : "Create vault"}
              </button>
            </section>
          ))}
        {tab === "Chat" && (
          <CoachPanel
            days={journal.healthDays ?? []}
            workouts={journal.workouts}
            unlocked={unlocked}
          />
        )}
        {tab === "Settings" && (
          <section className="panel settings">
            <ShieldCheck size={30} />
            <h2>A private foundation.</h2>
            <p>
              Your journal is encrypted on this device with a passphrase you
              choose. FORM has no account, server sync, or passphrase recovery.
              Clearing website data can erase your journal. Keep an encrypted
              backup.
            </p>
            <p>
              The vault locks when you leave the app. Encryption protects saved
              data; it does not protect an unlocked screen or a compromised
              device.
            </p>
            <div className="settings-actions">
              <button
                className="primary"
                onClick={() => (unlocked ? lock() : setModal("vault"))}
              >
                <LockKeyhole size={17} />
                {unlocked
                  ? "Lock journal"
                  : hasVault
                    ? "Unlock journal"
                    : "Create vault"}
              </button>
              <button disabled={!hasVault} onClick={backup}>
                <ArrowDownToLine size={17} /> Export encrypted backup
              </button>
              {!hasVault && (
                <label className="file-button">
                  Restore encrypted backup
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) => void restore(e.target.files?.[0])}
                  />
                </label>
              )}
            </div>
            {error && <p role="status">{error}</p>}
            <hr />
            <h3>Install on iPhone</h3>
            <p>
              Open the deployed HTTPS site in Safari. Tap Share, then Add to
              Home Screen. Open FORM once online to prepare it for offline use.
            </p>
            <h3>Apple Health</h3>
            <p>
              Use the Health tab to import a daily summary saved by an iPhone
              Shortcut. There is no background sync or direct website access to
              HealthKit.
            </p>
          </section>
        )}
        <footer>
          <span className="wordmark small">FORM.</span>
          <span>CONSISTENCY OVER PERFECTION.</span>
          <ShieldCheck size={15} />
        </footer>
      </main>
      <nav aria-label="Main navigation">
        {[
          { name: "Today", icon: House },
          { name: "Training", icon: Dumbbell },
          { name: "Health", icon: Heart },
          { name: "Chat", icon: MessageCircle },
          { name: "Settings", icon: Settings },
        ].map((item) => (
          <button
            key={item.name}
            className={tab === item.name ? "active" : ""}
            aria-current={tab === item.name ? "page" : undefined}
            onClick={() => setTab(item.name)}
          >
            <item.icon size={21} />
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      <dialog
        ref={dialog}
        onCancel={() => {
          if (!busy) setModal(null);
        }}
        onClose={() => {
          if (!busy) setModal(null);
        }}
      >
        <div className="dialog-heading">
          <span className="eyebrow">
            {modal === "vault" ? "YOUR PRIVATE JOURNAL" : "MAKE IT COUNT"}
          </span>
          <button
            aria-label="Close dialog"
            disabled={busy}
            onClick={() => setModal(null)}
          >
            <X size={20} />
          </button>
        </div>
        {modal === "vault" ? (
          <form onSubmit={unlock}>
            <LockKeyhole size={28} />
            <h2>{hasVault ? "Welcome back." : "A space that’s yours."}</h2>
            <p>
              {hasVault
                ? "Enter your passphrase to unlock this device’s journal."
                : "Choose a passphrase of at least 12 characters. It cannot be recovered. Save an encrypted backup after logging."}
            </p>
            <label>
              Passphrase
              <input
                autoFocus
                name="passphrase"
                type="password"
                minLength={12}
                required
                autoComplete={hasVault ? "current-password" : "new-password"}
              />
            </label>
            {!hasVault && (
              <label>
                Confirm passphrase
                <input
                  name="confirm"
                  type="password"
                  minLength={12}
                  required
                  autoComplete="new-password"
                />
              </label>
            )}
            <button className="primary" disabled={busy}>
              {busy
                ? "Opening…"
                : hasVault
                  ? "Unlock journal"
                  : "Create encrypted vault"}
            </button>
          </form>
        ) : modal === "workout" ? (
          <form onSubmit={save}>
            <h2>Showed up. Logged it.</h2>
            <label>
              Session name
              <input
                autoFocus
                name="name"
                placeholder="e.g. Morning strength"
                maxLength={80}
                required
              />
            </label>
            <div className="form-row">
              <label>
                Type
                <select name="kind">
                  <option>Strength</option>
                  <option>Run</option>
                  <option>Mobility</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Minutes
                <input
                  name="minutes"
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  inputMode="numeric"
                  required
                />
              </label>
            </div>
            <label>
              Date
              <input
                name="date"
                type="date"
                defaultValue={today()}
                max={today()}
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              <Check size={18} />
              {busy ? "Saving…" : "Save session"}
            </button>
          </form>
        ) : null}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </dialog>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
