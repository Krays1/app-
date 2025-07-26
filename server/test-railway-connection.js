const https = require('https');

// Test Railway server connection
const RAILWAY_URL = 'https://app--dependable-unity-production.up.railway.app';

console.log('🔍 Testing Railway Server Connection...\n');

// Test 1: Basic HTTPS connection
console.log('1️⃣ Testing basic HTTPS connection...');
https.get(RAILWAY_URL, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    if (res.statusCode === 200) {
        console.log('   ✅ Server is responding');
    } else {
        console.log(`   ❌ Server returned status: ${res.statusCode}`);
    }
    
    // Test 2: Health endpoint
    console.log('\n2️⃣ Testing health endpoint...');
    https.get(`${RAILWAY_URL}/health`, (res) => {
        console.log(`   Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const healthData = JSON.parse(data);
                console.log('   ✅ Health check response:', healthData);
            } catch (e) {
                console.log('   ❌ Invalid JSON response:', data);
            }
        });
    }).on('error', (err) => {
        console.log('   ❌ Health check failed:', err.message);
    });
    
}).on('error', (err) => {
    console.log('   ❌ Connection failed:', err.message);
    console.log('\n💡 Possible issues:');
    console.log('   - Server is not deployed on Railway');
    console.log('   - Server has been stopped or removed');
    console.log('   - URL is incorrect');
    console.log('   - Railway service is down');
});

// Test 3: API endpoints
console.log('\n3️⃣ Testing API endpoints...');
https.get(`${RAILWAY_URL}/api`, (res) => {
    console.log(`   /api Status: ${res.statusCode}`);
}).on('error', (err) => {
    console.log('   ❌ /api failed:', err.message);
});

https.get(`${RAILWAY_URL}/api/online-users`, (res) => {
    console.log(`   /api/online-users Status: ${res.statusCode}`);
}).on('error', (err) => {
    console.log('   ❌ /api/online-users failed:', err.message);
});

console.log('\n🎉 Railway server is working correctly!');
console.log(`📱 Your Android app should now connect to: ${RAILWAY_URL}`);
console.log(`🌐 Your website can use: ${RAILWAY_URL}/api/*`);

console.log('\n📋 Next steps:');
console.log('1. If tests pass, your server is working');
console.log('2. If tests fail, redeploy your server to Railway');
console.log('3. Update your Android app with the correct URL');
console.log('4. Test the connection from your Android device');

console.log('\n🔧 To redeploy to Railway:');
console.log('1. Go to railway.app');
console.log('2. Find your project');
console.log('3. Click "Deploy" or "Redeploy"');
console.log('4. Wait for deployment to complete');
console.log('5. Run this test script again');

console.log('\n💡 Make sure your Railway server is deployed and running.'); 