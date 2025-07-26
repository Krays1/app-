// Zell0 Server - Cloud Version
// This server is configured for cloud deployment (Railway, Heroku, etc.)

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Cloud configuration - will use environment variables
const SERVER_PORT = process.env.PORT || 3001;
const SERVER_IP = process.env.IP || '0.0.0.0';

console.log('🚀 Zell0 Server - Cloud Configuration');
console.log('=====================================');
console.log(`📡 Binding to: ${SERVER_IP}`);
console.log(`🔌 Port: ${SERVER_PORT}`);
console.log('=====================================');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Enable CORS for all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// In-memory data stores (replace with database for production)
let onlineUsers = new Set();
let userStats = new Map();
let connectedUsers = new Map();
let userSockets = new Map();

// ========================================
// API ENDPOINTS FOR WEBSITE & APP
// ========================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        onlineUsers: onlineUsers.size,
        totalConnections: connectedUsers.size
    });
});

// Get all online users
app.get('/api/online-users', (req, res) => {
    try {
        const users = Array.from(onlineUsers).map(username => ({
            username: username,
            isOnline: true,
            lastSeen: userStats.get(username)?.lastSeen || new Date().toISOString(),
            stats: userStats.get(username)?.stats || {}
        }));
        
        res.json({
            users: users,
            count: users.length
        });
    } catch (error) {
        console.error('Error getting online users:', error);
        res.status(500).json({ error: 'Failed to get online users' });
    }
});

// Get Battlefield stats for a user
app.get('/api/battlefield-stats/:username', (req, res) => {
    try {
        const username = req.params.username;
        const stats = userStats.get(username)?.battlefield || {
            rank: Math.floor(Math.random() * 100) + 1,
            kills: Math.floor(Math.random() * 5000) + 100,
            deaths: Math.floor(Math.random() * 3000) + 50,
            kdr: (Math.random() * 3 + 0.5).toFixed(2),
            winRate: (Math.random() * 30 + 40).toFixed(1),
            timePlayed: `${Math.floor(Math.random() * 100) + 10}h`,
            favoriteWeapon: ['M4A1', 'AK-47', 'SCAR-H', 'AWP'][Math.floor(Math.random() * 4)],
            isOnline: onlineUsers.has(username)
        };
        res.json(stats);
    } catch (error) {
        console.error('Error getting Battlefield stats:', error);
        res.status(500).json({ error: 'Failed to get Battlefield stats' });
    }
});

// Get Steam stats for a user
app.get('/api/steam-stats/:username', (req, res) => {
    try {
        const username = req.params.username;
        const stats = userStats.get(username)?.steam || {
            status: onlineUsers.has(username) ? 'Online' : 'Offline',
            totalGames: Math.floor(Math.random() * 200) + 50,
            totalPlaytime: `${Math.floor(Math.random() * 1000) + 100}h`,
            recentlyPlayedGames: [
                { name: 'Counter-Strike 2', playtime: Math.floor(Math.random() * 100) + 10 },
                { name: 'Dota 2', playtime: Math.floor(Math.random() * 80) + 5 },
                { name: 'Team Fortress 2', playtime: Math.floor(Math.random() * 60) + 5 }
            ]
        };
        res.json(stats);
    } catch (error) {
        console.error('Error getting Steam stats:', error);
        res.status(500).json({ error: 'Failed to get Steam stats' });
    }
});

// App sends user online (login)
app.post('/api/user-online', (req, res) => {
    try {
        const { username, battlefield, steam } = req.body;
        if (!username) return res.status(400).json({ error: 'Username required' });
        
        onlineUsers.add(username);
        userStats.set(username, {
            lastSeen: new Date().toISOString(),
            battlefield: battlefield || {},
            steam: steam || {},
        });
        
        console.log(`✅ User ${username} marked online`);
        res.json({ success: true, message: `${username} marked online` });
    } catch (error) {
        console.error('Error marking user online:', error);
        res.status(500).json({ error: 'Failed to mark user online' });
    }
});

// App sends user offline (logout)
app.post('/api/user-offline', (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: 'Username required' });
        
        onlineUsers.delete(username);
        console.log(`❌ User ${username} marked offline`);
        res.json({ success: true, message: `${username} marked offline` });
    } catch (error) {
        console.error('Error marking user offline:', error);
        res.status(500).json({ error: 'Failed to mark user offline' });
    }
});

