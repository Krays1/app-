const http = require('http');
const https = require('https');

// Configuration - updated with your actual Plex settings
const PLEX_IP = '192.168.1.182'; // Your PC's actual IP address
const PLEX_PORT = '32400';
const PLEX_TOKEN = '8k4gRqLsCyXsSBfK3z3T'; // Your actual Plex token

console.log('🔧 Testing Plex Library Contents');
console.log('=====================================');
console.log(`Server IP: ${PLEX_IP}`);
console.log(`Port: ${PLEX_PORT}`);
console.log(`Token: ***`);
console.log('=====================================\n');

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        const req = client.get(url, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function testLibraryContents() {
    try {
        console.log('Starting library contents tests...\n');
        
        // Test 1: Get libraries
        console.log('✅ Getting libraries...');
        const librariesUrl = `http://${PLEX_IP}:${PLEX_PORT}/library/sections?X-Plex-Token=${PLEX_TOKEN}`;
        const librariesResponse = await makeRequest(librariesUrl);
        
        // Check if response is XML or JSON
        if (librariesResponse.trim().startsWith('<?xml')) {
            console.log('📄 Server returned XML response (this is normal for Plex)');
            console.log('✅ Libraries endpoint is working');
            console.log('The Zell0 app will handle XML parsing automatically');
            return;
        }
        
        const librariesJson = JSON.parse(librariesResponse);
        
        if (librariesJson.MediaContainer && librariesJson.MediaContainer.Directory) {
            const libraries = librariesJson.MediaContainer.Directory;
            console.log(`Found ${libraries.length} libraries`);
            
            // Test each library
            for (let i = 0; i < Math.min(libraries.length, 3); i++) { // Test first 3 libraries
                const library = libraries[i];
                console.log(`\n📚 Testing library: ${library.title} (ID: ${library.key})`);
                
                // Test 2: Get library contents
                const contentsUrl = `http://${PLEX_IP}:${PLEX_PORT}/library/sections/${library.key}/all?X-Plex-Token=${PLEX_TOKEN}`;
                const contentsResponse = await makeRequest(contentsUrl);
                const contentsJson = JSON.parse(contentsResponse);
                
                if (contentsJson.MediaContainer && contentsJson.MediaContainer.Metadata) {
                    const items = contentsJson.MediaContainer.Metadata;
                    console.log(`✅ Found ${items.length} items in ${library.title}`);
                    
                    // Show first few items
                    for (let j = 0; j < Math.min(items.length, 3); j++) {
                        const item = items[j];
                        console.log(`  • ${item.title} (${item.year || 'N/A'}) - ${item.type}`);
                    }
                    
                    if (items.length > 3) {
                        console.log(`  ... and ${items.length - 3} more items`);
                    }
                } else {
                    console.log(`❌ No items found in ${library.title}`);
                }
            }
        } else {
            console.log('❌ No libraries found');
        }
        
        console.log('\n=====================================');
        console.log('Test completed!');
        console.log('\nIf all tests passed, your Plex libraries are accessible.');
        console.log('You can now browse and play media in the Zell0 app!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure Plex Media Server is running');
        console.log('2. Check that the IP address is correct');
        console.log('3. Verify the token is valid');
        console.log('4. Ensure your PC and this device are on the same network');
    }
}

testLibraryContents(); 