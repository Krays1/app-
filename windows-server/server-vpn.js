// Zell0 Server - VPN Configuration (172.94.3.216)
// This server is configured to use the specific VPN IP for walkie-talkie functionality

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// VPN IP Configuration - MUST match Android app
const SERVER_IP = '172.94.3.216'; // VPN IP as specified
const SERVER_PORT = 3001;

console.log('🔧 Zell0 Server - VPN Configuration');
console.log('=====================================');
console.log(`📡 Binding to VPN IP: ${SERVER_IP}`);
console.log(`🔌 Port: ${SERVER_PORT}`);
console.log('=====================================');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Enable CORS for development/testing
app.use(cors());

// Directory where videos are stored (root of X:\)
const VIDEO_DIR = 'X:/';

// Serve video files statically
app.use('/videos', express.static(VIDEO_DIR));

// Serve thumbnails from X: drive
const THUMBNAILS_DIR = 'X:/thumbnails';
app.use('/thumbnails', express.static(THUMBNAILS_DIR));

// Create thumbnails directory if it doesn't exist
if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    console.log(`📁 Created thumbnails directory: ${THUMBNAILS_DIR}`);
}

// Endpoint to list videos with metadata
app.get('/api/videos', (req, res) => {
    fs.readdir(VIDEO_DIR, (err, files) => {
        if (err) return res.status(500).send('Error reading video directory');
        
        // Filter for video files only
        const videoFiles = files.filter(f => /\.(mp4|mov|webm|mkv|avi)$/i.test(f));
        
        // Create video metadata array
        const videos = videoFiles.map(filename => {
            const filePath = path.join(VIDEO_DIR, filename);
            let stats;
            try {
                stats = fs.statSync(filePath);
            } catch (e) {
                stats = { size: 0, mtime: new Date() };
            }
            
            return {
                filename: filename,
                size: stats.size,
                modified: stats.mtime,
                url: `/videos/${filename}`,
                thumbnailUrl: `/thumbnails/${filename.replace(/\.[^/.]+$/, '.jpg')}`,
                duration: null // Could be extracted with ffmpeg if needed
            };
        });
        
        res.json(videos);
    });
});

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, VIDEO_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Endpoint to upload a video
app.post('/api/upload', upload.single('video'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    res.json({ filename: req.file.filename, url: `/videos/${req.file.filename}` });
});

// Configure CORS for cross-origin requests
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Socket.IO configuration for real-time communication
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Store connected users and their sockets
const connectedUsers = new Map();
const userSockets = new Map(); // username -> socketId (instead of deviceId -> socketId)

// User profiles storage (persistent user data)
const userProfiles = new Map(); // Store user profile data: username -> userProfile
const USER_PROFILES_FILE = path.join(__dirname, 'user_profiles.json');

// Chess game management
const chessGames = new Map();
const gameIdCounter = 1;

// Chess game storage on X: drive
const CHESS_GAMES_FILE = 'X:/chess_games.json';

// Helper to ensure game.spectators is always a Set
function ensureSpectatorsSet(game) {
    if (!game.spectators || typeof game.spectators.has !== 'function') {
        game.spectators = new Set(game.spectators || []);
    }
}

// Load chess games from disk
function loadChessGames() {
    try {
        if (fs.existsSync(CHESS_GAMES_FILE)) {
            const data = fs.readFileSync(CHESS_GAMES_FILE, 'utf8');
            const games = JSON.parse(data);
            for (const game of games) {
                // Convert spectators array to Set
                if (Array.isArray(game.spectators)) {
                    game.spectators = new Set(game.spectators);
                } else if (!game.spectators) {
                    game.spectators = new Set();
                }
                chessGames.set(game.id, game);
            }
            console.log(`[Chess] Loaded ${games.length} games from disk.`);
        }
    } catch (e) {
        console.error('[Chess] Failed to load games:', e);
    }
}

function saveChessGames() {
    try {
        const games = Array.from(chessGames.values());
        fs.writeFileSync(CHESS_GAMES_FILE, JSON.stringify(games, null, 2), 'utf8');
    } catch (e) {
        console.error('[Chess] Failed to save games:', e);
    }
}

// Load games on startup
loadChessGames();

// Clean up any corrupted games (where both players are the same)
function cleanupCorruptedGames() {
    let cleanedCount = 0;
    for (const [gameId, game] of chessGames.entries()) {
        if (game.whitePlayer && game.blackPlayer && game.whitePlayer === game.blackPlayer) {
            console.log(`[Chess] Cleaning up corrupted game ${gameId}: both players are ${game.whitePlayer}`);
            chessGames.delete(gameId);
            cleanedCount++;
        }
    }
    if (cleanedCount > 0) {
        saveChessGames();
        console.log(`[Chess] Cleaned up ${cleanedCount} corrupted games`);
    }
}

// Clear all existing chess games (useful for testing with username changes)
function clearAllChessGames() {
    const gameCount = chessGames.size;
    chessGames.clear();
    saveChessGames();
    console.log(`[Chess] Cleared all ${gameCount} chess games`);
}

// Clean up corrupted games on startup
cleanupCorruptedGames();

// File storage system
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const sharedFiles = new Map(); // Store file metadata

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log(`📁 Created uploads directory: ${UPLOADS_DIR}`);
}

// Function to broadcast user list to all connected clients
function broadcastUserList() {
    const userList = Array.from(connectedUsers.values()).map(user => ({
        username: user.userInfo?.username || user.deviceName || 'User',
        profilePic: user.userInfo?.profilePic || null,
        isOnline: true,
        lastSeen: Date.now()
    }));
    
    io.emit('user_list_updated', { users: userList });
    console.log(`👥 User list broadcast - ${userList.length} users`);
}

// File management functions
function saveFile(filename, fileData, uploadedBy, originalName, fileType, fileSize) {
    try {
        const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const safeFilename = fileId + '_' + filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(UPLOADS_DIR, safeFilename);
        
        // Decode base64 and save file
        const buffer = Buffer.from(fileData, 'base64');
        fs.writeFileSync(filePath, buffer);
        
        // Store file metadata
        const fileInfo = {
            id: fileId,
            originalName: originalName,
            filename: safeFilename,
            path: filePath,
            type: fileType,
            size: fileSize,
            uploadedBy: uploadedBy,
            uploadedAt: new Date().toISOString()
        };
        
        sharedFiles.set(fileId, fileInfo);
        
        console.log(`📁 File saved: ${originalName} (${fileSize} bytes) by ${uploadedBy}`);
        return fileInfo;
        
    } catch (error) {
        console.error('❌ Error saving file:', error);
        throw error;
    }
}

function getFileList() {
    return Array.from(sharedFiles.values()).map(file => ({
        id: file.id,
        name: file.originalName,
        type: file.type,
        size: file.size,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt
    }));
}

