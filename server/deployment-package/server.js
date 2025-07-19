const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files for web dashboard (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const connectedUsers = new Map();
const userSockets = new Map();

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        connectedUsers: connectedUsers.size,
        uptime: process.uptime()
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    const clientIP = socket.handshake.address;
    console.log(`${new Date().toISOString()} - User connected: ${socket.id} from ${clientIP}`);
    
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

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`${new Date().toISOString()} - Zell0 Server running on ${HOST}:${PORT}`);
    console.log(`${new Date().toISOString()} - Health check available at http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
}); 