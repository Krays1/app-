const io = require('socket.io-client');

console.log('🧪 TESTING SIMPLE GAME CREATION');
console.log('================================');

const SERVER_URL = 'http://172.94.3.216:3001';
const PLAYER_USERNAME = 'testPlayer';

async function testSimpleGameCreation() {
    console.log('\n1️⃣ Creating test player...');
    
    const player = io(SERVER_URL);
    
    await new Promise(resolve => {
        player.on('connect', () => {
            console.log('✅ Player connected');
            resolve();
        });
    });
    
    console.log('\n2️⃣ Registering player...');
    
    player.emit('register', {
        deviceId: 'test-device',
        deviceName: 'Test Device',
        username: PLAYER_USERNAME
    });
    
    await new Promise(resolve => {
        player.on('registered', () => {
            console.log('✅ Player registered');
            resolve();
        });
    });
    
    console.log('\n3️⃣ Looking for game...');
    
    player.emit('chess:find_game');
    
    await new Promise(resolve => {
        player.on('chess:game_joined', (data) => {
            console.log('✅ Game joined/created:', data);
            resolve();
        });
        
        setTimeout(() => {
            console.log('⏰ Timeout - no game response');
            resolve();
        }, 3000);
    });
    
    console.log('\n✅ SIMPLE GAME CREATION TEST COMPLETE!');
    
    player.disconnect();
}

testSimpleGameCreation().catch(console.error); 