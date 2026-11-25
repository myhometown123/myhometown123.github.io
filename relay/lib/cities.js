'use strict';

/* Shared "saved cities" logic (the source of truth is Vercel Postgres / Neon).
   Used by both the Vercel function (api/cities.js) and the plain-Node server
   (server.js). The email-on-new-city is intentionally NOT here — the site still
   fires that through the existing /email path, keeping this module purely data. */

const db = require('./db');

const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').slice(0, n).trim();
const cleanZip = (s) => String(s == null ? '' : s).replace(/\D/g, '').slice(0, 5);

function needCity(city) {
  if (!city) {
    const e = new Error('Missing "city"');
    e.statusCode = 400;
    throw e;
  }
}

async function listCities() {
  return db.listCities();
}

// Upserts a city and returns whether it was new, plus the fresh list.
async function addCity({ city, zip } = {}) {
  city = clean(city, 120);
  zip = cleanZip(zip);
  needCity(city);
  const added = await db.upsertCity(city, zip);
  const cities = await db.listCities();
  return { added, city, zip, cities };
}

async function removeCity({ city, zip } = {}) {
  city = clean(city, 120);
  zip = cleanZip(zip);
  needCity(city);
  const removed = await db.deleteCity(city, zip);
  const cities = await db.listCities();
  return { removed, city, zip, cities };
}

module.exports = { listCities, addCity, removeCity };
