const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('encoder', {
  // Stream control
  startStream: (config) => ipcRenderer.invoke('start-stream', config),
  stopStream: () => ipcRenderer.invoke('stop-stream'),
  
  // System info
  getFFmpegStatus: () => ipcRenderer.invoke('get-ffmpeg-status'),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  getAudioDevices: () => ipcRenderer.invoke('get-audio-devices'),
  
  // Stream events
  onStreamStarted: (callback) => ipcRenderer.on('stream-started', callback),
  onStreamProgress: (callback) => ipcRenderer.on('stream-progress', (event, data) => callback(data)),
  onStreamError: (callback) => ipcRenderer.on('stream-error', (event, error) => callback(error)),
  onStreamEnded: (callback) => ipcRenderer.on('stream-ended', callback),
  
  // Settings persistence
  getSettings: (key) => localStorage.getItem(key),
  setSettings: (key, value) => localStorage.setItem(key, JSON.stringify(value))
});

contextBridge.exposeInMainWorld('encoderAPI', {
  // MIDI Device Control
  getMidiDevices: () => ipcRenderer.invoke('get-midi-devices'),
  connectMidiDevice: (deviceId) => ipcRenderer.invoke('connect-midi-device', deviceId),
  sendMidiCommand: (config) => ipcRenderer.invoke('send-midi-command', config),
  sendMidiProgramChange: (config) => ipcRenderer.invoke('send-midi-program-change', config),
  sendMidiNote: (config) => ipcRenderer.invoke('send-midi-note', config),
  createMidiMapping: (config) => ipcRenderer.invoke('create-midi-mapping', config),
  executeMidiMapping: (config) => ipcRenderer.invoke('execute-midi-mapping', config),
  getMidiMappings: () => ipcRenderer.invoke('get-midi-mappings'),
  disconnectMidiDevice: () => ipcRenderer.invoke('disconnect-midi-device'),
  
  // DMX Lighting Control
  getDmxAdapters: () => ipcRenderer.invoke('get-dmx-adapters'),
  connectDmxUniverse: (config) => ipcRenderer.invoke('connect-dmx-universe', config),
  setDmxChannel: (config) => ipcRenderer.invoke('set-dmx-channel', config),
  setDmxChannels: (config) => ipcRenderer.invoke('set-dmx-channels', config),
  startDmxFade: (config) => ipcRenderer.invoke('start-dmx-fade', config),
  startDmxChase: (config) => ipcRenderer.invoke('start-dmx-chase', config),
  startDmxStrobe: (config) => ipcRenderer.invoke('start-dmx-strobe', config),
  stopDmxEffect: (config) => ipcRenderer.invoke('stop-dmx-effect', config),
  stopDmxAllEffects: (config) => ipcRenderer.invoke('stop-dmx-all-effects', config),
  getDmxUniverseStatus: (config) => ipcRenderer.invoke('get-dmx-universe-status', config),
  getAllDmxUniverses: () => ipcRenderer.invoke('get-all-dmx-universes'),
  disconnectDmxUniverse: (config) => ipcRenderer.invoke('disconnect-dmx-universe', config)
});
