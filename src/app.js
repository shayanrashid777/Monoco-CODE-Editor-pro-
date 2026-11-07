(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const host = NexusPlugins.createHost();
  const native = window.nexusNative || null;   // present only inside the desktop app
  const extras = new Map();
  const KEY = 'nexus.session.v2';
  const CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min';
  const LANG = { js: 'javascript', cjs: 'javascript', mjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', json: 'json', css: 'css', scss: 'scss', html: 'html', htm: 'html', md: 'markdown', py: 'python', sh: 'shell', yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql', go: 'go', rs: 'rust', java: 'java', c: 'c', cpp: 'cpp', cs: 'csharp', php: 'php', rb: 'ruby' };
  let monaco, editor, tabs = [], active = 0, shown = null, untitled = 1, persistTimer;

  const cur = () => tabs[active];
  const langOf = name => { const m = /\.([a-z0-9]+)$/i.exec(name); return (m && LANG[m[1].toLowerCase()]) || 'plaintext'; };
  const newName = () => 'untitled-' + untitled++ + '.txt';

  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.id); toast.id = setTimeout(() => (t.hidden = true), 2200);
  }
  function persistSoon() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const json = JSON.stringify({ active, untitled, tabs: tabs.map(t => ({ name: t.name, text: t.model.getValue(), dirty: t.dirty, path: t.path })) });
      if (native) native.saveSession(json);
      else try { localStorage.setItem(KEY, json); } catch (e) { /* storage unavailable */ }
    }, 400);
  }

  // ---- tabs
  function makeTab(name, text, handle, dirty, fpath) {
    const t = { name, handle: handle || null, path: fpath || null, dirty: !!dirty, viewState: null, model: monaco.editor.createModel(text, langOf(name)) };
    t.model.onDidChangeContent(() => { t.dirty = true; renderTabs(); persistSoon(); host.emit('change', { name: t.name }); });
    tabs.push(t);
    return t;
  }
  function renderTabs() {
    const el = $('tabs'); el.textContent = '';
    tabs.forEach((t, i) => {
      const d = document.createElement('div');
      d.className = 'tab' + (i === active ? ' active' : '');
      const label = document.createElement('span'); label.textContent = t.name; d.appendChild(label);
      if (t.dirty) { const dot = document.createElement('span'); dot.className = 'dot'; dot.textContent = '●'; d.appendChild(dot); }
      const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = 'Close';
      x.onclick = e => { e.stopPropagation(); closeTab(i); };
      d.appendChild(x);
      d.onclick = () => switchTab(i);
      el.appendChild(d);
    });
    const c = tabs[active];
    document.title = (c ? (c.dirty ? '● ' : '') + c.name + ' – ' : '') + 'Nexus Code Editor';
  }
  function show(skipSave) {
    if (!skipSave && shown) shown.viewState = editor.saveViewState();
    shown = cur();
    editor.setModel(shown.model);
    if (shown.viewState) editor.restoreViewState(shown.viewState);
    renderTabs(); updateStatus(); persistSoon();
    host.emit('tabswitch', { name: shown.name });
    editor.focus();
  }
  function switchTab(i) { if (i === active && shown) return; active = i; show(); }
  function newTab(name, text, handle, fpath) { makeTab(name || newName(), text || '', handle, false, fpath); active = tabs.length - 1; show(); }
  function closeTab(i) {
    const t = tabs[i];
    if (t.dirty && !confirm('Close "' + t.name + '" without saving?')) return;
    tabs.splice(i, 1);
    if (!tabs.length) makeTab(newName(), '');
    if (i < active) active--;
    active = Math.min(active, tabs.length - 1);
    show(true);
    t.model.dispose();
  }

  function updateStatus() {
    if (!editor || !cur()) return;
    const p = editor.getPosition();
    $('pos').textContent = 'Ln ' + p.lineNumber + ', Col ' + p.column;
    const id = cur().model.getLanguageId();
    const info = monaco.languages.getLanguages().find(l => l.id === id);
    $('lang').textContent = (info && info.aliases && info.aliases[0]) || id;
    const ex = $('extras'); ex.textContent = '';
    extras.forEach(v => { const s = document.createElement('span'); s.textContent = v; ex.appendChild(s); });
  }

  // ---- files
  function openNative(f) {
    const i = tabs.findIndex(t => t.path && t.path === f.path);
    if (i >= 0) switchTab(i); else newTab(f.name, f.text, null, f.path);
  }
  async function openFile() {
    try {
      if (native) { (await native.openFiles()).forEach(openNative); return; }
      if (window.showOpenFilePicker) {
        const [handle] = await window.showOpenFilePicker();
        const file = await handle.getFile();
        newTab(file.name, await file.text(), handle);
      } else $('picker').click();
    } catch (e) { if (e.name !== 'AbortError') toast('Open failed: ' + e.message); }
  }
  $('picker').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    newTab(f.name, await f.text()); e.target.value = '';
  };
  async function saveFile() {
    const t = cur(), text = t.model.getValue();
    try {
      if (native) {
        if (t.path) await native.saveFile(t.path, text);
        else {
          const r = await native.saveFileAs(t.name, text);
          if (!r) return;   // dialog cancelled
          t.path = r.path; t.name = r.name; monaco.editor.setModelLanguage(t.model, langOf(t.name));
        }
      } else {
        if (!t.handle && window.showSaveFilePicker) t.handle = await window.showSaveFilePicker({ suggestedName: t.name });
        if (t.handle) {
          const w = await t.handle.createWritable(); await w.write(text); await w.close();
          t.name = t.handle.name; monaco.editor.setModelLanguage(t.model, langOf(t.name));
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
          a.download = t.name; a.click(); URL.revokeObjectURL(a.href);
        }
      }
      t.dirty = false; renderTabs(); updateStatus(); persistSoon(); toast('Saved ' + t.name); host.emit('save', { name: t.name });
    } catch (e) { if (e.name !== 'AbortError') toast('Save failed: ' + e.message); }
  }

  // ---- API exposed to plugins (unchanged from the lightweight editor)
  const editApi = {
    getText: () => cur().model.getValue(),
    setText(text) {
      const m = cur().model;
      editor.pushUndoStop();
      editor.executeEdits('plugin', [{ range: m.getFullModelRange(), text }]);
      editor.pushUndoStop();
    },
    getSelection() {
      const m = cur().model, s = editor.getSelection();
      return { start: m.getOffsetAt(s.getStartPosition()), end: m.getOffsetAt(s.getEndPosition()), text: m.getValueInRange(s) };
    },
    replaceSelection(text) {
      editor.pushUndoStop();
      editor.executeEdits('plugin', [{ range: editor.getSelection(), text, forceMoveMarkers: true }]);
      editor.pushUndoStop();
    },
    getFileName: () => cur().name,
    notify: toast,
    setStatus(key, text) { text ? extras.set(key, text) : extras.delete(key); updateStatus(); }
  };
  window.Nexus = { registerPlugin: p => host.register(p, editApi), version: '2.0.0' };

  host.registerCommand('file.new', 'File: New', () => newTab());
  host.registerCommand('file.open', 'File: Open…', openFile);
  host.registerCommand('file.save', 'File: Save', saveFile);
  host.registerCommand('tab.close', 'Tab: Close Current', () => closeTab(active));
  host.registerCommand('palette.open', 'View: Command Palette', openPalette);
  host.registerCommand('editor.find', 'Edit: Find', () => editor.getAction('actions.find').run());
  host.registerCommand('editor.replace', 'Edit: Replace', () => editor.getAction('editor.action.startFindReplace').run());
  host.registerCommand('editor.format', 'Edit: Format Document', () => editor.getAction('editor.action.formatDocument').run());
  host.registerCommand('editor.goto', 'Go to Line…', () => editor.getAction('editor.action.gotoLine').run());

  // ---- command palette (lists core + plugin commands)
  let items = [], sel = 0;
  function renderPalette() {
    const q = $('pq').value.toLowerCase();
    items = host.listCommands().filter(c => c.title.toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(0, items.length - 1));
    const ul = $('plist'); ul.textContent = '';
    items.forEach((c, i) => {
      const li = document.createElement('li'); li.textContent = c.title; li.className = i === sel ? 'sel' : '';
      li.onclick = () => runItem(i); ul.appendChild(li);
    });
  }
  function openPalette() { $('palette').hidden = false; $('pq').value = ''; sel = 0; renderPalette(); $('pq').focus(); }
  function closePalette() { $('palette').hidden = true; if (editor) editor.focus(); }
  function runItem(i) { const c = items[i]; closePalette(); if (c) host.run(c.id).catch(e => toast(e.message)); }
  $('pq').oninput = () => { sel = 0; renderPalette(); };
  $('pq').onkeydown = e => {
    if (e.key === 'Escape') closePalette();
    else if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); renderPalette(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); renderPalette(); e.preventDefault(); }
    else if (e.key === 'Enter') runItem(sel);
  };
  $('palette').onclick = e => { if (e.target.id === 'palette') closePalette(); };
  document.querySelectorAll('[data-cmd]').forEach(b => (b.onclick = () => host.run(b.dataset.cmd)));
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); openPalette(); }
  });
  window.addEventListener('beforeunload', e => {
    if (tabs.some(t => t.dirty)) { persistSoon(); e.preventDefault(); e.returnValue = ''; }
  });

  // ---- Monaco loading: local copy from `npm install` first, jsDelivr as fallback
  const loadScript = src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res;
    s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s);
  });
  async function loadMonaco() {
    let lastError;
    for (const base of ['vendor/monaco', CDN]) {
      try {
        await loadScript(base + '/vs/loader.js');
        const abs = new URL(base, location.href).href.replace(/\/$/, '');
        window.MonacoEnvironment = {
          getWorkerUrl: () => 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
            "self.MonacoEnvironment={baseUrl:'" + abs + "/'};importScripts('" + abs + "/vs/base/worker/workerMain.js');")
        };
        window.require.config({ paths: { vs: abs + '/vs' } });
        await new Promise((res, rej) => window.require(['vs/editor/editor.main'], res, rej));
        return window.monaco;
      } catch (e) { lastError = e; console.warn('[nexus] Monaco from ' + base + ' failed', e); }
    }
    throw lastError;
  }
  async function loadPlugins() {
    try {
      const res = await fetch('plugins.json'); if (!res.ok) return;
      for (const p of await res.json()) {
        await new Promise(resolve => {
          const s = document.createElement('script'); s.src = p.main; s.onload = resolve;
          s.onerror = () => { toast('Plugin failed to load: ' + p.id); resolve(); };
          document.head.appendChild(s);
        });
      }
    } catch (e) { console.warn('[nexus] plugins unavailable (serve over http, see docs/BUILDING.md)'); }
  }

  async function boot() {
    try { monaco = await loadMonaco(); }
    catch (e) {
      $('editor').innerHTML = '<p class="loading">Monaco could not be loaded. Run <code>npm install</code> and rebuild, or check your network connection.</p>';
      return;
    }
    $('editor').textContent = '';
    const dark = matchMedia('(prefers-color-scheme: dark)');
    editor = monaco.editor.create($('editor'), {
      model: null, automaticLayout: true, fontSize: 14, tabSize: 2, scrollBeyondLastLine: false,
      minimap: { enabled: true }, theme: dark.matches ? 'vs-dark' : 'vs'
    });
    dark.onchange = () => monaco.editor.setTheme(dark.matches ? 'vs-dark' : 'vs');
    editor.onDidChangeCursorPosition(updateStatus);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveFile);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO, openFile);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, openPalette);

    try {
      const raw = native ? await native.loadSession() : localStorage.getItem(KEY);
      const saved = JSON.parse(raw || 'null');
      if (saved && saved.tabs && saved.tabs.length) {
        saved.tabs.forEach(t => makeTab(t.name, t.text, null, t.dirty, t.path));
        untitled = saved.untitled || 1; active = Math.min(saved.active || 0, tabs.length - 1);
      }
    } catch (e) { /* ignore corrupt session */ }
    if (!tabs.length) {
      makeTab('welcome.js', '// Welcome to Nexus Code Editor (powered by Monaco)\n// Ctrl/Cmd+Shift+P  command palette     Ctrl/Cmd+F  find\n// Ctrl/Cmd+S        save                Ctrl/Cmd+O  open\n// Alt+Click         add cursor          Ctrl/Cmd+/  toggle comment\n\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("Nexus"));\n');
    }
    show(true);
    if (native) {
      native.onMenu(id => host.run(id).catch(e => toast(e.message)));
      native.onOpenFiles(files => files.forEach(openNative));
      native.ready();
    }
    await loadPlugins();
    host.emit('tabswitch', { name: cur().name });
  }
  boot();
})();
