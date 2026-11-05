# FORM

A private, mobile-first training foundation built with React 19, TypeScript, and Vite. No sample fitness readings, telemetry, or remote fonts are enabled. Apple Health daily summaries can be imported manually from iPhone Shortcuts. Empty metrics mean no data is available. Training minutes come only from manually entered sessions.

## Development

Use Node 22.12+ (Node 22 LTS recommended).

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Production base path is `/form-fitness/` for GitHub Pages. Change `base` in `vite.config.ts` before using a different path or a custom domain. Do not put secrets in `VITE_*` variables: those are public client code.

## Deploy from an iPhone

1. In this repository on GitHub, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. In Safari, use Request Desktop Website if needed.
2. Merge the latest PR into `main`. The included **Build and deploy FORM** workflow runs tests, builds, and deploys. If already merged before enabling Pages, open **Actions → Build and deploy FORM → Run workflow** on `main`.
3. After a successful deployment, open **https://gproctor21.github.io/form-fitness/** in Safari. Tap **Share → Add to Home Screen**. Launch once while online; the app shell becomes available offline after the service worker installs. Updates show an explicit update button.

This workflow requires GitHub Pages to be enabled and permitted by repository/account policies. The initial deployment and physical iPhone installation must be verified on the device.

## Local vault and backup

Create a passphrase of at least 12 characters before logging a workout. The vault uses Web Crypto AES-256-GCM, a fresh random 96-bit IV on every save, and a PBKDF2-SHA-256 key derived with 600,000 iterations and a random 128-bit salt. Only ciphertext, IV, salt, and format version are saved in localStorage; the key and decrypted journal stay in memory. The journal stays unlocked for up to two minutes while the app is in the background, so you can briefly switch to Shortcuts or Files. It locks after that interval, including when iOS suspends timers and you return later. Manual locking is immediate. Keys remain only in memory: reloading or iOS discarding the app still requires the passphrase. Returning within the grace period preserves in-progress forms and imports.

Export the encrypted backup in Settings and keep it in Files. To restore, open Settings in a fresh installation/origin without an existing vault, select the JSON backup, and unlock with its original passphrase. There is no account, sync, passphrase recovery, or automatic backup. Browser data removal, device loss, or storage eviction can erase the local journal. Encryption at rest does not protect an unlocked session or a compromised device. This is a local foundation, not a clinically validated health storage system.

The service worker caches static application files only. No workout data is sent to GitHub or a backend. Hosting providers can still receive normal asset requests. Shortcuts imports are reviewed locally and do not need a server. Future automatic sync requires a separately designed authenticated endpoint and explicit consent; do not embed a shared API secret in this client.

## Validation

`npm test` checks encryption round-trip, wrong-passphrase and tamper rejection, and fresh IVs. `npm run build` performs strict TypeScript checking and generates the offline app and web manifest. CI repeats both on pull requests and main.

Browser integration checks live in `tests/foundation.spec.ts`. Run `npx playwright install chromium` and `npm run test:e2e`. Local execution was blocked by macOS sandbox restrictions on launching Chromium; the built-in browser was used for manual UI checks. Physical iOS and offline restoration checks remain to be completed. Build tooling currently reports six low/moderate transitive dependency advisories; `npm audit --omit=dev` reports none. Review upstream fixes before expanding production scope.

## Apple Health via iPhone Shortcuts

Open **Health** in FORM, unlock the vault, then expand **Set up your first iPhone Shortcut**. The full guide is bundled at `public/health-shortcuts-guide.html` and works offline after the app shell is cached. Create the Shortcut on the iPhone, grant Health read permission there, and save its JSON output to Files. FORM validates, previews, and encrypts each explicitly saved daily summary. No native HealthKit connection or background sync is claimed. Start with steps from one selected source on one completed day. Keep the raw export private: it is plaintext in Files.

The version 1 schema requires `days`, each with `date` (YYYY-MM-DD), `source`, and at least one supported numeric reading. Units are explicit: `steps`, `activeEnergyKcal`, `restingHeartRateBpm`, `sleepHours`, `dietaryEnergyKcal`, `weightKg`. Files are limited to 1 MB and 366 days. Duplicate dates within an import are rejected. Reimporting a day replaces its **entire** summary; it never adds totals or merges unknown source overlaps. Missing/permission-denied fields are omitted, not converted to zero. Dashboard metrics show today's readings only; history includes the data date and local import time. Real iPhone Shortcut execution and Apple Health permissions must be verified on the device.

Existing workout-only vaults open without migration. New Health fields are included in encrypted backup/restore, and adding a workout preserves them. Vault keys are never used in URLs, project links, or clipboard summaries.

## ChatGPT project handoff

Per the user's choice, the Chat tab opens the existing Health & Fitness ChatGPT project, rather than embedding an API chat. The destination was verified in the signed-in browser. It displays no private context in the public code; the project ID is a destination identifier, not an access credential. Normal ChatGPT sign-in still applies. FORM has no access to project memory or conversations. Unlock the vault to review and manually copy the latest seven imported daily summaries and ten workouts. Nothing is transmitted to ChatGPT until the user chooses to paste it there. No API billing, server, or API key was added.

Tests additionally cover malformed/invalid dates and units, duplicate rejection, replacement without double counting, encrypted Health round-trip, and compatibility with old workout-only vaults.

## Visual direction

Warm limestone and concrete tones, sage ceramic tile geometry, soft glass panels, and charcoal framing inspired by the user-provided Mexico City bathroom reference. All surfaces, dialogs, navigation, the offline guide, and PWA chrome use the light palette. The private reference photo is not bundled or published.
