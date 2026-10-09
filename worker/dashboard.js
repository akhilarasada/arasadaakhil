// HTML for the private dashboard. Rendered on the server with the numbers already in it.

const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const fmt = n => Number(n || 0).toLocaleString('en-IN');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const shortDay = day => Number(day.slice(8)) + ' ' + MONTHS[Number(day.slice(5, 7)) - 1];
const clock = seconds => Math.floor(seconds / 60) + ':' + String(Math.round(seconds % 60)).padStart(2, '0');
const hourLabel = h => (h % 12 || 12) + (h < 12 ? 'am' : 'pm');

// Cloudflare reports countries as two-letter codes; show the full name
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
function countryName(code) {
  try { return /^[A-Z]{2}$/.test(code) ? regionNames.of(code) : (code || 'Unknown'); } catch (e) { return code; }
}

// The order the sections appear on the page, for the "how far people got" chart
const SECTION_ORDER = ['About', 'Work', 'Freelance', 'Experience', 'Skillset', 'Resume', 'MCP', 'Projects offer', 'Contact'];

const STYLE = `
  :root { --bg:#efeeeb; --ink:#0a0a0a; --muted:#6b6862; --line:rgba(10,10,10,.14); --card:#f7f6f3; --red:#d12424; --stone:#ccc9c4;
    --display:"Funnel Display","Helvetica Neue",Arial,sans-serif; --body:"Archivo","Helvetica Neue",Arial,sans-serif; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--body); font-size:15px; line-height:1.45; -webkit-font-smoothing:antialiased; }
  a { color:inherit; }
  .wrap { max-width:1280px; margin:0 auto; padding:28px clamp(16px,4vw,48px) 64px; }
  header { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-end; gap:16px; padding-bottom:22px; border-bottom:1px solid var(--line); }
  .brand { display:inline-flex; align-items:center; gap:6px; font:600 18px var(--display); text-decoration:none; }
  .brand i { width:9px; height:9px; background:var(--red); }
  h1 { margin:18px 0 0; font:500 clamp(40px,7vw,84px)/.95 var(--display); letter-spacing:-.04em; }
  .label { font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
  .tabs { display:flex; flex-wrap:wrap; gap:6px; }
  .tabs a, .pager a, .pager span { padding:8px 14px; border:1px solid var(--line); border-radius:999px; font-size:13px; text-decoration:none; }
  .tabs a.on { background:var(--ink); border-color:var(--ink); color:var(--bg); }
  .signout:hover { background:var(--red); border-color:var(--red); color:#fff; }
  .section-title { display:flex; align-items:baseline; gap:12px; margin:44px 0 12px; }
  .section-title h2 { margin:0; font:500 clamp(26px,3vw,40px)/1 var(--display); letter-spacing:-.03em; }
  .section-title i { width:9px; height:9px; background:var(--red); }
  .tiles { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:24px; }
  .tile, .card { background:var(--card); border:1px solid var(--line); padding:18px; }
  .tile b { display:block; margin:14px 0 6px; font:500 clamp(34px,4.2vw,56px)/.9 var(--display); letter-spacing:-.04em; }
  .tile b small { font-size:.42em; letter-spacing:0; color:var(--muted); margin-left:3px; }
  .tile > small { color:var(--muted); font-size:13px; }
  .tile--hot { background:var(--ink); border-color:var(--ink); color:var(--bg); }
  .tile--hot .label, .tile--hot > small { color:var(--stone); }
  .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:12px; }
  .grid--3 { grid-template-columns:repeat(3,1fr); }
  .card--wide { grid-column:1 / -1; }
  .card h3 { margin:0 0 4px; font:500 21px var(--display); letter-spacing:-.02em; }
  .card > p { margin:0 0 16px; color:var(--muted); font-size:13px; }
  .chart { position:relative; }
  .chart svg { display:block; width:100%; height:auto; overflow:visible; }
  .chart .grid-line { stroke:var(--line); stroke-width:1; }
  .chart .axis { fill:var(--muted); font:11px var(--body); }
  .chart .bar { fill:var(--ink); transition:fill .15s; }
  .chart .hit { fill:transparent; }
  .chart g.col:hover .bar { fill:var(--red); }
  .chart .cell { fill:var(--ink); transition:stroke .1s; stroke:transparent; stroke-width:2; }
  .chart .cell:hover { stroke:var(--red); }
  .chart .cell--none { fill:rgba(10,10,10,.05); }
  .tip { position:absolute; top:0; left:0; z-index:2; padding:8px 10px; background:var(--ink); color:var(--bg); font-size:12px; line-height:1.4; white-space:nowrap; pointer-events:none; opacity:0; transform:translate(-50%,-115%); transition:opacity .12s; }
  .tip.on { opacity:1; }
  .tip b { display:block; font-weight:600; }
  .scale { display:flex; align-items:center; gap:8px; margin-top:10px; color:var(--muted); font-size:11px; }
  .scale i { width:120px; height:8px; background:linear-gradient(90deg, rgba(10,10,10,.08), var(--ink)); }
  .rows { list-style:none; margin:0; padding:0; }
  .rows li { display:grid; grid-template-columns:minmax(90px,40%) 1fr auto; align-items:center; gap:12px; padding:8px 0; border-top:1px solid var(--line); }
  .rows li:first-child { border-top:0; }
  .rows .name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .rows .track { height:8px; }
  .rows .fill { display:block; height:100%; min-width:2px; background:var(--ink); border-radius:0 4px 4px 0; }
  .rows .num { font-variant-numeric:tabular-nums; font-weight:500; }
  .rows .num small { color:var(--muted); font-weight:400; margin-left:6px; }
  .empty { padding:18px 0; color:var(--muted); }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th { text-align:left; padding:8px 10px 8px 0; font-weight:500; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
  td { padding:9px 10px 9px 0; border-top:1px solid var(--line); white-space:nowrap; }
  .scroll { overflow-x:auto; }

  .people { border-top:1px solid var(--line); }
  .people__head, .person > summary { display:grid; grid-template-columns:22px 1.5fr 1.4fr 1.5fr 1.3fr 70px 1.1fr; gap:12px; align-items:center; }
  .people__head { padding:8px 0; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
  .person { border-top:1px solid var(--line); }
  .person > summary { padding:11px 0; cursor:pointer; list-style:none; }
  .person > summary::-webkit-details-marker { display:none; }
  .person > summary:hover { background:rgba(10,10,10,.03); }
  .person > summary > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .arrow { width:22px; height:22px; display:grid; place-items:center; border:1px solid var(--line); border-radius:50%; font-size:11px; transition:transform .25s, background .2s, color .2s; }
  .person[open] .arrow { transform:rotate(90deg); background:var(--ink); color:var(--bg); border-color:var(--ink); }
  .ip { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:13px; }
  .count { justify-self:start; min-width:30px; padding:3px 9px; border-radius:999px; background:var(--ink); color:var(--bg); font-size:12px; font-weight:600; text-align:center; }
  .count--many { background:var(--red); }
  .person__body { padding:4px 0 18px 34px; }
  .person__meta { display:flex; flex-wrap:wrap; gap:6px 22px; margin-bottom:10px; color:var(--muted); font-size:13px; }
  .person__meta b { color:var(--ink); font-weight:500; }
  .person__body table { font-size:13px; max-width:720px; }
  .pager { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:16px; }
  .pager span { border-color:transparent; color:var(--muted); }
  .pager a:hover { background:var(--ink); border-color:var(--ink); color:var(--bg); }
  .pager .off { opacity:.35; pointer-events:none; }
  footer { margin-top:28px; color:var(--muted); font-size:12px; }

  .msg { min-height:100vh; display:grid; place-items:center; padding:24px; text-align:center; }
  .msg h1 { margin:0 0 14px; font-size:clamp(34px,6vw,64px); }
  .msg p { max-width:34em; margin:0 auto; color:var(--muted); }
  .login { min-height:100vh; min-height:100svh; display:grid; grid-template-columns:1.1fr 1fr; }
  .login__side { display:flex; flex-direction:column; justify-content:space-between; padding:clamp(24px,4vw,56px); }
  .login__side h1 { margin:0; font-size:clamp(56px,10vw,150px); line-height:.86; }
  .login__side h1 i { display:inline-block; width:.16em; height:.16em; margin-left:.06em; background:var(--red); }
  .login__side p { max-width:22em; margin:20px 0 0; font:500 clamp(17px,1.7vw,24px)/1.2 var(--display); letter-spacing:-.02em; }
  .login__panel { display:flex; flex-direction:column; justify-content:center; padding:clamp(28px,5vw,80px); background:#0d0d0b; color:var(--bg); }
  .login__panel h2 { margin:14px 0 36px; font:500 clamp(30px,3.6vw,52px)/1 var(--display); letter-spacing:-.03em; }
  .login__panel .label { color:var(--stone); }
  .field { display:block; margin-bottom:26px; }
  .field span { display:block; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--stone); }
  .field input { width:100%; padding:10px 0; background:transparent; border:0; border-bottom:1px solid rgba(255,255,255,.3); border-radius:0; color:var(--bg); font:inherit; font-size:18px; outline:none; transition:border-color .3s; }
  .field input:focus { border-color:var(--red); }
  .field input::placeholder { color:rgba(255,255,255,.28); }
  .login__btn { align-self:flex-start; margin-top:6px; padding:16px 28px; background:var(--red); color:#fff; border:0; border-radius:999px; font:inherit; font-weight:500; cursor:pointer; transition:background .3s,color .3s; }
  .login__btn:hover { background:var(--bg); color:var(--ink); }
  .login__error { margin:0 0 24px; padding:12px 14px; border:1px solid var(--red); color:#ff9a9a; font-size:14px; }
  .login__note { margin-top:28px; font-size:13px; color:var(--muted); }
  .login__back { font-size:13px; }

  @media (max-width:1000px) {
    .tiles { grid-template-columns:1fr 1fr; } .grid, .grid--3 { grid-template-columns:1fr; }
    .login { grid-template-columns:1fr; } .login__side { gap:40px; }
    .people__head { display:none; }
    .person > summary { grid-template-columns:22px 1fr auto; }
    .person > summary > span:nth-child(n+4):not(.count) { display:none; }
  }
`;

