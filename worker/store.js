// Shared storage helpers: database setup and the small classifiers used when recording a visit.

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Dates are kept in Indian time so "today" matches the owner's day
export function dayOf(ts) {
  return new Date(ts + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function istString(ts) {
  return new Date(ts + IST_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}

export async function hash(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function clean(value, max) {
  return typeof value === 'string' && value ? value.slice(0, max) : null;
}

// Columns added after the first release; created on demand so no manual migration is needed
const EXTRA_EVENT_COLUMNS = {
  ip: 'TEXT', city: 'TEXT', region: 'TEXT', os: 'TEXT', lang: 'TEXT',
  screen: 'TEXT', org: 'TEXT', dur: 'INTEGER', scroll: 'INTEGER'
};

let schemaReady = false;

export async function ensureSchema(db) {
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
    db.prepare('CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, who TEXT NOT NULL)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS mcp_calls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      day TEXT NOT NULL,
      method TEXT NOT NULL,
      tool TEXT,
      client TEXT,
      client_version TEXT,
      ua TEXT,
      country TEXT,
      ip TEXT
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS idx_mcp_day ON mcp_calls (day, method)')
  ]);

  const existing = await db.prepare('PRAGMA table_info(events)').all();
  const have = new Set(existing.results.map(c => c.name));
  const missing = Object.entries(EXTRA_EVENT_COLUMNS).filter(([name]) => !have.has(name));
  if (missing.length) {
    await db.batch(missing.map(([name, type]) => db.prepare(`ALTER TABLE events ADD COLUMN ${name} ${type}`)));
  }
  schemaReady = true;
}

export function refHost(ref, ownHost) {
  if (!ref || typeof ref !== 'string') return 'Direct';
  // In-app browsers on Android report the app, e.g. android-app://com.linkedin.android
  const app = ref.match(/^android-app:\/\/([^/]+)/i);
  let host;
  if (app) {
    host = app[1].toLowerCase();
  } else {
    try { host = new URL(ref).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) { return 'Direct'; }
  }
  if (!host || host === ownHost.replace(/^www\./, '')) return 'Direct';
  if (/linkedin|lnkd\.in$/.test(host)) return 'LinkedIn';
  if (/android\.gm$|mail\.google\./.test(host)) return 'Gmail';
  if (/google\./.test(host) || /googlequicksearchbox/.test(host)) return 'Google';
  if (/github\.com$/.test(host)) return 'GitHub';
  if (/instagram/.test(host)) return 'Instagram';
  if (/facebook|fb\.com$|fb\.me$/.test(host)) return 'Facebook';
  if (/whatsapp/.test(host)) return 'WhatsApp';
  if (/^t\.co$|twitter|^x\.com$/.test(host)) return 'X';
  if (/bing\.com$/.test(host)) return 'Bing';
  if (/chatgpt|openai/.test(host)) return 'ChatGPT';
  if (/claude\.ai$/.test(host)) return 'Claude';
  if (/perplexity/.test(host)) return 'Perplexity';
  return host.slice(0, 60);
}

export function deviceOf(ua, width) {
  if (/ipad|tablet/i.test(ua) || (width >= 600 && width < 1000 && /android/i.test(ua))) return 'Tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

export function browserOf(ua) {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

export function osOf(ua) {
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/cros/i.test(ua)) return 'ChromeOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}
