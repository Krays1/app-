const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { NetworkManager } = require('./network-manager');

// Initialize store for settings
const store = new Store();

let mainWindow;
let tray;
let networkManager;
let isQuitting = false;

// VPN Server Configuration (same as Android app)
const SERVER_CONFIG = {
    host: '172.94.3.216',
    port: 3001,
    secure: false
};

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        titleBarStyle: 'default',
        show: false,
        frame: true
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Initialize network manager
        initializeNetworkManager();
        
        // Auto-connect if settings allow
        setTimeout(() => {
            autoConnectToServer();
        }, 1000);
    });

    // Handle window close
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (networkManager) {
            networkManager.disconnect();
        }
    });

    // Create tray icon
    createTray();
}

function createTray() {
    const iconPath = path.join(__dirname, 'assets/tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    
    tray = new Tray(icon);
    tray.setToolTip('Zell0 Desktop');
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: 'Connect to Server',
            click: () => {
                if (networkManager) {
                    networkManager.connect();
                }
            }
        },
        {
            label: 'Disconnect',
            click: () => {
                if (networkManager) {
                    networkManager.disconnect();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);
    
    tray.setContextMenu(contextMenu);
    
    // Double click to show window
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function initializeNetworkManager() {
    networkManager = new NetworkManager(SERVER_CONFIG);
    
    // Handle network events
    networkManager.on('connected', () => {
        console.log('Main: Network connected');
        if (mainWindow) {
            mainWindow.webContents.send('network-connected');
        }
        updateTrayStatus('Connected');
    });
    
    networkManager.on('disconnected', () => {
        console.log('Main: Network disconnected');
        if (mainWindow) {
            mainWindow.webContents.send('network-disconnected');
        }
        updateTrayStatus('Disconnected');
    });
    
    networkManager.on('error', (error) => {
        console.log('Main: Network error', error);
        if (mainWindow) {
            mainWindow.webContents.send('network-error', error);
        }
        updateTrayStatus('Error');
    });
    
    networkManager.on('registered', (data) => {
        console.log('Main: User registered', data);
        if (mainWindow) {
            mainWindow.webContents.send('network-connected');
        }
        updateTrayStatus('Connected');
    });
    
    networkManager.on('user-joined', (user) => {
        console.log('Main: User joined', user);
        if (mainWindow) {
            mainWindow.webContents.send('user-joined', user);
        }
    });
    
    networkManager.on('user-left', (user) => {
        console.log('Main: User left', user);
        if (mainWindow) {
            mainWindow.webContents.send('user-left', user);
        }
    });
    
    networkManager.on('user-list', (users) => {
        console.log('Main: User list received', users.length, 'users');
        if (mainWindow) {
            mainWindow.webContents.send('user-list', users);
        }
    });
    
    networkManager.on('text-message', (message) => {
        console.log('Main: Text message received', message);
        if (mainWindow) {
            mainWindow.webContents.send('text-message', message);
        }
    });
    
    networkManager.on('voice-message', (message) => {
        console.log('Main: Voice message received', message);
        if (mainWindow) {
            mainWindow.webContents.send('voice-message', message);
        }
    });
    
    // Chess events
    networkManager.on('chess-game-joined', (data) => {
        console.log('Main: Chess game joined', data);
        if (mainWindow) {
            mainWindow.webContents.send('chess-game-joined', data);
        }
    });
    
    networkManager.on('chess-game-started', (data) => {
        console.log('Main: Chess game started', data);
        if (mainWindow) {
            mainWindow.webContents.send('chess-game-started', data);
        }
    });
    
    networkManager.on('chess-move', (data) => {
        console.log('Main: Chess move', data);
        if (mainWindow) {
            mainWindow.webContents.send('chess-move', data);
        }
    });
    
    networkManager.on('chess-game-over', (data) => {
        console.log('Main: Chess game over', data);
        if (mainWindow) {
            mainWindow.webContents.send('chess-game-over', data);
        }
    });
    
    networkManager.on('chess-left-confirmation', (data) => {
        console.log('Main: Chess left confirmation', data);
        if (mainWindow) {
            mainWindow.webContents.send('chess-left-confirmation', data);
        }
    });
    
    networkManager.on('chess-error', (data) => {
        console.log('Main: Chess error', data);
        if (mainWindow) {
            mainWindow.webContents.send('chess-error', data);
        }
    });
}

function updateTrayStatus(status) {
    if (tray) {
        tray.setToolTip(`Zell0 Desktop - ${status}`);
    }
}

async function autoConnectToServer() {
    try {
        const settings = store.get('settings', {
            username: '',
            autoConnect: true,
            voiceEnabled: true,
            notificationsEnabled: true
        });
        
        if (settings.autoConnect && settings.username) {
            console.log('Auto-connecting to server with username:', settings.username);
            
            const userData = {
                username: settings.username,
                deviceId: `desktop-${Date.now()}`,
                deviceName: 'Windows Desktop',
                profilePic: null
            };
            
            if (networkManager) {
                await networkManager.connect(userData);
                console.log('Auto-connection successful');
            }
        } else {
            console.log('Auto-connect disabled or no username set');
        }
    } catch (error) {
        console.error('Auto-connection failed:', error);
    }
}

// IPC Handlers
ipcMain.handle('connect-to-server', async (event, userData) => {
    try {
        if (networkManager) {
            await networkManager.connect(userData);
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('disconnect-from-server', async () => {
    try {
        if (networkManager) {
            networkManager.disconnect();
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('send-text-message', async (event, message) => {
    try {
        if (networkManager) {
            networkManager.sendTextMessage(message);
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('send-voice-message', async (event, audioData) => {
    try {
        if (networkManager) {
            networkManager.sendVoiceMessage(audioData);
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('request-user-list', async () => {
    try {
        if (networkManager) {
            networkManager.requestUserList();
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('find-chess-game', async () => {
    try {
        if (networkManager) {
            networkManager.findChessGame();
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('make-chess-move', async (event, moveData) => {
    try {
        if (networkManager) {
            networkManager.makeChessMove(moveData);
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('leave-chess-game', async () => {
    try {
        if (networkManager) {
            networkManager.leaveChessGame();
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('resign-chess-game', async () => {
    try {
        if (networkManager) {
            networkManager.resignChessGame();
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-chess-game', async () => {
    try {
        if (networkManager) {
            networkManager.saveChessGame();
            return { success: true };
        }
        return { success: false, error: 'Network manager not initialized' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-settings', () => {
    return store.get('settings', {
        username: '',
        autoConnect: true,
        voiceEnabled: true,
        notificationsEnabled: true,
        darkTheme: false,
        microphoneDevice: '',
        speakerDevice: '',
        voiceVolume: 80
    });
});

ipcMain.handle('save-settings', (event, settings) => {
    store.set('settings', settings);
    return { success: true };
});

ipcMain.handle('show-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Audio Files', extensions: ['wav', 'mp3', 'ogg'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result;
});

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

// Handle app quit
app.on('quit', () => {
    if (networkManager) {
        networkManager.disconnect();
    }
}); 