const HEAD = title => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Funnel+Display:wght@500;600&display=swap" rel="stylesheet">
<style>${STYLE}</style></head>`;

export function renderMessage(title, text) {
  return `${HEAD(title)}<body><div class="msg"><div><h1>${esc(title)}</h1><p>${esc(text)}</p></div></div></body></html>`;
}

// Sign-in page shown at /dashboard until a valid session exists
export function renderLogin({ user, error }) {
  return `${HEAD('Sign in — Dashboard')}
<body><main class="login">
  <section class="login__side">
    <a class="brand" href="/">AA<i></i></a>
    <div>
      <h1>Dash<br>board<i></i></h1>
      <p>Who is visiting, where they came from, and what they opened.</p>
    </div>
    <a class="login__back" href="/">← Back to the site</a>
  </section>
  <section class="login__panel">
    <span class="label">(Private area)</span>
    <h2>Sign in</h2>
    ${error ? `<p class="login__error" role="alert">${esc(error)}</p>` : ''}
    <form method="post" action="/dashboard">
      <label class="field"><span>Username</span>
        <input type="text" name="username" placeholder="${esc(user)}" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus></label>
      <label class="field"><span>Password</span>
        <input type="password" name="password" autocomplete="current-password" required></label>
      <button class="login__btn" type="submit">Open dashboard →</button>
    </form>
    <p class="login__note">You stay signed in on this device for 7 days.</p>
  </section>
