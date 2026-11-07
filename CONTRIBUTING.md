# Contributing

Thanks for helping improve Nexus Code Editor.

## Setup

```bash
git clone https://github.com/shayan777/Monoco-CODE-Editor-pro.git
cd Monoco-CODE-Editor-pro
npm install
npm start
```

Requires Node 18+. See [docs/BUILDING.md](docs/BUILDING.md) for details.

## Before opening a pull request

1. Branch from `main`.
2. Run `npm run verify` and `npm test`; both must pass.
3. Add or update tests in `scripts/test.cjs` for new behavior.
4. Update docs and the "Unreleased" section of `CHANGELOG.md`.
5. Keep changes focused: one topic per pull request.

## Writing a plugin

New functionality usually belongs in a plugin under `plugins/`. See [docs/PLUGINS.md](docs/PLUGINS.md).

## Style

Follow `.editorconfig` (2-space indent, LF endings). The code has no build step or transpiler, so keep browser code plain ES2020.

By contributing you agree your work is released under the [MIT License](LICENSE) and that you will follow the [Code of Conduct](CODE_OF_CONDUCT.md).
