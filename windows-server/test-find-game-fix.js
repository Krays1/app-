const io = require('socket.io-client');

console.log('🧪 TESTING CHESS FIND GAME FIX');
console.log('==============================');

// Test configuration
const SERVER_URL = 'http://172.94.3.216:3001';
const PLAYER1_USERNAME = 'krays1'; // This player has unfinished games
const PLAYER2_USERNAME = 'testPlayer2';

async function testFindGameFix() {
    console.log('\n1️⃣ Creating test players...');
    
    const player1 = io(SERVER_URL);
    const player2 = io(SERVER_URL);
    
    // Wait for connections
    await new Promise(resolve => {
        player1.on('connect', () => {
            console.log('✅ Player 1 connected');
            player2.on('connect', () => {
                console.log('✅ Player 2 connected');
                resolve();
            });
        });
    });
    
    console.log('\n2️⃣ Registering players...');
    
    // Register players
    player1.emit('register', {
        deviceId: 'test-device-1',
        deviceName: 'Test Device 1',
        username: PLAYER1_USERNAME
    });
    
    player2.emit('register', {
        deviceId: 'test-device-2',
        deviceName: 'Test Device 2',
        username: PLAYER2_USERNAME
    });
    
    await new Promise(resolve => {
        player1.on('registered', () => {
            console.log('✅ Player 1 registered');
            player2.on('registered', () => {
                console.log('✅ Player 2 registered');
                resolve();
            });
        });
    });
    
    console.log('\n3️⃣ Player 1 (with unfinished games) looking for new game...');
    
    let unfinishedGamesFound = false;
    let newGameFound = false;
    
    // Player 1 looks for game
    player1.emit('chess:find_game');
    
    await new Promise(resolve => {
        // Listen for unfinished games
        player1.on('chess:unfinished_games_found', (data) => {
            console.log(`✅ Found ${data.games.length} unfinished games`);
            console.log('Unfinished games:', data.games);
            unfinishedGamesFound = true;
        });
        
        // Listen for new game creation
        player1.on('chess:game_joined', (data) => {
            console.log('✅ Player 1 joined/created game:', data);
            newGameFound = true;
            resolve();
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
            console.log('⏰ Timeout - no game found');
            resolve();
        }, 5000);
    });
    
    console.log('\n4️⃣ Results:');
    console.log(`- Unfinished games found: ${unfinishedGamesFound}`);
    console.log(`- New game found: ${newGameFound}`);
    
    if (unfinishedGamesFound && newGameFound) {
        console.log('✅ SUCCESS: Player can find new games even with unfinished games!');
    } else if (unfinishedGamesFound && !newGameFound) {
        console.log('❌ ISSUE: Player found unfinished games but no new game');
    } else if (!unfinishedGamesFound && newGameFound) {
        console.log('⚠️ WARNING: No unfinished games found, but new game created');
    } else {
        console.log('❌ ISSUE: Neither unfinished games nor new game found');
    }
    
    console.log('\n5️⃣ Testing clear unfinished games...');
    
    // Test clearing unfinished games
    player1.emit('chess:clear_unfinished_games');
    
    await new Promise(resolve => {
        player1.on('chess:unfinished_games_cleared', (data) => {
            console.log('✅ Unfinished games cleared:', data);
            resolve();
        });
        
        setTimeout(() => {
            console.log('⏰ Timeout - clear operation');
            resolve();
        }, 3000);
    });
    
    console.log('\n✅ FIND GAME FIX TEST COMPLETE!');
    
    // Cleanup
    player1.disconnect();
    player2.disconnect();
}

// Run the test
testFindGameFix().catch(console.error); 