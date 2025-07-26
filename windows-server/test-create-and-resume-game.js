const io = require('socket.io-client');

console.log('🧪 TESTING CREATE AND RESUME GAME');
console.log('==================================');

const SERVER_URL = 'http://172.94.3.216:3001';
const PLAYER1_USERNAME = 'testPlayer1';
const PLAYER2_USERNAME = 'testPlayer2';

async function testCreateAndResumeGame() {
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
    
    console.log('\n3️⃣ Creating a new game...');
    
    let gameCreated = false;
    let gameId = null;
    
    // Player 1 creates a game
    player1.emit('chess:find_game');
    
    await new Promise(resolve => {
        player1.on('chess:game_joined', (data) => {
            console.log('✅ Player 1 joined/created game:', data);
            gameId = data.gameId;
            gameCreated = true;
            resolve();
        });
        
        setTimeout(() => {
            console.log('⏰ Timeout - game creation');
            resolve();
        }, 5000);
    });
    
    if (!gameCreated) {
        console.log('❌ Failed to create game');
        return;
    }
    
    console.log('\n4️⃣ Player 2 joining the game...');
    
    let gameStarted = false;
    
    // Player 2 joins the game
    player2.emit('chess:find_game');
    
    await new Promise(resolve => {
        player2.on('chess:game_joined', (data) => {
            console.log('✅ Player 2 joined game:', data);
            gameStarted = data.started;
            resolve();
        });
        
        setTimeout(() => {
            console.log('⏰ Timeout - game join');
            resolve();
        }, 5000);
    });
    
    if (!gameStarted) {
        console.log('❌ Game did not start');
        return;
    }
    
    console.log('\n5️⃣ Making some moves...');
    
    // Make a few moves
    player1.emit('chess_move', {
        gameId: gameId,
        from: 'e2',
        to: 'e4',
        username: PLAYER1_USERNAME,
        timestamp: Date.now()
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    player2.emit('chess_move', {
        gameId: gameId,
        from: 'e7',
        to: 'e5',
        username: PLAYER2_USERNAME,
        timestamp: Date.now()
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    player1.emit('chess_move', {
        gameId: gameId,
        from: 'g1',
        to: 'f3',
        username: PLAYER1_USERNAME,
        timestamp: Date.now()
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n6️⃣ Player 1 leaving game (creating unfinished game)...');
    
    // Player 1 leaves the game
    player1.emit('chess:leave_game', {
        gameId: gameId,
        username: PLAYER1_USERNAME
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n7️⃣ Player 1 reconnecting and looking for game...');
    
    // Disconnect and reconnect player 1
    player1.disconnect();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const player1Reconnected = io(SERVER_URL);
    
    await new Promise(resolve => {
        player1Reconnected.on('connect', () => {
            console.log('✅ Player 1 reconnected');
            resolve();
        });
    });
    
    // Register again
    player1Reconnected.emit('register', {
        deviceId: 'test-device-1',
        deviceName: 'Test Device 1',
        username: PLAYER1_USERNAME
    });
    
    await new Promise(resolve => {
        player1Reconnected.on('registered', () => {
            console.log('✅ Player 1 re-registered');
            resolve();
        });
    });
    
    console.log('\n8️⃣ Looking for unfinished games...');
    
    let unfinishedGamesFound = false;
    let gameResumed = false;
    
    // Player 1 looks for game
    player1Reconnected.emit('chess:find_game');
    
    await new Promise(resolve => {
        // Listen for unfinished games
        player1Reconnected.on('chess:unfinished_games_found', (data) => {
            console.log(`✅ Found ${data.games.length} unfinished games`);
            console.log('Unfinished games:', data.games);
            unfinishedGamesFound = true;
            
            // Simulate Android app choosing to resume the game
            console.log('\n9️⃣ Resuming the unfinished game...');
            const gameToResume = data.games[0];
            player1Reconnected.emit('chess:resume_game', {
                gameId: gameToResume.gameId
            });
        });
        
        // Listen for game resumed
        player1Reconnected.on('chess:game_resumed', (data) => {
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
    
    console.log('\n10️⃣ Results:');
    console.log(`- Unfinished games found: ${unfinishedGamesFound}`);
    console.log(`- Game resumed: ${gameResumed}`);
    
    if (unfinishedGamesFound && gameResumed) {
        console.log('✅ SUCCESS: Complete create and resume game flow works!');
    } else if (unfinishedGamesFound && !gameResumed) {
        console.log('❌ ISSUE: Found unfinished games but could not resume');
    } else if (!unfinishedGamesFound) {
        console.log('❌ ISSUE: No unfinished games found');
    }
    
    console.log('\n✅ CREATE AND RESUME GAME TEST FINISHED!');
    
    // Cleanup
    player1Reconnected.disconnect();
    player2.disconnect();
}

// Run the test
testCreateAndResumeGame().catch(console.error); 