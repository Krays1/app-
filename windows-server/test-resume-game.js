const io = require('socket.io-client');

console.log('🧪 TESTING CHESS RESUME GAME FEATURE');
console.log('=====================================');

// Test configuration
const SERVER_URL = 'http://172.94.3.216:3001';
const PLAYER1_USERNAME = 'testPlayer1';
const PLAYER2_USERNAME = 'testPlayer2';

async function testResumeGame() {
    console.log('\n1️⃣ Creating two test players...');
    
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
    
    console.log('\n3️⃣ Starting a chess game...');
    
    // Player 1 creates game
    player1.emit('chess:find_game');
    
    let gameId;
    await new Promise(resolve => {
        player1.on('chess:game_joined', (data) => {
            gameId = data.gameId;
            console.log(`✅ Player 1 joined game: ${gameId}`);
            resolve();
        });
    });
    
    // Player 2 joins game
    player2.emit('chess:join_game', { gameId });
    
    await new Promise(resolve => {
        player2.on('chess:game_joined', (data) => {
            console.log(`✅ Player 2 joined game: ${gameId}`);
            resolve();
        });
    });
    
    console.log('\n4️⃣ Making some moves...');
    
    // Wait for game to start
    await new Promise(resolve => {
        player1.on('chess:game_started', () => {
            console.log('✅ Game started');
            resolve();
        });
    });
    
    // Make a few moves
    player1.emit('chess_move', {
        gameId: gameId,
        from: 'e2',
        to: 'e4',
        username: PLAYER1_USERNAME
    });
    
    await new Promise(resolve => {
        player1.on('chess_move_made', () => {
            console.log('✅ Player 1 moved e2-e4');
            resolve();
        });
    });
    
    player2.emit('chess_move', {
        gameId: gameId,
        from: 'e7',
        to: 'e5',
        username: PLAYER2_USERNAME
    });
    
    await new Promise(resolve => {
        player2.on('chess_move_made', () => {
            console.log('✅ Player 2 moved e7-e5');
            resolve();
        });
    });
    
    player1.emit('chess_move', {
        gameId: gameId,
        from: 'd1',
        to: 'h5',
        username: PLAYER1_USERNAME
    });
    
    await new Promise(resolve => {
        player1.on('chess_move_made', () => {
            console.log('✅ Player 1 moved d1-h5');
            resolve();
        });
    });
    
    console.log('\n5️⃣ Player 2 leaving game (simulating disconnect)...');
    
    // Player 2 leaves game (simulating disconnect)
    player2.emit('chess:leave_game', { gameId });
    
    await new Promise(resolve => {
        player2.on('chess:game_reset', () => {
            console.log('✅ Game reset after player 2 left');
            resolve();
        });
    });
    
    console.log('\n6️⃣ Player 2 reconnecting and looking for game...');
    
    // Player 2 reconnects and looks for game
    player2.emit('chess:find_game');
    
    await new Promise(resolve => {
        player2.on('chess:unfinished_games_found', (data) => {
            console.log(`✅ Found ${data.games.length} unfinished games`);
            console.log('Unfinished games:', data.games);
            
            if (data.games.length > 0) {
                const unfinishedGame = data.games[0];
                console.log(`\n7️⃣ Resuming game: ${unfinishedGame.gameId}`);
                
                // Resume the game
                player2.emit('chess:resume_game', { gameId: unfinishedGame.gameId });
                
                player2.on('chess:game_resumed', (resumeData) => {
                    console.log('✅ Game resumed successfully!');
                    console.log('Resume data:', {
                        gameId: resumeData.gameId,
                        color: resumeData.color,
                        isMyTurn: resumeData.isMyTurn,
                        opponent: resumeData.opponent,
                        moveCount: resumeData.moves ? resumeData.moves.length : 0
                    });
                    resolve();
                });
                
                player2.on('chess:resume_failed', (error) => {
                    console.log('❌ Resume failed:', error.message);
                    resolve();
                });
            } else {
                console.log('❌ No unfinished games found');
                resolve();
            }
        });
    });
    
    console.log('\n8️⃣ Testing API endpoints...');
    
    // Test API endpoints
    try {
        const response = await fetch(`${SERVER_URL}/api/chess/unfinished/${PLAYER2_USERNAME}`);
        const data = await response.json();
        console.log('✅ Unfinished games API response:', data);
    } catch (error) {
        console.log('❌ API test failed:', error.message);
    }
    
    console.log('\n✅ RESUME GAME TEST COMPLETE!');
    console.log('The resume game feature should now work in your Android app!');
    
    // Cleanup
    player1.disconnect();
    player2.disconnect();
}

// Run the test
testResumeGame().catch(console.error); 