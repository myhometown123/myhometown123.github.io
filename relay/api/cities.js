'use strict';

/* Vercel serverless function: /cities — the shared saved-cities list.
   The source of truth is Vercel Postgres (Neon); this is a thin JSON API over it.
     GET    /cities            → { ok, cities: [{city, zip}] }
     POST   /cities {city,zip?} → { ok, added, city, zip, cities }
     DELETE /cities {city,zip?} → { ok, removed, city, zip, cities }
   CORS is open (like /email). Set DATABASE_URL in Vercel → Project → Settings
   (enabling Vercel Postgres does this for you). */

const { listCities, addCity, removeCity } = require('../lib/cities');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    if (req.method === 'GET') {
      const cities = await listCities();
      return res.status(200).json({ ok: true, cities });
    }
    if (req.method === 'POST') {
      const r = await addCity(req.body || {});
      return res.status(200).json({ ok: true, ...r });
    }
    if (req.method === 'DELETE') {
      const r = await removeCity(req.body || {});
      return res.status(200).json({ ok: true, ...r });
    }
    return res.status(405).json({ ok: false, error: 'Use GET, POST, or DELETE /cities' });
  } catch (e) {
    return res.status(e.statusCode || 500).json({ ok: false, error: e.message });
  }
};
