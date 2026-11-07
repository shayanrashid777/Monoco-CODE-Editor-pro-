// Nexus workbench extension: text tools + live stats.
(function () {
  const tools = {
    sortLines: t => t.split('\n').sort((a, b) => a.localeCompare(b)).join('\n'),
    reverseLines: t => t.split('\n').reverse().join('\n'),
    uniqueLines: t => [...new Set(t.split('\n'))].join('\n'),
    trimTrailing: t => t.replace(/[ \t]+$/gm, ''),
    upper: t => t.toUpperCase(),
    lower: t => t.toLowerCase(),
    stats: t => ({ lines: t ? t.split('\n').length : 0, words: (t.trim().match(/\S+/g) || []).length, chars: t.length })
  };

  const plugin = {
    id: 'nexus-workbench',
    name: 'Workbench',
    activate(api) {
      // Apply to the selection if there is one, otherwise to the whole file.
      const apply = fn => () => {
        const s = api.getSelection();
        if (s.text) api.replaceSelection(fn(s.text)); else api.setText(fn(api.getText()));
      };
      api.registerCommand('sort', 'Sort Lines', apply(tools.sortLines));
      api.registerCommand('reverse', 'Reverse Lines', apply(tools.reverseLines));
      api.registerCommand('unique', 'Remove Duplicate Lines', apply(tools.uniqueLines));
      api.registerCommand('trim', 'Trim Trailing Whitespace', apply(tools.trimTrailing));
      api.registerCommand('upper', 'Uppercase', apply(tools.upper));
      api.registerCommand('lower', 'Lowercase', apply(tools.lower));
      const update = () => {
        const s = tools.stats(api.getText());
        api.setStatus('workbench', s.lines + ' lines · ' + s.words + ' words · ' + s.chars + ' chars');
      };
      api.on('change', update);
      api.on('tabswitch', update);
      update();
    }
  };

  if (typeof Nexus !== 'undefined') Nexus.registerPlugin(plugin);
  if (typeof module !== 'undefined' && module.exports) module.exports = { plugin, tools };
})();
