# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
