const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');
const notifier = require('node-notifier');

// Initialize store for settings
const store = new Store();

// Server configuration
const SERVER_IP = '172.94.3.216'; // VPN IP as specified for walkie-talkie
const SERVER_PORT = 3000;

// Global variables
let mainWindow = null;
let tray = null;
let serverApp = null;
let server = null;
let io = null;
let isServerRunning = false;
let connectedUsers = new Map();
let userSockets = new Map();

// Auto-launch setup
const autoLauncher = new AutoLaunch({
    name: 'Zell0 Server',
    path: process.execPath,
});

// Create the Express server
function createServer() {
    serverApp = express();
    server = http.createServer(serverApp);
    
    // Configure Socket.IO with CORS
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // Serve static files for web dashboard
    serverApp.use(express.static(path.join(__dirname, 'public')));

    // Logging middleware
    serverApp.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`${timestamp} - ${req.method} ${req.url}`);
        
        // Send to renderer for UI logging
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server-log', {
                timestamp,
                type: 'http',
                message: `${req.method} ${req.url}`,
                ip: req.ip
            });
        }
        next();
    });

    // Health check endpoint
    serverApp.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            connectedUsers: connectedUsers.size,
            uptime: process.uptime(),
            serverIP: SERVER_IP,
            serverPort: SERVER_PORT
        });
    });

    // Server info endpoint
    serverApp.get('/info', (req, res) => {
        res.json({
            serverName: 'Zell0 Windows Server',
            version: '1.0.0',
            connectedDevices: Array.from(connectedUsers.values()).map(user => ({
                deviceId: user.deviceId,
                connectedAt: user.connectedAt,
                lastSeen: user.lastSeen
            }))
        });
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
        const clientIP = socket.handshake.address;
        const timestamp = new Date().toISOString();
        
        console.log(`${timestamp} - User connected: ${socket.id} from ${clientIP}`);
        
        // Send to UI
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('user-connected', {
                socketId: socket.id,
                clientIP,
                timestamp
            });
        }

        // Handle user registration
        socket.on('register', (data) => {
            try {
                const { deviceId, timestamp } = data;
                
                // Store user information
                connectedUsers.set(socket.id, {
                    deviceId,
                    socketId: socket.id,
                    connectedAt: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    clientIP
                });
                
                userSockets.set(deviceId, socket.id);
                
                // Notify other users
                socket.broadcast.emit('user_joined', { 
                    userId: deviceId,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`${new Date().toISOString()} - User registered: ${deviceId} (${socket.id})`);
                
                // Send registration confirmation
                socket.emit('registration_confirmed', {
                    deviceId,
                    serverTime: new Date().toISOString(),
                    connectedUsers: Array.from(connectedUsers.values()).map(u => u.deviceId)
                });

                // Update UI
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('user-registered', {
                        deviceId,
                        socketId: socket.id,
                        clientIP,
                        totalUsers: connectedUsers.size
                    });
                }

                // Show notification
                notifier.notify({
                    title: 'Zell0 Server',
                    message: `Device "${deviceId}" connected`,
                    timeout: 3
                });
                
            } catch (error) {
                console.error('Error in register:', error);
                socket.emit('error', { message: 'Registration failed' });
            }
        });
        
        // Handle text messages
        socket.on('text_message', (data) => {
            try {
                const { message, senderId, timestamp, type } = data;
                
                // Update last seen
                const userInfo = connectedUsers.get(socket.id);
                if (userInfo) {
                    userInfo.lastSeen = new Date().toISOString();
                }
                
                // Broadcast to all other users
                socket.broadcast.emit('text_message', {
                    message,
                    senderId,
                    timestamp,
                    type,
                    serverTimestamp: new Date().toISOString()
                });
                
                console.log(`${new Date().toISOString()} - Text message from ${senderId}: ${message.substring(0, 50)}...`);
                
                // Update UI
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('message-received', {
                        type: 'text',
                        senderId,
                        content: message,
                        timestamp
                    });
                }
                
            } catch (error) {
                console.error('Error in text_message:', error);
                socket.emit('error', { message: 'Failed to send text message' });
            }
        });
        
        // Handle audio messages
        socket.on('audio_message', (data) => {
            try {
                const { audioData, senderId, timestamp, type, duration } = data;
                
                // Update last seen
                const userInfo = connectedUsers.get(socket.id);
                if (userInfo) {
                    userInfo.lastSeen = new Date().toISOString();
                }
                
                // Broadcast to all other users
                socket.broadcast.emit('audio_message', {
                    audioData,
                    senderId,
                    timestamp,
                    type,
                    duration,
                    serverTimestamp: new Date().toISOString()
                });
                
                console.log(`${new Date().toISOString()} - Audio message from ${senderId}: ${audioData.length} bytes, ${duration}ms`);
                
                // Update UI
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('message-received', {
                        type: 'audio',
                        senderId,
                        size: audioData.length,
                        duration,
                        timestamp
                    });
                }
                
            } catch (error) {
                console.error('Error in audio_message:', error);
                socket.emit('error', { message: 'Failed to send audio message' });
            }
        });
        
        // Handle keep alive
        socket.on('keep_alive', (data) => {
            try {
                const { deviceId, timestamp } = data;
                
                // Update last seen
                const userInfo = connectedUsers.get(socket.id);
                if (userInfo) {
                    userInfo.lastSeen = new Date().toISOString();
                }
                
                // Send keep alive response
                socket.emit('keep_alive_response', {
                    serverTime: new Date().toISOString(),
                    status: 'ok'
                });
                
            } catch (error) {
                console.error('Error in keep_alive:', error);
            }
        });
        
        // Handle disconnection
        socket.on('disconnect', (reason) => {
            try {
                const userInfo = connectedUsers.get(socket.id);
                if (userInfo) {
                    const { deviceId } = userInfo;
                    
                    // Remove user from maps
                    connectedUsers.delete(socket.id);
                    userSockets.delete(deviceId);
                    
                    // Notify other users
                    socket.broadcast.emit('user_left', { 
                        userId: deviceId,
                        timestamp: new Date().toISOString()
                    });
                    
                    console.log(`${new Date().toISOString()} - User disconnected: ${deviceId} (${socket.id}) - Reason: ${reason}`);
                    
                    // Update UI
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('user-disconnected', {
                            deviceId,
                            socketId: socket.id,
                            reason,
                            totalUsers: connectedUsers.size
                        });
                    }

                    // Show notification
                    notifier.notify({
                        title: 'Zell0 Server',
                        message: `Device "${deviceId}" disconnected`,
                        timeout: 3
                    });
                } else {
                    console.log(`${new Date().toISOString()} - Unknown user disconnected: ${socket.id} - Reason: ${reason}`);
                }
            } catch (error) {
                console.error('Error in disconnect:', error);
            }
        });
        
        // Handle errors
        socket.on('error', (error) => {
            console.error(`${new Date().toISOString()} - Socket error for ${socket.id}:`, error);
        });
    });
}

