const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');
const { startHookServer } = require('./hook-server');
const { registerHooks } = require('./hook-register');
const { PetState } = require('./pet-state');

let mainWindow = null;
let tray = null;
let petState = null;

function createWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 200,
    height: 250,
    x: screenW - 250,
    y: screenH - 300,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'pet.html'));
  mainWindow.setIgnoreMouseEvents(false);

  // Allow dragging
  ipcMain.on('set-ignore-mouse', (_, ignore) => {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  });

  // Pet state queries from renderer
  ipcMain.handle('get-state', () => petState.getFullState());
  ipcMain.handle('feed', () => petState.feed());
  ipcMain.handle('play', () => petState.play());
  ipcMain.handle('train', () => petState.train());
  ipcMain.handle('get-stats', () => petState.getStats());

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  // Simple 16x16 tray icon
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADGSURBVDiNpZMxDoMwDEV/Uga27sAJ2DkEF+htuARH6MrSgYGxC0NPlFRNaZCQIvn7+9uxYwBijDGFEASQJP2cB4BSSqyqSkVR0Pd9CoAxxmaMUdO0kiRprUVESimllLpuL/Rsa63JOacYI0VRSDlnstbSOUfnnMg5pznnfAJ0XYemaX73AaD1WtN1XcoAeBFxH6h7T50zIqJbLaWQUvJBROwGcN9j5xyZmY0xRt77E2B5S8gY8y8LAJlvdxkQkeIm+BV+ARv5X9SdI9n3AAAAAElFTkSuQmCC'
  );

  tray = new Tray(icon);

  const updateMenu = () => {
    const state = petState.getFullState();
    const contextMenu = Menu.buildFromTemplate([
      { label: `🐾 ${state.name} Lv.${state.level} (${state.evolution})`, enabled: false },
      { label: `${state.moodEmoji} ${state.mood} | ♥${state.happiness}% | ⚡${state.energy}%`, enabled: false },
      { type: 'separator' },
      { label: '🍎 Feed', click: () => { petState.feed(); sendToRenderer('state-update'); } },
      { label: '🎮 Play', click: () => { petState.play(); sendToRenderer('state-update'); } },
      { label: '💪 Train', click: () => { petState.train(); sendToRenderer('state-update'); } },
      { type: 'separator' },
      { label: '📊 Stats', click: () => sendToRenderer('show-stats') },
      { type: 'separator' },
      { label: 'Size', submenu: [
        { label: 'Small', click: () => resizePet(120, 150) },
        { label: 'Medium', click: () => resizePet(200, 250) },
        { label: 'Large', click: () => resizePet(300, 380) },
      ]},
      { type: 'separator' },
      { label: 'Quit CodePal', click: () => { petState.save(); app.quit(); } },
    ]);
    tray.setContextMenu(contextMenu);
    tray.setToolTip(`CodePal - ${state.name} Lv.${state.level}`);
  };

  updateMenu();
  setInterval(updateMenu, 5000);
}

function resizePet(w, h) {
  if (mainWindow) {
    mainWindow.setSize(w, h);
  }
}

function sendToRenderer(channel, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

// Hook event handler
function onHookEvent(event) {
  petState.onAgentEvent(event);
  sendToRenderer('agent-event', event);
  sendToRenderer('state-update', petState.getFullState());
}

app.whenReady().then(async () => {
  petState = new PetState();

  createWindow();
  createTray();

  // Start hook HTTP server
  startHookServer(onHookEvent);

  // Register hooks with Claude Code
  registerHooks();

  // Periodic stat decay and save
  setInterval(() => {
    petState.tick();
    sendToRenderer('state-update', petState.getFullState());
  }, 30000); // Every 30 seconds

  // Save every 5 minutes
  setInterval(() => petState.save(), 300000);
});

app.on('before-quit', () => {
  if (petState) petState.save();
});

app.on('window-all-closed', (e) => {
  e.preventDefault(); // Keep running in tray
});
