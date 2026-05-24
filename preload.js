const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  playVideo: (url) => ipcRenderer.send('open-vlc', url),
  fetchEpisodes: (url) => ipcRenderer.invoke('fetch-episodes', url),
  downloadVideo: (url) => ipcRenderer.invoke('download-video', url)
});
