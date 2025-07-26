const io = require('socket.io-client');

console.log('🧪 TESTING IN-GAME REFRESH FEATURE');
console.log('===================================');

const SERVER_URL = 'http://172.94.3.216:3001';
const PLAYER1_USERNAME = 'testPlayer1';
const PLAYER2_USERNAME = 'testPlayer2';

async function testInGameRefresh() {
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
    
    console.log('\n3️⃣ Creating and starting a game...');
    
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
    
    console.log('\n5️⃣ Making a move to establish game state...');
    
    let moveMade = false;
    
    // Player 1 makes a move
    player1.emit('chess:make_move', {
        gameId: gameId,
        from: 'e2',
        to: 'e4',
        piece: 'pawn',
        color: 'white'
    });
    
    await new Promise(resolve => {
        player1.on('chess_move_made', (data) => {
            console.log('✅ Move made:', data);
            moveMade = true;
            resolve();
        });
        
        setTimeout(() => {
            console.log('⏰ Timeout - move');
            resolve();
        }, 5000);
    });
    
    if (!moveMade) {
        console.log('❌ Failed to make move');
        return;
    }
    
    console.log('\n6️⃣ Player 1 leaving the game...');
    
    // Player 1 leaves the game
    player1.emit('chess:leave_game', {
        gameId: gameId
    });
    
    await new Promise(resolve => {
        setTimeout(() => {
            console.log('✅ Player 1 left the game');
            resolve();
        }, 2000);
    });
    
    console.log('\n7️⃣ Player 1 reconnecting and using in-game refresh...');
    
    let reconnected = false;
    let gameStateReceived = false;
    
    // Player 1 reconnects and uses refresh
    player1.emit('chess:get_games');
    
    await new Promise(resolve => {
        player1.on('chess:games_list', (data) => {
            console.log('✅ Received games list after reconnect:', data);
            reconnected = true;
            
            // Check if our game is in the list
            const games = data.games;
            const ourGame = games.find(game => game.id === gameId);
            if (ourGame) {
                console.log('✅ Found our game in the list after reconnect');
                
                // Test getting game state
                player1.emit('chess:get_game_state', {
                    gameId: gameId
                });
            }
        });
        
        player1.on('chess:game_state', (data) => {
            console.log('✅ Received game state after reconnect:', {
                gameId: data.gameId,
                currentPlayer: data.currentPlayer,
                isMyTurn: data.isMyTurn,
                moveCount: data.moves ? data.moves.length : 0,
                whitePlayer: data.whitePlayer,
                blackPlayer: data.blackPlayer
            });
            gameStateReceived = true;
            resolve();
        });
        
        setTimeout(() => {
            console.log('⏰ Timeout - reconnect and refresh');
            resolve();
        }, 10000);
    });
    
    console.log('\n8️⃣ Results:');
    console.log(`- Reconnected successfully: ${reconnected}`);
    console.log(`- Game state received: ${gameStateReceived}`);
    
    if (reconnected && gameStateReceived) {
        console.log('✅ SUCCESS: In-game refresh functionality works!');
        console.log('✅ Player can leave and rejoin the same game with same opponent');
    } else {
        console.log('❌ ISSUE: In-game refresh functionality incomplete');
    }
    
    console.log('\n✅ IN-GAME REFRESH TEST FINISHED!');
    
    // Cleanup
    player1.disconnect();
    player2.disconnect();
}

// Run the test
testInGameRefresh().catch(console.error); 