</main></body></html>`;
}

/* ---------- charts ---------- */

// Single-series daily bars: one hue, thin marks rounded at the data end, hover for exact values
function dailyChart(daily) {
  const W = 1100, H = 280, left = 40, right = 8, top = 12, bottom = 28;
  const plotW = W - left - right, plotH = H - top - bottom;
  const max = Math.max(4, ...daily.map(d => d.visitors));
  const step = Math.max(1, Math.ceil(max / 4));
  const ceil = step * 4;
  const slot = plotW / daily.length;
  const barW = Math.max(2, Math.min(24, slot - 2));
  const labelEvery = Math.ceil(daily.length / 10);

  let grid = '';
  for (let v = 0; v <= ceil; v += step) {
    const y = top + plotH - (v / ceil) * plotH;
    grid += `<line class="grid-line" x1="${left}" x2="${W - right}" y1="${y}" y2="${y}"/>` +
      `<text class="axis" x="${left - 8}" y="${y + 4}" text-anchor="end">${v}</text>`;
  }

  let cols = '';
  daily.forEach((d, i) => {
    const x = left + i * slot + (slot - barW) / 2;
    const h = (d.visitors / ceil) * plotH;
    const y = top + plotH - h;
    const r = Math.min(4, barW / 2, h);
    const bar = h > 0
      ? `<path class="bar" d="M${x} ${top + plotH}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + barW - r}Q${x + barW} ${y} ${x + barW} ${y + r}V${top + plotH}Z"/>`
      : '';
    const tick = i % labelEvery === 0
      ? `<text class="axis" x="${x + barW / 2}" y="${H - 8}" text-anchor="middle">${shortDay(d.day)}</text>`
      : '';
    cols += `<g class="col" data-tip="${esc(shortDay(d.day))}|${d.visitors} visitors · ${d.views} page views" data-x="${(x + barW / 2) / W}" data-y="${y / H}">` +
      `<rect class="hit" x="${left + i * slot}" y="${top}" width="${slot}" height="${plotH}"/>${bar}</g>${tick}`;
  });

  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitors per day">${grid}${cols}</svg><div class="tip"></div></div>`;
}

