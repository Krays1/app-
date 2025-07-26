const io = require('socket.io-client');

async function testConnection() {
    console.log('Testing connection to Zell0 server...');
    
    const socket = io('http://172.94.3.216:3001', {
        transports: ['websocket', 'polling'],
        timeout: 5000
    });
    
    socket.on('connect', () => {
        console.log('✅ Connected to server successfully!');
        
        // Test registration
        const testUser = {
            username: 'TestUser',
            deviceId: 'test-desktop-' + Date.now(),
            deviceName: 'Test Desktop',
            profilePic: null
        };
        
        console.log('Registering test user:', testUser.username);
        socket.emit('register', testUser);
    });
    
    socket.on('registration_success', (data) => {
        console.log('✅ Registration successful:', data);
        
        // Request user list
        console.log('Requesting user list...');
        socket.emit('request_user_list');
    });
    
    socket.on('user_list', (data) => {
        console.log('✅ User list received:', data.users.length, 'users');
        data.users.forEach(user => {
            console.log(`  - ${user.username} (${user.deviceName})`);
        });
        
        // Send test message
        console.log('Sending test message...');
        socket.emit('send_text_message', {
            message: 'Hello from desktop test!',
            timestamp: Date.now()
        });
        
        // Disconnect after test
        setTimeout(() => {
            console.log('Test completed, disconnecting...');
            socket.disconnect();
            process.exit(0);
        }, 2000);
    });
    
    socket.on('text_message_received', (data) => {
        console.log('✅ Message received:', data);
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    });
    
    socket.on('registration_error', (error) => {
        console.error('❌ Registration failed:', error);
        process.exit(1);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
        console.error('❌ Test timeout');
        process.exit(1);
    }, 10000);
}

testConnection().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
}); 