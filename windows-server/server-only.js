// Standalone Zell0 Server (without Electron GUI)
// This version runs the server functionality without the GUI

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const SERVER_IP = '172.94.3.216'; // VPN IP as specified
const SERVER_PORT = 3000;

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Parse JSON bodies
app.use(express.json());

// Socket.IO configuration
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Store connected users
const connectedUsers = new Map();
const userSockets = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connectedUsers: connectedUsers.size,
        serverIP: SERVER_IP,
        serverPort: SERVER_PORT
    });
});

// Server info endpoint
app.get('/info', (req, res) => {
    res.json({
        name: 'Zell0 Server',
        version: '1.0.0',
        description: 'Walkie-talkie server for Android clients',
        endpoints: {
            health: '/health',
            info: '/info'
        },
        websocket: {
            events: ['register', 'text-message', 'voice-message', 'disconnect']
        }
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`${new Date().toISOString()} - New client connected: ${socket.id}`);
    
    // Handle user registration
    socket.on('register', (data) => {
        try {
            const { deviceId, deviceName, userInfo } = data;
            
            // Remove existing connection for this device
            const existingSocket = userSockets.get(deviceId);
            if (existingSocket && existingSocket !== socket.id) {
                connectedUsers.delete(existingSocket);
                io.to(existingSocket).emit('duplicate-connection');
            }
            
            // Register new connection
            const user = {
                socketId: socket.id,
                deviceId: deviceId,
                deviceName: deviceName || 'Unknown Device',
                userInfo: userInfo || {},
                connectedAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            
            connectedUsers.set(socket.id, user);
            userSockets.set(deviceId, socket.id);
            
            console.log(`${new Date().toISOString()} - User registered: ${deviceId} (${deviceName})`);
            
            // Send confirmation
            socket.emit('registered', {
                success: true,
                deviceId: deviceId,
                connectedUsers: connectedUsers.size
            });
            
            // Broadcast to all clients
            socket.broadcast.emit('user-connected', {
                deviceId: deviceId,
                deviceName: deviceName,
                totalUsers: connectedUsers.size
            });
            
        } catch (error) {
            console.error('Registration error:', error);
            socket.emit('error', { message: 'Registration failed' });
        }
    });
    
    // Handle text messages
    socket.on('text-message', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const message = {
                id: Date.now() + Math.random(),
                type: 'text',
                from: userInfo.deviceId,
                fromName: userInfo.deviceName,
                content: data.message,
                timestamp: new Date().toISOString()
            };
            
            console.log(`${new Date().toISOString()} - Text message from ${userInfo.deviceId}: ${data.message}`);
            
            // Update last seen
            userInfo.lastSeen = new Date().toISOString();
            
            // Broadcast to all connected clients
            io.emit('text-message', message);
            
        } catch (error) {
            console.error('Text message error:', error);
            socket.emit('error', { message: 'Message sending failed' });
        }
    });
    
    // Handle voice messages
    socket.on('voice-message', (data) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (!userInfo) {
                socket.emit('error', { message: 'User not registered' });
                return;
            }
            
            const message = {
                id: Date.now() + Math.random(),
                type: 'voice',
                from: userInfo.deviceId,
                fromName: userInfo.deviceName,
                audioData: data.audioData,
                duration: data.duration || 0,
                timestamp: new Date().toISOString()
            };
            
            console.log(`${new Date().toISOString()} - Voice message from ${userInfo.deviceId} (${data.duration}ms)`);
            
            // Update last seen
            userInfo.lastSeen = new Date().toISOString();
            
            // Broadcast to all connected clients except sender
            socket.broadcast.emit('voice-message', message);
            
        } catch (error) {
            console.error('Voice message error:', error);
            socket.emit('error', { message: 'Voice message sending failed' });
        }
    });
    
    // Handle ping for keepalive
    socket.on('ping', () => {
        const userInfo = connectedUsers.get(socket.id);
        if (userInfo) {
            userInfo.lastSeen = new Date().toISOString();
        }
        socket.emit('pong');
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        const userInfo = connectedUsers.get(socket.id);
        if (userInfo) {
            console.log(`${new Date().toISOString()} - User disconnected: ${userInfo.deviceId} (${reason})`);
            
            connectedUsers.delete(socket.id);
            userSockets.delete(userInfo.deviceId);
            
            // Broadcast to remaining clients
            socket.broadcast.emit('user-disconnected', {
                deviceId: userInfo.deviceId,
                deviceName: userInfo.deviceName,
                reason: reason,
                totalUsers: connectedUsers.size
            });
        }
    });
    
    // Handle errors
    socket.on('error', (error) => {
        console.error(`Socket error (${socket.id}):`, error);
    });
});

// Start server
server.listen(SERVER_PORT, SERVER_IP, () => {
    console.log('='.repeat(50));
    console.log('🚀 Zell0 Server Started Successfully!');
    console.log('='.repeat(50));
    console.log(`📡 Server IP: ${SERVER_IP}`);
    console.log(`🔌 Port: ${SERVER_PORT}`);
    console.log(`🌐 Health Check: http://${SERVER_IP}:${SERVER_PORT}/health`);
    console.log(`📊 Server Info: http://${SERVER_IP}:${SERVER_PORT}/info`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(50));
    console.log('✅ Ready to accept Android client connections!');
    console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped gracefully');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
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
        }
    }
}, 60000); // Check every minute 