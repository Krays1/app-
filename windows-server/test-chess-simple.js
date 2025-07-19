// Simple test to debug chess game creation
const io = require('socket.io-client');

const SERVER_URL = 'http://172.94.3.216:3001';

console.log('🧪 Simple Chess Debug Test');
console.log('==========================');

async function testSimple() {
    console.log('\n1. Creating player connection...');
    const player = io(SERVER_URL);
    
    await new Promise((resolve) => {
        player.on('connect', () => {
            console.log('✅ Player connected');
            resolve();
        });
    });
    
    // Register player
    player.emit('register', {
        username: 'TestPlayer',
        deviceId: 'testdevice',
        deviceName: 'Test Device'
    });
    
    await new Promise((resolve) => {
        player.on('registered', (data) => {
            console.log('✅ Player registered:', data);
            resolve();
        });
    });
    
    console.log('\n2. Creating chess game...');
    player.emit('chess:create_game');
    
    await new Promise((resolve) => {
        player.on('chess:game_joined', (data) => {
            console.log('✅ Player joined game:', data);
            resolve();
        });
    });
    
    console.log('\n3. Getting games list...');
    player.emit('chess:get_games');
    
    await new Promise((resolve) => {
        player.on('chess:games_list', (data) => {
            console.log('✅ Games list received:', data);
            resolve();
        });
    });
    
    console.log('\n4. Cleaning up...');
    player.disconnect();
    
    console.log('\n🏁 Simple test completed');
}

testSimple().catch(console.error); 