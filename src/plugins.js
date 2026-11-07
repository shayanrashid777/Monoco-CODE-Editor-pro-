(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NexusPlugins = factory();
})(this, function () {
  function createHost() {
    const commands = new Map(), listeners = new Map(), plugins = new Map();
    const host = {
      registerCommand(id, title, run) {
        commands.set(id, { id, title, run });
        return () => commands.delete(id);
      },
      listCommands() {
        return [...commands.values()].map(({ id, title }) => ({ id, title }))
          .sort((a, b) => a.title.localeCompare(b.title));
      },
      async run(id, ...args) {
        const c = commands.get(id);
        if (!c) throw new Error('Unknown command: ' + id);
        return c.run(...args);
      },
      on(event, fn) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(fn);
        return () => listeners.get(event).delete(fn);
      },
      emit(event, payload) {
        for (const fn of listeners.get(event) || []) {
          try { fn(payload); } catch (e) { console.error('[nexus] listener error', e); }
        }
      },
      register(plugin, editorApi) {
        if (!plugin || typeof plugin.id !== 'string' || typeof plugin.activate !== 'function') {
          console.error('[nexus] invalid plugin'); return false;
        }
        if (plugins.has(plugin.id)) { console.error('[nexus] duplicate plugin', plugin.id); return false; }
        const label = plugin.name || plugin.id;
        const api = Object.assign({}, editorApi, {
          registerCommand: (localId, title, run) =>
            host.registerCommand(plugin.id + ':' + localId, label + ': ' + title, run),
          on: host.on
        });
        try { plugin.activate(api); plugins.set(plugin.id, plugin); return true; }
        catch (e) { console.error('[nexus] plugin failed', plugin.id, e); return false; }
      },
      plugins() { return [...plugins.keys()]; }
    };
    return host;
  }
  return { createHost };
});
