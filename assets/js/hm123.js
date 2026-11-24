'use strict';

/* =====================================================================
   MyHometown123 — shared engine
   Master agent + 5 sub-agents that meet daily at 8:00 AM to find
   locations, contacts, events, history, and vacation spots for a city.
   Static-site build: the meeting is simulated client-side and every
   city gets deterministic (seeded) findings, so results are stable.
   ===================================================================== */

const HM123 = (() => {

  // ---------------- utilities ----------------
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtDateTime = (iso) => new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  // ---------------- known zips (offline dataset) ----------------
  const KNOWN_ZIPS = {
    '65802': { city: 'Springfield', state: 'MO' },
    '65756': { city: 'Rolla', state: 'MO' },
    '65616': { city: 'Branson', state: 'MO' },
    '65401': { city: 'Columbia', state: 'MO' },
    '63101': { city: 'St. Louis', state: 'MO' },
    '64101': { city: 'Kansas City', state: 'MO' },
    '64110': { city: 'Kansas City', state: 'MO' },
    '66101': { city: 'Wichita', state: 'KS' },
    '66202': { city: 'Oklahoma City', state: 'OK' },
    '73401': { city: 'Tulsa', state: 'OK' },
    '80202': { city: 'Denver', state: 'CO' },
    '73301': { city: 'Dallas', state: 'TX' },
    '77002': { city: 'Houston', state: 'TX' },
    '30303': { city: 'Atlanta', state: 'GA' },
    '02108': { city: 'Boston', state: 'MA' },
    '10001': { city: 'New York', state: 'NY' },
    '90210': { city: 'Beverly Hills', state: 'CA' },
  };

  async function resolveZip(zip) {
    if (!/^\d{5}$/.test(zip)) return null;
    if (KNOWN_ZIPS[zip]) return KNOWN_ZIPS[zip];
    try {
      const r = await fetch('https://api.zippopotam.us/us/' + zip, { cache: 'no-store' });
      if (!r.ok) return null;
      const j = await r.json();
      const p = j.places && j.places[0];
      if (!p) return null;
      return { city: p['place name'], state: p['state abbreviation'] };
    } catch (e) {
      return null;
    }
  }

  // ---------------- agents ----------------
  const AGENTS = [
    { id: 'master', name: 'Master Agent', role: 'Convenes the daily 8:00 AM meeting, assigns briefs, and signs off on the combined find.' },
    { id: 'locations', name: 'Locations Scout', role: 'Finds the places worth knowing: diners, markets, shops, and parks.' },
    { id: 'contacts', name: 'Contacts Finder', role: 'Finds the people worth calling: chamber, clerk, librarians, organizers.' },
    { id: 'events', name: 'Events Watcher', role: 'Watches the calendar for fairs, festivals, markets, and live music.' },
    { id: 'history', name: 'History Researcher', role: 'Digs up the founding story, railroads, mills, and landmark years.' },
    { id: 'vacation', name: 'Vacation Planner', role: 'Plans the trip: cabins, trails, viewpoints, wineries, and day trips.' },
  ];

  // ---------------- findings pools ----------------
  const FIRST = ['Ava', 'Marcus', 'Elena', 'Dwight', 'Priya', 'Sam', 'Ruth', 'Theo', 'June', 'Walter', 'Nina', 'Carter'];
  const LAST = ['Whitfield', 'Marquez', 'Okafor', 'Bennett', 'Kowalski', 'Tanaka', 'Reed', 'Castillo', 'Novak', 'Bryant', 'Holloway', 'Fitzgerald'];
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const LOC_NAMES = ['Main Street Diner', 'Corner Bakery', 'Farmers Market', 'Brewing Co.', 'Hardware & Feed Store', 'Bookshop', 'Flower & Greenhouse', 'Record Shop', 'Taco Stand', 'Ice Cream Parlor', 'Cider House', 'Tackle Shop'];
  const LOC_ADJ = ['Old Town', 'Riverside', 'Prairie Dog', 'Golden Oak', 'Blue Heron', 'Lone Star', 'Hilltop', 'Meadowlark', 'Cedar Ridge', 'Lantern Light'];
  const LOC_CHIPS = ['Local favorite', 'Hidden gem', 'Ask for the special', 'Since forever', 'Cash bar, cash register'];
  const VENUES = ['the fairgrounds', 'Main Street', 'riverside park', 'the old square', 'the courthouse steps', 'the bandshell'];
  const ROLES = ['Chamber of Commerce President', 'City Clerk', 'Historical Society Director', 'Public Library Director', 'Tourism Board Member', 'Farmers Market Coordinator'];

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || 'hometown';
  }

  function generateFindings(city, state) {
    const rng = mulberry32(hashSeed(city.toLowerCase() + '|' + (state || '')));
    const founded = randInt(rng, 1792, 1938);
    const area = randInt(rng, 201, 989);
    const slug = slugify(city);
    const adj = () => pick(rng, LOC_ADJ);
    const yearAfter = (n) => founded + randInt(rng, n, n + 50);

    const locations = [];
    const used = new Set();
    while (locations.length < 4) {
      const noun = pick(rng, LOC_NAMES);
      if (used.has(noun)) continue;
      used.add(noun);
      const name = (rng() < 0.45 ? adj() + ' ' : '') + noun;
      locations.push({
        name,
        chip: pick(rng, LOC_CHIPS),
        extra: '★ ' + (4 + Math.floor(rng() * 10) / 10).toFixed(1),
        detail: pick(rng, [
          'Family-run since ' + yearAfter(10) + '. Get there before the locals do.',
          'Open ' + randInt(rng, 4, 7) + ' days a week — the line forms early on ' + pick(rng, DAYS) + 's.',
          'The menu has changed about twice since ' + yearAfter(25) + '. Come as you are.',
          'Ten minutes out of downtown, two minutes too early for the parking lot to be free.',
        ]),
      });
    }

    const contacts = [];
    const usedRoles = new Set();
    while (contacts.length < 4) {
      const role = pick(rng, ROLES);
      if (usedRoles.has(role)) continue;
      usedRoles.add(role);
      const first = pick(rng, FIRST);
      const last = pick(rng, LAST);
      contacts.push({
        name: first + ' ' + last,
        chip: role,
        extra: '(' + area + ') 555-01' + randInt(rng, 10, 99) + ' · ' + first[0].toLowerCase() + '.' + last.toLowerCase() + '@' + slug + '.gov',
        detail: 'Best reached ' + pick(rng, DAYS) + 's between ' + randInt(rng, 8, 11) + ' and ' + (randInt(rng, 12, 15)) + '. Answering machine is friendly; leave a real message.',
      });
    }

    const events = [
      { name: city + ' Harvest Market', chip: 'Saturdays · autumn', detail: 'Held at ' + pick(rng, VENUES) + '. Bring a tote; produce goes fast after 10 AM.' },
      { name: adj() + ' Street Fair', chip: 'One weekend · summer', detail: 'Closed ' + pick(rng, ['Main Street', 'the river road', 'the square']) + ' to cars. Free entry; the pie contest is not to be missed.' },
      { name: 'First Friday Art Walk', chip: 'Monthly · evenings', detail: 'Galleries and porches stay open late along ' + pick(rng, VENUES) + '. Walk, don\'t drive.' },
      { name: city + ' Bandshell Series', chip: 'Fridays · June–August', detail: 'Doors at 7, first set at 8. The lawn fills by the opening act in July.' },
    ];

    const history = [
      { name: 'Founded in ' + founded, chip: founded + 's', detail: 'Early settlers staked out ' + adj().toLowerCase() + ' Hollow. The first deed is framed in the old courthouse.' },
      { name: 'The Railroad Years', chip: Math.floor(yearAfter(8) / 10) * 10 + 's', detail: 'Track reached the depot in ' + yearAfter(8) + ', and the freight house made the town the county\'s crossroads for a generation.' },
      { name: 'The Old Grist Mill', chip: Math.floor(yearAfter(20) / 10) * 10 + 's', detail: 'The mill on ' + adj() + ' Hill ground flour for three counties until the flood of ' + yearAfter(45) + '. The wheel still turns on Sundays.' },
      { name: 'The Storm of ' + yearAfter(50), chip: Math.floor(yearAfter(50) / 10) * 10 + 's', detail: 'It flattened the east side of Main Street. The rebuilt blocks — wider sidewalks, deeper gutters — still define the downtown core.' },
    ];

    const vacation = [
      { name: city + ' Lake Cabins', chip: 'Overnight', extra: randInt(rng, 35, 90) + ' min drive', detail: 'Paddle out before the tour boats arrive. Sunset from the east dock is the move.' },
      { name: adj() + ' Trail', chip: 'Hike', extra: randInt(rng, 3, 9) + '.2 mi loop', detail: 'One long, honest climb and a waterfall that shows up if the spring is wet. Water at the trailhead, none after.' },
      { name: 'Overlook at ' + adj() + ' Bluff', chip: 'Bucket list', extra: randInt(rng, 20, 70) + ' min drive', detail: 'Arrive at golden hour and stay an hour longer than you planned. No facilities — pack out, pack in.' },
      { name: city + ' Winery & Orchard', chip: 'Day trip', extra: 'Tues–Sun', detail: 'Cider, orchard snacks, and a tractor you can ride. Kids under 12 get a free apple-press ticket.' },
    ];

    return { locations, contacts, events, history, vacation, founded };
  }

  // ---------------- persistence (localStorage) ----------------
  const AGENT_KEY = 'mh123_agents';
  const LOG_KEY = 'mh123_logs';
  const CONFIG_KEY = 'mh123_config';

  function getAgentState() {
    const defaults = {};
    AGENTS.forEach((a) => { defaults[a.id] = { enabled: true, lastRun: null }; });
    try {
      const stored = JSON.parse(localStorage.getItem(AGENT_KEY) || '{}');
      return Object.assign(defaults, stored);
    } catch (e) { return defaults; }
  }

  function setAgentState(id, patch) {
    const state = getAgentState();
    if (!state[id]) state[id] = { enabled: true, lastRun: null };
    Object.assign(state[id], patch);
    localStorage.setItem(AGENT_KEY, JSON.stringify(state));
  }

  function getLogs() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function addLog(entry) {
    const logs = getLogs();
    logs.unshift(entry);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 50)));
  }

  function clearLogs() {
    localStorage.removeItem(LOG_KEY);
  }

  function getConfig() {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); } catch (e) { /* noop */ }
    return Object.assign({ email: 'ckonkol@gmail.com', meetingTime: '08:00' }, stored);
  }

  function saveConfig(cfg) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(Object.assign(getConfig(), cfg)));
  }

  // ---------------- the meeting ----------------
  async function runMeeting(city, state, { onEvent } = {}) {
    onEvent = onEvent || (() => {});
    state = state || getAgentState();
    const started = Date.now();
    onEvent({ type: 'start', city });

    onEvent({ type: 'agent', id: 'master', status: 'running', note: 'Convening the daily ' + getConfig().meetingTime + ' meeting…' });
    await sleep(700);
    onEvent({ type: 'agent', id: 'master', status: 'done', note: 'Briefs assigned to the sub-agents.' });

    const active = AGENTS.filter((a) => a.id !== 'master' && state[a.id] && state[a.id].enabled);
    const skipped = AGENTS.filter((a) => a.id !== 'master' && (!state[a.id] || !state[a.id].enabled));
    skipped.forEach((s) => onEvent({ type: 'agent', id: s.id, status: 'skipped', note: 'Disabled in admin.' }));

    const findings = generateFindings(city);
    const done = [];
    active.forEach((a) => {
      onEvent({ type: 'agent', id: a.id, status: 'running', note: 'Working the ' + a.id + ' brief…' });
    });
    for (const a of active) {
      await sleep(550 + Math.floor(Math.random() * 600));
      done.push(a.id);
      onEvent({ type: 'agent', id: a.id, status: 'done', note: findings[a.id].length + ' findings submitted.' });
      setAgentState(a.id, { lastRun: new Date().toISOString() });
    }
    setAgentState('master', { lastRun: new Date().toISOString() });

    const counts = {};
    active.forEach((a) => { counts[a.id] = findings[a.id].length; });
    const log = {
      city,
      date: new Date().toISOString(),
      durationMs: Date.now() - started,
      agents: done,
      skipped: skipped.map((s) => s.id),
      counts,
      total: Object.values(counts).reduce((s2, n) => s2 + n, 0),
    };
    addLog(log);
    onEvent({ type: 'complete', findings, log });
    return { findings, log };
  }

  return {
    AGENTS, KNOWN_ZIPS,
    resolveZip, generateFindings, runMeeting,
    getAgentState, setAgentState,
    getLogs, addLog, clearLogs,
    getConfig, saveConfig,
    fmtDateTime, sleep,
  };
})();
