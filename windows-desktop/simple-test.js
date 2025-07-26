const io = require('socket.io-client');

console.log('Testing connection to Zell0 server...');

const socket = io('http://172.94.3.216:3001', {
    transports: ['websocket', 'polling'],
    timeout: 10000
});

socket.on('connect', () => {
    console.log('✅ Connected to server!');
    
    const testUser = {
        username: 'DesktopTest',
        deviceId: 'desktop-test-' + Date.now(),
        deviceName: 'Desktop Test',
        profilePic: null
    };
    
    console.log('Registering:', testUser.username);
    socket.emit('register', testUser);
});

socket.on('registration_success', (data) => {
    console.log('✅ Registration successful!');
    console.log('User data:', data);
    
    // Request user list
    socket.emit('request_user_list');
});

socket.on('user_list', (data) => {
    console.log('✅ User list received!');
    console.log('Users:', data.users.length);
    data.users.forEach(user => {
        console.log(`  - ${user.username} (${user.deviceName})`);
    });
    
    // Send test message
    socket.emit('send_text_message', {
        message: 'Hello from desktop!',
        timestamp: Date.now()
    });
    
    setTimeout(() => {
        console.log('Test completed');
        socket.disconnect();
        process.exit(0);
    }, 3000);
});

socket.on('text_message_received', (data) => {
    console.log('✅ Message received:', data);
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
    console.error('❌ Test timeout');
    process.exit(1);
}, 15000); 