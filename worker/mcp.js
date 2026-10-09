// A small MCP server (Model Context Protocol, Streamable HTTP) at /mcp.
// AI assistants connect to it to answer questions about Akhil from the portfolio's own data.

import { profile, experience, projects, skills, contact, SITE } from './profile.js';
import { ensureSchema, dayOf } from './store.js';

const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER = { name: 'arasada-akhil-portfolio', title: 'Arasada Akhil — Portfolio', version: '1.0.0' };

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, authorization, mcp-session-id, mcp-protocol-version',
  'access-control-expose-headers': 'mcp-session-id'
};

const noArgs = { type: 'object', properties: {}, additionalProperties: false };

export const TOOLS = [
  { name: 'get_profile', description: 'Who Arasada Akhil is: role, location, summary, highlights, education and whether he is available for freelance work.', inputSchema: noArgs },
  { name: 'get_experience', description: 'Akhil\'s work history: roles, companies, dates and what he did in each.', inputSchema: noArgs },
  {
    name: 'list_projects',
    description: 'List Akhil\'s projects with a one-line summary and link. Filter by kind: "work" for employer projects, "freelance" for client and personal builds.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['all', 'work', 'freelance'], description: 'Which projects to list. Defaults to all.' } }, additionalProperties: false }
  },
  {
    name: 'get_project',
    description: 'Full details of one project by name, for example "RevalERP", "ALI CMS Studio" or "HRMSphere".',
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Project name, or part of it.' } }, required: ['name'], additionalProperties: false }
  },
  { name: 'get_skills', description: 'Akhil\'s skill areas, tech stack and certifications.', inputSchema: noArgs },
  { name: 'get_contact', description: 'How to reach or hire Akhil: email, contact form, resume link, LinkedIn and GitHub.', inputSchema: noArgs }
];

function runTool(name, args) {
  switch (name) {
    case 'get_profile':
      return [
        `# ${profile.name}`,
        `${profile.title}. ${profile.currentRole}. Based in ${profile.location}.`,
        '', profile.summary,
        '', '## Highlights', ...profile.highlights.map(h => `- ${h}`),
        '', `## Availability`, profile.availability,
        '', `## Education`, profile.education,
        '', `Website: ${SITE}`
      ].join('\n');

    case 'get_experience':
      return ['# Experience', ...experience.map(e =>
        `\n## ${e.role}, ${e.company} (${e.place})\n${e.period}\n${e.details}`), `\nEducation: ${profile.education}`].join('\n');

    case 'list_projects': {
      const kind = args && args.kind && args.kind !== 'all' ? args.kind : null;
      const list = projects.filter(p => !kind || p.kind === kind);
      return [`# Projects${kind ? ` (${kind})` : ''}`, ...list.map(p =>
        `- **${p.name}** [${p.kind}; ${p.tags}]${p.url ? ` ${p.url}` : ''}\n  ${p.description.split('. ')[0]}.`),
        '', 'Use get_project with a name for full details.'].join('\n');
    }

    case 'get_project': {
      const q = String((args && args.name) || '').toLowerCase().trim();
      const p = q && projects.find(x => x.name.toLowerCase() === q) || projects.find(x => q && x.name.toLowerCase().includes(q));
      if (!p) return { error: `No project matches "${args && args.name}". Known projects: ${projects.map(x => x.name).join(', ')}.` };
      return [`# ${p.name}`, `Kind: ${p.kind}`, `Tags: ${p.tags}`,
        p.role && `Role: ${p.role}`, p.team && `Team: ${p.team}`, p.period && `Period: ${p.period}`,
        p.url ? `Link: ${p.url}` : 'Link: not public', '', p.description].filter(v => v !== undefined && v !== null && v !== false).join('\n');
    }

    case 'get_skills':
      return ['# Skills', ...skills.areas.map(a => `- **${a.name}**: ${a.detail}`),
        '', `Stack: ${skills.stack.join(', ')}`,
        '', '## Certifications', ...skills.certifications.map(c => `- ${c}`)].join('\n');

    case 'get_contact':
      return ['# Contact Arasada Akhil', `- Email: ${contact.email}`, `- Contact form: ${contact.contactForm}`,
        `- Resume (PDF): ${contact.resume}`, `- LinkedIn: ${contact.linkedin}`, `- GitHub: ${contact.github}`,
        `- Website: ${contact.website}`, '', profile.availability].join('\n');

    default:
      return null;
  }
}

/* ---------- who is calling ---------- */

// Friendly name for the AI app, from what it reports about itself
export function aiName(raw) {
  const s = String(raw || '').toLowerCase();
  if (!s) return 'Unknown';
  if (/claude-code|claude code/.test(s)) return 'Claude Code';
  if (/claude|anthropic/.test(s)) return 'Claude';
  if (/chatgpt|openai/.test(s)) return 'ChatGPT';
  if (/cursor/.test(s)) return 'Cursor';
  if (/gemini|google/.test(s)) return 'Gemini';
  if (/copilot|vscode|visual studio code/.test(s)) return 'VS Code / Copilot';
  if (/windsurf|codeium/.test(s)) return 'Windsurf';
  if (/perplexity/.test(s)) return 'Perplexity';
  if (/inspector/.test(s)) return 'MCP Inspector';
  if (/^node|undici/.test(s)) return 'Node script';
  if (/python|httpx|aiohttp/.test(s)) return 'Python script';
  if (/curl|wget|postman|insomnia/.test(s)) return 'Manual test';
  return String(raw).slice(0, 40);
}

