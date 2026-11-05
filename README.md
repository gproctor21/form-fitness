# FORM

A private, mobile-first training foundation built with React 19, TypeScript, and Vite. No sample fitness readings, telemetry, remote fonts, or Health integrations are enabled. Empty metrics mean no data is available. Training minutes come only from manually entered sessions.

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
2. Merge the foundation PR into `main`. The included **Build and deploy FORM** workflow runs tests, builds, and deploys. If already merged before enabling Pages, open **Actions → Build and deploy FORM → Run workflow** on `main`.
3. After a successful deployment, open **https://gproctor21.github.io/form-fitness/** in Safari. Tap **Share → Add to Home Screen**. Launch once while online; the app shell becomes available offline after the service worker installs. Updates show an explicit update button.

This workflow requires GitHub Pages to be enabled and permitted by repository/account policies. The initial deployment and physical iPhone installation must be verified on the device.

## Local vault and backup

Create a passphrase of at least 12 characters before logging a workout. The vault uses Web Crypto AES-256-GCM, a fresh random 96-bit IV on every save, and a PBKDF2-SHA-256 key derived with 600,000 iterations and a random 128-bit salt. Only ciphertext, IV, salt, and format version are saved in localStorage; the key and decrypted journal stay in memory. The journal locks when the document becomes hidden. This can include opening the iOS share sheet, so unlock again if needed.

Export the encrypted backup in Settings and keep it in Files. To restore, open Settings in a fresh installation/origin without an existing vault, select the JSON backup, and unlock with its original passphrase. There is no account, sync, passphrase recovery, or automatic backup. Browser data removal, device loss, or storage eviction can erase the local journal. Encryption at rest does not protect an unlocked session or a compromised device. This is a local foundation, not a clinically validated health storage system.

The service worker caches static application files only. No workout data is sent to GitHub or a backend. Hosting providers can still receive normal asset requests. Future secure sync and Apple Health Shortcuts import require a separately designed authenticated endpoint, explicit user consent, schema validation, and a migration plan; do not embed a shared API secret in this client.

## Validation

`npm test` checks encryption round-trip, wrong-passphrase and tamper rejection, and fresh IVs. `npm run build` performs strict TypeScript checking and generates the offline app and web manifest. CI repeats both on pull requests and main.

Browser integration checks live in `tests/foundation.spec.ts`. Run `npx playwright install chromium` and `npm run test:e2e`. Local execution was blocked by macOS sandbox restrictions on launching Chromium; the built-in browser was used for manual UI checks. Physical iOS and offline restoration checks remain to be completed. Build tooling currently reports six low/moderate transitive dependency advisories; `npm audit --omit=dev` reports none. Review upstream fixes before expanding production scope.