function getFile(fileId) {
    const fileInfo = sharedFiles.get(fileId);
    if (!fileInfo || !fs.existsSync(fileInfo.path)) {
        return null;
    }
    
    try {
        const fileData = fs.readFileSync(fileInfo.path);
        return {
            ...fileInfo,
            data: fileData.toString('base64')
        };
    } catch (error) {
        console.error('❌ Error reading file:', error);
        return null;
    }
}

function broadcastFileList() {
    const fileList = getFileList();
    io.emit('file_list_updated', { files: fileList });
    console.log(`📁 File list broadcast - ${fileList.length} files`);
}

// User Profile Management Functions
function loadUserProfiles() {
    try {
        if (fs.existsSync(USER_PROFILES_FILE)) {
            const data = fs.readFileSync(USER_PROFILES_FILE, 'utf8');
            const profiles = JSON.parse(data);
            
            // Load profiles into Map
            for (const [username, profile] of Object.entries(profiles)) {
                userProfiles.set(username, profile);
            }
            
            console.log(`👤 Loaded ${userProfiles.size} user profiles`);
        }
    } catch (error) {
        console.error('❌ Error loading user profiles:', error);
    }
}

function saveUserProfiles() {
    try {
        const profilesObj = {};
        for (const [username, profile] of userProfiles.entries()) {
            profilesObj[username] = profile;
        }
        
        fs.writeFileSync(USER_PROFILES_FILE, JSON.stringify(profilesObj, null, 2));
        console.log(`💾 Saved ${userProfiles.size} user profiles`);
    } catch (error) {
        console.error('❌ Error saving user profiles:', error);
    }
}

function validatePassword(username, password) {
    const profile = userProfiles.get(username);
    if (!profile) {
        return false; // User doesn't exist
    }
    return profile.password === password;
}

function createOrUpdateUserProfile(username, password, profilePic) {
    const existingProfile = userProfiles.get(username);
    
    const profile = {
        username: username,
        password: password,
        profilePic: profilePic || null,
        createdAt: existingProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    };
    
    userProfiles.set(username, profile);
    saveUserProfiles();
    
    console.log(`👤 ${existingProfile ? 'Updated' : 'Created'} profile for ${username}`);
    return profile;
}

