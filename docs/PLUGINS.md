# Writing plugins

A plugin is a folder in `plugins/` with a manifest and an entry script.

```
plugins/my-plugin/
  package.json     { "name": "my-plugin", "version": "1.0.0", "main": "extension.js" }
  extension.js
```

The manifest `name` must match the folder name (`npm run verify` enforces this). `npm run build` discovers every plugin folder automatically.

## Entry script

```js
Nexus.registerPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  activate(api) {
    api.registerCommand('hello', 'Say Hello', () => api.notify('Hello!'));
    api.on('save', e => api.notify('Saved ' + e.name));
  }
});
```

Commands appear in the palette as `My Plugin: Say Hello` and have the id `my-plugin:hello`.

## API

| Member | Description |
| --- | --- |
| `getText()` / `setText(text)` | Read or replace the active tab's content |
| `getSelection()` | `{ start, end, text }` |
| `replaceSelection(text)` | Replace the selected text |
| `getFileName()` | Active tab name |
| `notify(message)` | Show a short toast |
| `setStatus(key, text)` | Set a status-bar item; empty text removes it |
| `registerCommand(id, title, fn)` | Add a palette command |
| `on(event, fn)` | Events: `change`, `tabswitch`, `save` |

Errors thrown by a plugin or listener are caught and logged, so one bad plugin cannot break the editor.

## Testing

Entry scripts can export pure helpers for Node tests, as `nexus-workbench` does with `module.exports`. See `scripts/test.cjs`.

## Notes for the Monaco editor

Plugin edits (`setText`, `replaceSelection`) run as Monaco edit operations, so users can undo them with `Ctrl/Cmd+Z`. The plugin API itself is unchanged from earlier versions, so existing plugins keep working.
