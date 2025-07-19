// Test VPN IP Binding for Zell0 Server
const http = require('http');

const SERVER_IP = '172.94.3.216';
const SERVER_PORT = 3000;

console.log('Testing VPN IP binding...');
console.log('='.repeat(40));
console.log(`Attempting to bind to: ${SERVER_IP}:${SERVER_PORT}`);
console.log('='.repeat(40));

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'success',
        message: 'VPN IP binding test successful',
        serverIP: SERVER_IP,
        serverPort: SERVER_PORT,
        timestamp: new Date().toISOString()
    }));
});

server.listen(SERVER_PORT, SERVER_IP, () => {
    console.log('✅ SUCCESS: VPN IP binding works!');
    console.log(`📡 Server running on: http://${SERVER_IP}:${SERVER_PORT}`);
    console.log('🌐 Test URL: http://' + SERVER_IP + ':' + SERVER_PORT);
    console.log('');
    console.log('Your VPN IP is configured correctly!');
    console.log('You can now start the full server using:');
    console.log('  START-VPN-SERVER.bat');
    console.log('');
    console.log('Press Ctrl+C to stop this test');
});

server.on('error', (error) => {
    console.log('❌ FAILED: Cannot bind to VPN IP');
    console.log('Error:', error.message);
    console.log('');
    console.log('Possible solutions:');
    console.log('1. Ensure VPN is connected and IP 172.94.3.216 is available');
    console.log('2. Check network adapter configuration');
    console.log('3. Run as Administrator');
    console.log('4. Check Windows Firewall settings');
    console.log('');
    console.log('Alternative: Use localhost testing with server-localhost.js');
});

process.on('SIGINT', () => {
    console.log('\n🛑 Test stopped');
    server.close();
    process.exit(0);
}); 