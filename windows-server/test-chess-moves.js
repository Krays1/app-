// Test chess moves with the new system
const io = require('socket.io-client');
const SERVER_URL = 'http://172.94.3.216:3001';

console.log('🧪 Testing Chess Moves');
console.log('======================');

async function testChessMoves() {
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
        
        // Player 1 finds game
        console.log('\n3. Player 1 finding game...');
        player1.emit('chess:find_game');
        
        let gameId = null;
        await new Promise(resolve => {
            player1.on('chess:game_joined', (data) => {
                gameId = data.gameId;
                console.log('✅ Player 1 joined game:', {
                    gameId: data.gameId,
                    color: data.color,
                    started: data.started,
                    isMyTurn: data.isMyTurn
                });
                resolve();
            });
        });
        
        // Player 2 finds game
        console.log('\n4. Player 2 finding game...');
        player2.emit('chess:find_game');
        
        // Wait for game to start
        await new Promise(resolve => {
            const onGameStarted = (data) => {
                console.log('✅ Game started:', {
                    whitePlayer: data.whitePlayer,
                    blackPlayer: data.blackPlayer,
                    currentPlayer: data.currentPlayer
                });
                resolve();
            };
            
            player1.on('chess:game_started', onGameStarted);
            player2.on('chess:game_started', onGameStarted);
        });
        
        // Test a move
        console.log('\n5. Testing move...');
        await new Promise(resolve => {
            const onMoveMade = (data) => {
                console.log('✅ Move made:', {
                    from: data.from,
                    to: data.to,
                    piece: data.piece,
                    color: data.color
                });
                resolve();
            };
            
            player1.on('chess:move_made', onMoveMade);
            player2.on('chess:move_made', onMoveMade);
            
            // Player 1 makes a move (e2 to e4)
            setTimeout(() => {
                console.log('Making move: e2 to e4');
                player1.emit('chess:make_move', {
                    gameId: gameId,
                    from: 'e2',
                    to: 'e4'
                });
            }, 1000);
        });
        
        console.log('\n🎉 Chess moves test completed!');
        console.log('✅ Move functionality is working');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        process.exit(0);
    }
}

testChessMoves(); 