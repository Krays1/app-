const io = require('socket.io-client');

const SERVER_URL = 'http://172.94.3.216:3001';

console.log('Testing basic server connection...');

const socket = io(SERVER_URL);

socket.on('connect', () => {
    console.log('✅ Connected to server');
    console.log('Socket ID:', socket.id);
    
    // Just emit a simple event to test
    console.log('📡 Testing basic event emission...');
    socket.emit('test', { message: 'Hello server' });
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

// Listen for any events
socket.onAny((eventName, ...args) => {
    console.log(`📨 Received event: ${eventName}`, args);
});

// Timeout after 5 seconds
setTimeout(() => {
    console.log('⏰ Test completed');
    socket.disconnect();
    process.exit(0);
}, 5000); 