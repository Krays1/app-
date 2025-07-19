const http = require('http');

console.log('🔍 Testing Plex API connectivity...\n');

const plexUrls = [
    'http://127.0.0.1:32400',
    'http://localhost:32400'
];

async function testPlexUrl(url) {
    return new Promise((resolve, reject) => {
        const testUrl = `${url}/identity`;
        
        console.log(`Testing: ${testUrl}`);
        
        const req = http.get(testUrl, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`✅ SUCCESS: Connected to Plex server`);
                        console.log(`   Server: ${json.friendlyName || 'Unknown'}`);
                        console.log(`   Version: ${json.version || 'Unknown'}`);
                        console.log(`   Platform: ${json.platform || 'Unknown'}`);
                        resolve(url);
                    } catch (e) {
                        console.log(`❌ ERROR: Invalid JSON response`);
                        reject(e);
                    }
                } else {
                    console.log(`❌ ERROR: HTTP ${res.statusCode}`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (err) => {
            console.log(`❌ ERROR: ${err.message}`);
            reject(err);
        });
        
        req.setTimeout(5000, () => {
            console.log(`❌ ERROR: Timeout`);
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

async function testAllUrls() {
    for (const url of plexUrls) {
        try {
            await testPlexUrl(url);
            console.log('\n🎉 Plex server is accessible!');
            return;
        } catch (e) {
            console.log('');
            continue;
        }
    }
    
    console.log('\n❌ Could not connect to any Plex server URLs');
    console.log('Make sure your Plex server is running on port 32400');
}

testAllUrls(); 