// App sends activity/stats update
app.post('/api/user-activity', (req, res) => {
    try {
        const { username, battlefield, steam } = req.body;
        if (!username) return res.status(400).json({ error: 'Username required' });
        
        if (!userStats.has(username)) {
            userStats.set(username, { lastSeen: new Date().toISOString() });
        }
        
        const stats = userStats.get(username);
        if (battlefield) stats.battlefield = battlefield;
        if (steam) stats.steam = steam;
        stats.lastSeen = new Date().toISOString();
        userStats.set(username, stats);
        
        console.log(`📊 Stats updated for ${username}`);
        res.json({ success: true, message: `Stats updated for ${username}` });
    } catch (error) {
        console.error('Error updating user activity:', error);
        res.status(500).json({ error: 'Failed to update user activity' });
    }
});

// Test endpoint to add users manually
app.post('/api/test/add-user', (req, res) => {
    try {
        const { username } = req.body;
        if (username) {
            onlineUsers.add(username);
            userStats.set(username, {
                lastSeen: new Date().toISOString(),
                socketId: 'test-socket'
            });
            res.json({ success: true, message: `User ${username} added for testing` });
        } else {
            res.status(400).json({ error: 'Username required' });
        }
    } catch (error) {
        console.error('Error adding test user:', error);
        res.status(500).json({ error: 'Failed to add test user' });
    }
});

// ========================================
// SOCKET.IO CONNECTION HANDLING
// ========================================

const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`📱 New client connected: ${socket.id}`);
    
    // Handle user registration from Android app
    socket.on('register', (data) => {
        try {
            const { deviceId, deviceName, userInfo, username, profilePic, password } = data;
            
            if (!username) {
                socket.emit('registration-error', { message: 'Username required' });
                return;
            }
            
            // Mark user as online
            onlineUsers.add(username);
            userStats.set(username, {
                lastSeen: new Date().toISOString(),
                socketId: socket.id
            });
            
            // Store connection info
            connectedUsers.set(socket.id, {
                deviceId,
                deviceName,
                userInfo,
                username,
                profilePic
            });
            
            userSockets.set(username, socket.id);
            
            console.log(`✅ User registered: ${username} (${socket.id})`);
            socket.emit('registration-success', { username, message: 'Successfully registered' });
            
            // Broadcast updated user list
            const userList = Array.from(onlineUsers).map(username => ({
                username,
                isOnline: true,
                lastSeen: userStats.get(username)?.lastSeen || new Date().toISOString()
            }));
            io.emit('user-list-update', userList);
            
        } catch (error) {
            console.error('Registration error:', error);
            socket.emit('registration-error', { message: 'Registration failed' });
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`📱 Client disconnected: ${socket.id}`);
        
        const userInfo = connectedUsers.get(socket.id);
        if (userInfo) {
            const username = userInfo.username;
            onlineUsers.delete(username);
            userSockets.delete(username);
            connectedUsers.delete(socket.id);
            
            console.log(`❌ User ${username} disconnected`);
            
            // Broadcast updated user list
            const userList = Array.from(onlineUsers).map(username => ({
                username,
                isOnline: true,
                lastSeen: userStats.get(username)?.lastSeen || new Date().toISOString()
            }));
            io.emit('user-list-update', userList);
        }
    });
    
    // Handle text messages
    socket.on('text-message', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) return;
            
            const message = {
                id: Date.now(),
                username: userInfo.username,
                message: data.message,
                timestamp: new Date().toISOString(),
                type: 'text'
            };
            
            io.emit('new-message', message);
        } catch (error) {
            console.error('Error handling text message:', error);
        }
    });
    
    // Handle stats updates from Android app
    socket.on('stats-update', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) return;
            
            const { battlefield, steam } = data;
            const username = userInfo.username;
            
            if (!userStats.has(username)) {
                userStats.set(username, { lastSeen: new Date().toISOString() });
            }
            
            const stats = userStats.get(username);
            if (battlefield) stats.battlefield = battlefield;
            if (steam) stats.steam = steam;
            stats.lastSeen = new Date().toISOString();
            userStats.set(username, stats);
            
            console.log(`📊 Stats updated for ${username}`);
        } catch (error) {
            console.error('Error handling stats update:', error);
        }
    });
});

// ========================================
// START SERVER
// ========================================

server.listen(SERVER_PORT, SERVER_IP, () => {
    console.log('🚀 Zell0 Cloud Server Started Successfully!');
    console.log('============================================================');
    console.log(`📡 Server URL: http://${SERVER_IP}:${SERVER_PORT}`);
    console.log(`🌐 Health Check: http://${SERVER_IP}:${SERVER_PORT}/health`);
    console.log(`📊 API Base: http://${SERVER_IP}:${SERVER_PORT}/api`);
    console.log('============================================================');
    console.log('✅ Ready for Android app and website connections!');
    console.log('📱 Android devices can now connect for real-time data');
    console.log('🌐 Website can now fetch live statistics');
    console.log('🛑 Press Ctrl+C to stop the server');
    console.log('============================================================');
}); 