// Nexus Code Editor: Windows/macOS/Linux desktop shell (Electron).
// Serves the bundled editor from dist/ on a private loopback port and wraps it in a native window
// with native file dialogs, menus, single-instance behaviour and "open with" support.
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path'), fs = require('fs'), http = require('http');

const DIST = path.join(__dirname, '..', 'dist');
const MAX_FILE = 50 * 1024 * 1024;
const REPO_URL = 'https://github.com/shayan777/Monoco-CODE-Editor-pro';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.map': 'application/json' };

let win = null, server = null, origin = '', rendererReady = false, pendingFiles = [];

if (!app.requestSingleInstanceLock()) { app.quit(); } else {
  app.on('second-instance', (_e, argv) => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
    deliver(filesFromArgv(argv));
  });
  app.whenReady().then(start);
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { if (server) server.close(); });
}

function filesFromArgv(argv) {
  return argv.slice(app.isPackaged ? 1 : 2).filter(a => {
    try { return !a.startsWith('-') && fs.statSync(a).isFile(); } catch (e) { return false; }
  }).map(p => path.resolve(p));
}
function readFiles(paths) {
  const out = [];
  for (const p of paths) {
    try {
      if (fs.statSync(p).size > MAX_FILE) { dialog.showErrorBox('File too large', path.basename(p) + ' is larger than 50 MB.'); continue; }
      out.push({ path: p, name: path.basename(p), text: fs.readFileSync(p, 'utf8') });
    } catch (e) { dialog.showErrorBox('Could not open file', p + '\n\n' + e.message); }
  }
  return out;
}
function deliver(paths) {
  const files = readFiles(paths);
  if (!files.length) return;
  if (rendererReady && win) win.webContents.send('native:openFiles', files); else pendingFiles.push(...files);
}

function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      // Only answer requests addressed to our own loopback origin (blocks DNS-rebinding tricks).
      if (req.headers.host !== new URL(origin).host) { res.writeHead(403).end('Forbidden'); return; }
      let key;
      try { key = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'; }
      catch (e) { res.writeHead(400).end('Bad request'); return; }
      const file = path.resolve(DIST, key);
      if (file !== DIST && !file.startsWith(DIST + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404).end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(data);
      });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { origin = 'http://127.0.0.1:' + server.address().port; resolve(); });
  });
}

const trusted = e => !!(e.senderFrame && e.senderFrame.url.startsWith(origin + '/'));
const sessionFile = () => path.join(app.getPath('userData'), 'session.json');

function registerIpc() {
  ipcMain.handle('native:openFiles', async e => {
    if (!trusted(e)) return [];
    const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'] });
    return r.canceled ? [] : readFiles(r.filePaths);
  });
  ipcMain.handle('native:saveFile', async (e, filePath, text) => {
    if (!trusted(e) || typeof filePath !== 'string' || typeof text !== 'string') throw new Error('Rejected');
    await fs.promises.writeFile(filePath, text, 'utf8');
    return true;
  });
  ipcMain.handle('native:saveFileAs', async (e, name, text) => {
    if (!trusted(e) || typeof text !== 'string') throw new Error('Rejected');
    const r = await dialog.showSaveDialog(win, { defaultPath: typeof name === 'string' ? name : 'untitled.txt' });
    if (r.canceled || !r.filePath) return null;
    await fs.promises.writeFile(r.filePath, text, 'utf8');
    return { path: r.filePath, name: path.basename(r.filePath) };
  });
  ipcMain.handle('native:loadSession', e => {
    if (!trusted(e)) return null;
    try { return fs.readFileSync(sessionFile(), 'utf8'); } catch (err) { return null; }
  });
  ipcMain.on('native:saveSession', (e, json) => {
    if (!trusted(e) || typeof json !== 'string') return;
    try { fs.writeFileSync(sessionFile(), json, 'utf8'); } catch (err) { /* non-fatal */ }
  });
  ipcMain.on('native:ready', e => {
    if (!trusted(e)) return;
    rendererReady = true;
    if (pendingFiles.length) { win.webContents.send('native:openFiles', pendingFiles); pendingFiles = []; }
  });
}

function buildMenu() {
  const send = id => () => win && win.webContents.send('native:menu', id);
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: '&File', submenu: [
      { label: 'New Tab', click: send('file.new') },
      { label: 'Open…', click: send('file.open') },
      { label: 'Save', click: send('file.save') },
      { type: 'separator' },
      { label: 'Command Palette', click: send('palette.open') },
      { type: 'separator' },
      { role: 'quit' }
    ] },
    { label: '&View', submenu: [
      { role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }
    ] },
    { label: '&Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    { label: '&Help', submenu: [
      { label: 'Project on GitHub', click: () => shell.openExternal(REPO_URL) },
      { label: 'About Nexus Code Editor', click: () => dialog.showMessageBox(win, { type: 'info', title: 'About', message: 'Nexus Code Editor', detail: 'Version ' + app.getVersion() + '\nPowered by Monaco and Electron.' }) }
    ] }
  ]));
}

async function start() {
  await startServer();
  registerIpc();
  buildMenu();
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 640, minHeight: 400, show: false, backgroundColor: '#14161c',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });

  // Keep the window on our own origin; open web links in the user's browser.
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(origin + '/')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  // The page asks to block unload when tabs have unsaved changes: confirm natively.
  win.webContents.on('will-prevent-unload', e => {
    const choice = dialog.showMessageBoxSync(win, { type: 'warning', buttons: ['Discard changes', 'Cancel'], defaultId: 1, cancelId: 1, title: 'Unsaved changes', message: 'You have unsaved changes.', detail: 'Quit without saving?' });
    if (choice === 0) e.preventDefault();   // ignore the page's block and close
  });

  pendingFiles = readFiles(filesFromArgv(process.argv));
  await win.loadURL(origin + '/');
}
