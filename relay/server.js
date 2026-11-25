'use strict';

/* =====================================================================
   MyHometown123 — email relay (local / any Node host)

   The public site is static (GitHub Pages) and a browser can't open a raw
   SMTP socket, so it POSTs a "city added" event and the relay sends a real
   Gmail email. THIS FILE is the plain-Node version (local or Render/Railway/Fly);
   the Vercel version is api/email.js. Both share the sending code in lib/send.js.

   Run:
     cd relay
     npm install
     SMTP_USER=you@gmail.com SMTP_PASSWORD=app-pass node server.js   (or use .env)
   Then:  curl -X POST http://localhost:8787/email -H 'Content-Type: application/json' \
            -d '{"city":"Springfield","zip":"65802","link":"https://myhometown123.github.io"}'
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { sendCityEmail } = require('./lib/send');
const { listCities, addCity, removeCity } = require('./lib/cities');

// optional .env loader (no dependency; real env vars win)
(function loadEnv() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      if (!/^[A-Z0-9_]+$/.test(key) || process.env[key] !== undefined) continue;
      process.env[key] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch (e) { /* no .env — fine */ }
})();

const PORT = parseInt(process.env.PORT || '8787', 10);
const MAX_BODY = 16 * 1024;

// tiny in-memory rate limit (protects the public endpoint)
const hits = [];
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '10', 10);
function rateLimited() {
  const now = Date.now();
  while (hits.length && now - hits[0] > 60000) hits.shift();
  if (hits.length >= RATE_LIMIT) return true;
  hits.push(now);
  return false;
}

function send(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > MAX_BODY) req.destroy(); });
    req.on('end', () => resolve(body));
    req.on('error', () => resolve(''));
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { send(res, 204, {}); return; }

  let pathName = '/';
  try { pathName = new URL(req.url, 'http://localhost').pathname; } catch (e) { /* keep '/' */ }

  // ----- /cities (Postgres-backed) -----
  if (pathName === '/cities') {
    try {
      if (req.method === 'GET') {
        return send(res, 200, { ok: true, cities: await listCities() });
      }
      if (req.method === 'POST') {
        const data = JSON.parse(await readBody(req) || '{}');
        return send(res, 200, { ok: true, ...(await addCity(data)) });
      }
      if (req.method === 'DELETE') {
        const data = JSON.parse(await readBody(req) || '{}');
        return send(res, 200, { ok: true, ...(await removeCity(data)) });
      }
      return send(res, 405, { ok: false, error: 'Use GET, POST, or DELETE /cities' });
    } catch (e) {
      console.error('[relay] cities failed:', e.message);
      return send(res, e.statusCode || 500, { ok: false, error: e.message });
    }
  }

  // ----- GET / (health) -----
  if (req.method === 'GET') {
    return send(res, 200, {
      ok: true,
      service: 'myhometown123-relay',
      emailConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
      dbConfigured: Boolean(process.env.DATABASE_URL),
    });
  }

  // ----- POST /email (Gmail) -----
  if (req.method === 'POST' && (pathName === '/email' || pathName === '/')) {
    if (rateLimited()) { send(res, 429, { ok: false, error: 'Rate limited — try again later.' }); return; }
    let data;
    try { data = JSON.parse(await readBody(req) || '{}'); }
    catch (e) { return send(res, 400, { ok: false, error: 'Invalid JSON' }); }
    try {
      const city = await sendCityEmail(data);
      return send(res, 200, { ok: true, city });
    } catch (e) {
      console.error('[relay] send failed:', e.message);
      return send(res, e.statusCode || 502, { ok: false, error: e.message });
    }
  }

  send(res, 405, { ok: false, error: 'Unknown method/path' });
});

server.listen(PORT, () => {
  console.log('[relay] MyHometown123 relay (email + cities) listening on :' + PORT);
  console.log('[relay] sender=' + (process.env.SMTP_USER || '(unset)') + ' recipient=' + (process.env.RECIPIENT || process.env.SMTP_USER || '(unset)'));
  console.log('[relay] cities db=' + (process.env.DATABASE_URL ? 'configured' : '(unset — /cities will 500)'));
});
