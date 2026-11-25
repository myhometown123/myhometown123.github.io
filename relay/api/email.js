'use strict';

/* Vercel serverless function: POST /email
   Deploy with the relay/ folder as the project root (see README.md).
   Set the env vars SMTP_USER and SMTP_PASSWORD (and optionally RECIPIENT)
   in Vercel → Project → Settings → Environment Variables.

   The public site calls:  POST {VERCEL_URL}/email   { city, zip?, link? } */

const { sendCityEmail } = require('../lib/send');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Use POST with { city, zip?, link? }' });
    return;
  }

  try {
    const city = await sendCityEmail(req.body || {});
    res.status(200).json({ ok: true, city });
  } catch (e) {
    res.status(e.statusCode || 502).json({ ok: false, error: e.message });
  }
};
