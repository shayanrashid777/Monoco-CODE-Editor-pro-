# Building Nexus Code Editor

You need Node.js 18 or newer. The only dependency is `monaco-editor` (pinned to 0.52.2).

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs Monaco so the build can bundle it |
| `npm run verify` | Checks required files, plugin manifests, docs and JS syntax |
| `npm test` | Runs unit tests for the plugin host and bundled plugin |
| `npm run build` | Runs verify, then copies `src/` and `plugins/` into `dist/`, bundles Monaco into `dist/vendor/monaco/`, and generates `dist/plugins.json` |
| `npm start` | Builds, then serves `dist/` at `http://localhost:5173` (custom port: `node scripts/serve.cjs 8080`) |

## How Monaco is loaded

1. The app first tries the local copy at `vendor/monaco/vs/loader.js`, which exists when `npm install` ran before the build. This works fully offline.
2. If that is missing, it falls back to the pinned jsDelivr CDN copy. The build prints a warning in this case.
3. If both fail, the editor area shows an error message.

Monaco's web workers are started from a small data URL that imports the worker from the same base, so the local and CDN paths both work.

## Notes

- Serve over HTTP rather than opening `index.html` directly. Plugins are discovered with `fetch('plugins.json')`, which browsers block on `file://`.
- `dist/` is static, so it can be hosted anywhere (GitHub Pages, Netlify, any web server). With Monaco bundled it is a few MB larger.
- CI (`.github/workflows/ci.yml`) runs install, verify, test and build on Node 18, 20 and 22 and uploads `dist/` as an artifact.

## Deploying

`.github/workflows/pages.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`. Enable it once under **Settings → Pages → Source: GitHub Actions**. All asset paths are relative, so the site works under a `/repo-name/` sub-path.

## Lockfile

Run `npm install` once locally and commit `package-lock.json`. The workflows use `npm ci` automatically when it exists.

## Publishing to GitHub Packages

`.github/workflows/npm-publish.yml` publishes the package when you create a GitHub release. Before the first release:

1. Confirm the package scope in `package.json` (`@shayan777`) matches the GitHub owner, in lowercase.
2. Bump `version` (a version can only be published once).
3. Create a release on GitHub. The workflow verifies, tests, builds and publishes using the built-in `GITHUB_TOKEN`; no extra secret is needed.

The published package contains `dist/`, `src/`, `plugins/`, `scripts/` and `docs/`. `dist/` includes the bundled Monaco copy, so the package is several MB.

## Windows desktop app (Windows 10 and 11)

The app is an Electron desktop application: a native window with native Open/Save dialogs, a menu bar, single-instance behaviour, session restore and "open with" support (pass a file path as an argument). Monaco is bundled, so it runs fully offline. Nothing is exposed to the network; the editor is served to its own window on a private loopback port.

| Command | What it does |
| --- | --- |
| `npm run desktop` | Builds, then launches the app in a window (any OS, for development) |
| `npm run dist:win` | Builds the Windows installer and portable exe into `installers/` (run on Windows) |

`.github/workflows/windows-app.yml` runs `dist:win` on a Windows runner and produces:
- `Nexus-Code-Editor-Setup-<version>.exe`: installer (choose install folder, desktop shortcut, per-user, no admin needed)
- `Nexus-Code-Editor-Portable-<version>.exe`: single file, no install

**Release:** `git tag v1.0.0 && git push origin v1.0.0` attaches both files to a GitHub Release. You can also run the workflow manually from the Actions tab and download the files as an artifact.

**Notes**
- The build is x64. It also runs on Windows 11 on ARM through emulation.
- The executables are unsigned, so Windows SmartScreen may show "Windows protected your PC" on first run (More info, then Run anyway). Removing the warning needs a code-signing certificate.
- Plugins are bundled at build time, so adding a plugin means rebuilding.
- The Electron version is `^33`; bump `electron` and `electron-builder` in `package.json` when you want newer ones.