// Weekday by hour heatmap: one hue from light to dark, a gap between cells, hover for the count
function heatmap(cells) {
  const W = 1100, left = 44, top = 6, gap = 2;
  const cw = (W - left) / 24, ch = 26, H = top + ch * 7 + 22;
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let max = 0;
  for (const c of cells) {
    if (c.dow >= 0 && c.dow < 7 && c.hr >= 0 && c.hr < 24) { grid[c.dow][c.hr] = c.n; max = Math.max(max, c.n); }
  }
  // Week shown Monday first
  const order = [1, 2, 3, 4, 5, 6, 0];
  let out = '';
  order.forEach((dow, row) => {
    const y = top + row * ch;
    out += `<text class="axis" x="${left - 8}" y="${y + ch / 2 + 4}" text-anchor="end">${WEEKDAYS[dow]}</text>`;
    for (let h = 0; h < 24; h++) {
      const n = grid[dow][h];
      const x = left + h * cw;
      const shade = n ? (0.14 + 0.86 * (n / max)).toFixed(2) : null;
      out += `<rect class="cell${n ? '' : ' cell--none'}" x="${x + gap / 2}" y="${y + gap / 2}" width="${cw - gap}" height="${ch - gap}" rx="3"` +
        (n ? ` fill-opacity="${shade}"` : '') +
        ` data-tip="${WEEKDAYS[dow]} ${hourLabel(h)}|${n} page view${n === 1 ? '' : 's'}" data-x="${(x + cw / 2) / W}" data-y="${y / H}"/>`;
    }
  });
  for (let h = 0; h < 24; h += 3) {
    out += `<text class="axis" x="${left + h * cw + cw / 2}" y="${H - 6}" text-anchor="middle">${hourLabel(h)}</text>`;
  }
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Page views by weekday and hour">${out}</svg><div class="tip"></div></div>` +
    `<div class="scale"><span>Fewer</span><i></i><span>More${max ? ` (busiest hour: ${max})` : ''}</span></div>`;
}

