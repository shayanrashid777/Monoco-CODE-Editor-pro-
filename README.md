# ⚡ Nexus Code Editor

[![CI](https://github.com/shayan777/Monoco-CODE-Editor-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/shayan777/Monoco-CODE-Editor-pro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A plugin-driven code editor for Windows (and the browser), powered by the [Monaco editor](https://microsoft.github.io/monaco-editor/) (the engine behind VS Code).

## Quick start

```bash
npm install      # fetches monaco-editor so the build can bundle it (works offline afterwards)
npm start        # verifies, builds to dist/, serves http://localhost:5173
npm test         # unit tests (plugin host, workbench plugin)
npm run verify   # project integrity checks
```

Requires Node 18+. If you skip `npm install`, the build still works and the app loads Monaco from the jsDelivr CDN instead.

## Windows desktop app

Download the installer or portable `.exe` from the repo's Releases page (Windows 10 and 11). To build it yourself: `npm install && npm run dist:win`. See [docs/BUILDING.md](docs/BUILDING.md).

## Features

- Monaco editing: IntelliSense for JS/TS/JSON/CSS/HTML, find/replace, multi-cursor, code folding, minimap, bracket matching, light/dark theme that follows your OS
- Tabs with one model per file, undo history and scroll position kept per tab
- Open/save real files (File System Access API in Chromium; upload/download fallback elsewhere)
- Command palette (`Ctrl/Cmd+Shift+P`) listing core and plugin commands
- Session restore: open tabs survive reloads
- Plugin API with commands, events and status-bar items
- Built-in `nexus-workbench` plugin: sort/reverse/dedupe lines, trim whitespace, change case, live word count

See [docs/FEATURES.md](docs/FEATURES.md), [docs/BUILDING.md](docs/BUILDING.md) and [docs/PLUGINS.md](docs/PLUGINS.md).

## Deploying to GitHub Pages

Push to `main` and the `Deploy to GitHub Pages` workflow publishes the editor. One-time setup: in the repo go to **Settings → Pages** and set **Source** to **GitHub Actions**. The site appears at `https://shayan777.github.io/Monoco-CODE-Editor-pro/`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [SECURITY.md](SECURITY.md).

## Project layout

```
src/        editor app (index.html, app.js, plugins.js, styles.css)
plugins/    bundled plugins, one folder each (package.json manifest + extension.js)
scripts/    verify, build, serve, test
docs/       documentation
.github/    CI + Pages workflows, issue/PR templates, Dependabot
```

## License

MIT, see [LICENSE](LICENSE).