function updateUserProfile(username, updates) {
    const profile = userProfiles.get(username);
    if (!profile) {
        console.log(`❌ Profile not found for username: ${username}`);
        return null;
    }
    
    const updatedProfile = {
        ...profile,
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    userProfiles.set(username, updatedProfile);
    saveUserProfiles();
    
    console.log(`✅ Updated profile for ${username}`);
    return updatedProfile;
}

function getUserProfile(username) {
    return userProfiles.get(username);
}

// Debug endpoint to check chess games and user info
app.get('/debug/chess', (req, res) => {
    try {
        const games = Array.from(chessGames.values());
        const users = Array.from(connectedUsers.values());
        
        res.json({
            timestamp: new Date().toISOString(),
            totalGames: games.length,
            totalUsers: users.length,
            games: games.map(game => ({
                id: game.id,
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                started: game.started,
                ended: game.ended,
                currentPlayer: game.currentPlayer,
                createdAt: game.createdAt
            })),
            users: users.map(user => ({
                socketId: user.socketId,
                deviceId: user.deviceId,
                deviceName: user.deviceName,
                username: user.userInfo?.username,
                connectedAt: user.connectedAt,
                lastSeen: user.lastSeen
            }))
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to clear all chess games
app.get('/debug/clear-chess', (req, res) => {
    try {
        const clearedCount = chessGames.size;
        chessGames.clear();
        saveChessGames();
        res.json({
            message: `Cleared ${clearedCount} chess games`,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error clearing chess games:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connectedUsers: connectedUsers.size,
        serverIP: SERVER_IP,
        serverPort: SERVER_PORT,
        message: 'Zell0 VPN Server is running on 172.94.3.216'
    });
});

// Server info endpoint
app.get('/info', (req, res) => {
    res.json({
        name: 'Zell0 Walkie-Talkie Server',
        version: '1.0.0',
        description: 'VPN-configured server for Android walkie-talkie communication',
        serverIP: SERVER_IP,
        serverPort: SERVER_PORT,
        supportedFeatures: [
            'Real-time text messaging',
            'Voice/audio messaging', 
            'Multiple device support',
            'User registration',
            'Push-to-talk functionality',
            'Chess multiplayer games'
        ],
        endpoints: {
            health: '/health',
            info: '/info',
            chess: '/chess-debug'
        },
        websocket: {
            events: ['register', 'text-message', 'voice-message', 'ping', 'disconnect', 'chess:*']
        }
    });
});

// Chess debug endpoint
app.get('/chess-debug', (req, res) => {
    const games = Array.from(chessGames.values()).map(game => ({
        id: game.id,
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        started: game.started,
        currentPlayer: game.currentPlayer,
        ended: game.ended,
        createdAt: game.createdAt,
        moveCount: game.moves ? game.moves.length : 0
    }));
    
    res.json({
        totalGames: games.length,
        activeGames: games.filter(g => !g.ended).length,
        games: games
    });
});

// Clear all chess games endpoint (for testing)
app.post('/chess-clear', (req, res) => {
    clearAllChessGames();
    res.json({
        message: 'All chess games cleared',
        timestamp: new Date().toISOString()
    });
});

// Socket.IO event handlers for real-time communication
io.on('connection', (socket) => {
    console.log(`${new Date().toISOString()} - 📱 New Android client connected: ${socket.id}`);
    
    // Handle user registration from Android app
    socket.on('register', (data) => {
        try {
            const { deviceId, deviceName, userInfo, username, profilePic, password } = data;
            
            console.log(`📋 Registration request - Device: ${deviceId}, Name: ${deviceName}`);
            
            // Check if this is a first-time user or returning user
            const existingProfile = getUserProfile(username);
            
            if (existingProfile) {
                // Existing user - allow without password validation since we removed passwords
                console.log(`🔐 Existing user returning: ${existingProfile.username} (${deviceId})`);
                
                // Update last login
                updateUserProfile(username, { lastLogin: new Date().toISOString() });
                console.log(`🔐 User authenticated: ${existingProfile.username} (${deviceId})`);
            } else {
                // New user - create profile without password requirement
                if (!username) {
                    socket.emit('error', { 
                        message: 'Username is required for new users.', 
                        type: 'missing_credentials' 
                    });
                    return;
                }
                
                // Create profile with empty password since we don't use passwords anymore
                createOrUpdateUserProfile(username, "", profilePic);
                console.log(`👤 Created new user profile: ${username} (${deviceId})`);
            }
            
            // Handle duplicate connections (same device connecting again)
            const existingSocket = userSockets.get(username);
            if (existingSocket && existingSocket !== socket.id) {
                console.log(`⚠️ Duplicate connection detected for ${username}, removing old connection`);
                connectedUsers.delete(existingSocket);
                io.to(existingSocket).emit('duplicate-connection');
            }
            
            // Get current user profile
            const currentProfile = getUserProfile(username);
            
            // Register new user connection
            const user = {
                socketId: socket.id,
                deviceId: deviceId,
                deviceName: deviceName || 'Android Device',
                userInfo: {
                    ...(userInfo || {}),
                    username: currentProfile?.username || username || userInfo?.username || deviceName || 'User',
                    profilePic: currentProfile?.profilePic || profilePic || userInfo?.profilePic || null
                },
                connectedAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            
            connectedUsers.set(socket.id, user);
            userSockets.set(username, socket.id);
            
            console.log(`✅ User registered: ${username} (${user.userInfo.username}) - Total users: ${connectedUsers.size}`);
            
            // Send registration confirmation to Android app
            socket.emit('registered', {
                success: true,
                deviceId: deviceId,
                connectedUsers: connectedUsers.size,
                serverIP: SERVER_IP,
                message: 'Successfully connected to Zell0 server',
                userProfile: {
                    username: currentProfile?.username,
                    profilePic: currentProfile?.profilePic
                }
            });
            
            // Notify other connected users
            socket.broadcast.emit('user_joined', {
                userId: username,
                timestamp: new Date().toISOString()
            });
            
            // Broadcast updated user list to all clients
            broadcastUserList();
            
        } catch (error) {
            console.error('❌ Registration error:', error);
            socket.emit('error', { message: 'Registration failed', error: error.message });
        }
    });
    
    // Handle text messages from Android devices
    socket.on('text-message', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const message = {
                id: Date.now() + Math.random(),
                text: data.message,
                senderId: userInfo.userInfo?.username || 'Unknown User',
                senderName: userInfo.userInfo?.username || 'Unknown User',
                senderProfilePic: userInfo.userInfo?.profilePic || null,
                timestamp: data.timestamp || Date.now(),
                type: 'text'
            };
            
            // Broadcast to all other clients
            socket.broadcast.emit('text_message_received', message);
            console.log(`💬 Text message from ${message.senderName}: ${message.text}`);
            
        } catch (error) {
            console.error('Error in text-message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });
    
    // Handle voice messages from Android devices
    socket.on('voice-message', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const message = {
                id: Date.now() + Math.random(),
                audioData: data.audioData,
                senderId: userInfo.userInfo?.username || 'Unknown User',
                senderName: userInfo.userInfo?.username || 'Unknown User',
                senderProfilePic: userInfo.userInfo?.profilePic || null,
                timestamp: data.timestamp || Date.now(),
                duration: data.duration || 0,
                type: 'voice'
            };
            
            // Broadcast to all other clients
            socket.broadcast.emit('voice_message_received', message);
            console.log(`🎤 Voice message from ${message.senderName} (${data.audioData.length} bytes)`);
            
        } catch (error) {
            console.error('Error in voice-message:', error);
            socket.emit('error', { message: 'Failed to send voice message' });
        }
    });
    
    // Handle live audio streaming
    socket.on('live-audio-chunk', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const chunk = {
                audioData: data.audioData,
                senderId: userInfo.userInfo?.username || 'Unknown User',
                senderName: userInfo.userInfo?.username || 'Unknown User',
                senderProfilePic: userInfo.userInfo?.profilePic || null,
                timestamp: data.timestamp || Date.now(),
                chunkSize: data.chunkSize || 0
            };
            
            // Broadcast to all other clients
            socket.broadcast.emit('live_audio_chunk_received', chunk);
            
        } catch (error) {
            console.error('Error in live-audio-chunk:', error);
        }
    });
    
    // Handle image messages from Android devices
    socket.on('image-message', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const message = {
                id: Date.now() + Math.random(),
                type: 'image',
                from: userInfo.deviceId,
                fromName: userInfo.userInfo?.username || userInfo.deviceName,
                imageData: data.imageData,
                caption: data.caption || '',
                imageSize: data.imageSize || 0,
                timestamp: new Date().toISOString(),
                profilePic: userInfo.userInfo?.profilePic || null
            };
            
            console.log(`📷 Image message from ${userInfo.deviceName} (${data.imageSize} bytes): "${data.caption}"`);
            
            // Update last seen timestamp
            userInfo.lastSeen = new Date().toISOString();
            
            // Broadcast image message to all OTHER connected devices (not sender)
            socket.broadcast.emit('image-message', message);
            
        } catch (error) {
            console.error('❌ Image message error:', error);
            socket.emit('error', { message: 'Image message sending failed' });
        }
    });
    
    // Handle file messages from Android devices
    socket.on('file-message', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const message = {
                id: Date.now() + Math.random(),
                type: 'file',
                from: userInfo.deviceId,
                fromName: userInfo.userInfo?.username || userInfo.deviceName,
                fileData: data.fileData,
                fileName: data.fileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                timestamp: new Date().toISOString(),
                profilePic: userInfo.userInfo?.profilePic || null
            };
            
            console.log(`📎 File message from ${userInfo.deviceName}: ${data.fileName} (${data.fileSize} bytes)`);
            
            // Update last seen timestamp
            userInfo.lastSeen = new Date().toISOString();
            
            // Broadcast file message to all OTHER connected devices (not sender)
            socket.broadcast.emit('file-message', message);
            
        } catch (error) {
            console.error('❌ File message error:', error);
            socket.emit('error', { message: 'File message sending failed' });
        }
    });
    
    // Handle file uploads
    socket.on('file_upload', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const { fileName, fileData, fileType, fileSize } = data;
            const uploadedBy = userInfo.userInfo?.username || 'Unknown User';
            
            const fileInfo = saveFile(fileName, fileData, uploadedBy, fileName, fileType, fileSize);
            
            if (fileInfo) {
                socket.emit('file_upload_success', {
                    fileId: fileInfo.id,
                    fileName: fileInfo.originalName
                });
                
                // Broadcast to all clients
                io.emit('file_shared', {
                    fileId: fileInfo.id,
                    fileName: fileInfo.originalName,
                    fileType: fileInfo.type,
                    fileSize: fileInfo.size,
                    uploadedBy: uploadedBy
                });
                
                broadcastFileList();
                console.log(`📁 File uploaded: ${fileName} by ${uploadedBy}`);
            } else {
                socket.emit('error', { message: 'Failed to save file' });
            }
        } catch (error) {
            console.error('Error in file_upload:', error);
            socket.emit('error', { message: 'File upload failed' });
        }
    });
    
    // Handle file download request from Android devices
    socket.on('file-download', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const { fileId } = data;
            const file = getFile(fileId);
            
            if (!file) {
                socket.emit('error', { message: 'File not found' });
                return;
            }
            
            // Send file data to requester
            socket.emit('file-download-response', {
                fileId: file.id,
                fileName: file.originalName,
                fileType: file.type,
                fileSize: file.size,
                fileData: file.data,
                uploadedBy: file.uploadedBy,
                uploadedAt: file.uploadedAt
            });
            
            console.log(`📥 File downloaded: ${file.originalName} by ${userInfo.deviceName}`);
            
        } catch (error) {
            console.error('❌ File download error:', error);
            socket.emit('error', { message: 'File download failed', error: error.message });
        }
    });
    
    // Handle request for file list
    socket.on('get-file-list', () => {
        try {
            const fileList = getFileList();
            socket.emit('file-list-response', { files: fileList });
        } catch (error) {
            console.error('❌ Get file list error:', error);
            socket.emit('error', { message: 'Failed to get file list' });
        }
    });
    
    // Handle request for user list
    socket.on('get-user-list', () => {
        try {
            console.log(`📋 User list requested by ${socket.id}`);
            broadcastUserList();
        } catch (error) {
            console.error('❌ Get user list error:', error);
            socket.emit('error', { message: 'Failed to get user list' });
        }
    });
    
    // Handle request to clear connected users list
    socket.on('clear-connected-users', () => {
        try {
            console.log(`🧹 Clearing connected users list requested by ${socket.id}`);
            
            // Clear all connected users
            const clearedCount = connectedUsers.size;
            connectedUsers.clear();
            userSockets.clear();
            
            // Broadcast empty user list to all clients
            broadcastUserList();
            
            // Send confirmation back to the requesting client
            socket.emit('connected-users-cleared', {
                message: 'Connected users list cleared successfully',
                clearedCount: clearedCount
            });
            
            console.log(`✅ Connected users list cleared. Total users: ${connectedUsers.size}`);
            
        } catch (error) {
            console.error('❌ Clear connected users error:', error);
            socket.emit('error', { message: 'Failed to clear connected users' });
        }
    });
    
    // Handle profile updates from Android app
    socket.on('profile-update', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const { username, profilePic } = data;
            const deviceId = userInfo.deviceId;
            
            // Prepare update data (no password validation needed)
            const updateData = {};
            if (username) updateData.username = username;
            if (profilePic !== undefined) updateData.profilePic = profilePic;
            
            // Update user profile
            const updatedProfile = updateUserProfile(username, updateData);
            
            if (updatedProfile) {
                // Update current session info
                userInfo.userInfo.username = updatedProfile.username;
                userInfo.userInfo.profilePic = updatedProfile.profilePic;
                
                // Send confirmation to client
                socket.emit('profile-update-success', {
                    message: 'Profile updated successfully',
                    userProfile: {
                        username: updatedProfile.username,
                        profilePic: updatedProfile.profilePic
                    }
                });
                
                // Broadcast updated user list to all clients
                broadcastUserList();
                
                console.log(`👤 Profile updated: ${updatedProfile.username} (${deviceId})`);
            } else {
                socket.emit('error', { message: 'Profile update failed' });
            }
            
        } catch (error) {
            console.error('❌ Profile update error:', error);
            socket.emit('error', { message: 'Profile update failed', error: error.message });
        }
    });
    
    // Handle ping for keepalive (maintain connection)
    socket.on('ping', () => {
        const userInfo = connectedUsers.get(socket.id);
        if (userInfo) {
            userInfo.lastSeen = new Date().toISOString();
        }
        socket.emit('pong');
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (userInfo) {
                const username = userInfo.userInfo?.username || 'Unknown User';
                console.log(`📱 User disconnected: ${username} (${socket.id})`);
                
                // Remove from connected users
                connectedUsers.delete(socket.id);
                
                // Remove from user sockets mapping
                userSockets.delete(username);
                
                // Notify other users
                socket.broadcast.emit('user_left', {
                    userId: username,
                    timestamp: new Date().toISOString()
                });
                
                // Broadcast updated user list
                broadcastUserList();
                
                console.log(`👥 Remaining users: ${connectedUsers.size}`);
            } else {
                console.log(`📱 Unknown user disconnected: ${socket.id}`);
            }
        } catch (error) {
            console.error('Error in disconnect handler:', error);
        }
    });
    
    // Handle socket errors
    socket.on('error', (error) => {
        console.error(`❌ Socket error (${socket.id}):`, error);
    });
    
    // Chess game handlers
    socket.on('chess:get_games', () => {
        try {
            const availableGames = Array.from(chessGames.values()).filter(game => 
                !game.ended && (!game.whitePlayer || !game.blackPlayer)
            );
            
            socket.emit('chess:games_list', {
                games: availableGames.map(game => ({
                    id: game.id,
                    whitePlayer: game.whitePlayer || null,
                    blackPlayer: game.blackPlayer || null,
                    started: game.started,
                    createdAt: game.createdAt
                }))
            });
            
            console.log(`[Chess Debug] Available games:`, availableGames.map(game => ({
                id: game.id,
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                started: game.started
            })));
            
            console.log(`[Chess] Sent ${availableGames.length} available games to ${socket.id}`);
        } catch (error) {
            console.error('Error in chess:get_games:', error);
        }
    });
    
    // --- CHESS LOGIC REFACTOR: USERNAME ONLY --- //
    // Helper to get username from socket with debugging
    function getUsernameFromSocket(socket) {
        const userInfo = connectedUsers.get(socket.id);
        const username = userInfo?.userInfo?.username || null;
        console.log(`[Chess Debug] Socket ${socket.id}: userInfo=`, userInfo);
        console.log(`[Chess Debug] Socket ${socket.id}: username="${username}"`);
        console.log(`[Chess Debug] Connected users map:`, Array.from(connectedUsers.entries()).map(([id, info]) => ({ id, username: info?.userInfo?.username })));
        return username;
    }

    // NEW SIMPLE CHESS SYSTEM - Direct Matchmaking
    socket.on('chess:find_game', (data) => {
        try {
            const username = getUsernameFromSocket(socket);
            if (!username) {
                console.log('[Chess] No username found for find game request');
                return;
            }
            
            console.log(`[Chess] ${username} looking for a game...`);
            
            // Check if user is already in a game
            let existingGame = null;
            for (const [gameId, game] of chessGames.entries()) {
                if ((game.whitePlayer === username || game.blackPlayer === username) && !game.ended) {
                    existingGame = game;
                    console.log(`[Chess] ${username} already in game ${gameId}`);
                    break;
                }
            }
            
            if (existingGame) {
                // User already in a game - rejoin it
                socket.join(existingGame.id);
                
                if (existingGame.started) {
                    const playerColor = existingGame.whitePlayer === username ? 'white' : 'black';
                    socket.emit('chess:game_joined', {
                        gameId: existingGame.id,
                        color: playerColor,
                        started: true,
                        isMyTurn: existingGame.currentPlayer === playerColor
                    });
                    console.log(`[Chess] ${username} rejoined active game as ${playerColor}`);
                } else {
                    socket.emit('chess:game_joined', {
                        gameId: existingGame.id,
                        color: null,
                        started: false,
                        isMyTurn: false
                    });
                    console.log(`[Chess] ${username} rejoined waiting game`);
                }
                return;
            }
            
            // Look for a game to join
            for (const [gameId, game] of chessGames.entries()) {
                if (!game.ended && !game.started && game.whitePlayer && !game.blackPlayer) {
                    // Found a game to join
                    game.blackPlayer = username;
                    game.started = true;
                    game.currentPlayer = 'white';
                    
                    // Ensure board is initialized
                    if (!game.board) {
                        game.board = initializeChessBoard();
                    }
                    if (!game.moves) {
                        game.moves = [];
                    }
                    
                    socket.join(gameId);
                    
                    // Notify both players
                    socket.emit('chess:game_joined', {
                        gameId: gameId,
                        color: 'black',
                        started: true,
                        isMyTurn: false
                    });
                    
                    // Find and notify the white player
                    for (const [socketId, userInfo] of connectedUsers.entries()) {
                        if (userInfo?.userInfo?.username === game.whitePlayer) {
                            const whitePlayerSocket = io.sockets.sockets.get(socketId);
                            if (whitePlayerSocket) {
                                whitePlayerSocket.emit('chess:game_joined', {
                                    gameId: gameId,
                                    color: 'white',
                                    started: true,
                                    isMyTurn: true
                                });
                            }
                            break;
                        }
                    }
                    
                    // Broadcast game started to room
                    io.to(gameId).emit('chess:game_started', {
                        whitePlayer: game.whitePlayer,
                        blackPlayer: game.blackPlayer,
                        currentPlayer: 'white'
                    });
                    
                    console.log(`[Chess] ${username} joined ${game.whitePlayer}'s game. Game started!`);
                    saveChessGames();
                    return;
                }
            }
            
            // No game to join, create new one
            const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const game = {
                id: gameId,
                whitePlayer: username,
                blackPlayer: null,
                started: false,
                ended: false,
                currentPlayer: 'white',
                board: initializeChessBoard(),
                moves: [],
                createdAt: new Date().toISOString()
            };
            
            chessGames.set(gameId, game);
            socket.join(gameId);
            
            socket.emit('chess:game_joined', {
                gameId: gameId,
                color: null,
                started: false,
                isMyTurn: false
            });
            
            console.log(`[Chess] ${username} created new game ${gameId}, waiting for opponent`);
            saveChessGames();
            
        } catch (error) {
            console.error('Error in chess:find_game:', error);
        }
    });

    socket.on('chess:join_game', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const username = getUsernameFromSocket(socket);
            
            console.log(`[Chess] Join game request: username="${username}" wants to join game ${gameId}`);
            
            if (!username) {
                console.log(`[Chess] ERROR: No username found for socket ${socket.id}`);
                socket.emit('error', { message: 'Username required to join game' });
                return;
            }
            
            if (!game) {
                console.log(`[Chess] ERROR: Game ${gameId} not found`);
                socket.emit('error', { message: 'Game not found' });
                return;
            }
            
            if (game.ended) {
                console.log(`[Chess] ERROR: Game ${gameId} has ended`);
                socket.emit('error', { message: 'Game has ended' });
                return;
            }
            
            console.log(`[Chess Debug] Game ${gameId} state: white="${game.whitePlayer}", black="${game.blackPlayer}", started=${game.started}, waitingForDiceRoll=${game.waitingForDiceRoll}`);
            
            // Already a player?
            if (game.whitePlayer === username || game.blackPlayer === username) {
                const existingColor = game.whitePlayer === username ? 'white' : 'black';
                console.log(`[Chess] User ${username} already in game as ${existingColor}`);
                socket.join(gameId);
                socket.emit('chess:game_joined', {
                    gameId,
                    color: existingColor,
                    started: game.started,
                    waitingForDiceRoll: game.waitingForDiceRoll || false
                });
                return;
            }
            
            // Game full? Spectator
            if (game.whitePlayer && game.blackPlayer) {
                console.log(`[Chess] Game ${gameId} is full, ${username} joining as spectator`);
                ensureSpectatorsSet(game);
                game.spectators.add(socket.id);
                socket.join(gameId);
                socket.emit('chess:game_joined', {
                    gameId,
                    color: 'spectator',
                    started: game.started,
                    waitingForDiceRoll: false
                });
                return;
            }
            
            // Join as available player
            if (!game.whitePlayer) {
                game.whitePlayer = username;
                console.log(`[Chess] ${username} assigned as WHITE player in game ${gameId}`);
            } else if (!game.blackPlayer) {
                game.blackPlayer = username;
                console.log(`[Chess] ${username} assigned as BLACK player in game ${gameId}`);
            }
            
            console.log(`[Chess Debug] After assignment - White: "${game.whitePlayer}", Black: "${game.blackPlayer}"`);
            
            // If both players are present, start the game immediately
            if (game.whitePlayer && game.blackPlayer) {
                console.log(`[Chess] Both players present in game ${gameId}, starting game immediately`);
                console.log(`[Chess] Players: White="${game.whitePlayer}", Black="${game.blackPlayer}"`);
                
                // Start the game
                game.started = true;
                game.currentPlayer = 'white';
                game.waitingForDiceRoll = false;
                
                console.log(`[Chess] Game started! White: "${game.whitePlayer}", Black: "${game.blackPlayer}"`);
                
                // Join the game room first
                socket.join(gameId);
                
                // Make sure both players are in the room before emitting game start
                // Find the first player's socket and join them to the room
                for (const [socketId, userInfo] of connectedUsers.entries()) {
                    if (userInfo?.userInfo?.username === game.whitePlayer) {
                        const firstPlayerSocket = io.sockets.sockets.get(socketId);
                        if (firstPlayerSocket) {
                            firstPlayerSocket.join(gameId);
                            console.log(`[Chess] Added first player ${game.whitePlayer} to game room ${gameId}`);
                        }
                        break;
                    }
                }
                
                // Notify all players that game has started
                io.to(gameId).emit('chess:game_started', {
                    whitePlayer: game.whitePlayer,
                    blackPlayer: game.blackPlayer,
                    currentPlayer: 'white'
                });
                
                console.log(`[Chess] Emitted game_started to room ${gameId}`);
                saveChessGames();
            } else {
                // Still waiting for second player
                socket.join(gameId);
                socket.emit('chess:game_joined', {
                    gameId,
                    color: null, // Color will be assigned when game starts
                    started: false,
                    waitingForDiceRoll: false
                });
                console.log(`[Chess] Still waiting for second player. White="${game.whitePlayer}", Black="${game.blackPlayer}"`);
            }
            
            saveChessGames();
            console.log(`[Chess] Final game state: ${gameId} - White: "${game.whitePlayer}", Black: "${game.blackPlayer}", Started: ${game.started}`);
            
        } catch (error) {
            console.error('[Chess] Error in join_game:', error);
            socket.emit('error', { message: 'Failed to join game' });
        }
    });


    
    socket.on('chess:make_move', (data) => {
        try {
            const { gameId, from, to } = data;
            const game = chessGames.get(gameId);
            const username = getUsernameFromSocket(socket);
            
            console.log(`[Chess] Move request: username="${username}" wants to move ${from} to ${to} in game ${gameId}`);
            
            if (!username) {
                console.log(`[Chess] ERROR: No username found for socket ${socket.id}`);
                socket.emit('error', { message: 'Username required to make moves' });
                return;
            }
            
            if (!game) {
                console.log(`[Chess] ERROR: Game ${gameId} not found`);
                socket.emit('error', { message: 'Game not found' });
                return;
            }
            
            if (!game.started) {
                console.log(`[Chess] ERROR: Game ${gameId} not started`);
                socket.emit('error', { message: 'Game not started' });
                return;
            }
            
            console.log(`[Chess Debug] Game ${gameId} state: white="${game.whitePlayer}", black="${game.blackPlayer}", currentPlayer="${game.currentPlayer}"`);
            
            const playerColor = game.whitePlayer === username ? 'white' : game.blackPlayer === username ? 'black' : null;
            console.log(`[Chess Debug] User ${username} identified as ${playerColor} player`);
            
            if (playerColor !== game.currentPlayer) {
                console.log(`[Chess] ERROR: Not ${username}'s turn. Current player: ${game.currentPlayer}, User is: ${playerColor}`);
                socket.emit('error', { message: 'Not your turn' });
                return;
            }
            
            if (isValidMove(game.board, from, to, playerColor)) {
                const piece = game.board[from];
                const isCapture = game.board[to] !== null;
                const capturedPiece = game.board[to];
                
                // Check if this is a king capture
                const isKingCapture = capturedPiece === 'K' || capturedPiece === 'k';
                
                game.board[to] = piece;
                game.board[from] = null;
                
                // Save move with username
                game.moves.push({
                    from,
                    to,
                    piece,
                    color: playerColor,
                    username,
                    isCapture,
                    timestamp: new Date().toISOString()
                });
                
                game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
                console.log(`[Chess] Move made: ${from} to ${to} by ${playerColor} (${username}). Next player: ${game.currentPlayer}`);
                console.log(`[Chess Debug] Game ${gameId} turn state: white="${game.whitePlayer}", black="${game.blackPlayer}", currentPlayer="${game.currentPlayer}"`);
                
                // Check for check, checkmate, and king capture
                const isCheck = isInCheck(game.board, game.currentPlayer);
                const isCheckmate = isCheck && isCheckmate(game.board, game.currentPlayer);
                
                io.to(gameId).emit('chess:move_made', {
                    from,
                    to,
                    piece,
                    color: playerColor,
                    capture: isCapture,
                    playerName: username,
                    isCheck: isCheck,
                    isCheckmate: isCheckmate,
                    isKingCapture: isKingCapture,
                    currentPlayer: game.currentPlayer
                });
                
                if (isKingCapture) {
                    io.to(gameId).emit('chess:game_over', {
                        winner: playerColor,
                        reason: 'King captured'
                    });
                    game.ended = true;
                } else if (isCheckmate) {
                    io.to(gameId).emit('chess:game_over', {
                        winner: playerColor,
                        reason: 'Checkmate'
                    });
                    game.ended = true;
                } else if (isStalemate(game.board, game.currentPlayer)) {
                    io.to(gameId).emit('chess:game_over', {
                        winner: null,
                        reason: 'Stalemate'
                    });
                    game.ended = true;
                }
                
                saveChessGames();
            } else {
                console.log(`[Chess] ERROR: Invalid move ${from} to ${to} by ${playerColor} (${username})`);
                socket.emit('error', { message: 'Invalid move' });
            }
        } catch (error) {
            console.error('[Chess] Error in make_move:', error);
            socket.emit('error', { message: 'Failed to make move' });
        }
    });
    
    socket.on('chess:leave_game', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const username = getUsernameFromSocket(socket);
            
            if (!game) {
                console.log(`[Chess] Game ${gameId} not found for leave request`);
                return;
            }
            
            console.log(`[Chess] ${username} leaving game ${gameId}`);
            
            socket.leave(gameId);
            if (game.spectators) {
                game.spectators.delete(socket.id);
            }
            
            // If this was a player (not just a spectator), handle player removal
            if (username && (game.whitePlayer === username || game.blackPlayer === username)) {
                if (game.whitePlayer === username) {
                    game.whitePlayer = null;
                    console.log(`[Chess] Removed ${username} as white player`);
                } else if (game.blackPlayer === username) {
                    game.blackPlayer = null;
                    console.log(`[Chess] Removed ${username} as black player`);
                }
                
                // Reset game state if a player left
                if (!game.whitePlayer || !game.blackPlayer) {
                    game.started = false;
                    game.currentPlayer = 'white';
                    console.log(`[Chess] Game ${gameId} reset to waiting state`);
                    
                    // Notify remaining players
                    io.to(gameId).emit('chess:game_reset', {
                        message: 'Game reset - waiting for players'
                    });
                }
            }
            
            // If no players left, end the game
            if (!game.whitePlayer && !game.blackPlayer && (!game.spectators || game.spectators.size === 0)) {
                console.log(`[Chess] No players left in game ${gameId}, ending game`);
                game.ended = true;
                chessGames.delete(gameId);
            }
            
            saveChessGames();
            
        } catch (error) {
            console.error('Error in chess:leave_game:', error);
        }
    });
    
    socket.on('chess:resign_game', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const username = getUsernameFromSocket(socket);
            
            if (!username) {
                socket.emit('error', { message: 'Username required to resign game' });
                return;
            }
            
            if (game && (game.whitePlayer === username || game.blackPlayer === username)) {
                const resignedPlayer = game.whitePlayer === username ? 'white' : 'black';
                const winner = resignedPlayer === 'white' ? 'black' : 'white';
                
                io.to(gameId).emit('chess:player_resigned', {
                    player: resignedPlayer
                });
                io.to(gameId).emit('chess:game_over', {
                    winner: winner,
                    reason: 'Resignation'
                });
                
                chessGames.delete(gameId);
                saveChessGames(); // Save after resigning
                console.log(`[Chess] ${username} resigned game ${gameId}`);
            }
        } catch (error) {
            console.error('Error in chess:resign_game:', error);
        }
    });
    
    socket.on('chess:save_game', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const username = getUsernameFromSocket(socket);
            
            if (!username) {
                socket.emit('error', { message: 'Username required to save game' });
                return;
            }
            
            if (game && (game.whitePlayer === username || game.blackPlayer === username)) {
                // Mark game as saved
                game.saved = true;
                game.savedBy = username;
                game.savedAt = new Date().toISOString();
                
                saveChessGames();
                
                io.to(gameId).emit('chess:game_saved', {
                    savedBy: username,
                    message: 'Game saved successfully'
                });
                
                console.log(`[Chess] Game ${gameId} saved by ${username}`);
            }
        } catch (error) {
            console.error('Error in chess:save_game:', error);
        }
    });
    
    socket.on('chess:sync_turn_state', (data) => {
        try {
            const { gameId, playerName, expectedTurn, playerColor } = data;
            const game = chessGames.get(gameId);
            
            if (!game) {
                socket.emit('chess:error', { message: 'Game not found' });
                return;
            }
            
            console.log(`[Chess Debug] Turn state sync request from ${playerName}`);
            console.log(`[Chess Debug] Client expects: isMyTurn=${expectedTurn}, playerColor=${playerColor}`);
            console.log(`[Chess Debug] Server state: currentPlayer=${game.currentPlayer}, whitePlayer=${game.whitePlayer}, blackPlayer=${game.blackPlayer}`);
            
            // Determine if it's actually this player's turn
            const isActuallyMyTurn = game.currentPlayer === playerColor;
            
            console.log(`[Chess Debug] Server determines: isMyTurn=${isActuallyMyTurn}`);
            
            // Send the correct turn state back to the client
            socket.emit('chess:turn_state_sync', {
                isMyTurn: isActuallyMyTurn,
                currentPlayer: game.currentPlayer,
                playerColor: playerColor
            });
            
            console.log(`[Chess Debug] Sent turn state sync response to ${playerName}`);
            
        } catch (error) {
            console.error('Error in chess:sync_turn_state:', error);
            socket.emit('chess:error', { message: 'Error syncing turn state' });
        }
    });

    socket.on('chess:offer_draw', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const username = getUsernameFromSocket(socket);
            
            if (!username) {
                socket.emit('error', { message: 'Username required to offer draw' });
                return;
            }
            
            if (game && (game.whitePlayer === username || game.blackPlayer === username)) {
                const offeringPlayer = game.whitePlayer === username ? 'white' : 'black';
                io.to(gameId).emit('chess:draw_offered', {
                    player: offeringPlayer
                });
                console.log(`[Chess] ${username} offered draw in game ${gameId}`);
            }
        } catch (error) {
            console.error('Error in chess:offer_draw:', error);
        }
    });
    
    socket.on('chess:respond_draw', (data) => {
        try {
            const { gameId, accepted } = data;
            const game = chessGames.get(gameId);
            
            if (game) {
                if (accepted) {
                    io.to(gameId).emit('chess:draw_accepted');
                    io.to(gameId).emit('chess:game_over', {
                        winner: null,
                        reason: 'Draw by agreement'
                    });
                    chessGames.delete(gameId);
                } else {
                    io.to(gameId).emit('chess:draw_declined');
                }
                saveChessGames(); // Save after responding to draw
            }
        } catch (error) {
            console.error('Error in chess:respond_draw:', error);
        }
    });
});