const b64 = text => btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = text => decodeURIComponent(escape(atob(text.replace(/-/g, '+').replace(/_/g, '/'))));

// The session id carries the client's name, so later calls can be attributed without a lookup
function newSession(info) {
  const rand = [...crypto.getRandomValues(new Uint8Array(6))].map(b => b.toString(16).padStart(2, '0')).join('');
  return b64(JSON.stringify([String(info.name || '').slice(0, 40), String(info.version || '').slice(0, 20)])) + '.' + rand;
}

function clientFrom(request, initInfo) {
  if (initInfo && initInfo.name) return { name: initInfo.name, version: initInfo.version || '' };
  const sid = request.headers.get('mcp-session-id') || '';
  try {
    const [name, version] = JSON.parse(unb64(sid.split('.')[0]));
    if (name) return { name, version };
  } catch (e) { /* not one of our session ids */ }
  return { name: request.headers.get('user-agent') || '', version: '' };
}

async function log(env, request, method, tool, client) {
  if (!env.DB) return;
  const ts = Date.now();
  await ensureSchema(env.DB);
  await env.DB.prepare(
    'INSERT INTO mcp_calls (ts, day, method, tool, client, client_version, ua, country, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    ts, dayOf(ts), method, tool || null, aiName(client.name), String(client.version || '').slice(0, 20) || null,
    (request.headers.get('user-agent') || '').slice(0, 120), (request.cf && request.cf.country) || 'Unknown',
    request.headers.get('cf-connecting-ip') || null
  ).run();
}

/* ---------- protocol ---------- */

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id: id === undefined ? null : id, error: { code, message } });

function handle(msg, request, env, ctx, extraHeaders) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg && msg.id, -32600, 'Invalid request');
  const { id, method, params } = msg;
  const isNotification = id === undefined;

  switch (method) {
    case 'initialize': {
      const wanted = params && params.protocolVersion;
      const info = (params && params.clientInfo) || {};
      extraHeaders['mcp-session-id'] = newSession(info);
      ctx.waitUntil(log(env, request, 'initialize', null, clientFrom(request, info)).catch(() => {}));
      return ok(id, {
        protocolVersion: VERSIONS.includes(wanted) ? wanted : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions: 'Read-only information about Arasada Akhil, a team lead and full stack developer in Hyderabad: profile, experience, projects, skills and contact details. Start with get_profile.'
      });
    }
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      ctx.waitUntil(log(env, request, 'tools/list', null, clientFrom(request)).catch(() => {}));
      return ok(id, { tools: TOOLS });
    case 'tools/call': {
      const name = params && params.name;
      const out = runTool(name, (params && params.arguments) || {});
      if (out === null) return fail(id, -32602, `Unknown tool: ${name}`);
      ctx.waitUntil(log(env, request, 'tools/call', String(name).slice(0, 40), clientFrom(request)).catch(() => {}));
      if (out && out.error) return ok(id, { content: [{ type: 'text', text: out.error }], isError: true });
      return ok(id, { content: [{ type: 'text', text: out }], isError: false });
    }
    case 'resources/list':
      return ok(id, { resources: [] });
    case 'prompts/list':
      return ok(id, { prompts: [] });
    default:
      return isNotification ? null : fail(id, -32601, `Method not found: ${method}`);
  }
}

export async function handleMcp(request, env, ctx) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  if (request.method === 'GET') {
    // People opening the address in a browser get the explanation on the site
    if ((request.headers.get('accept') || '').includes('text/html')) {
      return Response.redirect(SITE + '/#mcp', 302);
    }
    return new Response(JSON.stringify(fail(null, -32000, 'This MCP server answers POST requests only.')), {
      status: 405, headers: { ...CORS, allow: 'POST, OPTIONS', 'content-type': 'application/json' }
    });
  }
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { ...CORS, allow: 'POST, OPTIONS' } });

  let body;
  try { body = JSON.parse(await request.text()); } catch (e) {
    return new Response(JSON.stringify(fail(null, -32700, 'Parse error')), { status: 400, headers: { ...CORS, 'content-type': 'application/json' } });
  }

  const extraHeaders = {};
  const batch = Array.isArray(body);
  const replies = (batch ? body.slice(0, 20) : [body]).map(m => handle(m, request, env, ctx, extraHeaders)).filter(r => r !== null);

  // Notifications and responses need no reply body
  if (!replies.length) return new Response(null, { status: 202, headers: { ...CORS, ...extraHeaders } });
  return new Response(JSON.stringify(batch ? replies : replies[0]), {
    headers: { ...CORS, ...extraHeaders, 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}

// Public totals shown on the site's MCP section
export async function mcpPublicStats(env) {
  const headers = { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' };
  if (!env.DB) return new Response(JSON.stringify({ calls: 0, clients: [] }), { headers });
  await ensureSchema(env.DB);
  const [total, clients] = await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS n FROM mcp_calls WHERE method = 'tools/call'"),
    env.DB.prepare("SELECT client AS name, COUNT(*) AS n FROM mcp_calls WHERE method IN ('initialize', 'tools/call') GROUP BY client ORDER BY n DESC LIMIT 5")
  ]);
  return new Response(JSON.stringify({ calls: total.results[0].n, clients: clients.results }), { headers });
}
