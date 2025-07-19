// Quick test to verify chess game start
const io = require('socket.io-client');
const SERVER_URL = 'http://172.94.3.216:3001';

console.log('🧪 Quick Chess Test');
console.log('===================');

async function quickTest() {
    try {
        // Player 1
        const player1 = io(SERVER_URL);
        await new Promise(resolve => player1.on('connect', resolve));
        
        player1.emit('register', { username: 'Player1', deviceId: 'device1', profilePic: null });
        await new Promise(resolve => player1.on('registration_success', resolve));
        
        // Player 2
        const player2 = io(SERVER_URL);
        await new Promise(resolve => player2.on('connect', resolve));
        
        player2.emit('register', { username: 'Player2', deviceId: 'device2', profilePic: null });
        await new Promise(resolve => player2.on('registration_success', resolve));
        
        // Player 1 creates game
        player1.emit('chess:create_game');
        
        let gameId = null;
        await new Promise(resolve => {
            player1.on('chess:game_joined', (data) => {
                gameId = data.gameId;
                console.log('✅ Player 1 joined game:', data);
                resolve();
            });
        });
        
        // Player 2 joins game
        player2.emit('chess:join_game', { gameId });
        
        // Wait for both game_joined and game_started events
        let gameStarted = false;
        await new Promise(resolve => {
            const checkComplete = () => {
                if (gameStarted) resolve();
            };
            
            player2.on('chess:game_joined', (data) => {
                console.log('✅ Player 2 joined game:', data);
            });
            
            player1.on('chess:game_started', (data) => {
                console.log('✅ Game started (Player 1):', data);
                gameStarted = true;
                checkComplete();
            });
            
            player2.on('chess:game_started', (data) => {
                console.log('✅ Game started (Player 2):', data);
                gameStarted = true;
                checkComplete();
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                console.log('❌ Timeout waiting for game to start');
                resolve();
            }, 5000);
        });
        
        console.log('🎉 Quick test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}

quickTest(); 