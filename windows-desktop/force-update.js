// Force UI update test
console.log('=== Force UI Update Test ===');

// Simulate received message
const testMessage = {
    id: Date.now(),
    text: 'Test message from Android',
    senderId: 'krays1',
    senderName: 'krays1',
    senderProfilePic: null,
    timestamp: Date.now(),
    type: 'text'
};

// Simulate user list
const testUsers = [
    {
        username: 'krays1',
        deviceId: 'android-device',
        deviceName: 'Android Device',
        profilePic: null
    },
    {
        username: 'krays2',
        deviceId: 'desktop-device',
        deviceName: 'Windows Desktop',
        profilePic: null
    }
];

console.log('Test message:', testMessage);
console.log('Test users:', testUsers);

// This will be called from the renderer process
window.testUIUpdate = function() {
    console.log('Testing UI update...');
    
    // Update connection status
    if (window.updateConnectionStatus) {
        window.updateConnectionStatus('connected');
    }
    
    // Update user list
    if (window.handleUserList) {
        window.handleUserList(testUsers);
    }
    
    // Add test message
    if (window.handleTextMessage) {
        window.handleTextMessage(testMessage);
    }
    
    console.log('UI update test completed');
};

console.log('Force update script loaded'); 