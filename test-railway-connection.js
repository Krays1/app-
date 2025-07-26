const https = require('https');

const RAILWAY_URL = 'https://app--dependable-unity-production.up.railway.app';

console.log('🔍 Testing Railway Server Connection...\n');

// Test 1: Basic connectivity
console.log('1️⃣ Testing basic connectivity...');
https.get(RAILWAY_URL, (res) => {
    console.log(`✅ Server is responding! Status: ${res.statusCode}`);
    console.log(`📡 Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    // Test 2: API endpoints
    console.log('\n2️⃣ Testing API endpoints...');
    
    // Test health endpoint
    https.get(`${RAILWAY_URL}/health`, (res) => {
        console.log(`✅ Health endpoint: ${res.statusCode}`);
        
        // Test API base
        https.get(`${RAILWAY_URL}/api`, (res) => {
            console.log(`✅ API base: ${res.statusCode}`);
            
            // Test online users endpoint
            https.get(`${RAILWAY_URL}/api/online-users`, (res) => {
                console.log(`✅ Online users endpoint: ${res.statusCode}`);
                
                console.log('\n🎉 Railway server is working correctly!');
                console.log(`📱 Your Android app should now connect to: ${RAILWAY_URL}`);
                console.log(`🌐 Your website can use: ${RAILWAY_URL}/api/*`);
                
            }).on('error', (err) => {
                console.log(`❌ Online users endpoint error: ${err.message}`);
            });
            
        }).on('error', (err) => {
            console.log(`❌ API base error: ${err.message}`);
        });
        
    }).on('error', (err) => {
        console.log(`❌ Health endpoint error: ${err.message}`);
    });
    
}).on('error', (err) => {
    console.log(`❌ Connection failed: ${err.message}`);
    console.log('💡 Make sure your Railway server is deployed and running.');
}); 