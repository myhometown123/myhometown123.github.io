# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