function rows(items, empty, total) {
  if (!items.length) return `<p class="empty">${esc(empty)}</p>`;
  const max = Math.max(...items.map(i => i.n));
  return '<ul class="rows">' + items.map(i =>
    `<li><span class="name" title="${esc(i.label)}">${esc(i.label || 'Unknown')}</span>` +
    `<span class="track"><span class="fill" style="width:${Math.max(1, (i.n / max) * 100)}%"></span></span>` +
    `<span class="num">${fmt(i.n)}${total ? `<small>${Math.round((i.n / total) * 100)}%</small>` : ''}</span></li>`
  ).join('') + '</ul>';
}

/* ---------- visitors table ---------- */

function people(s) {
  if (!s.visitors.length) return '<p class="empty">Nothing recorded in this period yet.</p>';
  const link = p => `?days=${s.days}&page=${p}#visitors`;

  const list = s.visitors.map(v => {
    const place = [v.city, countryName(v.country)].filter(Boolean).join(', ');
    const visits = v.visits.map(x =>
      `<tr><td>${esc(x.when)}</td><td>${esc(x.ref || 'Direct')}</td><td>${esc(x.path || '/')}</td></tr>`).join('');
    return `<details class="person">
      <summary>
        <span class="arrow" aria-hidden="true">▶</span>
        <span class="ip">${esc(v.ip || 'not recorded')}</span>
        <span>${esc(place || 'Unknown')}</span>
        <span title="${esc(v.org)}">${esc(v.org || '—')}</span>
        <span>${esc([v.device, v.os, v.browser].filter(Boolean).join(' · '))}</span>
        <span class="count${v.views > 1 ? ' count--many' : ''}" title="Page views in this period">${fmt(v.views)}×</span>
        <span>${esc(v.lastSeen)}</span>
      </summary>
      <div class="person__body">
        <div class="person__meta">
          <span>Visited on <b>${fmt(v.days)}</b> day${v.days === 1 ? '' : 's'}</span>
          ${v.region ? `<span>Region <b>${esc(v.region)}</b></span>` : ''}
          ${v.screen ? `<span>Screen <b>${esc(v.screen)}</b></span>` : ''}
          ${v.lang ? `<span>Language <b>${esc(v.lang)}</b></span>` : ''}
          <span>Last came from <b>${esc(v.ref || 'Direct')}</b></span>
        </div>
        <table><thead><tr><th>When (IST)</th><th>Came from</th><th>Page</th></tr></thead><tbody>${visits}</tbody></table>
      </div>
    </details>`;
  }).join('');

  return `<div class="people">
    <div class="people__head"><span></span><span>IP address</span><span>Location</span><span>Network</span><span>Device</span><span>Visits</span><span>Last seen (IST)</span></div>
    ${list}
  </div>
  <nav class="pager" aria-label="Visitor pages">
    <a class="${s.page <= 1 ? 'off' : ''}" href="${link(1)}">« First</a>
    <a class="${s.page <= 1 ? 'off' : ''}" href="${link(s.page - 1)}">‹ Previous</a>
    <span>Page ${s.page} of ${s.pages} · ${fmt(s.totalPeople)} visitors</span>
    <a class="${s.page >= s.pages ? 'off' : ''}" href="${link(s.page + 1)}">Next ›</a>
    <a class="${s.page >= s.pages ? 'off' : ''}" href="${link(s.pages)}">Last »</a>
  </nav>`;
}

/* ---------- page ---------- */

