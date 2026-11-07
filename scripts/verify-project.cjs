#!/usr/bin/env node
// Project verification: structure, manifests, docs, and JS syntax.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..');
const p = (...a) => path.join(root, ...a);
const errors = [];
const fail = m => errors.push(m);

function readJson(rel) {
  try { return JSON.parse(fs.readFileSync(p(rel), 'utf8')); }
  catch (e) { fail(rel + ': ' + e.message); return null; }
}

// 1. Required files
['LICENSE', 'README.md', 'package.json', 'src/index.html', 'src/styles.css', 'src/app.js',
 'src/plugins.js', 'plugins/nexus.code-workspace', 'resources/nexus-splash.svg',
 '.github/workflows/ci.yml', '.github/workflows/pages.yml', '.github/workflows/npm-publish.yml', '.github/workflows/windows-app.yml', '.gitignore', 'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'CHANGELOG.md',
 'scripts/build.cjs', 'electron/main.cjs', 'electron/preload.cjs', 'build/icon.png', 'scripts/serve.cjs', 'scripts/test.cjs']
  .forEach(f => { if (!fs.existsSync(p(f))) fail('missing file: ' + f); });

// 2. Root package.json
const pkg = readJson('package.json');
if (pkg) {
  ['name', 'version'].forEach(k => pkg[k] || fail('package.json: missing "' + k + '"'));
  ['monaco-editor', 'electron', 'electron-builder'].forEach(n => ((pkg.dependencies && pkg.dependencies[n]) || (pkg.devDependencies && pkg.devDependencies[n])) || fail('package.json: missing dependency "' + n + '"'));
  if (pkg.main !== 'electron/main.cjs') fail('package.json: "main" must be electron/main.cjs');
  ['build', 'test', 'verify', 'start'].forEach(s => (pkg.scripts && pkg.scripts[s]) || fail('package.json: missing script "' + s + '"'));
}

// 3. Workspace file
const ws = readJson('plugins/nexus.code-workspace');
if (ws && !(Array.isArray(ws.folders) && ws.folders.length)) fail('nexus.code-workspace: "folders" must be a non-empty array');

// 4. Plugins
const pluginsDir = p('plugins');
const jsFiles = [];
if (fs.existsSync(pluginsDir)) {
  for (const d of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const m = readJson('plugins/' + d.name + '/package.json');
    if (!m) continue;
    if (m.name !== d.name) fail('plugins/' + d.name + ': manifest name "' + m.name + '" must match folder name');
    if (!m.version) fail('plugins/' + d.name + ': missing version');
    if (!m.main) fail('plugins/' + d.name + ': missing "main"');
    else if (!fs.existsSync(p('plugins', d.name, m.main))) fail('plugins/' + d.name + ': main file "' + m.main + '" not found');
    else jsFiles.push(p('plugins', d.name, m.main));
  }
}

// 5. Docs and resources have real content
if (fs.existsSync(p('docs'))) {
  for (const f of fs.readdirSync(p('docs')).filter(f => f.endsWith('.md'))) {
    if (fs.statSync(p('docs', f)).size < 100) fail('docs/' + f + ' is nearly empty');
  }
}
if (fs.existsSync(p('resources/nexus-splash.svg'))) {
  const svg = fs.readFileSync(p('resources/nexus-splash.svg'), 'utf8');
  if (!/<svg[\s>]/.test(svg) || !/<(path|rect|circle|polygon|text)\b/.test(svg)) fail('resources/nexus-splash.svg has no visible shapes');
}

// 6. JS syntax
['src/app.js', 'src/plugins.js'].forEach(f => jsFiles.push(p(f)));
fs.readdirSync(p('scripts')).filter(f => f.endsWith('.cjs')).forEach(f => jsFiles.push(p('scripts', f)));
if (fs.existsSync(p('electron'))) fs.readdirSync(p('electron')).filter(f => f.endsWith('.cjs')).forEach(f => jsFiles.push(p('electron', f)));
for (const f of jsFiles) {
  if (!fs.existsSync(f)) continue;
  try { cp.execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { fail('syntax error in ' + path.relative(root, f) + ': ' + String(e.stderr).split('\n')[0]); }
}

if (errors.length) {
  console.error('Project verification FAILED:\n' + errors.map(e => '  ✗ ' + e).join('\n'));
  process.exit(1);
}
console.log('Project verification passed. (' + jsFiles.length + ' JS files checked)');
