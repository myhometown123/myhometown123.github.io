'use strict';

/* Postgres access for the saved-cities list.
   The source of truth lives in Vercel Postgres (Neon). The connection string
   comes from DATABASE_URL (set automatically when you enable Vercel Postgres,
   or in your local .env). Shared by the Vercel function (api/cities.js) and the
   plain-Node server (server.js).

   One table: cities(city, zip, added_at) with a UNIQUE (city, zip) key. */

const { Pool } = require('pg');

let pool = null;
let schemaPromise = null;

function getPool() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    const e = new Error('DATABASE_URL is not configured');
    e.statusCode = 500;
    throw e;
  }
  let hostname = '';
  try { hostname = new URL(url).hostname; } catch (err) { /* non-URL form; fall through */ }
  const opts = {
    connectionString: url,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  };
  // Neon/Vercel Postgres are remote → require TLS. (Local dev URLs may set
  // sslmode=disable, which we respect.)
  if (hostname && !/^(localhost|127\.0\.0\.1|::1|\.local)$/.test(hostname)) {
    opts.ssl = { rejectUnauthorized: false };
  }
  pool = new Pool(opts);
  return pool;
}

// Create the table once per process (idempotent; survives serverless cold starts).
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await getPool().query(
        `CREATE TABLE IF NOT EXISTS cities (
           id SERIAL PRIMARY KEY,
           city TEXT NOT NULL,
           zip  TEXT NOT NULL DEFAULT '',
           added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
           UNIQUE (city, zip)
         )`
      );
    })().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

async function listCities() {
  await ensureSchema();
  const { rows } = await getPool().query(
    'SELECT city, zip FROM cities ORDER BY added_at DESC, id DESC'
  );
  return rows.map((r) => ({ city: r.city, zip: r.zip || '' }));
}

// Returns true only if this (city, zip) was a brand-new row.
async function upsertCity(city, zip) {
  await ensureSchema();
  const { rows } = await getPool().query(
    `INSERT INTO cities (city, zip) VALUES ($1, $2)
     ON CONFLICT (city, zip) DO UPDATE SET zip = EXCLUDED.zip
     RETURNING (xmax = 0) AS inserted`,
    [city, zip || '']
  );
  return !!rows[0] && !!rows[0].inserted;
}

async function deleteCity(city, zip) {
  await ensureSchema();
  const res = await getPool().query('DELETE FROM cities WHERE city = $1 AND zip = $2', [city, zip || '']);
  return (res.rowCount || 0) > 0;
}

module.exports = { listCities, upsertCity, deleteCity };
