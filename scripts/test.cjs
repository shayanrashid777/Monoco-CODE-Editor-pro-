#!/usr/bin/env node
const assert = require('assert');
const path = require('path');
const root = path.resolve(__dirname, '..');
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('  ✓ ' + name); };

(async () => {
  const { createHost } = require(path.join(root, 'src/plugins.js'));

  await test('host: registers namespaced commands and runs them', async () => {
    const host = createHost(); let hit = 0;
    assert(host.register({ id: 'demo', name: 'Demo', activate: api => api.registerCommand('go', 'Go', () => hit++) }, {}));
    assert.deepStrictEqual(host.listCommands().map(c => c.id), ['demo:go']);
    assert.strictEqual(host.listCommands()[0].title, 'Demo: Go');
    await host.run('demo:go'); assert.strictEqual(hit, 1);
  });
  await test('host: rejects invalid, duplicate and crashing plugins', () => {
    const host = createHost(); const quiet = console.error; console.error = () => {};
    assert.strictEqual(host.register({}, {}), false);
    assert(host.register({ id: 'a', activate() {} }, {}));
    assert.strictEqual(host.register({ id: 'a', activate() {} }, {}), false);
    assert.strictEqual(host.register({ id: 'b', activate() { throw new Error('boom'); } }, {}), false);
    console.error = quiet;
    assert.deepStrictEqual(host.plugins(), ['a']);
  });
  await test('host: events deliver and isolate listener errors', () => {
    const host = createHost(); const quiet = console.error; console.error = () => {};
    let got = null; host.on('change', () => { throw new Error('x'); }); host.on('change', p => (got = p));
    host.emit('change', 7); console.error = quiet; assert.strictEqual(got, 7);
  });
  await test('host: unknown command rejects', async () => {
    await assert.rejects(createHost().run('nope'), /Unknown command/);
  });

  // Workbench plugin, run against a fake editor
  let captured; global.Nexus = { registerPlugin: p => (captured = p) };
  const { tools } = require(path.join(root, 'plugins/nexus-workbench/extension.js'));
  await test('workbench: pure text tools', () => {
    assert.strictEqual(tools.sortLines('b\na\nc'), 'a\nb\nc');
    assert.strictEqual(tools.uniqueLines('a\na\nb'), 'a\nb');
    assert.strictEqual(tools.trimTrailing('a  \nb\t'), 'a\nb');
    assert.deepStrictEqual(tools.stats('hi there\nyou'), { lines: 2, words: 3, chars: 12 });
  });
  await test('workbench: commands act on whole file or selection', async () => {
    let text = 'b\na', sel = { start: 0, end: 0, text: '' }, status = '';
    const host = createHost();
    const fake = { getText: () => text, setText: t => (text = t), getSelection: () => sel,
      replaceSelection: t => (text = text.slice(0, sel.start) + t + text.slice(sel.end)), setStatus: (k, v) => (status = v) };
    assert(host.register(captured, fake));
    await host.run('nexus-workbench:sort'); assert.strictEqual(text, 'a\nb');
    text = 'one two'; sel = { start: 0, end: 3, text: 'one' };
    await host.run('nexus-workbench:upper'); assert.strictEqual(text, 'ONE two');
    host.emit('change'); assert(/words/.test(status));
  });

  console.log('\n' + passed + ' tests passed');
})().catch(e => { console.error('\n✗ ' + (e.stack || e)); process.exit(1); });
