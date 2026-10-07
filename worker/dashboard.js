// HTML for the private dashboard. Rendered on the server with the numbers already in it.

const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const fmt = n => Number(n || 0).toLocaleString('en-IN');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDay = day => Number(day.slice(8)) + ' ' + MONTHS[Number(day.slice(5, 7)) - 1];

const STYLE = `
  :root { --bg:#efeeeb; --ink:#0a0a0a; --muted:#6b6862; --line:rgba(10,10,10,.14); --card:#f7f6f3; --red:#d12424; --stone:#ccc9c4;
    --display:"Funnel Display","Helvetica Neue",Arial,sans-serif; --body:"Archivo","Helvetica Neue",Arial,sans-serif; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--body); font-size:15px; line-height:1.45; -webkit-font-smoothing:antialiased; }
  a { color:inherit; }
  .wrap { max-width:1240px; margin:0 auto; padding:28px clamp(16px,4vw,48px) 64px; }
  header { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-end; gap:16px; padding-bottom:22px; border-bottom:1px solid var(--line); }
  .brand { display:inline-flex; align-items:center; gap:6px; font:600 18px var(--display); text-decoration:none; }
  .brand i { width:9px; height:9px; background:var(--red); }
  h1 { margin:18px 0 0; font:500 clamp(40px,7vw,84px)/.95 var(--display); letter-spacing:-.04em; }
  .label { font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
  .tabs { display:flex; gap:6px; }
  .tabs a { padding:8px 14px; border:1px solid var(--line); border-radius:999px; font-size:13px; text-decoration:none; }
  .tabs a.on { background:var(--ink); border-color:var(--ink); color:var(--bg); }
  .tiles { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:24px; }
  .tile, .card { background:var(--card); border:1px solid var(--line); padding:18px; }
  .tile b { display:block; margin:14px 0 6px; font:500 clamp(36px,4.6vw,60px)/.9 var(--display); letter-spacing:-.04em; }
  .tile small { color:var(--muted); font-size:13px; }
  .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:12px; }
  .card--wide { grid-column:1 / -1; }
  .card h2 { margin:0 0 4px; font:500 22px var(--display); letter-spacing:-.02em; }
  .card > p { margin:0 0 16px; color:var(--muted); font-size:13px; }
  .chart { position:relative; }
  .chart svg { display:block; width:100%; height:auto; overflow:visible; }
  .chart .grid-line { stroke:var(--line); stroke-width:1; }
  .chart .axis { fill:var(--muted); font:11px var(--body); }
  .chart .bar { fill:var(--ink); transition:fill .15s; }
  .chart .hit { fill:transparent; }
  .chart g.col:hover .bar { fill:var(--red); }
  .tip { position:absolute; top:0; left:0; padding:8px 10px; background:var(--ink); color:var(--bg); font-size:12px; line-height:1.4; white-space:nowrap; pointer-events:none; opacity:0; transform:translate(-50%,-110%); transition:opacity .12s; }
  .tip.on { opacity:1; }
  .tip b { display:block; font-weight:600; }
  .rows { list-style:none; margin:0; padding:0; }
  .rows li { display:grid; grid-template-columns:minmax(90px,38%) 1fr auto; align-items:center; gap:12px; padding:8px 0; border-top:1px solid var(--line); }
  .rows li:first-child { border-top:0; }
  .rows .name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .rows .track { height:8px; }
  .rows .fill { display:block; height:100%; min-width:2px; background:var(--ink); border-radius:0 4px 4px 0; }
  .rows .num { font-variant-numeric:tabular-nums; font-weight:500; }
  .empty { padding:22px 0; color:var(--muted); }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th { text-align:left; padding:8px 10px 8px 0; font-weight:500; font-size:11px; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); }
  td { padding:9px 10px 9px 0; border-top:1px solid var(--line); white-space:nowrap; }
  .scroll { overflow-x:auto; }
  footer { margin-top:28px; color:var(--muted); font-size:12px; }
  .msg { min-height:100vh; display:grid; place-items:center; padding:24px; text-align:center; }
  .msg h1 { margin:0 0 14px; font-size:clamp(34px,6vw,64px); }
  .msg p { max-width:34em; margin:0 auto; color:var(--muted); }
  .signout { padding:8px 14px; border:1px solid var(--line); border-radius:999px; font-size:13px; text-decoration:none; }
  .signout:hover { background:var(--red); border-color:var(--red); color:#fff; }
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
  @media (max-width:900px) { .tiles { grid-template-columns:1fr 1fr; } .grid { grid-template-columns:1fr; }
    .login { grid-template-columns:1fr; } .login__side { gap:40px; } }
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
    cols += `<g class="col" data-x="${(x + barW / 2) / W}" data-y="${y / H}" data-day="${shortDay(d.day)}" data-visitors="${d.visitors}" data-views="${d.views}">` +
      `<rect class="hit" x="${left + i * slot}" y="${top}" width="${slot}" height="${plotH}"/>${bar}</g>${tick}`;
  });

  return `<div class="chart" id="daily"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visitors per day">${grid}${cols}</svg><div class="tip"></div></div>`;
}

