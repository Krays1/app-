const io = require('socket.io-client');

console.log('=== Testing Fixed Message Sending ===');

const socket = io('http://172.94.3.216:3001', {
    transports: ['websocket', 'polling'],
    timeout: 10000
});

socket.on('connect', () => {
    console.log('✅ Connected to server!');
    
    const testUser = {
        username: 'TestFixedSender',
        deviceId: 'test-fixed-sender-' + Date.now(),
        deviceName: 'Test Fixed Sender',
        profilePic: null
    };
    
    console.log('Registering:', testUser.username);
    socket.emit('register', testUser);
});

socket.on('registration_success', (data) => {
    console.log('✅ Registration successful!');
    
    // Wait a moment then send test message with CORRECT event name
    setTimeout(() => {
        console.log('Sending test message with FIXED event name...');
        socket.emit('text-message', {
            message: 'Hello from FIXED desktop sender!',
            timestamp: Date.now(),
            type: 'text'
        });
    }, 2000);
});

socket.on('text-message', (data) => {
    console.log('✅ Message received:', data);
});

socket.on('message_sent', (data) => {
    console.log('✅ Message sent confirmation:', data);
});

socket.on('message_error', (error) => {
    console.error('❌ Message error:', error);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
});

socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
    process.exit(1);
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});

// Timeout
setTimeout(() => {
    console.log('Test completed');
    socket.disconnect();
    process.exit(0);
}, 10000); 