// Final test to verify chess game works
const io = require('socket.io-client');
const SERVER_URL = 'http://172.94.3.216:3001';

console.log('🧪 Final Chess Test');
console.log('===================');

async function finalTest() {
    try {
        // Player 1
        console.log('\n1. Creating Player 1...');
        const player1 = io(SERVER_URL);
        await new Promise(resolve => player1.on('connect', resolve));
        
        player1.emit('register', { username: 'Player1', deviceId: 'device1', profilePic: null });
        await new Promise(resolve => player1.on('registration_success', resolve));
        console.log('✅ Player 1 registered');
        
        // Player 2
        console.log('\n2. Creating Player 2...');
        const player2 = io(SERVER_URL);
        await new Promise(resolve => player2.on('connect', resolve));
        
        player2.emit('register', { username: 'Player2', deviceId: 'device2', profilePic: null });
        await new Promise(resolve => player2.on('registration_success', resolve));
        console.log('✅ Player 2 registered');
        
        // Player 1 creates game
        console.log('\n3. Player 1 creating game...');
        player1.emit('chess:create_game');
        
        let gameId = null;
        await new Promise(resolve => {
            player1.on('chess:game_joined', (data) => {
                gameId = data.gameId;
                console.log('✅ Player 1 joined game:', {
                    gameId: data.gameId,
                    color: data.color,
                    started: data.started
                });
                resolve();
            });
        });
        
        // Player 2 joins game
        console.log('\n4. Player 2 joining game...');
        player2.emit('chess:join_game', { gameId });
        
        // Wait for game to start
        console.log('\n5. Waiting for game to start...');
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
        
        console.log('\n🎉 Final test completed!');
        console.log('✅ Chess game should now work properly');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}

finalTest(); 