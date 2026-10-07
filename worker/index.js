// Visitor tracking + private dashboard for the portfolio.
// The site itself is served as static files from /public; only /api/track and
// /dashboard reach this code.

import { renderDashboard, renderLogin, renderMessage } from './dashboard.js';

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|pingdom|uptime|curl|wget|python|scrapy|httpclient|facebookexternalhit|whatsapp/i;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const RANGES = [7, 30, 90];

// Dashboard sign-in. The password lives in the DASHBOARD_PASSWORD secret.
const DASHBOARD_USER = 'arasadaakhil.website';
const SESSION_COOKIE = 'dash_session';
const SESSION_DAYS = 7;
const MAX_ATTEMPTS = 8;          // wrong sign-ins allowed per visitor...
const ATTEMPT_WINDOW_MIN = 15;   // ...within this many minutes

let schemaReady = false;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/track' && request.method === 'POST') {
      // Read the tiny body, reply at once, and let the write finish in the background
      const raw = await request.text();
      ctx.waitUntil(track(request, env, raw).catch(err => console.error('track failed', err)));
      return new Response(null, { status: 204 });
    }

    if (url.pathname === '/dashboard/logout') {
      return new Response(null, {
        status: 303,
        headers: { location: '/dashboard', 'set-cookie': sessionCookie('', 0), 'cache-control': 'no-store' }
      });
    }
    if (url.pathname === '/dashboard' || url.pathname === '/dashboard/') {
      return dashboard(request, env, url);
    }

    return env.ASSETS.fetch(request);
  }
};

/* ---------- storage ---------- */

async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      day TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT,
      path TEXT,
      ref TEXT,
      country TEXT,
      device TEXT,
      browser TEXT,
      visitor TEXT
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_events_day ON events (day, type)'),
    db.prepare('CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, who TEXT NOT NULL)')
  ]);
  schemaReady = true;
}

// Dates are kept in Indian time so "today" matches the owner's day
function dayOf(ts) {
  return new Date(ts + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/* ---------- tracking ---------- */

async function track(request, env, raw) {
  if (!env.DB) return;
  const ua = request.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua)) return;

  let body;
  try { body = JSON.parse(raw); } catch (e) { return; }
  if (!body || typeof body !== 'object') return;
  const type = body.type === 'event' ? 'event' : 'pageview';
  const ts = Date.now();
  const day = dayOf(ts);

  // Anonymous daily visitor id: the IP is hashed with the date and never stored
  const ip = request.headers.get('cf-connecting-ip') || '';
  const visitor = await hash(day + '|' + ip + '|' + ua + '|' + (env.DASHBOARD_PASSWORD || 'salt'));

  await ensureSchema(env.DB);
  await env.DB.prepare(
    'INSERT INTO events (ts, day, type, name, path, ref, country, device, browser, visitor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    ts, day, type,
    clean(body.name, 80),
    clean(body.path, 120) || '/',
    refHost(body.ref, new URL(request.url).hostname),
    (request.cf && request.cf.country) || 'Unknown',
    deviceOf(ua, Number(body.w) || 0),
    browserOf(ua),
    visitor
  ).run();
}

async function hash(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function clean(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : null;
}

function refHost(ref, ownHost) {
  if (!ref || typeof ref !== 'string') return 'Direct';
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '');
    if (!host || host === ownHost.replace(/^www\./, '')) return 'Direct';
    if (/linkedin\.com$|lnkd\.in$/.test(host)) return 'LinkedIn';
    if (/google\./.test(host)) return 'Google';
    if (/github\.com$/.test(host)) return 'GitHub';
    if (/instagram\.com$/.test(host)) return 'Instagram';
    if (/facebook\.com$|fb\.com$/.test(host)) return 'Facebook';
    if (/t\.co$|twitter\.com$|x\.com$/.test(host)) return 'X';
    if (/bing\.com$/.test(host)) return 'Bing';
    return host.slice(0, 60);
  } catch (e) {
    return 'Direct';
  }
}

function deviceOf(ua, width) {
  if (/ipad|tablet/i.test(ua) || (width >= 600 && width < 1000 && /android/i.test(ua))) return 'Tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function browserOf(ua) {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

/* ---------- dashboard ---------- */

async function dashboard(request, env, url) {
  const headers = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow'
  };

  if (!env.DASHBOARD_PASSWORD) {
    return new Response(renderMessage('Dashboard is locked',
      'No password is set yet. In Cloudflare, open this Worker, go to Settings, then Variables and Secrets, and add a secret named DASHBOARD_PASSWORD.'),
      { status: 503, headers });
  }
  if (!env.DB) {
    return new Response(renderMessage('No database connected',
      'The D1 database binding named DB is missing from this Worker.'), { status: 503, headers });
  }

  if (request.method === 'POST') return signIn(request, env, headers);

  if (!(await validSession(request, env.DASHBOARD_PASSWORD))) {
    return new Response(renderLogin({ user: DASHBOARD_USER }), { status: 401, headers });
  }

  const days = RANGES.includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
  const stats = await loadStats(env.DB, days);
  return new Response(renderDashboard(stats), { headers });
}

