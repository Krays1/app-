// Quick IP Address Detection for Zell0 Server
const os = require('os');

console.log('🔍 Available Network Interfaces:');
console.log('='.repeat(50));

const interfaces = os.networkInterfaces();
let recommendedIP = null;

for (const [name, addrs] of Object.entries(interfaces)) {
    console.log(`\n📡 ${name}:`);
    for (const addr of addrs) {
        if (addr.family === 'IPv4') {
            const status = addr.internal ? '(internal/loopback)' : '(external/network)';
            console.log(`   ${addr.address} ${status}`);
            
            // Select the best IP for Android connections
            if (!addr.internal && !recommendedIP) {
                recommendedIP = addr.address;
            }
        }
    }
}

console.log('\n='.repeat(50));
if (recommendedIP) {
    console.log(`🎯 RECOMMENDED IP FOR ANDROID APP: ${recommendedIP}`);
    console.log(`📱 Update your Android app to use: http://${recommendedIP}:3000`);
} else {
    console.log('⚠️  No external IP found. Use 127.0.0.1 for localhost testing.');
    console.log('📱 Update your Android app to use: http://127.0.0.1:3000');
}
console.log('='.repeat(50)); 