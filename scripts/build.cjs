#!/usr/bin/env node
// Copies src/ and plugins/ into dist/ and writes dist/plugins.json.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, 'src'), dist, { recursive: true });
fs.copyFileSync(path.join(root, 'resources', 'nexus-splash.svg'), path.join(dist, 'nexus-splash.svg'));

const manifest = [];
const pdir = path.join(root, 'plugins');
for (const d of fs.readdirSync(pdir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(pdir, d.name, 'package.json'), 'utf8'));
  fs.cpSync(path.join(pdir, d.name), path.join(dist, 'plugins', d.name), { recursive: true });
  manifest.push({ id: meta.name, main: 'plugins/' + d.name + '/' + (meta.main || 'extension.js') });
}
const monaco = path.join(root, 'node_modules', 'monaco-editor', 'min', 'vs');
if (fs.existsSync(monaco)) {
  fs.cpSync(monaco, path.join(dist, 'vendor', 'monaco', 'vs'), { recursive: true });
  console.log('Bundled Monaco locally (works offline).');
} else {
  console.warn('monaco-editor is not installed: dist/ will load Monaco from the jsDelivr CDN. Run `npm install` to bundle it.');
}
fs.writeFileSync(path.join(dist, 'plugins.json'), JSON.stringify(manifest, null, 2));
console.log('Built dist/ with ' + manifest.length + ' plugin(s).');