// Load user profiles on server start
loadUserProfiles();

// Start the server on the VPN IP
server.listen(SERVER_PORT, SERVER_IP, () => {
    console.log('='.repeat(60));
    console.log('🚀 Zell0 Walkie-Talkie Server Started Successfully!');
    console.log('='.repeat(60));
    console.log(`📡 Server IP: ${SERVER_IP} (VPN)`);
    console.log(`🔌 Port: ${SERVER_PORT}`);
    console.log(`🌐 Health Check: http://${SERVER_IP}:${SERVER_PORT}/health`);
    console.log(`📊 Server Info: http://${SERVER_IP}:${SERVER_PORT}/info`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));
    console.log('✅ Ready for Android walkie-talkie connections!');
    console.log('📱 Android devices can now connect for audio & text');
    console.log('🎤 Push-to-talk functionality enabled');
    console.log('💬 Text messaging enabled');
    console.log('📷 Image sharing enabled');
    console.log('📁 File sharing enabled');
    console.log('📂 Upload folder: ' + UPLOADS_DIR);
    console.log('🛑 Press Ctrl+C to stop the server');
    console.log('='.repeat(60));
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Zell0 server...');
    
    // Notify all connected clients
    io.emit('server-shutdown', {
        message: 'Server is shutting down',
        timestamp: new Date().toISOString()
    });
    
    server.close(() => {
        console.log('✅ Zell0 server stopped gracefully');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Periodic cleanup of stale connections (every minute)
setInterval(() => {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [socketId, userInfo] of connectedUsers.entries()) {
        const lastSeen = new Date(userInfo.lastSeen);
        if (now - lastSeen > staleThreshold) {
            console.log(`🧹 Cleaning up stale connection: ${userInfo.deviceName}`);
            connectedUsers.delete(socketId);
            userSockets.delete(userInfo.deviceId);
        }
    }
}, 60000);

// Chess game helper functions
function initializeChessBoard() {
    const board = {};
    
    // Initialize pawns
    for (let col = 0; col < 8; col++) {
        const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
        board[`${colChar}2`] = 'P'; // White pawns
        board[`${colChar}7`] = 'p'; // Black pawns
    }
    
    // Initialize other pieces
    const whitePieces = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    const blackPieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    
    for (let col = 0; col < 8; col++) {
        const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
        board[`${colChar}1`] = whitePieces[col];
        board[`${colChar}8`] = blackPieces[col];
    }
    
    return board;
}

function isValidMove(board, from, to, color) {
    console.log(`[Chess Debug] Validating move: ${from} to ${to} by ${color}`);
    
    const piece = board[from];
    if (!piece) {
        console.log(`[Chess Debug] No piece at ${from}`);
        return false;
    }
    
    console.log(`[Chess Debug] Piece at ${from}: ${piece}`);
    
    // Check if piece belongs to the player
    const isWhitePiece = piece === piece.toUpperCase();
    if ((color === 'white' && !isWhitePiece) || (color === 'black' && isWhitePiece)) {
        console.log(`[Chess Debug] Piece ${piece} doesn't belong to ${color} player`);
        return false;
    }
    
    // Check if destination is not occupied by own piece
    const targetPiece = board[to];
    if (targetPiece) {
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();
        if ((color === 'white' && isTargetWhite) || (color === 'black' && !isTargetWhite)) {
            console.log(`[Chess Debug] Destination ${to} occupied by own piece ${targetPiece}`);
            return false;
        }
    }
    
    // Basic move validation
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const pieceType = piece.toLowerCase();
    console.log(`[Chess Debug] Piece type: ${pieceType}, from: (${fromRow},${fromCol}), to: (${toRow},${toCol})`);
    
    let isValid = false;
    switch (pieceType) {
        case 'p': // Pawn
            isValid = isValidPawnMove(board, from, to, color);
            break;
        case 'r': // Rook
            isValid = isValidRookMove(board, from, to);
            break;
        case 'n': // Knight
            isValid = isValidKnightMove(from, to);
            break;
        case 'b': // Bishop
            isValid = isValidBishopMove(board, from, to);
            break;
        case 'q': // Queen
            isValid = isValidQueenMove(board, from, to);
            break;
        case 'k': // King
            isValid = isValidKingMove(from, to);
            break;
        default:
            console.log(`[Chess Debug] Unknown piece type: ${pieceType}`);
            return false;
    }
    
    console.log(`[Chess Debug] Move validation result: ${isValid}`);
    return isValid;
}

function isValidPawnMove(board, from, to, color) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    console.log(`[Chess Debug] Pawn move: ${from}(${fromRow},${fromCol}) to ${to}(${toRow},${toCol}), color: ${color}, direction: ${direction}, startRow: ${startRow}`);
    
    // Forward move (no capture)
    if (fromCol === toCol && !board[to]) {
        if (toRow === fromRow + direction) {
            console.log(`[Chess Debug] Valid single pawn move`);
            return true;
        }
        // Double move from starting position
        if (fromRow === startRow && toRow === fromRow + 2 * direction) {
            const intermediateSquare = `${from[0]}${8 - (fromRow + direction)}`;
            const isIntermediateClear = !board[intermediateSquare];
            console.log(`[Chess Debug] Double pawn move check: intermediate square ${intermediateSquare} clear: ${isIntermediateClear}`);
            return isIntermediateClear;
        }
    }
    
    // Capture (diagonal move with opponent piece)
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
        const targetPiece = board[to];
        if (targetPiece) {
            const isTargetWhite = targetPiece === targetPiece.toUpperCase();
            const isValidCapture = (color === 'white' && !isTargetWhite) || (color === 'black' && isTargetWhite);
            console.log(`[Chess Debug] Pawn capture: target piece ${targetPiece}, isTargetWhite: ${isTargetWhite}, isValidCapture: ${isValidCapture}`);
            return isValidCapture;
        } else {
            console.log(`[Chess Debug] Pawn diagonal move but no target piece`);
        }
    }
    
    console.log(`[Chess Debug] Invalid pawn move`);
    return false;
}

