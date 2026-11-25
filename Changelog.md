# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.1] - 2026-11-25

### Fixed
- **"Cities" not saving to Firebase** — the browser write used `firebase.firestore.FieldValue.arrayUnion(...)` / `arrayRemove(...)`, but that reference isn't exposed the way the modular SDK has it in the Firebase **compat (UMD)** SDK, so `saveCity` threw and the error was **silently swallowed** by the engine's offline `catch`. The site showed "Added to Cities" but nothing reached Firestore (the console stayed empty while reads worked). `saveCity`/`removeCity` in `assets/js/firebase-client.js` now use a plain read-modify-write `DocumentReference.set()` — the exact operation verified working against the live project over the Firestore REST API — and `assets/js/hm123.js` now logs write failures to the console instead of hiding them.

## [1.7.0] - 2026-11-25

### Added
- **Firebase Cloud Firestore as the cross-device "Cities" store** — the saved-cities list now reads/writes **Cloud Firestore directly from the browser** (`assets/js/firebase-client.js`), so a city saved on one PC/device shows up on every other **with no server deploy required**. The Firebase web config (not a secret) is pasted into `assets/js/firebase-client.js`.

### Changed
- **Cities persistence backend** (`assets/js/hm123.js`) — `loadCities`/`saveCity`/`removeCity` now use the Firebase client (`window.HM123DB`) when present, falling back to the browser's `localStorage` when Firebase isn't configured or is offline. The relay's `/cities` (Postgres) path is retired.
- **`index.html` / `city.html` / `admin.html`** — load the two Firebase `*-compat` SDK scripts and `firebase-client.js` before `hm123.js`.
- **Email on new city is unchanged** — still delivered via the Vercel relay's `/email` endpoint (which works), independent of where cities are stored.

### Notes
- Setup: create a Firebase project, enable **Cloud Firestore** (production mode), add a **Web app**, paste its `firebaseConfig` into `assets/js/firebase-client.js`, and set the Firestore rule to allow read/write on `/cities`. **No Vercel deploy is needed for this feature.**
- Until the config is pasted, the site automatically uses per-browser `localStorage` and keeps working (a warning is logged to the console).
- Firestore rules `allow read, write` on `/cities` are open by design (the list is a public, low-value list of city names). Lock it down with Firebase Auth later if you want stricter write control.

## [1.6.0] - 2026-11-25

### Added
- **Cross-device saved-cities list** — the "Cities" list now lives in a small **Postgres** database (Vercel Postgres / Neon) behind the relay, so a city you save on one PC/device shows up on every other. New relay endpoints: `GET/POST/DELETE /cities` (JSON), shared DB layer in `relay/lib/db.js` + `relay/lib/cities.js`, and the Vercel function `relay/api/cities.js`.
- **Offline fallback** — when the relay is unreachable, the site still works, using the browser's `localStorage` as a local cache; it syncs back to the database automatically once the relay is reachable.

### Changed
- **Site cities persistence** (`assets/js/hm123.js`) — `getCities()` now returns the shared (DB-backed) list, a new `loadCities()` fetches it on page load, and `saveCity`/`removeCity` persist through the relay's `/cities` (the DB decides whether a city is "new" for the add-email). `localStorage` is now a cache + offline fallback, not the source of truth.

### Notes
- Requires enabling **Vercel Postgres** on the relay project (this sets `DATABASE_URL`) and a re-deploy — see `relay/README.md` §2b. Until it's enabled, the site gracefully falls back to per-device `localStorage` and keeps working.

## [1.5.0] - 2026-11-25

### Added
- **Contact info on Vacation spots** — each spot now shows address + a Google **Map** link, phone, website, and social links (matching Locations and Events).

### Removed
- **"Example city" nav link** from the site navigation (homepage, city, and admin pages).

## [1.4.0] - 2026-11-25

### Fixed
- **Site crash on every page** — `Uncaught TypeError: HM123.renderCitiesNav is not a function` at load. `renderCitiesNav()` was defined inside the engine but never added to the `HM123` export object, so the auto-wire that renders the **Cities ▾** nav threw and the dropdown never appeared (and broke the page). It's now exported.

### Changed
- **Site wired to the live relay** — `RELAY_URL` in `assets/js/hm123.js` is now set to the deployed Vercel relay `https://myhometown123githubio.vercel.app`. Saving a brand-new city sends a real Gmail "city added" email via `POST …/email` (verified live: `200 {"ok":true,"city":…}`, `configured:true`). The **📧 Notify ckonkol** button remains the always-working, no-backend fallback.

## [1.3.0] - 2026-11-24

