// Simple test script to check if Zell0 Server is running
const http = require('http');

const SERVER_IP = '172.94.3.216';
const SERVER_PORT = 3000;

console.log('Testing Zell0 Server...');
console.log('='.repeat(40));

// Test health endpoint
const options = {
    hostname: SERVER_IP,
    port: SERVER_PORT,
    path: '/health',
    method: 'GET',
    timeout: 5000
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log('🎉 SUCCESS: Server is UP and running!');
            console.log('📊 Server Status:', response.status);
            console.log('👥 Connected Users:', response.connectedUsers);
            console.log('🌐 Server IP:', response.serverIP);
            console.log('⏰ Uptime:', Math.floor(response.uptime), 'seconds');
            console.log('🔗 Health URL: http://' + SERVER_IP + ':' + SERVER_PORT + '/health');
            console.log('📱 Ready for Android connections!');
        } catch (error) {
            console.log('❌ Invalid response format:', data);
        }
    });
});

req.on('error', (error) => {
    console.log('❌ Server is NOT running or not accessible');
    console.log('Error:', error.message);
    console.log('');
    console.log('To start the server manually:');
    console.log('1. node server-only.js    (Command-line only)');
    console.log('2. npx electron .          (With GUI)');
});

req.on('timeout', () => {
    console.log('❌ Server test timed out');
    req.destroy();
});

req.end(); 