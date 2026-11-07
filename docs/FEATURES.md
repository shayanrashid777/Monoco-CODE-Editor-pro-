# Features

## Editing (Monaco)
- Language services for JavaScript/TypeScript, JSON, CSS/SCSS and HTML (completions, hover, diagnostics, formatting); syntax highlighting for Markdown, Python, shell, YAML, XML, SQL, Go, Rust, Java, C/C++, C#, PHP and Ruby
- Find/replace, multi-cursor (`Alt+Click`), code folding, minimap, bracket matching, snippets
- Light or dark theme, following your OS setting
- Tabs backed by one Monaco model each, so undo history, cursor and scroll position are kept per tab; unsaved changes are marked and closing asks for confirmation
- Session restore through `localStorage`, so tabs survive reloads

## Files
- Chromium browsers use the File System Access API, so Save writes back to the opened file
- Other browsers use a file picker to open and a download to save

## Shortcuts
| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd+S` | Save |
| `Ctrl/Cmd+O` | Open |
| `Ctrl/Cmd+Shift+P` | Nexus command palette (core and plugin commands) |
| `F1` | Monaco's own palette for editor actions |
| `Ctrl/Cmd+F` / `Ctrl/Cmd+H` | Find / replace |
| `Ctrl/Cmd+/` | Toggle line comment |

## Built-in plugin: Workbench
Sort Lines, Reverse Lines, Remove Duplicate Lines, Trim Trailing Whitespace, Uppercase, Lowercase. Each applies to the selection, or the whole file if nothing is selected, and goes through Monaco's undo stack. A status-bar item shows live line, word and character counts.
