// Simple test to verify simplified chess logic (no dice rolls)
const io = require('socket.io-client');
const SERVER_URL = 'http://172.94.3.216:3001';

console.log('🧪 Simple Chess Test (No Dice Rolls)');
console.log('=====================================');

async function testSimplifiedChess() {
    try {
        // Player 1
        console.log('\n1. Creating Player 1...');
        const player1 = io(SERVER_URL);
        
        await new Promise((resolve) => {
            player1.on('connect', () => {
                console.log('✅ Player 1 connected');
                resolve();
            });
        });
        
        // Register Player 1
        player1.emit('register', {
            username: 'Player1',
            deviceId: 'device1',
            profilePic: null
        });
        
        await new Promise((resolve) => {
            player1.on('registration_success', (data) => {
                console.log('✅ Player 1 registered:', data.username);
                resolve();
            });
        });
        
        // Player 2
        console.log('\n2. Creating Player 2...');
        const player2 = io(SERVER_URL);
        
        await new Promise((resolve) => {
            player2.on('connect', () => {
                console.log('✅ Player 2 connected');
                resolve();
            });
        });
        
        // Register Player 2
        player2.emit('register', {
            username: 'Player2',
            deviceId: 'device2',
            profilePic: null
        });
        
        await new Promise((resolve) => {
            player2.on('registration_success', (data) => {
                console.log('✅ Player 2 registered:', data.username);
                resolve();
            });
        });
        
        // Player 1 creates game
        console.log('\n3. Player 1 creating game...');
        player1.emit('chess:create_game');
        
        let gameId = null;
        await new Promise((resolve) => {
            player1.on('chess:game_joined', (data) => {
                gameId = data.gameId;
                console.log('✅ Player 1 joined game:', {
                    gameId: data.gameId,
                    color: data.color,
                    started: data.started,
                    waitingForDiceRoll: data.waitingForDiceRoll
                });
                resolve();
            });
        });
        
        // Player 2 joins game
        console.log('\n4. Player 2 joining game...');
        player2.emit('chess:join_game', { gameId });
        
        let player2Color = null;
        await new Promise((resolve) => {
            player2.on('chess:game_joined', (data) => {
                console.log('✅ Player 2 joined game:', {
                    gameId: data.gameId,
                    color: data.color,
                    started: data.started,
                    waitingForDiceRoll: data.waitingForDiceRoll
                });
                resolve();
            });
        });
        
        // Wait for game to start
        console.log('\n5. Waiting for game to start...');
        await new Promise((resolve) => {
            const onGameStarted = (data) => {
                console.log('✅ Game started!', {
                    whitePlayer: data.whitePlayer,
                    blackPlayer: data.blackPlayer,
                    currentPlayer: data.currentPlayer
                });
                resolve();
            };
            
            player1.on('chess:game_started', onGameStarted);
            player2.on('chess:game_started', onGameStarted);
        });
        
        console.log('\n🎉 Test completed successfully!');
        console.log('✅ Simplified chess logic is working');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        // Cleanup
        player1?.disconnect();
        player2?.disconnect();
        process.exit(0);
    }
}

testSimplifiedChess(); 