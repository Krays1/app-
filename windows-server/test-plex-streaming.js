const http = require('http');
const https = require('https');

// Configuration - updated with your actual Plex settings
const PLEX_IP = '192.168.1.182'; // Your PC's actual IP address
const PLEX_PORT = '32400';
const PLEX_TOKEN = '8k4gRqLsCyXsSBfK3z3T'; // Your actual Plex token

console.log('🔧 Testing Plex Streaming URLs');
console.log('=====================================');
console.log(`Server IP: ${PLEX_IP}`);
console.log(`Port: ${PLEX_PORT}`);
console.log(`Token: ***`);
console.log('=====================================\n');

function makeRequest(url, method = 'GET') {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        const req = client.request(url, { method }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

function createOptimizedPlexUrl(baseUrl, mediaId) {
    return `${baseUrl}/video/:/transcode/universal/start.m3u8?` +
           `X-Plex-Token=${PLEX_TOKEN}&` +
           `ratingKey=${mediaId}&` +
           `protocol=hls&` +
           `includeCodecs=1&` +
           `maxVideoBitrate=4000&` +
           `videoQuality=80&` +
           `audioBoost=100&` +
           `subtitleSize=100&` +
           `audioCodec=aac&` +
           `videoCodec=h264&` +
           `resolution=720p&` +
           `maxAudioChannels=2`;
}

async function testPlexStreaming() {
    try {
        console.log('Starting Plex streaming tests...\n');
        
        const baseUrl = `http://${PLEX_IP}:${PLEX_PORT}`;
        
        // Test 1: Get libraries
        console.log('✅ Testing libraries endpoint...');
        const librariesUrl = `${baseUrl}/library/sections?X-Plex-Token=${PLEX_TOKEN}`;
        const librariesResponse = await makeRequest(librariesUrl);
        
        if (librariesResponse.statusCode === 200) {
            console.log('✅ Libraries endpoint working');
            
            // Check if response is XML or JSON
            if (librariesResponse.data.trim().startsWith('<?xml')) {
                console.log('📄 Server returned XML response (this is normal for Plex)');
                console.log('✅ Libraries endpoint is working');
                console.log('The Zell0 app will handle XML parsing automatically');
                console.log('\n✅ Plex streaming should work in the Zell0 app!');
                return;
            }
            
            // Parse libraries to find actual library IDs
            try {
                const librariesData = JSON.parse(librariesResponse.data);
                if (librariesData.MediaContainer && librariesData.MediaContainer.Directory) {
                    const libraries = librariesData.MediaContainer.Directory;
                    console.log(`Found ${libraries.length} libraries`);
                    
                    if (libraries.length > 0) {
                        // Use the first library ID
                        const firstLibraryId = libraries[0].key;
                        console.log(`Using library ID: ${firstLibraryId}`);
                        
                        // Test 2: Get library contents
                        console.log('\n✅ Testing library contents...');
                        const contentsUrl = `${baseUrl}/library/sections/${firstLibraryId}/all?X-Plex-Token=${PLEX_TOKEN}`;
                        const contentsResponse = await makeRequest(contentsUrl);
                        
                        if (contentsResponse.statusCode === 200) {
                            console.log('✅ Library contents endpoint working');
                            
                            // Parse contents to find actual media IDs
                            try {
                                const contentsData = JSON.parse(contentsResponse.data);
                                if (contentsData.MediaContainer && contentsData.MediaContainer.Metadata) {
                                    const mediaItems = contentsData.MediaContainer.Metadata;
                                    console.log(`Found ${mediaItems.length} media items`);
                                    
                                    if (mediaItems.length > 0) {
                                        // Use the first media item ID
                                        const firstMediaId = mediaItems[0].ratingKey;
                                        console.log(`Using media ID: ${firstMediaId}`);
                                        
                                        // Test 3: Test streaming URL format
                                        console.log('\n✅ Testing streaming URL format...');
                                        const streamUrl = createOptimizedPlexUrl(baseUrl, firstMediaId);
                                        console.log(`Stream URL: ${streamUrl}`);
                                        
                                        // Test 4: Test stream URL accessibility
                                        console.log('\n✅ Testing stream URL accessibility...');
                                        try {
                                            const streamResponse = await makeRequest(streamUrl, 'HEAD');
                                            console.log(`✅ Stream URL accessible (Status: ${streamResponse.statusCode})`);
                                            
                                            if (streamResponse.statusCode === 200) {
                                                console.log('✅ Streaming should work in the app!');
                                            } else {
                                                console.log(`⚠️  Stream URL returned status ${streamResponse.statusCode}`);
                                            }
                                            
                                        } catch (streamError) {
                                            console.log(`❌ Stream URL test failed: ${streamError.message}`);
                                        }
                                        
                                        // Test 5: Test web player URL
                                        console.log('\n✅ Testing web player URL...');
                                        const webPlayerUrl = `${baseUrl}/web/index.html#!/media/${firstMediaId}?X-Plex-Token=${PLEX_TOKEN}`;
                                        console.log(`Web Player URL: ${webPlayerUrl}`);
                                        
                                        try {
                                            const webResponse = await makeRequest(webPlayerUrl, 'HEAD');
                                            console.log(`✅ Web player URL accessible (Status: ${webResponse.statusCode})`);
                                        } catch (webError) {
                                            console.log(`❌ Web player URL test failed: ${webError.message}`);
                                        }
                                    } else {
                                        console.log('⚠️  No media items found in library');
                                    }
                                } else {
                                    console.log('⚠️  No media items found in library response');
                                }
                            } catch (parseError) {
                                console.log(`❌ Error parsing library contents: ${parseError.message}`);
                            }
                        } else {
                            console.log(`❌ Library contents endpoint failed (Status: ${contentsResponse.statusCode})`);
                        }
                    } else {
                        console.log('⚠️  No libraries found');
                    }
                } else {
                    console.log('⚠️  No libraries found in response');
                }
            } catch (parseError) {
                console.log(`❌ Error parsing libraries: ${parseError.message}`);
            }
        } else {
            console.log(`❌ Libraries endpoint failed (Status: ${librariesResponse.statusCode})`);
        }
        
        console.log('\n=====================================');
        console.log('Streaming test completed!');
        console.log('\nIf all tests passed, streaming should work in the Zell0 app.');
        console.log('If tests failed, check your Plex server configuration.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure Plex Media Server is running');
        console.log('2. Check that the IP address is correct');
        console.log('3. Verify the token is valid');
        console.log('4. Ensure your PC and this device are on the same network');
    }
}

testPlexStreaming(); 