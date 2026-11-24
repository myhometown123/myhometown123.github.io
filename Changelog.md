# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-11-24

### Added
- **Homepage** (`index.html`) — ZIP code lookup that resolves the city (built-in dataset with zippopotam.us fallback) and opens the city page, plus demo city links.
- **City page** (`city.html?city=…`) — displays the city and the daily 8:00 AM agent meeting: a Master Agent convenes five sub-agents (Locations Scout, Contacts Finder, Events Watcher, History Researcher, Vacation Planner) with live status, then renders findings in five sections (locations, contacts, events, history, vacation spots).
- **`?meeting=yes`** parameter auto-convenes the meeting and generates findings on load.
- **Admin page** (`admin.html`) — enable/pause agents (disabled agents are skipped at meetings), convene a test meeting, view/export/clear the meeting log (last 50, browser-local), and configure meeting time and contact email (default `ckonkol@gmail.com`).
- **Shared engine** (`assets/js/hm123.js`) — deterministic seeded findings per city (stable across visits), agent state and meeting log persisted in `localStorage`.
- **Styles** (`assets/css/styles.css`) — shared responsive layout for all pages.
- **Changelog.md** — created with this entry.
