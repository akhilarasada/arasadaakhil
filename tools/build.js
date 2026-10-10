// Builds the site that Cloudflare serves.
//
//   src/      what you edit: index.html, styles.css and the scripts, written to be read
//   public/   what is served: the same page with its styles trimmed, minified and placed
//             inside the HTML (one request less before first paint), and minified scripts
//
// Run it after every change to src/ and commit both folders:
//
//   node tools/build.js
//
// It needs no install: the two tools it uses (PurgeCSS, esbuild) are fetched by npx.
// Everything else in public/ (assets, legal.html, robots.txt, ...) is edited in place.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const out = path.join(root, 'public');
const tmp = '.wrangler/build-tmp';        // relative, so no path needs quoting on any system
const SCRIPTS = ['liquid.js', 'script.js', 'blocks.js', 'badge.js', 'extras.js'];

const npx = (args) => execFileSync('npx', ['--yes', ...args], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'], shell: true }).toString();
fs.mkdirSync(path.join(root, tmp, 'src'), { recursive: true });

// 1. Styles: drop the rules no page or script uses, then minify
npx(['purgecss@6', '--config', 'tools/purgecss.config.cjs', '--output', tmp]);
const css = npx(['esbuild@0.24', tmp + '/src/styles.css', '--minify', '--target=chrome100,safari15,firefox100']).trim();

// 2. Scripts: minified under their own names
for (const name of SCRIPTS) {
  npx(['esbuild@0.24', 'src/' + name, '--minify', '--target=es2018', '--outfile=public/' + name]);
}

// 3. The page: styles inline, scripts stamped with a hash of everything so caches refresh on change
const hash = crypto.createHash('sha1');
hash.update(css);
for (const name of SCRIPTS) hash.update(fs.readFileSync(path.join(out, name)));
const stamp = hash.digest('hex').slice(0, 10);

let html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const link = /<link rel="stylesheet" href="styles\.css[^"]*">/;
if (!link.test(html)) throw new Error('stylesheet link not found in src/index.html');
html = html.replace(link, () => '<style>' + css + '</style>');
html = html.replace(/(<script src="[a-z]+\.js)(\?v=[^"]*)?"/g, (m, a) => a + '?v=' + stamp + '"');
fs.writeFileSync(path.join(out, 'index.html'), html);

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('styles', kb(fs.statSync(path.join(src, 'styles.css')).size), '->', kb(css.length), '(inline)');
for (const name of SCRIPTS) console.log(name, kb(fs.statSync(path.join(src, name)).size), '->', kb(fs.statSync(path.join(out, name)).size));
console.log('index.html', kb(html.length), '· stamp', stamp);
