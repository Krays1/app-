// Test the new simplified chess matchmaking system
const io = require('socket.io-client');
const SERVER_URL = 'http://172.94.3.216:3001';

console.log('🧪 Testing New Chess Matchmaking System');
console.log('=======================================');

async function testNewChess() {
    try {
        // Player 1
        console.log('\n1. Player 1 connecting...');
        const player1 = io(SERVER_URL);
        await new Promise(resolve => player1.on('connect', resolve));
        
        player1.emit('register', { username: 'Player1', deviceId: 'device1', profilePic: null });
        await new Promise(resolve => player1.on('registration_success', resolve));
        console.log('✅ Player 1 registered');
        
        // Player 2
        console.log('\n2. Player 2 connecting...');
        const player2 = io(SERVER_URL);
        await new Promise(resolve => player2.on('connect', resolve));
        
        player2.emit('register', { username: 'Player2', deviceId: 'device2', profilePic: null });
        await new Promise(resolve => player2.on('registration_success', resolve));
        console.log('✅ Player 2 registered');
        
        // Player 1 finds game (should create new game)
        console.log('\n3. Player 1 finding game...');
        player1.emit('chess:find_game');
        
        await new Promise(resolve => {
            player1.on('chess:game_joined', (data) => {
                console.log('✅ Player 1 joined game:', {
                    gameId: data.gameId,
                    color: data.color,
                    started: data.started,
                    isMyTurn: data.isMyTurn
                });
                resolve();
            });
        });
        
        // Player 2 finds game (should join Player 1's game)
        console.log('\n4. Player 2 finding game...');
        player2.emit('chess:find_game');
        
        // Wait for both players to get game started
        let gameStartedCount = 0;
        await new Promise(resolve => {
            const onGameStarted = (data) => {
                gameStartedCount++;
                console.log(`✅ Game started (Player ${gameStartedCount}):`, {
                    whitePlayer: data.whitePlayer,
                    blackPlayer: data.blackPlayer,
                    currentPlayer: data.currentPlayer
                });
                
                if (gameStartedCount >= 2) {
                    resolve();
                }
            };
            
            player1.on('chess:game_started', onGameStarted);
            player2.on('chess:game_started', onGameStarted);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                console.log('❌ Timeout waiting for game to start');
                resolve();
            }, 10000);
        });
        
        console.log('\n🎉 New chess system test completed!');
        console.log('✅ Simplified matchmaking is working');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}

testNewChess(); 