const io = require('socket.io-client');

console.log('=== Testing Message Sending ===');

const socket = io('http://172.94.3.216:3001', {
    transports: ['websocket', 'polling'],
    timeout: 10000
});

socket.on('connect', () => {
    console.log('✅ Connected to server!');
    
    const testUser = {
        username: 'TestSender',
        deviceId: 'test-sender-' + Date.now(),
        deviceName: 'Test Sender',
        profilePic: null
    };
    
    console.log('Registering:', testUser.username);
    socket.emit('register', testUser);
});

socket.on('registration_success', (data) => {
    console.log('✅ Registration successful!');
    
    // Wait a moment then send test message
    setTimeout(() => {
        console.log('Sending test message...');
        socket.emit('send_text_message', {
            message: 'Hello from test sender!',
            timestamp: Date.now(),
            type: 'text'
        });
    }, 2000);
});

socket.on('text_message_received', (data) => {
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