# MyHometown123 — relay (Vercel): Gmail email + shared saved-cities list

The public site is **static (GitHub Pages)** and a browser can't open a raw SMTP
socket, so the site's JS **POSTs a "city added" event** to this relay, and the relay
sends a **real Gmail email** via [nodemailer](https://nodemailer.com/).

The Gmail **App Password stays in a Vercel environment variable** — never in the
browser, never in the public repo.

The relay also serves the **shared saved-cities list** so it follows you across
PCs/devices: it reads/writes **Vercel Postgres (Neon)** through a small JSON API
(`GET/POST/DELETE /cities`). The `DATABASE_URL` connection string stays in Vercel
too — never in the browser, never in the public repo.

## Layout

- `api/email.js` — the **Vercel function**: `POST /email { city, zip?, link? }`
- `api/cities.js` — the **Vercel function**: `GET/POST/DELETE /cities` (the shared saved-cities list)
- `lib/send.js` — the shared Gmail/nodemailer sending code
- `lib/cities.js` — shared cities logic (input validation + query)
- `lib/db.js` — Postgres access for the `cities` table; connection from `DATABASE_URL`
- `server.js` — optional plain-Node server (same endpoints, for local testing or Render/Railway/Fly)
- `.env.example` — example local config

## 1) Create a Gmail App Password (one time)

1. On `ckonkol@gmail.com`, enable **2-Step Verification**: https://myaccount.google.com/signinoptions/two-factor
2. Create an App Password: https://myaccount.google.com/apppasswords
3. Copy the 16-character password → this is `SMTP_PASSWORD`.

> App Passwords allow a non-Gmail app to **send** as your account (can't read inbox).
> Still treat it like a password and rotate it if exposed.

## 2) Deploy on Vercel

### Option A — Vercel dashboard
1. Go to https://vercel.com → **Add New… → Project**.
2. Import the `myhometown123/myhometown123.github.io` repo.
3. Set **Root Directory** to `relay`.
4. Framework Preset: **Other** (Node).
5. Add Environment Variables (applies to Production + Preview):
   - `SMTP_USER` = `ckonkol@gmail.com`
   - `SMTP_PASSWORD` = `<your 16-char app password>`
   - `RECIPIENT` = `ckonkol@gmail.com`  *(optional — who receives the emails)*
6. **Deploy.** Your function URL will be `https://<your-project>.vercel.app/email`.

### Option B — Vercel CLI (from `relay/`)
```bash
npm install -g vercel
cd relay
vercel login
vercel env add SMTP_USER        # then paste: ckonkol@gmail.com
vercel env add SMTP_PASSWORD    # then paste your app password
vercel env add RECIPIENT        # optional
vercel --prod
```

## 2b) Enable Vercel Postgres — shared saved-cities list (recommended)

This is what makes the "Cities" list survive switching PCs/devices (it lives in the
database instead of each browser's `localStorage`).

1. In the relay project: **Settings → Databases → Vercel Postgres → New** (or
   [Neon](https://neon.tech) directly). Pick a name; it's free-tier.
2. Vercel creates a **`DATABASE_URL`** environment variable for the project
   (Production + Preview). That's the only setup needed — the relay's `pg` client
   reads it. (For Neon, use the **pooled** connection string — Vercel does this by default.)
3. **Re-deploy** the relay (so `pg` from `package.json` is installed and the new
   function is live). The relay auto-creates the `cities` table on first use.

> The `cities` table is tiny and auto-managed. You never store credentials or
> sensitive data in it — only `{city, zip}` pairs the site has saved.

## 3) Point the site at the relay

In `assets/js/hm123.js`, set `RELAY_URL` to your **function base URL** (no trailing
`/email`):

```js
const RELAY_URL = 'https://your-project.vercel.app';
```

Now visiting/saving a **new** city fires `POST {RELAY_URL}/email` and Gmail delivers
the notification. The in-page **📧 Notify ckonkol** button remains as an
always-working, no-backend fallback.

## Test it

```bash
curl -X POST https://your-project.vercel.app/email \
  -H "Content-Type: application/json" \
  -d '{"city":"Springfield","zip":"65802","link":"https://myhometown123.github.io/city.html?city=Springfield&zip=65802"}'
```
Expect `{"ok":true,"city":"Springfield"}` and a Gmail email. `400` = missing `city`,
`500` = env vars not set, `502` = Gmail rejected the send (wrong password / no 2FA).

### Test the cities list (Postgres)

```bash
# list
curl https://your-project.vercel.app/cities
# add (note: "added" is true only the FIRST time you add the same city+zip)
curl -X POST https://your-project.vercel.app/cities \
  -H "Content-Type: application/json" -d '{"city":"Springfield","zip":"65802"}'
# remove
curl -X DELETE https://your-project.vercel.app/cities \
  -H "Content-Type: application/json" -d '{"city":"Springfield","zip":"65802"}'
```
`GET` → `{"ok":true,"cities":[{"city":"Springfield","zip":"65802"}]}`.
`POST` → `{"ok":true,"added":true,...,"cities":[...]}`. `500` = `DATABASE_URL` not set.

## Local (no Vercel needed)

```bash
cd relay
npm install
SMTP_USER=ckonkol@gmail.com SMTP_PASSWORD=app-pass node server.js
# …then curl http://localhost:8787/email with the JSON above
```
