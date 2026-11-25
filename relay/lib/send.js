'use strict';

/* Shared "send the city-added email" logic.
   Used by both the Vercel function (api/email.js) and the local server
   (server.js), so there's one place the Gmail/SMTP code lives.

   Reads Gmail credentials from the environment:
     SMTP_USER, SMTP_PASSWORD, RECIPIENT (optional), SMTP_HOST/SMTP_PORT (optional)
   Throws an Error with .statusCode for the caller to map to an HTTP status. */

const nodemailer = require('nodemailer');

const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').slice(0, n).trim();

async function sendCityEmail({ city, zip, link } = {}) {
  city = clean(city, 120);
  zip = clean(zip, 10);
  link = clean(link, 500);
  if (!city) { const e = new Error('Missing "city"'); e.statusCode = 400; throw e; }

  const SMTP_USER = process.env.SMTP_USER || '';
  const SMTP_PASS = process.env.SMTP_PASSWORD || '';
  const RECIPIENT = process.env.RECIPIENT || SMTP_USER;
  if (!SMTP_USER || !SMTP_PASS) {
    const e = new Error('SMTP_USER / SMTP_PASSWORD are not configured');
    e.statusCode = 500;
    throw e;
  }

  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transport.sendMail({
    from: '"MyHometown123" <' + SMTP_USER + '>',
    to: RECIPIENT,
    subject: 'New city added to MyHometown123: ' + city,
    text:
      'A city was added to MyHometown123.\n\n' +
      'City: ' + city + (zip ? ' (' + zip + ')' : '') + (link ? '\nLink: ' + link : '') + '\n',
  });

  return city;
}

module.exports = { sendCityEmail };
