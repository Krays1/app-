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

// ========================================
// 🎮 DOOM GAME SYSTEM
// ========================================

// Doom game state
const doomGameState = {
    players: new Map(),
    bullets: new Map(),
    gameState: 'LOBBY', // LOBBY, PLAYING, GAME_OVER
    gameWidth: 800,
    gameHeight: 600,
    playerSize: 30,
    bulletSpeed: 15,
    playerSpeed: 5,
    respawnTime: 3000
};

// Doom game functions
function createDoomPlayer(id, username) {
    return {
        id: id,
        username: username,
        x: Math.random() * (doomGameState.gameWidth - 100) + 50,
        y: Math.random() * (doomGameState.gameHeight - 100) + 50,
        angle: Math.random() * Math.PI * 2,
        health: 100,
        state: 'ALIVE',
        score: 0,
        kills: 0,
        deaths: 0,
        lastShot: 0,
        respawnTime: 0
    };
}

function spawnPlayer(playerId) {
    const player = doomGameState.players.get(playerId);
    if (player) {
        player.x = Math.random() * (doomGameState.gameWidth - 100) + 50;
        player.y = Math.random() * (doomGameState.gameHeight - 100) + 50;
        player.health = 100;
        player.state = 'ALIVE';
        player.respawnTime = 0;
    }
}

function checkBulletCollisions() {
    const bulletsToRemove = [];
    
    doomGameState.bullets.forEach((bullet, bulletId) => {
        // Check bullet bounds
        if (bullet.x < 0 || bullet.x > doomGameState.gameWidth || 
            bullet.y < 0 || bullet.y > doomGameState.gameHeight) {
            bulletsToRemove.push(bulletId);
            return;
        }
        
        // Check player collisions
        doomGameState.players.forEach((player, playerId) => {
            if (player.state === 'ALIVE' && playerId !== bullet.shooterId) {
                const dx = bullet.x - player.x;
                const dy = bullet.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < doomGameState.playerSize) {
                    // Player hit!
                    player.health -= bullet.damage;
                    
                    if (player.health <= 0) {
                        player.state = 'DEAD';
                        player.deaths++;
                        player.respawnTime = Date.now() + doomGameState.respawnTime;
                        
                        // Award kill to shooter
                        const shooter = doomGameState.players.get(bullet.shooterId);
                        if (shooter) {
                            shooter.kills++;
                            shooter.score += 10;
                        }
                        
                        // Broadcast player hit
                        io.emit('doom-player-hit', {
                            targetId: playerId,
                            shooterId: bullet.shooterId,
                            damage: bullet.damage,
                            newHealth: player.health
                        });
                    } else {
                        // Broadcast player hit
                        io.emit('doom-player-hit', {
                            targetId: playerId,
                            shooterId: bullet.shooterId,
                            damage: bullet.damage,
                            newHealth: player.health
                        });
                    }
                    
                    bulletsToRemove.push(bulletId);
                }
            }
        });
    });
    
    // Remove hit bullets
    bulletsToRemove.forEach(bulletId => {
        doomGameState.bullets.delete(bulletId);
    });
}

function updateDoomGame() {
    // Update bullets
    doomGameState.bullets.forEach((bullet, bulletId) => {
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;
    });
    
    // Check collisions
    checkBulletCollisions();
    
    // Check respawns
    doomGameState.players.forEach((player, playerId) => {
        if (player.state === 'DEAD' && Date.now() > player.respawnTime) {
            spawnPlayer(playerId);
        }
    });
}

// Doom game game loop
setInterval(updateDoomGame, 1000 / 60); // 60 FPS

// ========================================
// 🎮 CHESS GAME SYSTEM
// ========================================

// Chess stats and history API endpoints
app.get('/api/chess/stats', (req, res) => {
    try {
        // 🔧 FORCE REFRESH STATS TO INCLUDE PLAYER NAMES
        chessSaveSystem.saveStats();
        
        const stats = chessSaveSystem.getStats();
        
        res.json({
            overall: stats.overall,
            topPlayers: stats.topPlayers,
            recentGames: stats.recentGames
        });
    } catch (error) {
        console.error('Error getting chess stats:', error);
        res.status(500).json({ error: 'Failed to get chess stats' });
    }
});

// 🔧 MANUAL REFRESH ENDPOINT
app.post('/api/chess/refresh-stats', (req, res) => {
    try {
        console.log('🔄 Manual chess stats refresh requested');
        
        // Force reload all data
        chessSaveSystem.loadStats();
        chessSaveSystem.loadGames();
        chessSaveSystem.loadUnfinishedGames();
        
        // Regenerate stats
        chessSaveSystem.saveStats();
        
        const stats = chessSaveSystem.getStats();
        
        res.json({
            success: true,
            message: 'Chess stats refreshed successfully',
            stats: {
                overall: stats.overall,
                topPlayers: stats.topPlayers,
                recentGames: stats.recentGames
            }
        });
    } catch (error) {
        console.error('Error refreshing chess stats:', error);
        res.status(500).json({ error: 'Failed to refresh chess stats' });
    }
});

app.get('/api/chess/player/:username', (req, res) => {
    try {
        const { username } = req.params;
        const playerStats = chessSaveSystem.getPlayerStats(username);
        const gameHistory = chessSaveSystem.getPlayerGameHistory(username);
        
        res.json({
            player: playerStats,
            history: gameHistory
        });
    } catch (error) {
        console.error('Error getting player stats:', error);
        res.status(500).json({ error: 'Failed to get player stats' });
    }
});

