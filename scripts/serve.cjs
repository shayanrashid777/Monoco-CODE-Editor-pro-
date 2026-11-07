#!/usr/bin/env node
// Tiny static server for dist/ (no dependencies). Usage: npm start [-- port]
const http = require('http'), fs = require('fs'), path = require('path');
const dist = path.resolve(__dirname, '..', 'dist');
const port = Number(process.argv[2] || process.env.PORT || 5173);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.map': 'application/json' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(dist, url === '/' ? 'index.html' : url);
  if (!file.startsWith(dist + path.sep) && file !== dist) { res.writeHead(403).end('Forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data);
  });
}).listen(port, () => console.log('Nexus Code Editor running at http://localhost:' + port));