// Handles the sign-in form: checks the username and password, then sets a signed session cookie
async function signIn(request, env, headers) {
  // Only accept the form when it was submitted from this site
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return new Response(renderLogin({ user: DASHBOARD_USER, error: 'Please sign in from this page.' }), { status: 403, headers });
  }

  await ensureSchema(env.DB);
  const now = Date.now();
  const who = await hash('login|' + (request.headers.get('cf-connecting-ip') || '') + '|' + env.DASHBOARD_PASSWORD);
  const since = now - ATTEMPT_WINDOW_MIN * 60000;
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE who = ? AND ts > ?').bind(who, since).first();
  if (recent && recent.n >= MAX_ATTEMPTS) {
    return new Response(renderLogin({
      user: DASHBOARD_USER,
      error: 'Too many wrong attempts. Wait ' + ATTEMPT_WINDOW_MIN + ' minutes and try again.'
    }), { status: 429, headers });
  }

  let form;
  try { form = await request.formData(); } catch (e) { form = new FormData(); }
  const user = String(form.get('username') || '').trim().toLowerCase();
  const pass = String(form.get('password') || '');

  const ok = (await sameText(user, DASHBOARD_USER)) & (await sameText(pass, env.DASHBOARD_PASSWORD));
  if (!ok) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO login_attempts (ts, who) VALUES (?, ?)').bind(now, who),
      env.DB.prepare('DELETE FROM login_attempts WHERE ts < ?').bind(now - 86400000)
    ]);
    return new Response(renderLogin({ user: DASHBOARD_USER, error: 'Wrong username or password.' }), { status: 401, headers });
  }

  const expires = now + SESSION_DAYS * 86400000;
  const token = expires + '.' + (await sign(String(expires), env.DASHBOARD_PASSWORD));
  return new Response(null, {
    status: 303,
    headers: { location: '/dashboard', 'set-cookie': sessionCookie(token, SESSION_DAYS * 86400), 'cache-control': 'no-store' }
  });
}

function sessionCookie(value, maxAge) {
  return SESSION_COOKIE + '=' + value + '; Path=/dashboard; Max-Age=' + maxAge + '; HttpOnly; Secure; SameSite=Strict';
}

async function validSession(request, secret) {
  const match = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + SESSION_COOKIE + '=([^;]+)'));
  if (!match) return false;
  const [expires, signature] = match[1].split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return sameText(signature, await sign(expires, secret));
}

// Signature that only someone holding the password secret can produce
async function sign(text, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Compare hashes so the check takes the same time whatever was typed
async function sameText(given, expected) {
  const [a, b] = await Promise.all([digest(given), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function digest(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

async function loadStats(db, days) {
  await ensureSchema(db);
  const now = Date.now();
  const today = dayOf(now);
  const since = dayOf(now - (days - 1) * 86400000);
  const pv = "type = 'pageview' AND day >= ?";

  const top = column => db.prepare(
    `SELECT ${column} AS label, COUNT(DISTINCT visitor) AS n FROM events WHERE ${pv} GROUP BY ${column} ORDER BY n DESC LIMIT 8`
  ).bind(since);

  const [series, countries, refs, devices, browsers, events, recent] = await db.batch([
    db.prepare(`SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM events WHERE ${pv} GROUP BY day ORDER BY day`).bind(since),
    top('country'), top('ref'), top('device'), top('browser'),
    db.prepare("SELECT name AS label, COUNT(*) AS n FROM events WHERE type = 'event' AND day >= ? GROUP BY name ORDER BY n DESC LIMIT 12").bind(since),
    db.prepare("SELECT ts, country, device, browser, ref FROM events WHERE type = 'pageview' ORDER BY id DESC LIMIT 15")
  ]);

  // Fill the days nobody visited so the chart has no gaps
  const byDay = new Map(series.results.map(r => [r.day, r]));
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayOf(now - i * 86400000);
    const row = byDay.get(day);
    daily.push({ day, visitors: row ? row.visitors : 0, views: row ? row.views : 0 });
  }

  return {
    days, today, ranges: RANGES, daily,
    countries: countries.results, refs: refs.results, devices: devices.results, browsers: browsers.results,
    events: events.results,
    recent: recent.results.map(r => ({ ...r, when: new Date(r.ts + IST_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ') }))
  };
}
