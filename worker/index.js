// Visitor tracking, the private dashboard and the MCP server for the portfolio.
// The site itself is served as static files from /public; only /api/*, /mcp and
// /dashboard reach this code.

import { renderDashboard, renderLogin, renderMessage } from './dashboard.js';
import { handleMcp, mcpPublicStats } from './mcp.js';
import { ensureSchema, dayOf, istString, hash, clean, refHost, deviceOf, browserOf, osOf } from './store.js';

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|pingdom|uptime|curl|wget|python|scrapy|httpclient|facebookexternalhit|whatsapp/i;
const RANGES = [7, 30, 90];
const PAGE_SIZE = 15;

// Dashboard sign-in. The password lives in the DASHBOARD_PASSWORD secret.
const DASHBOARD_USER = 'arasadaakhil.website';
const SESSION_COOKIE = 'dash_session';
const SESSION_DAYS = 7;
const MAX_ATTEMPTS = 8;          // wrong sign-ins allowed per visitor...
const ATTEMPT_WINDOW_MIN = 15;   // ...within this many minutes

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/track' && request.method === 'POST') {
      // Read the tiny body, reply at once, and let the write finish in the background
      const raw = await request.text();
      ctx.waitUntil(track(request, env, raw).catch(err => console.error('track failed', err)));
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/api/coupon' && request.method === 'POST') return issueCoupon(request, env);
    if (url.pathname === '/dashboard/coupon' && request.method === 'POST') return markCoupon(request, env);
    if (url.pathname === '/mcp' || url.pathname === '/mcp/') return handleMcp(request, env, ctx);
    if (url.pathname === '/api/mcp-stats') return mcpPublicStats(env);

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

/* ---------- tracking ---------- */