// Start the server
function startServer() {
    if (isServerRunning) {
        console.log('Server is already running');
        return;
    }

    try {
        createServer();
        
        server.listen(SERVER_PORT, '0.0.0.0', () => {
            const timestamp = new Date().toISOString();
            console.log(`${timestamp} - Zell0 Server running on ${SERVER_IP}:${SERVER_PORT}`);
            console.log(`${timestamp} - Health check available at http://${SERVER_IP}:${SERVER_PORT}/health`);
            
            isServerRunning = true;
            
            // Update UI
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('server-status', {
                    running: true,
                    ip: SERVER_IP,
                    port: SERVER_PORT,
                    timestamp
                });
            }

            // Update tray tooltip
            if (tray && !tray.isDestroyed()) {
                tray.setToolTip(`Zell0 Server - Running on ${SERVER_IP}:${SERVER_PORT}`);
            }

            // Show notification
            notifier.notify({
                title: 'Zell0 Server Started',
                message: `Server is running on ${SERVER_IP}:${SERVER_PORT}`,
                timeout: 5
            });
        });

        server.on('error', (error) => {
            console.error('Server error:', error);
            isServerRunning = false;
            
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('server-error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }

            dialog.showErrorBox('Server Error', `Failed to start server: ${error.message}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        dialog.showErrorBox('Server Error', `Failed to start server: ${error.message}`);
    }
}

// Stop the server
function stopServer() {
    if (!isServerRunning) {
        console.log('Server is not running');
        return;
    }

    try {
        if (server) {
            server.close(() => {
                console.log('Server stopped');
                isServerRunning = false;
                
                // Update UI
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('server-status', {
                        running: false,
                        timestamp: new Date().toISOString()
                    });
                }

                // Update tray tooltip
                if (tray && !tray.isDestroyed()) {
                    tray.setToolTip('Zell0 Server - Stopped');
                }

                // Show notification
                notifier.notify({
                    title: 'Zell0 Server Stopped',
                    message: 'Server has been stopped',
                    timeout: 3
                });
            });
        }
    } catch (error) {
        console.error('Error stopping server:', error);
    }
}

// Create the main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false // Start hidden in tray
    });

    mainWindow.loadFile('index.html');

    // Handle window close (minimize to tray)
    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            mainWindow.hide();
            
            notifier.notify({
                title: 'Zell0 Server',
                message: 'Application minimized to system tray',
                timeout: 3
            });
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create system tray
function createTray() {
    try {
        // Try to create tray with icon
        const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
        tray = new Tray(iconPath);
    } catch (error) {
        console.log('Tray icon not found, creating tray without icon');
        // Create a simple nativeImage as fallback
        const { nativeImage } = require('electron');
        const icon = nativeImage.createEmpty();
        tray = new Tray(icon);
    }
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Dashboard',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: 'Server Status',
            submenu: [
                {
                    label: isServerRunning ? 'Running' : 'Stopped',
                    enabled: false
                },
                { type: 'separator' },
                {
                    label: 'Start Server',
                    enabled: !isServerRunning,
                    click: startServer
                },
                {
                    label: 'Stop Server',
                    enabled: isServerRunning,
                    click: stopServer
                },
                {
                    label: 'Restart Server',
                    click: () => {
                        stopServer();
                        setTimeout(startServer, 1000);
                    }
                }
            ]
        },
        { type: 'separator' },
        {
            label: 'Auto-start with Windows',
            type: 'checkbox',
            checked: store.get('autoStart', true),
            click: async (menuItem) => {
                const enabled = menuItem.checked;
                store.set('autoStart', enabled);
                
                try {
                    if (enabled) {
                        await autoLauncher.enable();
                    } else {
                        await autoLauncher.disable();
                    }
                } catch (error) {
                    console.error('Auto-start error:', error);
                }
            }
        },
        {
            label: 'Open Health Check',
            click: () => {
                shell.openExternal(`http://${SERVER_IP}:${SERVER_PORT}/health`);
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuiting = true;
                stopServer();
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip('Zell0 Server');
    
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// IPC handlers
ipcMain.handle('get-server-status', () => {
    return {
        running: isServerRunning,
        ip: SERVER_IP,
        port: SERVER_PORT,
        connectedUsers: connectedUsers.size,
        uptime: process.uptime()
    };
});

ipcMain.handle('get-connected-users', () => {
    return Array.from(connectedUsers.values());
});

ipcMain.handle('start-server', () => {
    startServer();
});

ipcMain.handle('stop-server', () => {
    stopServer();
});

ipcMain.handle('get-settings', () => {
    return {
        autoStart: store.get('autoStart', true),
        minimizeToTray: store.get('minimizeToTray', true),
        showNotifications: store.get('showNotifications', true)
    };
});

ipcMain.handle('save-settings', (event, settings) => {
    Object.keys(settings).forEach(key => {
        store.set(key, settings[key]);
    });
});

// App event handlers
app.whenReady().then(async () => {
    createWindow();
    createTray();
    
    // Set up auto-start if enabled
    const autoStart = store.get('autoStart', true);
    if (autoStart) {
        try {
            await autoLauncher.enable();
        } catch (error) {
            console.error('Auto-start setup error:', error);
        }
    }
    
    // Start server automatically
    startServer();
});

app.on('window-all-closed', () => {
    // Keep running in background on Windows
    if (process.platform !== 'darwin') {
        // Don't quit, keep running in tray
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    app.isQuiting = true;
    stopServer();
});

// Periodic cleanup of stale connections
setInterval(() => {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [socketId, userInfo] of connectedUsers.entries()) {
        const lastSeen = new Date(userInfo.lastSeen);
        if (now - lastSeen > staleThreshold) {
            console.log(`${new Date().toISOString()} - Cleaning up stale connection: ${userInfo.deviceId}`);
            connectedUsers.delete(socketId);
            userSockets.delete(userInfo.deviceId);
            
            // Update UI
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('user-disconnected', {
                    deviceId: userInfo.deviceId,
                    socketId: socketId,
                    reason: 'stale connection',
                    totalUsers: connectedUsers.size
                });
            }
        }
    }
}, 60000); // Check every minute 