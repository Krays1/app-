const { app, BrowserWindow, ipcMain } = require('electron');
const io = require('socket.io-client');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let socket;
let isConnected = false;
let connectedUsers = [];
let currentUser = null;
let audioRecorder = null;
let isRecording = false;

// Server configuration
const SERVER_CONFIG = {
    host: '172.94.3.216',
    port: 3001
};

// Audio configuration
const AUDIO_CONFIG = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16
};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Zell0 Desktop - Simple Version'
    });

    mainWindow.loadFile('simple-index.html');
    
    // Open DevTools for debugging
    mainWindow.webContents.openDevTools();
}

function connectToServer(username) {
    const serverUrl = `http://${SERVER_CONFIG.host}:${SERVER_CONFIG.port}`;
    console.log('Connecting to server:', serverUrl);
    
    socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000
    });
    
    // Connection events
    socket.on('connect', () => {
        console.log('Connected to server');
        isConnected = true;
        currentUser = {
            username: username,
            deviceId: `desktop-${Date.now()}`,
            deviceName: 'Windows Desktop'
        };
        
        // Register with server
        socket.emit('register', currentUser);
        
        // Update UI
        if (mainWindow) {
            mainWindow.webContents.send('connection-status', { connected: true });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        isConnected = false;
        if (mainWindow) {
            mainWindow.webContents.send('connection-status', { connected: false });
        }
    });
    
    // User events
    socket.on('user_joined', (user) => {
        console.log('User joined:', user);
        if (!connectedUsers.find(u => u.deviceId === user.deviceId)) {
            connectedUsers.push(user);
        }
        if (mainWindow) {
            mainWindow.webContents.send('user-list', connectedUsers);
        }
    });
    
    socket.on('user_left', (user) => {
        console.log('User left:', user);
        connectedUsers = connectedUsers.filter(u => u.deviceId !== user.deviceId);
        if (mainWindow) {
            mainWindow.webContents.send('user-list', connectedUsers);
        }
    });
    
    socket.on('user_list_updated', (data) => {
        console.log('User list updated received:', data.users);
        connectedUsers = data.users || [];
        
        // Add current user to the list if not present
        if (currentUser && !connectedUsers.find(u => u.username === currentUser.username)) {
            connectedUsers.push(currentUser);
        }
        
        if (mainWindow) {
            mainWindow.webContents.send('user-list', connectedUsers);
        }
    });
    
    // Handle user list broadcast (fallback)
    socket.on('user_list_broadcast', (data) => {
        console.log('User list broadcast received:', data.users);
        connectedUsers = data.users || [];
        
        // Add current user to the list if not present
        if (currentUser && !connectedUsers.find(u => u.username === currentUser.username)) {
            connectedUsers.push(currentUser);
        }
        
        if (mainWindow) {
            mainWindow.webContents.send('user-list', connectedUsers);
        }
    });
    
    // Handle live audio streaming
    socket.on('live_audio_chunk_received', (chunk) => {
        console.log('Live audio chunk received:', chunk);
        if (mainWindow) {
            mainWindow.webContents.send('live-audio-chunk', chunk);
        }
    });
    
    // Message events
    socket.on('text_message_received', (message) => {
        console.log('Text message received:', message);
        if (mainWindow) {
            mainWindow.webContents.send('text-message', message);
        }
    });
    
    socket.on('voice_message_received', (message) => {
        console.log('Voice message received:', message);
        if (mainWindow) {
            mainWindow.webContents.send('voice-message', message);
        }
    });
    
    // Message confirmation events
    socket.on('message_sent', (data) => {
        console.log('Message sent confirmation:', data);
    });
    
    socket.on('message_error', (error) => {
        console.error('Message sending error:', error);
    });
    
    // Registration events
    socket.on('registration_success', (data) => {
        console.log('Registration successful:', data);
        // Request user list after registration
        socket.emit('get-user-list');
    });
    
    socket.on('registration_error', (error) => {
        console.error('Registration failed:', error);
    });
}

// Audio recording and playback functions
function startAudioRecording() {
    if (isRecording) return;
    
    try {
        console.log('Starting audio recording...');
        isRecording = true;
        
        // Create temporary file for recording
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `zell0_audio_${Date.now()}.wav`);
        
        // For now, we'll use a simple approach with Web Audio API
        // This will be handled in the renderer process
        if (mainWindow) {
            mainWindow.webContents.send('start-recording', { tempFile });
        }
        
        return { success: true, tempFile };
    } catch (error) {
        console.error('Failed to start recording:', error);
        isRecording = false;
        return { success: false, error: error.message };
    }
}

function stopAudioRecording() {
    if (!isRecording) return;
    
    try {
        console.log('Stopping audio recording...');
        isRecording = false;
        
        if (mainWindow) {
            mainWindow.webContents.send('stop-recording');
        }
        
        return { success: true };
    } catch (error) {
        console.error('Failed to stop recording:', error);
        return { success: false, error: error.message };
    }
}

function playAudioMessage(audioData) {
    try {
        console.log('Playing audio message...');
        
        if (mainWindow) {
            mainWindow.webContents.send('play-audio', { audioData });
        }
        
        return { success: true };
    } catch (error) {
        console.error('Failed to play audio:', error);
        return { success: false, error: error.message };
    }
}

// IPC handlers
ipcMain.handle('connect', async (event, username) => {
    try {
        connectToServer(username);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('send-message', async (event, message) => {
    try {
        if (socket && isConnected) {
            console.log('Sending message:', message);
            
            // Send message in the correct format expected by server
            socket.emit('text-message', {
                message: message,
                timestamp: Date.now(),
                type: 'text'
            });
            
            return { success: true };
        }
        return { success: false, error: 'Not connected' };
    } catch (error) {
        console.error('Failed to send message:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('request-users', async () => {
    try {
        if (socket && isConnected) {
            socket.emit('get-user-list');
            return { success: true };
        }
        return { success: false, error: 'Not connected' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

app.whenReady().then(() => {
    createWindow();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Audio IPC handlers
ipcMain.handle('start-recording', async () => {
    return startAudioRecording();
});

ipcMain.handle('stop-recording', async () => {
    return stopAudioRecording();
});

ipcMain.handle('play-audio', async (event, audioData) => {
    return playAudioMessage(audioData);
});

ipcMain.handle('send-voice-message', async (event, audioData) => {
    try {
        if (socket && isConnected) {
            console.log('Sending voice message...');
            
            // Send voice message in the correct format
            socket.emit('voice-message', {
                audioData: audioData,
                timestamp: Date.now(),
                type: 'voice'
            });
            
            return { success: true };
        }
        return { success: false, error: 'Not connected' };
    } catch (error) {
        console.error('Failed to send voice message:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('send-live-audio-chunk', async (event, audioData) => {
    try {
        if (socket && isConnected) {
            console.log('Sending live audio chunk...');
            
            // Send live audio chunk in the correct format
            socket.emit('live-audio-chunk', {
                audioData: audioData,
                timestamp: Date.now(),
                chunkSize: audioData.length
            });
            
            return { success: true };
        }
        return { success: false, error: 'Not connected' };
    } catch (error) {
        console.error('Failed to send live audio chunk:', error);
        return { success: false, error: error.message };
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
}); 