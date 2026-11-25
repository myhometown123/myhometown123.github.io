'use strict';

/* Firebase (Cloud Firestore) backend for the shared saved-cities list.
   Runs entirely in the browser — no server, no Vercel deploy required.
   Must be loaded AFTER the two `firebase-*-compat` SDK scripts and BEFORE hm123.js
   (see index.html / city.html / admin.html).

   The Firebase web config below is NOT a secret — it is meant to live in the client.
   (The Gmail App Password, by contrast, stays only in the relay's env vars.)

   If no valid config is present, this file does nothing and hm123.js falls back
   to the browser's localStorage, so the site keeps working either way. */

(function () {
  // ---- PASTE YOUR FIREBASE WEB CONFIG HERE (Console → Project settings → General → Your apps) ----
  // You can override at runtime with window.HM123_FIREBASE_CONFIG = {...} before this script loads.
  const firebaseConfig = {
    apiKey: "AIzaSyAXIXVHWA5xN8GeJKrYjgwk6nI38T2QP2w",
    authDomain: "myhometown-baf8f.firebaseapp.com",
    projectId: "myhometown-baf8f",
    storageBucket: "myhometown-baf8f.firebasestorage.app",
    messagingSenderId: "737177878363",
    appId: "1:737177878363:web:dbca8ee370562cc642e47e",
    measurementId: "G-SW1M31QN4P"
  };
  // ---- end config ----

  if (typeof firebase === 'undefined') {
    console.warn('[hm123] Firebase SDK not loaded — Cities will use localStorage only.');
    return;
  }
  if (!firebaseConfig || !firebaseConfig.projectId || /YOUR_/.test(JSON.stringify(firebaseConfig))) {
    console.warn('[hm123] Firebase config not set (assets/js/firebase-client.js) — Cities will use localStorage only.');
    return;
  }

  const app = firebase.initializeApp(firebaseConfig);
  const db = app.firestore();
  // Compat (UMD) SDK: db.doc() takes ONE path string, not the modular (col, doc) form.
  // A two-argument call drops the second segment ("cities has 1").
  const LIST_DOC = db.doc('cities/list');

  const norm = (c) => (typeof c === 'string')
    ? { city: c, zip: '' }
    : { city: (c && c.city) || '', zip: (c && c.zip) || '' };
  const cleanList = (arr) => (Array.isArray(arr) ? arr : []).map(norm).filter((c) => c.city);
  const match = (item, city, zip) =>
    (item.city || '').toLowerCase() === (city || '').toLowerCase() && (item.zip || '') === (zip || '');

  async function listCities() {
    const snap = await LIST_DOC.get();
    return cleanList(snap.exists() ? (snap.data() || {}).items : []);
  }

  async function saveCity({ city, zip } = {}) {
    city = String(city || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    zip = String(zip || '').replace(/\D/g, '').slice(0, 5);
    if (!city) throw Object.assign(new Error('Missing "city"'), { statusCode: 400 });
    const before = await listCities();
    const added = !before.some((c) => match(c, city, zip));
    const item = { city, zip };
    await LIST_DOC.set({ items: firebase.firestore.FieldValue.arrayUnion([item]) }, { merge: true });
    return { added, city, zip, cities: added ? [item].concat(before) : before };
  }

  async function removeCity({ city, zip } = {}) {
    city = String(city || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    zip = String(zip || '').replace(/\D/g, '').slice(0, 5);
    if (!city) throw Object.assign(new Error('Missing "city"'), { statusCode: 400 });
    const current = await listCities();
    const target = current.find((c) => match(c, city, zip));
    if (target) {
      await LIST_DOC.set({ items: firebase.firestore.FieldValue.arrayRemove([target]) }, { merge: true });
    }
    return { removed: !!target, city, zip, cities: current.filter((c) => !match(c, city, zip)) };
  }

  // Expose to the page; hm123.js uses window.HM123DB when present.
  window.HM123DB = { listCities, saveCity, removeCity, ready: true };
})();
