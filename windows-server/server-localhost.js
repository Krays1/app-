// Test server on localhost
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const SERVER_IP = '127.0.0.1'; // localhost
const SERVER_PORT = 3000;

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

const io = socketIo(server, {
    cors: { origin: "*" }
});

const connectedUsers = new Map();

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

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    
    socket.on('register', (data) => {
        connectedUsers.set(socket.id, data);
        console.log(`User registered: ${data.deviceId}`);
    });
    
    socket.on('disconnect', () => {
        connectedUsers.delete(socket.id);
        console.log(`Client disconnected: ${socket.id}`);
    });
});

server.listen(SERVER_PORT, SERVER_IP, () => {
    console.log('🚀 Test Server Started on localhost!');
    console.log(`📡 Server: http://${SERVER_IP}:${SERVER_PORT}`);
    console.log(`🔗 Health: http://${SERVER_IP}:${SERVER_PORT}/health`);
    console.log('✅ Press Ctrl+C to stop');
});

process.on('SIGINT', () => {
    console.log('\n🛑 Stopping server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
}); 