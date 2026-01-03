const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const ffmpeg = require('fluent-ffmpeg');
const { execSync } = require('child_process');
const MIDIController = require('./midiController');
const DMXController = require('./dmxController');

let mainWindow;
let encoderProcess = null;
let midiController = null;
let dmxController = null;

// Try to find FFmpeg installation
function findFFmpegPath() {
  try {
    const ffmpegPath = execSync('where ffmpeg', { encoding: 'utf-8' }).trim();
    return ffmpegPath;
  } catch {
    // Check common installation paths
    const commonPaths = [
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      '/usr/local/bin/ffmpeg',
      '/usr/bin/ffmpeg'
    ];
    
    const fs = require('fs');
    for (const p of commonPaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    
    return null;
  }
}

function createWindow() {
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (encoderProcess) {
      encoderProcess.kill();
    }
  });

  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Exit', click: () => app.quit() }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About', click: () => {
          // Show about dialog
        }}
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC Handlers

ipcMain.handle('get-ffmpeg-status', async () => {
  const ffmpegPath = findFFmpegPath();
  return {
    installed: ffmpegPath !== null,
    path: ffmpegPath,
    version: ffmpegPath ? execSync(`"${ffmpegPath}" -version`, { encoding: 'utf-8' }).split('\n')[0] : null
  };
});

ipcMain.handle('start-stream', async (event, config) => {
  try {
    const ffmpegPath = findFFmpegPath();
    if (!ffmpegPath) {
      return { success: false, error: 'FFmpeg not found. Please install FFmpeg.' };
    }

    ffmpeg.setFfmpegPath(ffmpegPath);

    const { source, rtmpUrl, streamKey, resolution, fps, bitrate, audioDevice } = config;

    // Build command based on source type
    let command = ffmpeg();

    if (source === 'screen') {
      // Windows screen capture using gdigrab
      command = command
        .input('desktop', { f: 'gdigrab' })
        .inputFormat('gdigrab');
    } else if (source === 'camera') {
      // Webcam input
      command = command.input(audioDevice || 'video="Screen capture"', { f: 'dshow' });
    } else if (source === 'window') {
      // Window capture
      command = command.input('desktop', { f: 'gdigrab' });
    }

    // Add audio input
    command = command.input('audio="Microphone"', { f: 'dshow' });

    // Video encoding
    const [width, height] = resolution.split('x').map(Number);
    command = command
      .videoCodec('libx264')
      .videoBitrate(bitrate)
      .fps(fps)
      .size(`${width}x${height}`)
      .videoFilters('scale=trunc(iw/2)*2:trunc(ih/2)*2');

    // Audio encoding
    command = command
      .audioCodec('aac')
      .audioBitrate('128k')
      .audioFrequency(48000)
      .audioChannels(2);

    // Output to RTMP
    const rtmpAddress = `${rtmpUrl}${streamKey}`;
    command = command
      .output(rtmpAddress, { f: 'flv' })
      .on('start', () => {
        mainWindow.webContents.send('stream-started');
      })
      .on('progress', (progress) => {
        mainWindow.webContents.send('stream-progress', {
          frames: progress.frames,
          currentFps: progress.currentFps,
          currentKbps: progress.currentKbps,
          timemark: progress.timemark
        });
      })
      .on('error', (err) => {
        mainWindow.webContents.send('stream-error', err.message);
      })
      .on('end', () => {
        mainWindow.webContents.send('stream-ended');
      });

    encoderProcess = command.run();

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-stream', async () => {
  try {
    if (encoderProcess) {
      encoderProcess.kill('SIGINT');
      encoderProcess = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-displays', async () => {
  const { screen } = require('electron');
  return screen.getAllDisplays().map(display => ({
    id: display.id,
    name: `Display ${display.id}`,
    width: display.bounds.width,
    height: display.bounds.height,
    scaleFactor: display.scaleFactor
  }));
});

ipcMain.handle('get-audio-devices', async () => {
  try {
    // Placeholder - would need to use a library like node-record-lpc16
    return [
      { id: 'Microphone', name: 'Microphone' },
      { id: 'Line In', name: 'Line In' }
    ];
  } catch (error) {
    return [];
  }
});

// MIDI Device Control Handlers

ipcMain.handle('get-midi-devices', async () => {
  try {
    if (!midiController) {
      midiController = new MIDIController();
    }
    const devices = await midiController.getAvailableDevices();
    return { success: true, devices };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('connect-midi-device', async (event, deviceId) => {
  try {
    if (!midiController) {
      midiController = new MIDIController();
    }
    await midiController.connectDevice(deviceId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-midi-command', async (event, { deviceId, channel, controller, value }) => {
  try {
    if (!midiController) {
      midiController = new MIDIController();
    }
    await midiController.sendMIDICommand(channel, controller, value);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-midi-program-change', async (event, { channel, program }) => {
  try {
    if (!midiController) {
      midiController = new MIDIController();
    }
    await midiController.sendProgramChange(channel, program);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-midi-note', async (event, { channel, note, velocity, isNoteOn }) => {
  try {
    if (!midiController) {
      midiController = new MIDIController();
    }
    await midiController.sendNote(channel, note, velocity, isNoteOn);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-midi-mapping', async (event, { deviceId, name, commands }) => {
  try {
    if (!midiController) {
      midiController = new MIDIController();
    }
    midiController.createMapping(deviceId, name, commands);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('execute-midi-mapping', async (event, { mappingName }) => {
  try {
    if (!midiController) {
      midiController = new MIDIController();
    }
    await midiController.executeMapping(mappingName);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-midi-mappings', async () => {
  try {
    if (!midiController) {
      midiController = new MIDIController();
    }
    const mappings = midiController.getMappings();
    return { success: true, mappings };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-midi-device', async () => {
  try {
    if (midiController) {
      midiController.disconnect();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// DMX Lighting Control Handlers

ipcMain.handle('get-dmx-adapters', async () => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const adapters = await dmxController.getAvailableAdapters();
    return { success: true, adapters };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('connect-dmx-universe', async (event, { universeId, adapterId }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const result = await dmxController.connectUniverse(universeId, adapterId);
    return { success: true, universe: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-dmx-channel', async (event, { universeId, channel, value }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const result = await dmxController.setChannel(universeId, channel, value);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-dmx-channels', async (event, { universeId, channels }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const result = await dmxController.setChannels(universeId, channels);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-dmx-fade', async (event, { universeId, channels, targetValue, duration }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const effectId = await dmxController.startFade(universeId, channels, targetValue, duration);
    return { success: true, effectId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-dmx-chase', async (event, { universeId, channelGroups, speed }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const effectId = await dmxController.startChase(universeId, channelGroups, speed);
    return { success: true, effectId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-dmx-strobe', async (event, { universeId, channels, frequency, duration }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const effectId = await dmxController.startStrobe(universeId, channels, frequency, duration);
    return { success: true, effectId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-dmx-effect', async (event, { effectId }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const result = await dmxController.stopEffect(effectId);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-dmx-all-effects', async (event, { universeId }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const result = await dmxController.stopAllEffects(universeId);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-dmx-universe-status', async (event, { universeId }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const status = dmxController.getUniverseStatus(universeId);
    return { success: true, status };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-all-dmx-universes', async () => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const universes = dmxController.getAllUniverses();
    return { success: true, universes };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('disconnect-dmx-universe', async (event, { universeId }) => {
  try {
    if (!dmxController) {
      dmxController = new DMXController();
    }
    const result = await dmxController.disconnectUniverse(universeId);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App lifecycle
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