function isValidRookMove(board, from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    if (fromCol !== toCol && fromRow !== toRow) return false;
    
    // Check if path is clear
    if (fromCol === toCol) {
        const start = Math.min(fromRow, toRow);
        const end = Math.max(fromRow, toRow);
        for (let row = start + 1; row < end; row++) {
            const square = `${String.fromCharCode('a'.charCodeAt(0) + fromCol)}${8 - row}`;
            if (board[square]) return false;
        }
    } else {
        const start = Math.min(fromCol, toCol);
        const end = Math.max(fromCol, toCol);
        for (let col = start + 1; col < end; col++) {
            const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - fromRow}`;
            if (board[square]) return false;
        }
    }
    
    return true;
}

function isValidKnightMove(from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const colDiff = Math.abs(fromCol - toCol);
    const rowDiff = Math.abs(fromRow - toRow);
    
    return (colDiff === 2 && rowDiff === 1) || (colDiff === 1 && rowDiff === 2);
}

function isValidBishopMove(board, from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    if (Math.abs(fromCol - toCol) !== Math.abs(fromRow - toRow)) return false;
    
    // Check if path is clear
    const colStep = fromCol < toCol ? 1 : -1;
    const rowStep = fromRow < toRow ? 1 : -1;
    
    let col = fromCol + colStep;
    let row = fromRow + rowStep;
    
    while (col !== toCol && row !== toRow) {
        const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}`;
        if (board[square]) return false;
        col += colStep;
        row += rowStep;
    }
    
    return true;
}