async function track(request, env, raw) {
  if (!env.DB) return;
  const ua = request.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua)) return;

  let body;
  try { body = JSON.parse(raw); } catch (e) { return; }
  if (!body || typeof body !== 'object') return;
  const type = body.type === 'event' || body.type === 'leave' ? body.type : 'pageview';
  const ts = Date.now();
  const day = dayOf(ts);
  const cf = request.cf || {};
  const ip = request.headers.get('cf-connecting-ip') || null;

  // Daily visitor id, used to count unique visitors per day
  const visitor = await hash(day + '|' + (ip || '') + '|' + ua + '|' + (env.DASHBOARD_PASSWORD || 'salt'));
  const width = Number(body.w) || 0, height = Number(body.h) || 0;
  const whole = (value, max) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Math.round(Number(value)))) : null;

  await ensureSchema(env.DB);
  await env.DB.prepare(
    `INSERT INTO events (ts, day, type, name, path, ref, country, device, browser, visitor,
       ip, city, region, os, lang, screen, org, dur, scroll)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    ts, day, type,
    clean(body.name, 80),
    clean(body.path, 120) || '/',
    refHost(body.ref, new URL(request.url).hostname),
    cf.country || 'Unknown',
    deviceOf(ua, width),
    browserOf(ua),
    visitor,
    ip,
    clean(cf.city, 60),
    clean(cf.region, 60),
    osOf(ua),
    clean(body.lang, 12),
    width && height ? width + '×' + height : null,
    clean(cf.asOrganization, 80),
    type === 'leave' ? whole(body.dur, 7200) : null,
    type === 'leave' ? whole(body.scroll, 100) : null
  ).run();
}

/* ---------- coupons ---------- */

// Each game on the site has its own prefix, so a code says which game it was won in
const COUPON_GAMES = { cube: 'ERP10', queens: 'HR10', anchor: 'AR10' };
const COUPON_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L: easy to read back
const COUPONS_PER_DAY = 6;                                  // per visitor

function randomCode(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return prefix + '-' + [...bytes].map(b => COUPON_LETTERS[b % COUPON_LETTERS.length]).join('');
}

// Called by the page when a game is won. Makes a fresh random code, stores it and returns it.
// A visitor who wins the same game again within a day gets the code they already hold.
async function issueCoupon(request, env) {
  const reply = (status, body) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
  if (!env.DB) return reply(503, { error: 'unavailable' });
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return reply(403, { error: 'forbidden' });
  const ua = request.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua)) return reply(403, { error: 'forbidden' });

  let body;
  try { body = await request.json(); } catch (e) { body = null; }
  const game = body && typeof body.game === 'string' ? body.game : '';
  if (!COUPON_GAMES[game]) return reply(400, { error: 'unknown game' });

  await ensureSchema(env.DB);
  const now = Date.now();
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const cf = request.cf || {};

  const held = await env.DB.prepare(
    'SELECT code FROM coupons WHERE ip = ? AND game = ? AND redeemed_ts IS NULL AND ts > ? ORDER BY id DESC LIMIT 1'
  ).bind(ip, game, now - 86400000).first();
  if (held) return reply(200, { code: held.code });

  const today = await env.DB.prepare('SELECT COUNT(*) AS n FROM coupons WHERE ip = ? AND ts > ?').bind(ip, now - 86400000).first();
  if (today && today.n >= COUPONS_PER_DAY) return reply(429, { error: 'limit' });

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode(COUPON_GAMES[game]);
    try {
      await env.DB.prepare(
        'INSERT INTO coupons (code, game, ts, day, ip, city, country, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(code, game, now, dayOf(now), ip, clean(cf.city, 60), cf.country || null, deviceOf(ua, 0)).run();
      return reply(200, { code });
    } catch (err) { /* the one-in-a-billion duplicate: draw again */ }
  }
  return reply(500, { error: 'failed' });
}

// The dashboard's "Mark redeemed" and "Undo" buttons
async function markCoupon(request, env) {
  const origin = request.headers.get('origin');
  const sameSite = !origin || new URL(origin).host === new URL(request.url).host;
  if (!env.DB || !env.DASHBOARD_PASSWORD || !sameSite || !(await validSession(request, env.DASHBOARD_PASSWORD))) {
    return new Response(null, { status: 303, headers: { location: '/dashboard' } });
  }
  let form;
  try { form = await request.formData(); } catch (e) { form = new FormData(); }
  const code = String(form.get('code') || '').trim().toUpperCase().slice(0, 24);
  const undo = form.get('action') === 'undo';
  await ensureSchema(env.DB);
  await env.DB.prepare('UPDATE coupons SET redeemed_ts = ? WHERE code = ?').bind(undo ? null : Date.now(), code).run();
  const back = String(form.get('q') || '').slice(0, 24);
  return new Response(null, {
    status: 303,
    headers: { location: '/dashboard?coupon=' + encodeURIComponent(back) + '#coupons', 'cache-control': 'no-store' }
  });
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
  const page = Math.max(1, Math.floor(Number(url.searchParams.get('page')) || 1));
  const stats = await loadStats(env.DB, days, page);
  stats.coupons = await loadCoupons(env.DB, url.searchParams.get('coupon'));
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

/* ---------- numbers for the dashboard ---------- */

// The coupons card: totals, and either the codes matching a search or the 25 newest
async function loadCoupons(db, search) {
  const q = String(search || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  const columns = 'code, game, ts, city, country, device, ip, redeemed_ts';
  const [totals, list] = await db.batch([
    db.prepare('SELECT COUNT(*) AS issued, SUM(CASE WHEN redeemed_ts IS NOT NULL THEN 1 ELSE 0 END) AS redeemed FROM coupons'),
    q ? db.prepare(`SELECT ${columns} FROM coupons WHERE code LIKE ? ORDER BY id DESC LIMIT 25`).bind('%' + q + '%')
      : db.prepare(`SELECT ${columns} FROM coupons ORDER BY id DESC LIMIT 25`)
  ]);
  return {
    q,
    issued: totals.results[0].issued || 0,
    redeemed: totals.results[0].redeemed || 0,
    list: list.results.map(c => ({ ...c, won: istString(c.ts), redeemed: c.redeemed_ts ? istString(c.redeemed_ts) : '' }))
  };
}

// One person across days: their IP when we have it, else the older daily id
const WHO = 'COALESCE(ip, visitor)';
// Hour and weekday in Indian time
const IST_EPOCH = '(ts + 19800000) / 1000';

async function loadStats(db, days, page) {
  await ensureSchema(db);
  const now = Date.now();
  const today = dayOf(now);
  const since = dayOf(now - (days - 1) * 86400000);
  const pv = "type = 'pageview' AND day >= ?";

  const top = (column, limit = 8) => db.prepare(
    `SELECT ${column} AS label, COUNT(DISTINCT visitor) AS n FROM events
     WHERE ${pv} AND ${column} IS NOT NULL AND ${column} != '' GROUP BY ${column} ORDER BY n DESC LIMIT ${limit}`
  ).bind(since);

  const [series, refs, countries, cities, devices, systems, browsers, orgs,
    clicks, sections, heat, engagement, loyalty, people, peoplePage,
    mcpClients, mcpTools, mcpTotals, mcpRecent] = await db.batch([
    db.prepare(`SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM events WHERE ${pv} GROUP BY day ORDER BY day`).bind(since),
    top('ref'), top('country'), top('city'), top('device'), top('os'), top('browser'), top('org'),
    db.prepare("SELECT name AS label, COUNT(*) AS n FROM events WHERE type = 'event' AND day >= ? AND name NOT LIKE 'Section: %' GROUP BY name ORDER BY n DESC LIMIT 12").bind(since),
    db.prepare("SELECT name AS label, COUNT(DISTINCT visitor) AS n FROM events WHERE type = 'event' AND day >= ? AND name LIKE 'Section: %' GROUP BY name").bind(since),
    db.prepare(`SELECT CAST(strftime('%w', ${IST_EPOCH}, 'unixepoch') AS INTEGER) AS dow,
                       CAST(strftime('%H', ${IST_EPOCH}, 'unixepoch') AS INTEGER) AS hr, COUNT(*) AS n
                FROM events WHERE ${pv} GROUP BY dow, hr`).bind(since),
    db.prepare(`SELECT AVG(d) AS dur, AVG(s) AS scroll, COUNT(*) AS n FROM (
                  SELECT MAX(dur) AS d, MAX(scroll) AS s FROM events WHERE type = 'leave' AND day >= ? GROUP BY visitor, day)`).bind(since),
    db.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN d > 1 THEN 1 ELSE 0 END) AS back FROM (
                  SELECT COUNT(DISTINCT day) AS d FROM events WHERE type = 'pageview' GROUP BY ${WHO} HAVING MAX(day) >= ?)`).bind(since),
    db.prepare(`SELECT COUNT(DISTINCT ${WHO}) AS n FROM events WHERE ${pv}`).bind(since),
    // With a single MAX(), SQLite fills the other columns from that same latest row
    db.prepare(`SELECT ${WHO} AS who, ip, COUNT(*) AS views, COUNT(DISTINCT day) AS days, MAX(ts) AS last,
                       country, city, region, org, device, os, browser, screen, lang, ref
                FROM events WHERE ${pv} GROUP BY ${WHO} ORDER BY last DESC LIMIT ${PAGE_SIZE} OFFSET ?`).bind(since, (page - 1) * PAGE_SIZE),
    db.prepare("SELECT client AS label, COUNT(*) AS n FROM mcp_calls WHERE day >= ? AND method IN ('initialize', 'tools/call') GROUP BY client ORDER BY n DESC LIMIT 8").bind(since),
    db.prepare("SELECT tool AS label, COUNT(*) AS n FROM mcp_calls WHERE day >= ? AND method = 'tools/call' GROUP BY tool ORDER BY n DESC LIMIT 8").bind(since),
    db.prepare(`SELECT SUM(CASE WHEN method = 'tools/call' THEN 1 ELSE 0 END) AS calls,
                       SUM(CASE WHEN method = 'initialize' THEN 1 ELSE 0 END) AS connections,
                       COUNT(DISTINCT COALESCE(ip, ua)) AS people
                FROM mcp_calls WHERE day >= ?`).bind(since),
    db.prepare('SELECT ts, method, tool, client, client_version, country FROM mcp_calls ORDER BY id DESC LIMIT 10')
  ]);

  // Every visit made by the people on this page, for the expandable rows
  const visitors = peoplePage.results;
  const visitsBy = new Map(visitors.map(v => [v.who, []]));
  if (visitors.length) {
    const marks = visitors.map(() => '?').join(', ');
    const visits = await db.prepare(
      `SELECT ${WHO} AS who, ts, path, ref FROM events WHERE type = 'pageview' AND ${WHO} IN (${marks}) ORDER BY ts DESC LIMIT 400`
    ).bind(...visitors.map(v => v.who)).all();
    for (const v of visits.results) {
      const list = visitsBy.get(v.who);
      if (list && list.length < 25) list.push({ when: istString(v.ts), path: v.path, ref: v.ref });
    }
  }

  // Fill the days nobody visited so the chart has no gaps
  const byDay = new Map(series.results.map(r => [r.day, r]));
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayOf(now - i * 86400000);
    const row = byDay.get(day);
    daily.push({ day, visitors: row ? row.visitors : 0, views: row ? row.views : 0 });
  }

  const totalPeople = people.results[0].n || 0;
  return {
    days, today, ranges: RANGES, daily,
    refs: refs.results, countries: countries.results, cities: cities.results, devices: devices.results,
    systems: systems.results, browsers: browsers.results, orgs: orgs.results,
    clicks: clicks.results,
    sections: sections.results,
    heat: heat.results,
    engagement: engagement.results[0] || {},
    loyalty: loyalty.results[0] || {},
    page, pages: Math.max(1, Math.ceil(totalPeople / PAGE_SIZE)), totalPeople,
    visitors: visitors.map(v => ({ ...v, lastSeen: istString(v.last), visits: visitsBy.get(v.who) || [] })),
    mcp: {
      clients: mcpClients.results, tools: mcpTools.results, totals: mcpTotals.results[0] || {},
      recent: mcpRecent.results.map(r => ({ ...r, when: istString(r.ts) }))
    }
  };
}
