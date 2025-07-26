const { app, BrowserWindow, ipcMain } = require('electron');
const NetworkManager = require('./network-manager');

console.log('=== Zell0 Desktop Debug Script ===');

// Test network manager directly
const networkManager = new NetworkManager({
    host: '172.94.3.216',
    port: 3001
});

// Add event listeners
networkManager.on('connected', () => {
    console.log('✅ Network manager: Connected');
});

networkManager.on('disconnected', () => {
    console.log('❌ Network manager: Disconnected');
});

networkManager.on('registered', (data) => {
    console.log('✅ Network manager: Registered', data);
});

networkManager.on('user-joined', (user) => {
    console.log('✅ Network manager: User joined', user);
});

networkManager.on('user-left', (user) => {
    console.log('✅ Network manager: User left', user);
});

networkManager.on('user-list', (users) => {
    console.log('✅ Network manager: User list received', users.length, 'users');
    users.forEach(user => {
        console.log(`  - ${user.username} (${user.deviceName})`);
    });
});

networkManager.on('text-message', (message) => {
    console.log('✅ Network manager: Text message received', message);
});

networkManager.on('error', (error) => {
    console.error('❌ Network manager: Error', error);
});

// Test connection
async function testConnection() {
    try {
        console.log('Testing connection...');
        
        const userData = {
            username: 'DebugUser',
            deviceId: 'debug-desktop-' + Date.now(),
            deviceName: 'Debug Desktop',
            profilePic: null
        };
        
        await networkManager.connect(userData);
        console.log('Connection test completed');
        
        // Keep running for a bit to see events
        setTimeout(() => {
            console.log('Test completed, disconnecting...');
            networkManager.disconnect();
            process.exit(0);
        }, 10000);
        
    } catch (error) {
        console.error('Connection test failed:', error);
        process.exit(1);
    }
}

testConnection(); 