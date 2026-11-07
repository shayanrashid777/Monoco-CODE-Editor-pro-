// Safe bridge between the editor page and the main process (sandboxed, context-isolated).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusNative', {
  isDesktop: true,
  platform: process.platform,
  openFiles: () => ipcRenderer.invoke('native:openFiles'),
  saveFile: (filePath, text) => ipcRenderer.invoke('native:saveFile', filePath, text),
  saveFileAs: (suggestedName, text) => ipcRenderer.invoke('native:saveFileAs', suggestedName, text),
  loadSession: () => ipcRenderer.invoke('native:loadSession'),
  saveSession: json => ipcRenderer.send('native:saveSession', json),
  onMenu: fn => ipcRenderer.on('native:menu', (_e, id) => fn(id)),
  onOpenFiles: fn => ipcRenderer.on('native:openFiles', (_e, files) => fn(files)),
  ready: () => ipcRenderer.send('native:ready')
});
