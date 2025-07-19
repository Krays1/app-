// Auto-detecting IP Server for Zell0
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const os = require('os');

// Function to get the best IP address
function getBestIPAddress() {
    const interfaces = os.networkInterfaces();
    
    // Priority order: VPN, WiFi, Ethernet, then localhost
    const priorityOrder = ['VPN', 'WiFi', 'Ethernet', 'Local Area Connection'];
    
    for (const priority of priorityOrder) {
        for (const [name, addrs] of Object.entries(interfaces)) {
            if (name.toLowerCase().includes(priority.toLowerCase())) {
                for (const addr of addrs) {
                    if (addr.family === 'IPv4' && !addr.internal) {
                        return addr.address;
                    }
                }
            }
        }
    }
    
    // Fallback: any non-internal IPv4 address
    for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) {
                return addr.address;
            }
        }
    }
    
    // Final fallback: localhost
    return '127.0.0.1';
}

// Get the best IP address
const SERVER_IP = getBestIPAddress();
const SERVER_PORT = 3000;

console.log('🔍 Available Network Interfaces:');
const interfaces = os.networkInterfaces();
for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
        if (addr.family === 'IPv4') {
            console.log(`   ${name}: ${addr.address}${addr.internal ? ' (internal)' : ''}`);
        }
    }
}
console.log(`\n🎯 Selected IP: ${SERVER_IP}`);

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

const io = socketIo(server, {
    cors: { origin: "*" }
});

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
        serverPort: SERVER_PORT,
        networkInterfaces: Object.keys(interfaces).length
    });
});

// Server info endpoint
app.get('/info', (req, res) => {
    res.json({
        name: 'Zell0 Server',
        version: '1.0.0',
        serverIP: SERVER_IP,
        serverPort: SERVER_PORT,
        description: 'Auto-configured walkie-talkie server',
        availableInterfaces: Object.fromEntries(
            Object.entries(interfaces).map(([name, addrs]) => [
                name,
                addrs.filter(addr => addr.family === 'IPv4').map(addr => addr.address)
            ])
        )
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`${new Date().toISOString()} - New client connected: ${socket.id}`);
    
    socket.on('register', (data) => {
        try {
            const { deviceId, deviceName, userInfo } = data;
            
            const existingSocket = userSockets.get(deviceId);
            if (existingSocket && existingSocket !== socket.id) {
                connectedUsers.delete(existingSocket);
                io.to(existingSocket).emit('duplicate-connection');
            }
            
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
            
            socket.emit('registered', {
                success: true,
                deviceId: deviceId,
                connectedUsers: connectedUsers.size,
                serverIP: SERVER_IP
            });
            
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
            
            userInfo.lastSeen = new Date().toISOString();
            io.emit('text-message', message);
            
        } catch (error) {
            console.error('Text message error:', error);
            socket.emit('error', { message: 'Message sending failed' });
        }
    });
    
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
            
            userInfo.lastSeen = new Date().toISOString();
            socket.broadcast.emit('voice-message', message);
            
        } catch (error) {
            console.error('Voice message error:', error);
            socket.emit('error', { message: 'Voice message sending failed' });
        }
    });
    
    socket.on('ping', () => {
        const userInfo = connectedUsers.get(socket.id);
        if (userInfo) {
            userInfo.lastSeen = new Date().toISOString();
        }
        socket.emit('pong');
    });
    
    socket.on('disconnect', (reason) => {
        const userInfo = connectedUsers.get(socket.id);
        if (userInfo) {
            console.log(`${new Date().toISOString()} - User disconnected: ${userInfo.deviceId} (${reason})`);
            
            connectedUsers.delete(socket.id);
            userSockets.delete(userInfo.deviceId);
            
            socket.broadcast.emit('user-disconnected', {
                deviceId: userInfo.deviceId,
                deviceName: userInfo.deviceName,
                reason: reason,
                totalUsers: connectedUsers.size
            });
        }
    });
});

// Start server
server.listen(SERVER_PORT, SERVER_IP, () => {
    console.log('='.repeat(60));
    console.log('🚀 Zell0 Server Started Successfully!');
    console.log('='.repeat(60));
    console.log(`📡 Server IP: ${SERVER_IP}`);
    console.log(`🔌 Port: ${SERVER_PORT}`);
    console.log(`🌐 Health Check: http://${SERVER_IP}:${SERVER_PORT}/health`);
    console.log(`📊 Server Info: http://${SERVER_IP}:${SERVER_PORT}/info`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(60));
    console.log('✅ Ready to accept Android client connections!');
    console.log('📱 Update your Android app to connect to this IP address');
    console.log('🛑 Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped gracefully');
        process.exit(0);
    });
});

// Cleanup stale connections
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
}, 60000); 