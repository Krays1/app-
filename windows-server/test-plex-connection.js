const http = require('http');

// Configuration - updated with your actual Plex settings
const PLEX_IP = '192.168.1.182'; // Your PC's actual IP address
const PLEX_PORT = '32400';
const PLEX_TOKEN = '8k4gRqLsCyXsSBfK3z3T'; // Your actual Plex token

const testUrls = [
    `http://${PLEX_IP}:${PLEX_PORT}/identity`,
    `http://${PLEX_IP}:${PLEX_PORT}/library/sections`,
    `http://${PLEX_IP}:${PLEX_PORT}/status/sessions`
];

console.log('🔧 Testing Plex Server Connection');
console.log('=====================================');
console.log(`Server IP: ${PLEX_IP}`);
console.log(`Port: ${PLEX_PORT}`);
console.log(`Token: ${PLEX_TOKEN ? '***' : 'None'}`);
console.log('=====================================');
console.log('');

async function testPlexEndpoint(url, description) {
    return new Promise((resolve) => {
        const options = {
            hostname: PLEX_IP,
            port: PLEX_PORT,
            path: url.replace(`http://${PLEX_IP}:${PLEX_PORT}`, ''),
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };

        if (PLEX_TOKEN) {
            options.headers['X-Plex-Token'] = PLEX_TOKEN;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ ${description}: SUCCESS (${res.statusCode})`);
                    try {
                        const json = JSON.parse(data);
                        if (description.includes('identity')) {
                            console.log(`   Server: ${json.friendlyName || 'Unknown'}`);
                            console.log(`   Version: ${json.version || 'Unknown'}`);
                            console.log(`   Platform: ${json.platform || 'Unknown'}`);
                        } else if (description.includes('sections')) {
                            const sections = json.MediaContainer?.Directory || [];
                            console.log(`   Libraries: ${sections.length}`);
                            sections.forEach(section => {
                                console.log(`     - ${section.title} (${section.type})`);
                            });
                        } else if (description.includes('sessions')) {
                            const sessions = json.MediaContainer?.Video || [];
                            console.log(`   Active Sessions: ${sessions.length}`);
                            sessions.forEach(session => {
                                console.log(`     - ${session.title} (${session.user})`);
                            });
                        }
                    } catch (e) {
                        console.log(`   Response: ${data.substring(0, 100)}...`);
                    }
                } else {
                    console.log(`❌ ${description}: FAILED (${res.statusCode})`);
                    console.log(`   Response: ${data.substring(0, 200)}...`);
                }
                console.log('');
                resolve();
            });
        });

        req.on('error', (err) => {
            console.log(`❌ ${description}: ERROR`);
            console.log(`   ${err.message}`);
            console.log('');
            resolve();
        });

        req.setTimeout(5000, () => {
            console.log(`⏰ ${description}: TIMEOUT`);
            console.log('');
            req.destroy();
            resolve();
        });

        req.end();
    });
}

async function runTests() {
    console.log('Starting connection tests...\n');
    
    for (const url of testUrls) {
        const description = url.includes('identity') ? 'Server Identity' :
                           url.includes('sections') ? 'Media Libraries' :
                           url.includes('sessions') ? 'Active Sessions' : 'Unknown Endpoint';
        
        await testPlexEndpoint(url, description);
    }
    
    console.log('=====================================');
    console.log('Test completed!');
    console.log('');
    console.log('If all tests passed, your Plex server is accessible.');
    console.log('If tests failed, check:');
    console.log('1. Plex Media Server is running on your PC');
    console.log('2. Your PC and this device are on the same network');
    console.log('3. The IP address is correct');
    console.log('4. Firewall allows connections on port 32400');
    console.log('');
    console.log('Use the IP address and port in the Zell0 app configuration.');
}

runTests().catch(console.error); 