export function renderDashboard(s) {
  const sum = (list, key) => list.reduce((total, d) => total + d[key], 0);
  const todayRow = s.daily[s.daily.length - 1] || { visitors: 0, views: 0 };
  const week = s.daily.slice(-7);
  const count = name => (s.clicks.find(e => e.label === name) || { n: 0 }).n;
  const noData = 'Nothing recorded in this period yet.';
  const visitorsTotal = sum(s.daily, 'visitors');

  const returning = s.loyalty.total ? Math.round(((s.loyalty.back || 0) / s.loyalty.total) * 100) : 0;
  const avgTime = s.engagement.n ? clock(s.engagement.dur || 0) : '—';
  const avgScroll = s.engagement.n ? Math.round(s.engagement.scroll || 0) : null;

  // How far down the page people got, in page order
  const reached = new Map(s.sections.map(x => [x.label.replace('Section: ', ''), x.n]));
  const funnel = SECTION_ORDER.filter(name => reached.has(name)).map(name => ({ label: name, n: reached.get(name) }));
  const funnelBase = funnel.length ? Math.max(...funnel.map(f => f.n)) : 0;

  const tabs = s.ranges.map(r => `<a href="?days=${r}" class="${r === s.days ? 'on' : ''}">${r} days</a>`).join('');
  const m = s.mcp.totals;

  const mcpRecent = s.mcp.recent.length
    ? `<div class="scroll"><table><thead><tr><th>When (IST)</th><th>AI app</th><th>What it did</th><th>Country</th></tr></thead><tbody>` +
      s.mcp.recent.map(r => `<tr><td>${esc(r.when)}</td><td>${esc(r.client)}${r.client_version ? ` <span class="label">${esc(r.client_version)}</span>` : ''}</td>` +
        `<td>${esc(r.method === 'tools/call' ? 'Called ' + r.tool : r.method === 'initialize' ? 'Connected' : 'Listed tools')}</td><td>${esc(countryName(r.country))}</td></tr>`).join('') +
      '</tbody></table></div>'
    : '<p class="empty">No AI app has connected yet. Add the MCP address to Claude, ChatGPT or Cursor and ask about yourself to see it here.</p>';

  return `${HEAD('Dashboard — Arasada Akhil')}
<body><div class="wrap">
  <header>
    <div>
      <a class="brand" href="/">AA<i></i></a>
      <h1>Dashboard</h1>
    </div>
    <nav class="tabs" aria-label="Period">${tabs}<a class="signout" href="/dashboard/logout">Sign out</a></nav>
  </header>

  <section class="tiles">
    <div class="tile tile--hot"><span class="label">Visitors · last ${s.days} days</span><b>${fmt(visitorsTotal)}</b><small>${fmt(todayRow.visitors)} today · ${fmt(sum(week, 'visitors'))} in 7 days</small></div>
    <div class="tile"><span class="label">Page views</span><b>${fmt(sum(s.daily, 'views'))}</b><small>${fmt(todayRow.views)} today · ${fmt(sum(week, 'views'))} in 7 days</small></div>
    <div class="tile"><span class="label">Returning visitors</span><b>${returning}<small>%</small></b><small>${fmt(s.loyalty.back || 0)} of ${fmt(s.loyalty.total || 0)} came on more than one day</small></div>
    <div class="tile"><span class="label">Average time on page</span><b>${avgTime}</b><small>${avgScroll === null ? 'Collected from new visits onward' : 'Average scroll depth ' + avgScroll + '%'}</small></div>
    <div class="tile"><span class="label">Resume downloads</span><b>${fmt(count('Resume download'))}</b><small>${fmt(count('Resume preview'))} previews opened</small></div>
    <div class="tile"><span class="label">Contact messages</span><b>${fmt(count('Contact form sent'))}</b><small>${fmt(count('Email click') + count('Phone click'))} email or phone taps</small></div>
    <div class="tile"><span class="label">AI requests (MCP)</span><b>${fmt(m.calls)}</b><small>${fmt(m.connections)} connections from ${fmt(m.people)} sources</small></div>
    <div class="tile"><span class="label">Countries reached</span><b>${fmt(s.countries.length)}${s.countries.length >= 8 ? '<small>+</small>' : ''}</b><small>${s.countries[0] ? 'Most from ' + esc(countryName(s.countries[0].label)) : 'No visits yet'}</small></div>
  </section>

  <div class="section-title"><i></i><h2>Traffic</h2></div>
  <section class="grid">
    <div class="card card--wide">
      <h3>Visitors per day</h3>
      <p>Unique visitors each day, Indian time. Hover a bar for that day's visitors and page views.</p>
      ${dailyChart(s.daily)}
    </div>
    <div class="card card--wide">
      <h3>When people visit</h3>
      <p>Page views by weekday and hour, Indian time. Darker means busier.</p>
      ${heatmap(s.heat)}
    </div>
    <div class="card"><h3>Where they came from</h3><p>Visitors by the site or app that sent them.</p>${rows(s.refs, noData, visitorsTotal)}</div>
    <div class="card"><h3>How far they got</h3><p>Visitors who scrolled to each section of the page.</p>${rows(funnel, 'Collected from new visits onward.', funnelBase)}</div>
  </section>

  <div class="section-title"><i></i><h2>Audience</h2></div>
  <section class="grid grid--3">
    <div class="card"><h3>Countries</h3><p>Visitors by country.</p>${rows(s.countries.map(c => ({ ...c, label: countryName(c.label) })), noData)}</div>
    <div class="card"><h3>Cities</h3><p>Visitors by city.</p>${rows(s.cities, 'Collected from new visits onward.')}</div>
    <div class="card"><h3>Networks</h3><p>Internet provider or company network.</p>${rows(s.orgs, 'Collected from new visits onward.')}</div>
    <div class="card"><h3>Devices</h3><p>Visitors by device type.</p>${rows(s.devices, noData)}</div>
    <div class="card"><h3>Operating systems</h3><p>Visitors by system.</p>${rows(s.systems, 'Collected from new visits onward.')}</div>
    <div class="card"><h3>Browsers</h3><p>Visitors by browser.</p>${rows(s.browsers, noData)}</div>
    <div class="card card--wide"><h3>What people clicked</h3><p>Downloads, contact actions and links to your projects.</p>${rows(s.clicks, 'No clicks recorded in this period yet.')}</div>
  </section>

  <div class="section-title"><i></i><h2>AI assistants (MCP)</h2></div>
  <section class="grid grid--3">
    <div class="card"><h3>Which AI</h3><p>Connections and requests by AI app.</p>${rows(s.mcp.clients, 'No AI app has connected in this period.')}</div>
    <div class="card"><h3>What they asked for</h3><p>Requests by tool.</p>${rows(s.mcp.tools, 'No requests in this period.')}</div>
    <div class="card"><h3>Latest AI activity</h3><p>The 10 most recent MCP requests.</p>${mcpRecent}</div>
  </section>

  <div class="section-title" id="visitors"><i></i><h2>Visitors</h2></div>
  <section class="card">
    <h3>Everyone who visited</h3>
    <p>One row per IP address, newest first. Click the arrow to see each visit. The red badge marks people who viewed more than once.</p>
    ${people(s)}
  </section>

  <footer>Each visit stores the IP address, approximate location, network and device. No cookies are used. Known bots are left out. Visits recorded before IP logging was added show as "not recorded".</footer>
</div>
<script>
  (function () {
    document.querySelectorAll('.chart').forEach(function (chart) {
      var tip = chart.querySelector('.tip');
      chart.querySelectorAll('[data-tip]').forEach(function (mark) {
        mark.addEventListener('mouseenter', function () {
          var parts = mark.getAttribute('data-tip').split('|');
          tip.textContent = '';
          var b = document.createElement('b'); b.textContent = parts[0];
          tip.appendChild(b); tip.appendChild(document.createTextNode(parts[1] || ''));
          tip.style.left = (mark.getAttribute('data-x') * 100) + '%';
          tip.style.top = (mark.getAttribute('data-y') * 100) + '%';
          tip.classList.add('on');
        });
        mark.addEventListener('mouseleave', function () { tip.classList.remove('on'); });
      });
    });
  })();
</script>
</body></html>`;
}
