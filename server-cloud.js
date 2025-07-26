const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store connected users
const connectedUsers = new Map();
const userSockets = new Map();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        onlineUsers: connectedUsers.size,
        totalConnections: connectedUsers.size,
        uptime: process.uptime()
    });
});

// Get online users endpoint
app.get('/api/online-users', (req, res) => {
    const users = Array.from(connectedUsers.values()).map(user => ({
        username: user.username || user.deviceId,
        deviceId: user.deviceId,
        connectedAt: user.connectedAt,
        lastSeen: user.lastSeen,
        clientIP: user.clientIP
    }));
    
    res.json({
        users: users,
        count: users.length,
        timestamp: new Date().toISOString()
    });
});

// API endpoint
app.get('/api', (req, res) => {
    res.json({
        message: 'Zell0 Server API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        onlineUsers: connectedUsers.size
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    const clientIP = socket.handshake.address;
    console.log(`📱 New client connected: ${socket.id}`);
    
    // Handle user registration
    socket.on('register', (data) => {
        try {
            const { username, deviceId, timestamp } = data;
            const userId = username || deviceId; // Use username if available, fallback to deviceId
            
            // Store user information
            connectedUsers.set(socket.id, {
                deviceId: userId,
                username: userId,
                socketId: socket.id,
                connectedAt: new Date().toISOString(),
                lastSeen: Date.now(), // Store as timestamp
                clientIP
            });
            
            userSockets.set(userId, socket.id);
            
            // Notify other users
            socket.broadcast.emit('user_joined', { 
                userId: userId,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ User registered: ${userId} (${socket.id})`);
            
            // Send registration confirmation
            socket.emit('registration_confirmed', {
                deviceId: userId,
                username: userId,
                serverTime: new Date().toISOString(),
                connectedUsers: Array.from(connectedUsers.values()).map(u => u.username || u.deviceId)
            });
            
            // Send updated user list to all clients
            const userList = Array.from(connectedUsers.values()).map(user => ({
                username: user.username || user.deviceId,
                profilePic: null,
                isOnline: true,
                lastSeen: user.lastSeen
            }));
            
            io.emit('user_list_updated', {
                users: userList
            });
            
        } catch (error) {
            console.error('Error in register:', error);
            socket.emit('error', { message: 'Registration failed' });
        }
    });
    
    // Handle text messages
    socket.on('text-message', (data) => {
        try {
            const { message, username, timestamp, type } = data;
            
            // Update last seen
            const userInfo = connectedUsers.get(socket.id);
            if (userInfo) {
                userInfo.lastSeen = Date.now(); // Update as timestamp
            }
            
            // Broadcast to all other users
            socket.broadcast.emit('text_message_received', {
                text: message,
                senderId: username,
                senderName: username,
                timestamp: timestamp,
                serverTimestamp: new Date().toISOString()
            });
            
            console.log(`${new Date().toISOString()} - Text message from ${username}: ${message.substring(0, 50)}...`);
            
        } catch (error) {
            console.error('Error in text-message:', error);
            socket.emit('error', { message: 'Failed to send text message' });
        }
    });
    
    // Handle audio messages
    socket.on('voice-message', (data) => {
        try {
            const { audioData, username, timestamp, type, duration } = data;
            
            // Update last seen
            const userInfo = connectedUsers.get(socket.id);
            if (userInfo) {
                userInfo.lastSeen = Date.now(); // Update as timestamp
            }
            
            // Broadcast to all other users
            socket.broadcast.emit('voice_message_received', {
                audioData: audioData,
                senderId: username,
                senderName: username,
                duration: duration,
                timestamp: timestamp,
                serverTimestamp: new Date().toISOString()
            });
            
            console.log(`${new Date().toISOString()} - Voice message from ${username}: ${duration}ms`);
            
        } catch (error) {
            console.error('Error in voice-message:', error);
            socket.emit('error', { message: 'Failed to send voice message' });
        }
    });
    
    // Handle keep alive
    socket.on('keep_alive', (data) => {
        try {
            const { deviceId, timestamp } = data;
            
            // Update last seen
            const userInfo = connectedUsers.get(socket.id);
            if (userInfo) {
                userInfo.lastSeen = Date.now(); // Update as timestamp
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
                const { deviceId, username } = userInfo;
                const userId = username || deviceId;
                
                // Remove user from maps
                connectedUsers.delete(socket.id);
                userSockets.delete(userId);
                
                // Notify other users
                socket.broadcast.emit('user_left', { 
                    userId: userId,
                    timestamp: new Date().toISOString()
                });
                
                // Send updated user list to remaining clients
                const userList = Array.from(connectedUsers.values()).map(user => ({
                    username: user.username || user.deviceId,
                    profilePic: null,
                    isOnline: true,
                    lastSeen: user.lastSeen
                }));
                
                io.emit('user_list_updated', {
                    users: userList
                });
                
                console.log(`${new Date().toISOString()} - User disconnected: ${userId} (${socket.id}) - Reason: ${reason}`);
            } else {
                console.log(`${new Date().toISOString()} - Unknown user disconnected: ${socket.id} - Reason: ${reason}`);
            }
        } catch (error) {
            console.error('Error in disconnect:', error);
        }
    });
});

// Start server
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log('🚀 Zell0 Server - Cloud Configuration');
    console.log('=====================================');
    console.log(`📡 Binding to: ${HOST}`);
    console.log(`🔌 Port: ${PORT}`);
    console.log('=====================================');
    console.log('🚀 Zell0 Cloud Server Started Successfully!');
    console.log('============================================================');
    console.log(`📡 Server URL: http://${HOST}:${PORT}`);
    console.log(`🌐 Health Check: http://${HOST}:${PORT}/health`);
    console.log(`📊 API Base: http://${HOST}:${PORT}/api`);
    console.log('============================================================');
    console.log('✅ Ready for Android app and website connections!');
    console.log('📱 Android devices can now connect for real-time data');
    console.log('🌐 Website can now fetch live statistics');
    console.log('🛑 Press Ctrl+C to stop the server');
    console.log('============================================================');
}); 