// NEW: Get unfinished games for a player
app.get('/api/chess/unfinished/:username', (req, res) => {
    try {
        const { username } = req.params;
        const unfinishedGames = chessSaveSystem.getUnfinishedGamesForPlayer(username);
        
        res.json({
            username: username,
            unfinishedGames: unfinishedGames.map(game => ({
                gameId: game.gameId,
                opponent: game.whitePlayer === username ? game.blackPlayer : game.whitePlayer,
                playerColor: game.whitePlayer === username ? 'white' : 'black',
                lastUpdated: game.lastUpdated,
                moveCount: game.moves ? game.moves.length : 0,
                startTime: game.startTime
            }))
        });
    } catch (error) {
        console.error('Error getting unfinished games:', error);
        res.status(500).json({ error: 'Failed to get unfinished games' });
    }
});

// NEW: Get all unfinished games (admin endpoint)
app.get('/api/chess/unfinished', (req, res) => {
    try {
        const unfinishedGames = chessSaveSystem.getUnfinishedGames();
        
        res.json({
            totalUnfinished: Object.keys(unfinishedGames).length,
            games: Object.entries(unfinishedGames).map(([gameId, game]) => ({
                gameId: gameId,
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                lastUpdated: game.lastUpdated,
                moveCount: game.moves ? game.moves.length : 0,
                startTime: game.startTime
            }))
        });
    } catch (error) {
        console.error('Error getting all unfinished games:', error);
        res.status(500).json({ error: 'Failed to get unfinished games' });
    }
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

// Chess save system
const ChessSaveSystem = require('./chess-save-system');
const chessSaveSystem = new ChessSaveSystem();

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

// ========================================
// 🐍 SNAKE LEADERBOARD SYSTEM
// ========================================

// Snake leaderboard
const SNAKE_LEADERBOARD_FILE = path.join(__dirname, 'snake-leaderboard.json');
let snakeLeaderboard = [];

function loadSnakeLeaderboard() {
    try {
        if (fs.existsSync(SNAKE_LEADERBOARD_FILE)) {
            const data = fs.readFileSync(SNAKE_LEADERBOARD_FILE, 'utf8');
            snakeLeaderboard = JSON.parse(data);
            console.log(`[Snake] Loaded ${snakeLeaderboard.length} scores from disk.`);
        }
    } catch (e) {
        console.error('[Snake] Failed to load leaderboard:', e);
    }
}

function saveSnakeLeaderboard() {
    try {
        fs.writeFileSync(SNAKE_LEADERBOARD_FILE, JSON.stringify(snakeLeaderboard, null, 2), 'utf8');
    } catch (e) {
        console.error('[Snake] Failed to save leaderboard:', e);
    }
}

// Load leaderboard on startup
loadSnakeLeaderboard();

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
    
    // ========================================
    // 🎮 DOOM GAME EVENTS
    // ========================================
    
    socket.on('doom-join-game', (data) => {
        const username = data.username || 'Player';
        const playerId = socket.id;
        
        // Create new player
        const player = createDoomPlayer(playerId, username);
        doomGameState.players.set(playerId, player);
        
        // Set game state to playing if not already
        if (doomGameState.gameState === 'LOBBY') {
            doomGameState.gameState = 'PLAYING';
        }
        
        // Send player joined confirmation
        socket.emit('doom-game-joined', {
            playerId: playerId,
            player: player
        });
        
        // Broadcast to other players
        socket.broadcast.emit('doom-player-joined', {
            playerId: playerId,
            player: player
        });
        
        // Send current game state to new player
        socket.emit('doom-game-state', {
            state: doomGameState.gameState,
            players: Array.from(doomGameState.players.values()),
            bullets: Array.from(doomGameState.bullets.values())
        });
        
        console.log(`🎮 Doom: ${username} joined the game`);
    });
    
    socket.on('doom-leave-game', () => {
        const playerId = socket.id;
        const player = doomGameState.players.get(playerId);
        
        if (player) {
            doomGameState.players.delete(playerId);
            
            // Remove player's bullets
            doomGameState.bullets.forEach((bullet, bulletId) => {
                if (bullet.shooterId === playerId) {
                    doomGameState.bullets.delete(bulletId);
                }
            });
            
            // Broadcast player left
            socket.broadcast.emit('doom-player-left', playerId);
            
            console.log(`🎮 Doom: ${player.username} left the game`);
            
            // Check if game should end
            if (doomGameState.players.size === 0) {
                doomGameState.gameState = 'LOBBY';
            }
        }
    });
    
    socket.on('doom-player-move', (data) => {
        const playerId = socket.id;
        const player = doomGameState.players.get(playerId);
        
        if (player && player.state === 'ALIVE') {
            player.x = Math.max(doomGameState.playerSize, 
                               Math.min(doomGameState.gameWidth - doomGameState.playerSize, data.x));
            player.y = Math.max(doomGameState.playerSize, 
                               Math.min(doomGameState.gameHeight - doomGameState.playerSize, data.y));
            
            // Broadcast movement to other players
            socket.broadcast.emit('doom-player-update', {
                playerId: playerId,
                player: player
            });
        }
    });
    
    socket.on('doom-player-aim', (data) => {
        const playerId = socket.id;
        const player = doomGameState.players.get(playerId);
        
        if (player && player.state === 'ALIVE') {
            player.angle = data.angle;
            
            // Broadcast aim to other players
            socket.broadcast.emit('doom-player-update', {
                playerId: playerId,
                player: player
            });
        }
    });
    
    socket.on('doom-fire-bullet', (data) => {
        const playerId = socket.id;
        const player = doomGameState.players.get(playerId);
        
        if (player && player.state === 'ALIVE') {
            // Check fire rate (500ms cooldown)
            if (Date.now() - player.lastShot > 500) {
                player.lastShot = Date.now();
                
                const bullet = {
                    id: data.bulletId,
                    shooterId: playerId,
                    x: data.x,
                    y: data.y,
                    angle: data.angle,
                    speed: doomGameState.bulletSpeed,
                    damage: 25
                };
                
                doomGameState.bullets.set(bullet.id, bullet);
                
                // Broadcast bullet to all players
                io.emit('doom-bullet-fired', {
                    bulletId: bullet.id,
                    shooterId: playerId,
                    bullet: bullet
                });
                
                console.log(`🎮 Doom: ${player.username} fired a bullet`);
            }
        }
    });
    
    socket.on('doom-request-respawn', (data) => {
        const playerId = socket.id;
        spawnPlayer(playerId);
        
        const player = doomGameState.players.get(playerId);
        if (player) {
            // Broadcast respawn to all players
            io.emit('doom-player-update', {
                playerId: playerId,
                player: player
            });
            
            console.log(`🎮 Doom: ${player.username} respawned`);
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
    
    // Handle pong response for keep-alive
    socket.on('pong', () => {
        console.log(`📡 Pong received from ${getUsernameFromSocket(socket) || 'unknown user'}`);
    });
    
    // Handle ping from client (respond with pong)
    socket.on('ping', () => {
        console.log(`📡 Ping received from ${getUsernameFromSocket(socket) || 'unknown user'}, sending pong`);
        socket.emit('pong');
    });
    
    // Handle server responses
    
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
            
            // NEW: Check for unfinished games between this player and others
            const unfinishedGames = chessSaveSystem.getUnfinishedGamesForPlayer(username);
            if (unfinishedGames.length > 0) {
                console.log(`[Chess] Found ${unfinishedGames.length} unfinished games for ${username}`);
                
                // Send unfinished games to client for selection
                socket.emit('chess:unfinished_games_found', {
                    games: unfinishedGames.map(game => ({
                        gameId: game.gameId,
                        opponent: game.whitePlayer === username ? game.blackPlayer : game.whitePlayer,
                        playerColor: game.whitePlayer === username ? 'white' : 'black',
                        lastUpdated: game.lastUpdated,
                        moveCount: game.moves ? game.moves.length : 0
                    }))
                });
                
                // Don't return here - allow player to also find new games
                // The client should handle the choice between resume and new game
                console.log(`[Chess] ${username} has unfinished games, but continuing to look for new games too`);
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
                game.startTime = new Date().toISOString(); // Add start time
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


    
    // 🔧 OLD CHESS HANDLER REMOVED - USING SIMPLIFIED VERSION ONLY
    
    // 🔧 SIMPLIFIED CHESS MOVE HANDLER - WORKS LIKE AUDIO/TEXT
    socket.on('chess_move', (data) => {
        try {
            const { gameId, from, to, username, timestamp } = data;
            const game = chessGames.get(gameId);
            
            console.log(`[Chess] === SIMPLE CHESS MOVE ===`);
            console.log(`[Chess] Username: "${username}"`);
            console.log(`[Chess] Move: ${from} to ${to}`);
            console.log(`[Chess] Game ID: ${gameId}`);
            console.log(`[Chess] Game exists: ${!!game}`);
            if (game) {
                console.log(`[Chess] Game started: ${game.started}`);
                console.log(`[Chess] White player: ${game.whitePlayer}`);
                console.log(`[Chess] Black player: ${game.blackPlayer}`);
                console.log(`[Chess] Current player: ${game.currentPlayer}`);
            }
            
            // 🔧 BASIC VALIDATION
            if (!username) {
                socket.emit('chess_error', { message: 'Username required' });
                return;
            }
            
            if (!game) {
                socket.emit('chess_error', { message: 'Game not found' });
                return;
            }
            
            // 🔧 AUTO-START GAME IF BOTH PLAYERS PRESENT
            if (!game.started && game.whitePlayer && game.blackPlayer) {
                console.log(`[Chess] Auto-starting game ${gameId}`);
                game.started = true;
                game.currentPlayer = 'white';
                game.startTime = new Date().toISOString(); // Add start time
                if (!game.board) game.board = initializeChessBoard();
                if (!game.moves) game.moves = [];
                
                // 🔧 BROADCAST GAME STARTED TO ALL PLAYERS
                io.to(gameId).emit('chess:game_started', {
                    whitePlayer: game.whitePlayer,
                    blackPlayer: game.blackPlayer,
                    currentPlayer: 'white'
                });
                
                saveChessGames();
            }
            
            if (!game.started) {
                socket.emit('chess_error', { message: 'Waiting for opponent' });
                return;
            }
            
            // 🔧 DETERMINE PLAYER COLOR
            const playerColor = game.whitePlayer === username ? 'white' : game.blackPlayer === username ? 'black' : null;
            
            if (!playerColor) {
                socket.emit('chess_error', { message: 'Not a player in this game' });
                return;
            }
            
            // 🔧 SIMPLE TURN CHECK
            if (game.currentPlayer !== playerColor) {
                socket.emit('chess_error', { message: `Not your turn. It's ${game.currentPlayer}'s turn.` });
                return;
            }
            
            // 🔧 SIMPLE MOVE VALIDATION
            const piece = game.board[from];
            if (!piece) {
                socket.emit('chess_error', { message: 'No piece at that position' });
                return;
            }
            
            // Check if piece belongs to player
            const isWhitePiece = piece === piece.toUpperCase();
            if ((playerColor === 'white' && !isWhitePiece) || (playerColor === 'black' && isWhitePiece)) {
                socket.emit('chess_error', { message: 'Not your piece' });
                return;
            }
            
            // 🔧 ENHANCED CHESS MOVE VALIDATION
            // First check if the move is valid according to piece rules
            const isValidMoveResult = isValidMove(game.board, from, to, playerColor);
            if (!isValidMoveResult) {
                socket.emit('chess_error', { message: 'Invalid move for this piece' });
                return;
            }
            
            // 🔧 CHECK IF MOVE WOULD PUT OWN KING IN CHECK
            // Make a temporary move to test if it would put own king in check
            const tempBoard = JSON.parse(JSON.stringify(game.board));
            tempBoard[to] = piece;
            tempBoard[from] = null;
            
            // Check if this move would put our own king in check
            if (isInCheck(tempBoard, playerColor)) {
                socket.emit('chess_error', { message: 'This move would put your king in check' });
                return;
            }
            
            // 🔧 MAKE THE MOVE (SIMPLE)
            const capturedPiece = game.board[to];
            game.board[to] = piece;
            game.board[from] = null;
            
            // 🔧 SAVE MOVE
            game.moves.push({
                from,
                to,
                piece,
                color: playerColor,
                username,
                isCapture: capturedPiece !== null,
                timestamp: new Date().toISOString()
            });
            
            // 🔧 SWITCH TURNS (SIMPLE)
            game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
            
            console.log(`[Chess] Move successful: ${from} to ${to} by ${playerColor}`);
            console.log(`[Chess] Next player: ${game.currentPlayer}`);
            
            // 🔧 CHECK FOR CHECK AND CHECKMATE
            const nextPlayerColor = game.currentPlayer;
            const isCheck = isInCheck(game.board, nextPlayerColor);
            const isCheckmateResult = isCheck && isCheckmate(game.board, nextPlayerColor);
            const isStalemateResult = isStalemate(game.board, nextPlayerColor);
            
            console.log(`[Chess] Game state after move:`);
            console.log(`[Chess] - Next player: ${nextPlayerColor}`);
            console.log(`[Chess] - In check: ${isCheck}`);
            console.log(`[Chess] - Checkmate: ${isCheckmateResult}`);
            console.log(`[Chess] - Stalemate: ${isStalemateResult}`);
            
            // 🔧 BROADCAST MOVE TO ALL PLAYERS
            console.log(`[Chess Debug] Broadcasting move with check state: isCheck=${isCheck}, isCheckmate=${isCheckmateResult}`);
            io.to(gameId).emit('chess_move_made', {
                from,
                to,
                piece,
                color: playerColor,
                capture: capturedPiece !== null,
                playerName: username,
                nextPlayer: game.currentPlayer,
                isCheck: isCheck,
                isCheckmate: isCheckmateResult,
                isStalemate: isStalemateResult
            });
            
            // 🔧 HANDLE GAME END CONDITIONS
            if (isCheckmateResult) {
                const winner = playerColor; // The player who made the move wins
                console.log(`[Chess] CHECKMATE! ${winner} wins!`);
                io.to(gameId).emit('chess_game_over', {
                    winner: winner,
                    reason: 'Checkmate',
                    winnerName: username
                });
                game.ended = true;
                
                // Save game to chess save system
                chessSaveSystem.recordGame({
                    gameId: gameId,
                    whitePlayer: game.whitePlayer,
                    blackPlayer: game.blackPlayer,
                    winner: winner,
                    moves: game.moves,
                    gameType: 'standard',
                    startTime: game.startTime,
                    endTime: new Date().toISOString()
                });
            } else if (isStalemateResult) {
                console.log(`[Chess] STALEMATE! Game is a draw.`);
                io.to(gameId).emit('chess_game_over', {
                    winner: null,
                    reason: 'Stalemate'
                });
                game.ended = true;
                
                // Save game to chess save system
                chessSaveSystem.recordGame({
                    gameId: gameId,
                    whitePlayer: game.whitePlayer,
                    blackPlayer: game.blackPlayer,
                    winner: 'draw',
                    moves: game.moves,
                    gameType: 'standard',
                    startTime: game.startTime,
                    endTime: new Date().toISOString()
                });
            } else if (isCheck) {
                console.log(`[Chess] CHECK! ${nextPlayerColor} is in check.`);
                // Check is already included in the move_made event
            } else if (capturedPiece === 'K' || capturedPiece === 'k') {
                console.log(`[Chess] KING CAPTURED! ${playerColor} wins!`);
                io.to(gameId).emit('chess_game_over', {
                    winner: playerColor,
                    reason: 'King captured',
                    winnerName: username
                });
                game.ended = true;
                
                // Save game to chess save system
                chessSaveSystem.recordGame({
                    gameId: gameId,
                    whitePlayer: game.whitePlayer,
                    blackPlayer: game.blackPlayer,
                    winner: playerColor,
                    moves: game.moves,
                    gameType: 'standard',
                    startTime: game.startTime,
                    endTime: new Date().toISOString()
                });
            }
            
            saveChessGames();
            console.log(`[Chess] === END SIMPLE CHESS MOVE ===`);
            
        } catch (error) {
            console.error('[Chess] Error in simple chess_move:', error);
            socket.emit('chess_error', { message: 'Failed to process move' });
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
            console.log(`[Chess] Connected users before leave: ${connectedUsers.size}`);
            console.log(`[Chess] Connected users list:`, Array.from(connectedUsers.entries()).map(([id, info]) => ({ id, username: info?.userInfo?.username })));
            
            // 🔧 CONFIRM USER IS STILL CONNECTED TO MAIN APP
            const userInfo = connectedUsers.get(socket.id);
            if (userInfo) {
                console.log(`[Chess] ✅ User ${username} remains connected to main app (socket: ${socket.id})`);
                
                // Send confirmation that user left chess but is still connected
                socket.emit('chess:left_game_confirmation', {
                    message: 'You have left the chess game but remain connected to the app',
                    gameId: gameId,
                    username: username
                });
            } else {
                console.log(`[Chess] ❌ WARNING: User ${username} not found in connected users after leaving chess game`);
            }
            
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
                
                // NEW: Save unfinished game if game was in progress
                if (game.started && game.moves && game.moves.length > 0) {
                    console.log(`[Chess] Saving unfinished game ${gameId} with ${game.moves.length} moves`);
                    
                    // Create player key for the game
                    const remainingPlayer = game.whitePlayer || game.blackPlayer;
                    const playerKey = chessSaveSystem.getPlayerKey(remainingPlayer, username);
                    
                    // Save as unfinished game
                    const unfinishedGameData = {
                        gameId: gameId,
                        whitePlayer: game.whitePlayer || username,
                        blackPlayer: game.blackPlayer || username,
                        currentPlayer: game.currentPlayer,
                        board: game.board,
                        moves: game.moves,
                        startTime: game.startTime,
                        playerKey: playerKey,
                        isUnfinished: true
                    };
                    
                    chessSaveSystem.saveUnfinishedGame(gameId, unfinishedGameData);
                    
                    // Notify remaining player about saved game
                    if (remainingPlayer) {
                        const remainingSocketId = userSockets.get(remainingPlayer);
                        if (remainingSocketId) {
                            const remainingSocket = io.sockets.sockets.get(remainingSocketId);
                            if (remainingSocket) {
                                remainingSocket.emit('chess:game_saved_unfinished', {
                                    gameId: gameId,
                                    opponent: username,
                                    message: 'Game saved - you can resume when opponent returns'
                                });
                            }
                        }
                    }
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
            
            // 🔧 VERIFY USER IS STILL IN CONNECTED USERS LIST
            const userStillConnected = connectedUsers.get(socket.id);
            if (userStillConnected) {
                console.log(`[Chess] ✅ CONFIRMED: User ${username} still in connected users after leaving chess game`);
                console.log(`[Chess] Connected users count after leave: ${connectedUsers.size}`);
                console.log(`[Chess] Connected users list after leave:`, Array.from(connectedUsers.entries()).map(([id, info]) => ({ id, username: info?.userInfo?.username })));
            } else {
                console.log(`[Chess] ❌ ERROR: User ${username} was removed from connected users after leaving chess game`);
                console.log(`[Chess] Connected users count after leave: ${connectedUsers.size}`);
                console.log(`[Chess] Connected users list after leave:`, Array.from(connectedUsers.entries()).map(([id, info]) => ({ id, username: info?.userInfo?.username })));
            }
            
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
                
                // 🔧 SAVE GAME TO CHESS STATS SYSTEM
                chessSaveSystem.recordGame({
                    gameId: gameId,
                    whitePlayer: game.whitePlayer,
                    blackPlayer: game.blackPlayer,
                    winner: winner,
                    moves: game.moves || [],
                    gameType: 'standard',
                    startTime: game.startTime,
                    endTime: new Date().toISOString()
                });
                
                chessGames.delete(gameId);
                saveChessGames(); // Save after resigning
                console.log(`[Chess] ${username} resigned game ${gameId} - game recorded to stats`);
            }
        } catch (error) {
            console.error('Error in chess:resign_game:', error);
        }
    });
    
    // NEW: Resume unfinished game
    socket.on('chess:resume_game', (data) => {
        try {
            const { gameId } = data;
            const username = getUsernameFromSocket(socket);
            
            if (!username) {
                socket.emit('error', { message: 'Username required to resume game' });
                return;
            }
            
            // Get the unfinished game data
            const unfinishedGame = chessSaveSystem.getUnfinishedGame(gameId);
            if (!unfinishedGame) {
                socket.emit('error', { message: 'Unfinished game not found' });
                return;
            }
            
            // Check if user is a player in this game
            if (unfinishedGame.whitePlayer !== username && unfinishedGame.blackPlayer !== username) {
                socket.emit('error', { message: 'You are not a player in this game' });
                return;
            }
            
            // Check if opponent is online
            const opponentUsername = unfinishedGame.whitePlayer === username ? unfinishedGame.blackPlayer : unfinishedGame.whitePlayer;
            const opponentSocketId = userSockets.get(opponentUsername);
            const opponentOnline = opponentSocketId && io.sockets.sockets.has(opponentSocketId);
            
            if (!opponentOnline) {
                socket.emit('chess:resume_failed', {
                    message: 'Opponent is not online. Cannot resume game.',
                    opponent: opponentUsername
                });
                return;
            }
            
            // Create new game from unfinished game data
            const newGameId = `resumed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const resumedGame = {
                id: newGameId,
                whitePlayer: unfinishedGame.whitePlayer,
                blackPlayer: unfinishedGame.blackPlayer,
                started: true,
                ended: false,
                currentPlayer: unfinishedGame.currentPlayer || 'white',
                board: unfinishedGame.board || initializeChessBoard(),
                moves: unfinishedGame.moves || [],
                startTime: unfinishedGame.startTime || new Date().toISOString(),
                isResumed: true,
                originalGameId: gameId
            };
            
            // Add game to active games
            chessGames.set(newGameId, resumedGame);
            
            // Join both players to the game
            socket.join(newGameId);
            
            // Find and notify opponent
            const opponentSocket = io.sockets.sockets.get(opponentSocketId);
            if (opponentSocket) {
                opponentSocket.join(newGameId);
                
                const playerColor = resumedGame.whitePlayer === username ? 'white' : 'black';
                const opponentColor = playerColor === 'white' ? 'black' : 'white';
                
                // Notify both players
                socket.emit('chess:game_resumed', {
                    gameId: newGameId,
                    playerColor: playerColor,
                    isMyTurn: resumedGame.currentPlayer === playerColor,
                    board: resumedGame.board,
                    moves: resumedGame.moves,
                    opponent: opponentUsername
                });
                
                opponentSocket.emit('chess:game_resumed', {
                    gameId: newGameId,
                    playerColor: opponentColor,
                    isMyTurn: resumedGame.currentPlayer === opponentColor,
                    board: resumedGame.board,
                    moves: resumedGame.moves,
                    opponent: username
                });
                
                // Remove from unfinished games
                chessSaveSystem.removeUnfinishedGame(gameId);
                
                console.log(`[Chess] Game ${gameId} resumed as ${newGameId} between ${username} and ${opponentUsername}`);
                saveChessGames();
            }
            
        } catch (error) {
            console.error('Error in chess:resume_game:', error);
            socket.emit('error', { message: 'Failed to resume game' });
        }
    });

    // NEW: Start new game (ignore unfinished games)
    socket.on('chess:start_new_game', (data) => {
        try {
            const username = getUsernameFromSocket(socket);
            if (!username) {
                socket.emit('error', { message: 'Username required to start new game' });
                return;
            }
            
            console.log(`[Chess] ${username} starting new game (ignoring unfinished games)`);
            
            // Continue with normal game finding logic
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
            console.error('Error in chess:start_new_game:', error);
            socket.emit('error', { message: 'Failed to start new game' });
        }
    });

    // NEW: Clear unfinished games for a player
    socket.on('chess:clear_unfinished_games', (data) => {
        try {
            const username = getUsernameFromSocket(socket);
            if (!username) {
                socket.emit('error', { message: 'Username required to clear unfinished games' });
                return;
            }
            
            console.log(`[Chess] ${username} clearing unfinished games`);
            
            // Get all unfinished games for this player
            const unfinishedGames = chessSaveSystem.getUnfinishedGamesForPlayer(username);
            
            // Remove each unfinished game
            for (const game of unfinishedGames) {
                chessSaveSystem.removeUnfinishedGame(game.gameId);
            }
            
            socket.emit('chess:unfinished_games_cleared', {
                message: `Cleared ${unfinishedGames.length} unfinished games`,
                count: unfinishedGames.length
            });
            
            console.log(`[Chess] Cleared ${unfinishedGames.length} unfinished games for ${username}`);
            
        } catch (error) {
            console.error('Error in chess:clear_unfinished_games:', error);
            socket.emit('error', { message: 'Failed to clear unfinished games' });
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
            const username = getUsernameFromSocket(socket);
            
            console.log(`[Chess] === TURN STATE SYNC REQUEST ===`);
            console.log(`[Chess] Username: "${username}" for game ${gameId}`);
            console.log(`[Chess] Client expects: turn=${expectedTurn}, color=${playerColor}`);
            
            if (!username) {
                console.log(`[Chess] ERROR: No username found for turn sync`);
                socket.emit('chess:error', { message: 'Username required for turn sync' });
                return;
            }
            
            if (!game) {
                console.log(`[Chess] ERROR: Game ${gameId} not found for turn sync`);
                socket.emit('chess:error', { message: 'Game not found for turn sync' });
                return;
            }
            
            if (!game.started) {
                console.log(`[Chess] ERROR: Game ${gameId} not started for turn sync`);
                socket.emit('chess:error', { message: 'Game not started for turn sync' });
                return;
            }
            
            // Determine the player's actual color
            const actualPlayerColor = game.whitePlayer === username ? 'white' : game.blackPlayer === username ? 'black' : null;
            
            if (!actualPlayerColor) {
                console.log(`[Chess] ERROR: User ${username} not a player in game ${gameId}`);
                socket.emit('chess:error', { message: 'Not a player in this game' });
                return;
            }
            
            // Determine if it's actually their turn
            const isActuallyMyTurn = game.currentPlayer === actualPlayerColor;
            
            console.log(`[Chess] Server game state: white="${game.whitePlayer}", black="${game.blackPlayer}", currentPlayer="${game.currentPlayer}"`);
            console.log(`[Chess] User ${username} is ${actualPlayerColor} player`);
            console.log(`[Chess] Is it their turn? ${isActuallyMyTurn}`);
            console.log(`[Chess] Client expected: ${expectedTurn}, Server says: ${isActuallyMyTurn}`);
            
            // Send the correct turn state back to the client
            const syncResponse = {
                isMyTurn: isActuallyMyTurn,
                currentPlayer: game.currentPlayer,
                playerColor: actualPlayerColor,
                gameStarted: game.started,
                gameId: gameId
            };
            
            socket.emit('chess:turn_state_sync', syncResponse);
            
            console.log(`[Chess] Sent sync response:`, syncResponse);
            console.log(`[Chess] === END TURN STATE SYNC ===`);
            
        } catch (error) {
            console.error('[Chess] Error in sync_turn_state:', error);
            socket.emit('chess:error', { message: 'Failed to sync turn state' });
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
    
    // 🔧 DEBUG ENDPOINT - CHECK GAME STATE
    socket.on('chess:debug_state', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const username = getUsernameFromSocket(socket);
            
            console.log(`[Chess Debug] === GAME STATE DEBUG ===`);
            console.log(`[Chess Debug] Game ID: ${gameId}`);
            console.log(`[Chess Debug] Username: ${username}`);
            
            if (!game) {
                console.log(`[Chess Debug] Game not found`);
                socket.emit('chess:debug_response', { error: 'Game not found' });
                return;
            }
            
            const playerColor = game.whitePlayer === username ? 'white' : game.blackPlayer === username ? 'black' : null;
            
            const debugInfo = {
                gameId: game.id,
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                started: game.started,
                ended: game.ended,
                currentPlayer: game.currentPlayer,
                playerColor: playerColor,
                isMyTurn: game.currentPlayer === playerColor,
                moveCount: game.moves ? game.moves.length : 0,
                boardState: game.board,
                lastMove: game.moves && game.moves.length > 0 ? game.moves[game.moves.length - 1] : null
            };
            
            console.log(`[Chess Debug] Debug info:`, JSON.stringify(debugInfo, null, 2));
            socket.emit('chess:debug_response', debugInfo);
            
        } catch (error) {
            console.error('[Chess] Error in debug_state:', error);
            socket.emit('chess:debug_response', { error: error.message });
        }
    });
    
    // 🔧 FORCE SYNC TURN STATE
    socket.on('chess:force_sync', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const username = getUsernameFromSocket(socket);
            
            console.log(`[Chess] Force sync requested for game ${gameId} by ${username}`);
            
            if (!game) {
                socket.emit('chess_error', { message: 'Game not found' });
                return;
            }
            
            const playerColor = game.whitePlayer === username ? 'white' : game.blackPlayer === username ? 'black' : null;
            
            if (!playerColor) {
                socket.emit('chess_error', { message: 'You are not a player in this game' });
                return;
            }
            
            // Force correct turn state
            const isMyTurn = game.currentPlayer === playerColor;
            
            socket.emit('chess:turn_state_sync', {
                isMyTurn: isMyTurn,
                currentPlayer: game.currentPlayer,
                playerColor: playerColor,
                gameStarted: game.started,
                gameId: game.id
            });
            
            console.log(`[Chess] Force sync complete: ${username} (${playerColor}) - isMyTurn: ${isMyTurn}`);
            
        } catch (error) {
            console.error('[Chess] Error in force_sync:', error);
            socket.emit('chess_error', { message: 'Failed to sync turn state' });
        }
    });

    // NEW: Get current game state
    socket.on('chess:get_game_state', (data) => {
        try {
            const { gameId } = data;
            const username = getUsernameFromSocket(socket);
            
            if (!username) {
                socket.emit('error', { message: 'Username required to get game state' });
                return;
            }
            
            const game = chessGames.get(gameId);
            if (!game) {
                socket.emit('error', { message: 'Game not found' });
                return;
            }
            
            // Check if user is a player in this game
            if (game.whitePlayer !== username && game.blackPlayer !== username) {
                socket.emit('error', { message: 'You are not a player in this game' });
                return;
            }
            
            const playerColor = game.whitePlayer === username ? 'white' : 'black';
            const isMyTurn = game.currentPlayer === playerColor;
            
            // Send current game state
            socket.emit('chess:game_state', {
                gameId: gameId,
                currentPlayer: game.currentPlayer,
                isMyTurn: isMyTurn,
                board: game.board || initializeChessBoard(),
                moves: game.moves || [],
                whitePlayer: game.whitePlayer,
                blackPlayer: game.blackPlayer,
                started: game.started,
                ended: game.ended
            });
            
            console.log(`[Chess] Sent game state to ${username} for game ${gameId}`);
            
        } catch (error) {
            console.error('Error in chess:get_game_state:', error);
            socket.emit('error', { message: 'Failed to get game state' });
        }
    });

    // ========================================
    // 🐍 SNAKE GAME EVENTS
    // ========================================

    // SNAKE: Submit score
    socket.on('snake:submit_score', (data) => {
        try {
            const { username, score, time, pieces } = data;
            if (!username || typeof score !== 'number' || typeof time !== 'number' || typeof pieces !== 'number') {
                socket.emit('snake:submit_result', { success: false, error: 'Invalid data' });
                return;
            }
            // Add to leaderboard
            snakeLeaderboard.push({ username, score, time, pieces, timestamp: new Date().toISOString() });
            // Sort by score DESC, then time ASC (lower time is better)
            snakeLeaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
            // Keep only top 10
            if (snakeLeaderboard.length > 10) snakeLeaderboard = snakeLeaderboard.slice(0, 10);
            saveSnakeLeaderboard();
            socket.emit('snake:submit_result', { success: true });
            io.emit('snake:leaderboard_updated', { leaderboard: snakeLeaderboard });
            console.log(`[Snake] Score submitted: ${username} - Score: ${score}, Time: ${time}, Pieces: ${pieces}`);
        } catch (e) {
            socket.emit('snake:submit_result', { success: false, error: 'Server error' });
            console.error('[Snake] Error submitting score:', e);
        }
    });

    // SNAKE: Get leaderboard
    socket.on('snake:get_leaderboard', () => {
        socket.emit('snake:leaderboard', { leaderboard: snakeLeaderboard });
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
    console.log(`[Chess Debug] Checking if ${color} is in check...`);
    
    // Find the king
    const kingPiece = color === 'white' ? 'K' : 'k';
    let kingPosition = null;
    
    for (let square in board) {
        if (board[square] === kingPiece) {
            kingPosition = square;
            break;
        }
    }
    
    if (!kingPosition) {
        console.log(`[Chess Debug] No ${color} king found on board!`);
        return false;
    }
    
    console.log(`[Chess Debug] ${color} king found at ${kingPosition}`);
    
    // Check if any opponent piece can capture the king
    const opponentColor = color === 'white' ? 'black' : 'white';
    console.log(`[Chess Debug] Checking if any ${opponentColor} pieces can capture king at ${kingPosition}`);
    
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === opponentColor) {
            console.log(`[Chess Debug] Checking ${opponentColor} piece ${piece} at ${square} against king at ${kingPosition}`);
            if (isValidMove(board, square, kingPosition, opponentColor)) {
                console.log(`[Chess Debug] CHECK! ${opponentColor} piece ${piece} at ${square} can capture king at ${kingPosition}`);
                return true;
            }
        }
    }
    
    console.log(`[Chess Debug] ${color} is NOT in check`);
    return false;
}

function getPieceColor(piece) {
    return piece === piece.toUpperCase() ? 'white' : 'black';
}

function hasValidMoves(board, color) {
    console.log(`[Chess Debug] Checking if ${color} has valid moves...`);
    
    // Check if any piece of the given color has valid moves
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === color) {
            // Check all possible squares on the board (including empty ones)
            for (let row = 1; row <= 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const targetSquare = `${String.fromCharCode('a'.charCodeAt(0) + col)}${row}`;
                    
                    // Skip if same square
                    if (square === targetSquare) continue;
                    
                    // Check if this move would be valid
                    if (isValidMove(board, square, targetSquare, color)) {
                        // Make a temporary move to check if it would put own king in check
                        const tempBoard = JSON.parse(JSON.stringify(board));
                        const pieceToMove = tempBoard[square];
                        tempBoard[targetSquare] = pieceToMove;
                        tempBoard[square] = null;
                        
                        // If this move doesn't put own king in check, it's a legal move
                        if (!isInCheck(tempBoard, color)) {
                            console.log(`[Chess Debug] ${color} has valid move: ${square} to ${targetSquare}`);
                            return true;
                        } else {
                            console.log(`[Chess Debug] Move ${square} to ${targetSquare} would put ${color} king in check`);
                        }
                    }
                }
            }
        }
    }
    
    console.log(`[Chess Debug] ${color} has no valid moves`);
    return false;
}

function isCheckmate(board, color) {
    console.log(`[Chess Debug] Checking if ${color} is checkmated...`);
    
    // Only detect checkmate if king is in check and has no legal moves
    if (!isInCheck(board, color)) {
        console.log(`[Chess Debug] ${color} is not in check, so not checkmated`);
        return false;
    }
    
    console.log(`[Chess Debug] ${color} is in check, checking for escape moves...`);
    
    // Check if any move can get out of check
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === color) {
            console.log(`[Chess Debug] Checking ${color} piece ${piece} at ${square} for escape moves...`);
            for (let targetSquare in board) {
                if (square === targetSquare) continue;
                
                if (isValidMove(board, square, targetSquare, color)) {
                    console.log(`[Chess Debug] Found valid move: ${square} to ${targetSquare}`);
                    // Make a temporary move to check if it gets out of check
                    const tempBoard = JSON.parse(JSON.stringify(board));
                    const pieceToMove = tempBoard[square];
                    tempBoard[targetSquare] = pieceToMove;
                    tempBoard[square] = null;
                    
                    // If this move gets us out of check, it's not checkmate
                    if (!isInCheck(tempBoard, color)) {
                        console.log(`[Chess Debug] Move ${square} to ${targetSquare} gets out of check - NOT checkmated`);
                        return false;
                    } else {
                        console.log(`[Chess Debug] Move ${square} to ${targetSquare} doesn't get out of check`);
                    }
                }
            }
        }
    }
    
    console.log(`[Chess Debug] CHECKMATE! ${color} has no escape moves`);
    return true;
}

function isStalemate(board, color) {
    console.log(`[Chess Debug] Checking if ${color} is stalemated...`);
    
    // Stalemate occurs when player is NOT in check but has no legal moves
    if (isInCheck(board, color)) {
        console.log(`[Chess Debug] ${color} is in check, so not stalemated`);
        return false;
    }
    
    console.log(`[Chess Debug] ${color} is not in check, checking for legal moves...`);
    
    // Check if player has any legal moves
    if (hasValidMoves(board, color)) {
        console.log(`[Chess Debug] ${color} has legal moves, not stalemated`);
        return false;
    }
    
    console.log(`[Chess Debug] STALEMATE! ${color} has no legal moves but is not in check`);
    return true;
} 