function isValidQueenMove(board, from, to) {
    return isValidRookMove(board, from, to) || isValidBishopMove(board, from, to);
}

function isValidKingMove(from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const colDiff = Math.abs(fromCol - toCol);
    const rowDiff = Math.abs(fromRow - toRow);
    
    return colDiff <= 1 && rowDiff <= 1;
}

function isInCheck(board, color) {
    // Find the king
    const kingPiece = color === 'white' ? 'K' : 'k';
    let kingPosition = null;
    
    for (let square in board) {
        if (board[square] === kingPiece) {
            kingPosition = square;
            break;
        }
    }
    
    if (!kingPosition) return false;
    
    // Check if any opponent piece can capture the king
    const opponentColor = color === 'white' ? 'black' : 'white';
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === opponentColor) {
            if (isValidMove(board, square, kingPosition, opponentColor)) {
                return true;
            }
        }
    }
    
    return false;
}

function getPieceColor(piece) {
    return piece === piece.toUpperCase() ? 'white' : 'black';
}

function hasValidMoves(board, color) {
    // Check if any piece of the given color has valid moves
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === color) {
            for (let targetSquare in board) {
                // Skip if same square
                if (square === targetSquare) continue;
                
                // Check if this move would be valid
                if (isValidMove(board, square, targetSquare, color)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isCheckmate(board, color) {
    // Only detect checkmate if king is in check and has no legal moves
    if (!isInCheck(board, color)) {
        return false;
    }
    
    // Check if any move can get out of check
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === color) {
            for (let targetSquare in board) {
                if (square === targetSquare) continue;
                
                if (isValidMove(board, square, targetSquare, color)) {
                    // Make a temporary move to check if it gets out of check
                    const tempBoard = JSON.parse(JSON.stringify(board));
                    const pieceToMove = tempBoard[square];
                    tempBoard[targetSquare] = pieceToMove;
                    tempBoard[square] = null;
                    
                    // If this move gets us out of check, it's not checkmate
                    if (!isInCheck(tempBoard, color)) {
                        return false;
                    }
                }
            }
        }
    }
    
    return true;
}

function isStalemate(board, color) {
    // Only detect stalemate in very specific situations
    // For now, return false to avoid false positives
    // In a real implementation, this would be more sophisticated
    return false;
} 