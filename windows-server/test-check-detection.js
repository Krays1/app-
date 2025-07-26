const io = require('socket.io-client');

console.log('🧪 Testing Check Detection...');

// Connect two players
const player1 = io('http://localhost:3001');
const player2 = io('http://localhost:3001');

let gameId = null;

// Player 1 setup
player1.on('connect', () => {
    console.log('✅ Player 1 connected');
    
    // Register player 1
    player1.emit('register', {
        username: 'CheckTest1',
        deviceId: 'device1',
        deviceName: 'Test Device 1'
    });
    
    // Find game
    setTimeout(() => {
        console.log('🔍 Player 1 looking for game...');
        player1.emit('chess:find_game');
    }, 1000);
});

// Player 2 setup
player2.on('connect', () => {
    console.log('✅ Player 2 connected');
    
    // Register player 2
    player2.emit('register', {
        username: 'CheckTest2',
        deviceId: 'device2',
        deviceName: 'Test Device 2'
    });
    
    // Find game
    setTimeout(() => {
        console.log('🔍 Player 2 looking for game...');
        player2.emit('chess:find_game');
    }, 2000);
});

// Game joined handlers
player1.on('chess:game_joined', (data) => {
    console.log('🎮 Player 1 joined game:', data);
    gameId = data.gameId;
    
    if (data.started) {
        console.log('🎯 Game started! Testing check detection...');
        testCheckDetection();
    }
});

player2.on('chess:game_joined', (data) => {
    console.log('🎮 Player 2 joined game:', data);
});

// Game started handler
player1.on('chess:game_started', (data) => {
    console.log('🚀 Game started event:', data);
    testCheckDetection();
});

player2.on('chess:game_started', (data) => {
    console.log('🚀 Game started event:', data);
});

// Move made handlers
player1.on('chess_move_made', (data) => {
    console.log('♟ Player 1 received move:', data);
    if (data.isCheck) {
        console.log('♔ CHECK detected!');
    }
    if (data.isCheckmate) {
        console.log('♔ CHECKMATE detected!');
    }
});

player2.on('chess_move_made', (data) => {
    console.log('♟ Player 2 received move:', data);
    if (data.isCheck) {
        console.log('♔ CHECK detected!');
    }
    if (data.isCheckmate) {
        console.log('♔ CHECKMATE detected!');
    }
});

// Game over handlers
player1.on('chess_game_over', (data) => {
    console.log('🏁 Player 1 received game over:', data);
});

player2.on('chess_game_over', (data) => {
    console.log('🏁 Player 2 received game over:', data);
});

// Error handlers
player1.on('chess_error', (data) => {
    console.log('❌ Player 1 error:', data);
});

player2.on('chess_error', (data) => {
    console.log('❌ Player 2 error:', data);
});

function testCheckDetection() {
    if (!gameId) {
        console.log('⏳ Waiting for game setup...');
        return;
    }
    
    console.log('🎯 Testing check detection...');
    
    // Test a simple check sequence
    const moves = [
        // Move 1: White pawn e2 to e4
        { from: 'e2', to: 'e4', player: 'CheckTest1', delay: 1000 },
        // Move 2: Black pawn e7 to e5
        { from: 'e7', to: 'e5', player: 'CheckTest2', delay: 2000 },
        // Move 3: White queen d1 to h5 (should put black in check)
        { from: 'd1', to: 'h5', player: 'CheckTest1', delay: 3000 },
        // Move 4: Black king e8 to e7 (should get out of check)
        { from: 'e8', to: 'e7', player: 'CheckTest2', delay: 4000 },
        // Move 5: White queen h5 to e8 (should be checkmate)
        { from: 'h5', to: 'e8', player: 'CheckTest1', delay: 5000 }
    ];
    
    moves.forEach((move, index) => {
        setTimeout(() => {
            const moveData = {
                gameId: gameId,
                from: move.from,
                to: move.to,
                username: move.player,
                timestamp: new Date().toISOString()
            };
            
            console.log(`♟ Move ${index + 1}: ${move.player} ${move.from} to ${move.to}`);
            
            if (move.player === 'CheckTest1') {
                player1.emit('chess_move', moveData);
            } else {
                player2.emit('chess_move', moveData);
            }
        }, move.delay);
    });
}

// Cleanup after test
setTimeout(() => {
    console.log('🧹 Cleaning up test...');
    player1.disconnect();
    player2.disconnect();
    process.exit(0);
}, 20000);

console.log('🧪 Check detection test started. Check server logs for chess events...'); 