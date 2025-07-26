const io = require('socket.io-client');

console.log('=== Testing Enhanced Desktop App Features ===');

const socket = io('http://172.94.3.216:3001', {
    transports: ['websocket', 'polling'],
    timeout: 10000
});

socket.on('connect', () => {
    console.log('✅ Connected to server!');
    
    const testUser = {
        username: 'EnhancedTestUser',
        deviceId: 'enhanced-test-' + Date.now(),
        deviceName: 'Enhanced Desktop Test',
        profilePic: null
    };
    
    console.log('Registering:', testUser.username);
    socket.emit('register', testUser);
});

socket.on('registration_success', (data) => {
    console.log('✅ Registration successful!');
    
    // Test user list request
    setTimeout(() => {
        console.log('Requesting user list...');
        socket.emit('get-user-list');
    }, 1000);
});

socket.on('user_list_updated', (data) => {
    console.log('✅ User list updated received:', data.users.length, 'users');
    data.users.forEach(user => {
        console.log(`  - ${user.username} (${user.deviceName || 'Unknown device'})`);
    });
});

socket.on('user_joined', (user) => {
    console.log('✅ User joined:', user);
});

socket.on('user_left', (user) => {
    console.log('✅ User left:', user);
});

socket.on('text_message_received', (data) => {
    console.log('✅ Text message received:', data);
});

socket.on('voice_message_received', (data) => {
    console.log('✅ Voice message received:', data.audioData.length, 'bytes');
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

// Test audio settings simulation
console.log('\n=== Audio Settings Test ===');
console.log('Simulating audio device enumeration...');

// Simulate available audio devices
const mockAudioDevices = {
    microphones: [
        { deviceId: 'default', label: 'Default Microphone' },
        { deviceId: 'mic1', label: 'USB Microphone' },
        { deviceId: 'mic2', label: 'Built-in Microphone' }
    ],
    speakers: [
        { deviceId: 'default', label: 'Default Speakers' },
        { deviceId: 'spk1', label: 'USB Headphones' },
        { deviceId: 'spk2', label: 'HDMI Audio' }
    ]
};

console.log('Available Microphones:');
mockAudioDevices.microphones.forEach(mic => {
    console.log(`  - ${mic.label} (${mic.deviceId})`);
});

console.log('Available Speakers:');
mockAudioDevices.speakers.forEach(spk => {
    console.log(`  - ${spk.label} (${spk.deviceId})`);
});

console.log('\n=== Audio Settings Recommendations ===');
console.log('For best voice quality:');
console.log('- Sample Rate: 16,000 Hz');
console.log('- Channels: Mono (1)');
console.log('- Microphone Volume: 60-80%');
console.log('- Speaker Volume: 60-80%');
console.log('- Echo Cancellation: Enabled');
console.log('- Noise Suppression: Enabled');
console.log('- Auto Gain Control: Disabled');

// Timeout
setTimeout(() => {
    console.log('\nTest completed');
    socket.disconnect();
    process.exit(0);
}, 15000); 