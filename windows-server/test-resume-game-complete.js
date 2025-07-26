const io = require('socket.io-client');

console.log('🧪 TESTING COMPLETE RESUME GAME FEATURE');
console.log('========================================');

const SERVER_URL = 'http://172.94.3.216:3001';
const PLAYER1_USERNAME = 'krays1'; // Has unfinished games
const PLAYER2_USERNAME = 'DJDELBOY23'; // Opponent in unfinished game

async function testCompleteResumeGame() {
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
    
    console.log('\n3️⃣ Player 1 looking for game (should find unfinished games)...');
    
    let unfinishedGamesFound = false;
    let gameResumed = false;
    
    // Player 1 looks for game
    player1.emit('chess:find_game');
    
    await new Promise(resolve => {
        // Listen for unfinished games
        player1.on('chess:unfinished_games_found', (data) => {
            console.log(`✅ Found ${data.games.length} unfinished games`);
            console.log('Unfinished games:', data.games);
            unfinishedGamesFound = true;
            
            // Simulate Android app choosing to resume the game
            console.log('\n4️⃣ Simulating Android app choosing to resume game...');
            const gameToResume = data.games[0];
            player1.emit('chess:resume_game', {
                gameId: gameToResume.gameId
            });
        });
        
        // Listen for game resumed
        player1.on('chess:game_resumed', (data) => {
            console.log('✅ Game resumed successfully!');
            console.log('Resumed game data:', {
                gameId: data.gameId,
                playerColor: data.playerColor,
                isMyTurn: data.isMyTurn,
                moveCount: data.moves ? data.moves.length : 0
            });
            gameResumed = true;
            resolve();
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            console.log('⏰ Timeout - no response');
            resolve();
        }, 10000);
    });
    
    console.log('\n5️⃣ Results:');
    console.log(`- Unfinished games found: ${unfinishedGamesFound}`);
    console.log(`- Game resumed: ${gameResumed}`);
    
    if (unfinishedGamesFound && gameResumed) {
        console.log('✅ SUCCESS: Complete resume game flow works!');
    } else if (unfinishedGamesFound && !gameResumed) {
        console.log('❌ ISSUE: Found unfinished games but could not resume');
    } else if (!unfinishedGamesFound) {
        console.log('❌ ISSUE: No unfinished games found');
    }
    
    console.log('\n6️⃣ Testing clear unfinished games...');
    
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
        }, 5000);
    });
    
    console.log('\n7️⃣ Testing start new game after clearing...');
    
    // Test starting new game after clearing
    player1.emit('chess:start_new_game');
    
    await new Promise(resolve => {
        player1.on('chess:game_joined', (data) => {
            console.log('✅ New game created after clearing:', data);
            resolve();
        });
        
        setTimeout(() => {
            console.log('⏰ Timeout - new game creation');
            resolve();
        }, 5000);
    });
    
    console.log('\n✅ COMPLETE RESUME GAME TEST FINISHED!');
    
    // Cleanup
    player1.disconnect();
    player2.disconnect();
}

// Run the test
testCompleteResumeGame().catch(console.error); 