// Cloudflare reports countries as two-letter codes; show the full name
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
function countryName(code) {
  try { return /^[A-Z]{2}$/.test(code) ? regionNames.of(code) : code; } catch (e) { return code; }
}

function rows(items, empty) {
  if (!items.length) return `<p class="empty">${esc(empty)}</p>`;
  const max = Math.max(...items.map(i => i.n));
  return '<ul class="rows">' + items.map(i =>
    `<li><span class="name" title="${esc(i.label)}">${esc(i.label || 'Unknown')}</span>` +
    `<span class="track"><span class="fill" style="width:${Math.max(1, (i.n / max) * 100)}%"></span></span>` +
    `<span class="num">${fmt(i.n)}</span></li>`
  ).join('') + '</ul>';
}

export function renderDashboard(s) {
  const sum = (list, key) => list.reduce((total, d) => total + d[key], 0);
  const todayRow = s.daily[s.daily.length - 1] || { visitors: 0, views: 0 };
  const week = s.daily.slice(-7);
  const count = name => (s.events.find(e => e.label === name) || { n: 0 }).n;
  const noData = 'Nothing recorded in this period yet.';

  const tabs = s.ranges.map(r => `<a href="?days=${r}" class="${r === s.days ? 'on' : ''}">${r} days</a>`).join('');

  const recent = s.recent.length
    ? `<div class="scroll"><table><thead><tr><th>When (IST)</th><th>Country</th><th>Device</th><th>Browser</th><th>Came from</th></tr></thead><tbody>` +
      s.recent.map(r => `<tr><td>${esc(r.when)}</td><td>${esc(countryName(r.country))}</td><td>${esc(r.device)}</td><td>${esc(r.browser)}</td><td>${esc(r.ref)}</td></tr>`).join('') +
      '</tbody></table></div>'
    : `<p class="empty">${noData}</p>`;

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
    <div class="tile"><span class="label">Visitors · last ${s.days} days</span><b>${fmt(sum(s.daily, 'visitors'))}</b><small>${fmt(todayRow.visitors)} today · ${fmt(sum(week, 'visitors'))} in 7 days</small></div>
    <div class="tile"><span class="label">Page views · last ${s.days} days</span><b>${fmt(sum(s.daily, 'views'))}</b><small>${fmt(todayRow.views)} today · ${fmt(sum(week, 'views'))} in 7 days</small></div>
    <div class="tile"><span class="label">Resume downloads</span><b>${fmt(count('Resume download'))}</b><small>${fmt(count('Resume preview'))} previews opened</small></div>
    <div class="tile"><span class="label">Contact messages</span><b>${fmt(count('Contact form sent'))}</b><small>${fmt(count('Email click') + count('Phone click'))} email or phone taps</small></div>
  </section>

  <section class="grid">
    <div class="card card--wide">
      <h2>Visitors per day</h2>
      <p>Unique visitors each day, Indian time. Hover a bar for that day's numbers.</p>
      ${dailyChart(s.daily)}
    </div>
    <div class="card"><h2>Where they came from</h2><p>Visitors by the site that sent them.</p>${rows(s.refs, noData)}</div>
    <div class="card"><h2>Countries</h2><p>Visitors by country.</p>${rows(s.countries.map(c => ({ ...c, label: countryName(c.label) })), noData)}</div>
    <div class="card"><h2>Devices</h2><p>Visitors by device type.</p>${rows(s.devices, noData)}</div>
    <div class="card"><h2>Browsers</h2><p>Visitors by browser.</p>${rows(s.browsers, noData)}</div>
    <div class="card card--wide"><h2>What people clicked</h2><p>Downloads, contact actions and links to your projects.</p>${rows(s.events, 'No clicks recorded in this period yet.')}</div>
    <div class="card card--wide"><h2>Latest visits</h2><p>The 15 most recent page views.</p>${recent}</div>
  </section>

  <footer>No cookies and no IP addresses are stored. A visitor is counted once per day. Known bots are left out.</footer>
</div>
<script>
  (function () {
    var chart = document.getElementById('daily');
    if (!chart) return;
    var tip = chart.querySelector('.tip');
    chart.querySelectorAll('g.col').forEach(function (col) {
      col.addEventListener('mouseenter', function () {
        var d = col.dataset;
        tip.innerHTML = '<b>' + d.day + '</b>' + d.visitors + ' visitors · ' + d.views + ' views';
        tip.style.left = (d.x * 100) + '%';
        tip.style.top = (d.y * 100) + '%';
        tip.classList.add('on');
      });
      col.addEventListener('mouseleave', function () { tip.classList.remove('on'); });
    });
  })();
</script>
</body></html>`;
}
