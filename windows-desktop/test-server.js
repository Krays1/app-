const http = require('http');

const SERVER_HOST = '172.94.3.216';
const SERVER_PORT = 3001;

console.log('Testing server connectivity...');
console.log(`Server: ${SERVER_HOST}:${SERVER_PORT}`);
console.log('');

const options = {
    hostname: SERVER_HOST,
    port: SERVER_PORT,
    path: '/',
    method: 'GET',
    timeout: 5000
};

const req = http.request(options, (res) => {
    console.log(`✅ Server is responding!`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(`Response length: ${data.length} characters`);
        if (data.length > 0) {
            console.log(`Response preview: ${data.substring(0, 200)}...`);
        }
        console.log('');
        console.log('✅ Server test completed successfully!');
        process.exit(0);
    });
});

req.on('error', (error) => {
    console.log(`❌ Server connection failed: ${error.message}`);
    console.log('');
    console.log('Possible issues:');
    console.log('1. Server is not running');
    console.log('2. Firewall blocking connection');
    console.log('3. Network connectivity issues');
    console.log('4. Wrong IP address or port');
    process.exit(1);
});

req.on('timeout', () => {
    console.log('❌ Server connection timeout');
    req.destroy();
    process.exit(1);
});

req.end(); 