### Added
- **Gmail SMTP relay** (`relay/`) — a Vercel serverless function (nodemailer) that the site calls when a city is added. It sends a real Gmail email and keeps the Gmail **App Password in a Vercel env var**, never in the public site. (Also runnable as a plain Node server for local testing.)
  - `POST /email` `{ city, zip?, link? }` → sends the notification; CORS enabled. Shared send logic in `relay/lib/send.js`.

### Changed
- **Automatic "city added" email** now goes through the relay (real Gmail SMTP on Vercel) instead of FormSubmit.co. The site's JS POSTs to `RELAY_URL + /email`; a browser can't open a raw SMTP socket, so the relay does the sending.
- Set `RELAY_URL` in `assets/js/hm123.js` to your Vercel function base URL (e.g. `https://<project>.vercel.app`) to enable it (leave `''` to use only the **📧 Notify ckonkol** button, which still works with no backend).

### Notes
- The relay is a separate Vercel deployment (not served by GitHub Pages). Create a Gmail **App Password** (requires 2-Step Verification) and set `SMTP_USER` / `SMTP_PASSWORD` in Vercel — see `relay/README.md`.
- The **📧 Notify ckonkol** button (from 1.2.0) remains as the always-working, no-backend fallback.

## [1.2.0] - 2026-11-24

### Added
- **"📧 Notify ckonkol" button** — an always-working email path that opens the visitor's own mail app pre-filled (subject + city + page link) to `ckonkol@gmail.com`. No third party, no activation needed.
  - Shown in the **city page header** on every city.
  - Shown as a per-city **Notify** link in the **Admin → Cities** panel.

### Notes
- This is the reliable fallback for the "email when a city is added" feature: it works even while the [FormSubmit.co](https://formsubmit.co) **AJAX form** activation is pending.
- To enable the automatic (in-browser, no mail client) email, click the **latest "Activate Form"** link in the email FormSubmit sent to `ckonkol@gmail.com` (the AJAX endpoint `formsubmit.co/ajax/ckonkol@gmail.com` is separate from the one-time "Email Link" and needs its own activation).

## [1.1.0] - 2026-11-24

### Added
- **Cities sub-menu** in the site nav — every visited/saved city is stored (browser-local) and listed as a `city.html?city=…&zip=…` link under a **Cities ▾** dropdown on all pages.
- **Rich contact info on Locations** — each spot now shows address (with a Google **Map** link), phone (`tel:`), website, and social links (Facebook / Instagram / X) where available.
- **Rich contact info on Events** — each event now shows venue/address + Map link, phone, website, and social links.
- **Cities panel on Admin** — add a city + ZIP, and see per-city **"Today's find"** (`city.html?city=…&zip=…`) and **"Meeting"** (`…&meeting=yes`) links.
- **Email on city add** — adding a brand-new city triggers a notification email to `ckonkol@gmail.com` (one-time delivery via FormSubmit; see notes).

### Changed
- **City page default view** now shows only **Today's find** (the results) — the "8:00 AM meeting" board is hidden.
- **Meeting view** (the convening board) is now reached via **`?meeting=yes`** (linked from the Admin "Meeting" button) rather than shown on every city load.
- Nav "Example city" link now opens the plain findings page; the meeting is a deliberate action from Admin.

### Notes
- The "city added" email uses [FormSubmit.co](https://formsubmit.co) AJAX. It delivers to `ckonkol@gmail.com` only after clicking the one-time activation link FormSubmit sends to that address. Until activated, the site logs that the email wasn't delivered.
- All contact details (addresses, phones, websites, socials) are **illustrative demo data** generated locally — not real businesses.

## [1.0.0] - 2026-11-24

### Added
- **Homepage** (`index.html`) — ZIP code lookup that resolves the city (built-in dataset with zippopotam.us fallback) and opens the city page, plus demo city links.
- **City page** (`city.html?city=…`) — displays the city and the daily 8:00 AM agent meeting: a Master Agent convenes five sub-agents (Locations Scout, Contacts Finder, Events Watcher, History Researcher, Vacation Planner) with live status, then renders findings in five sections (locations, contacts, events, history, vacation spots).
- **`?meeting=yes`** parameter auto-convenes the meeting and generates findings on load.
- **Admin page** (`admin.html`) — enable/pause agents (disabled agents are skipped at meetings), convene a test meeting, view/export/clear the meeting log (last 50, browser-local), and configure meeting time and contact email (default `ckonkol@gmail.com`).
- **Shared engine** (`assets/js/hm123.js`) — deterministic seeded findings per city (stable across visits), agent state and meeting log persisted in `localStorage`.
- **Styles** (`assets/css/styles.css`) — shared responsive layout for all pages.
- **Changelog.md** — created with this entry.
