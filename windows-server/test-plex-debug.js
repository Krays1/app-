const http = require('http');

console.log('🔍 Debugging Plex API response...\n');

const testUrl = 'http://127.0.0.1:32400/identity';

console.log(`Testing: ${testUrl}`);

const req = http.get(testUrl, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('\n=== RESPONSE BODY ===');
        console.log(data.substring(0, 500)); // Show first 500 chars
        console.log('=== END RESPONSE ===');
        
        if (data.length > 500) {
            console.log(`... (${data.length - 500} more characters)`);
        }
        
        // Try to parse as JSON
        try {
            const json = JSON.parse(data);
            console.log('\n✅ Valid JSON response:');
            console.log(JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('\n❌ Not valid JSON - might be HTML or other format');
        }
    });
});

req.on('error', (err) => {
    console.log(`❌ ERROR: ${err.message}`);
});

req.setTimeout(5000, () => {
    console.log(`❌ ERROR: Timeout`);
    req.destroy();
}); 