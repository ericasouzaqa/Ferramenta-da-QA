const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('sinalQaDesktop', {
  platform: process.platform,
  version: '0.1.0',
});
