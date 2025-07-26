const io = require('socket.io-client');

console.log('🧪 Testing Chess Check and Checkmate Detection...');

// Connect two players
const player1 = io('http://localhost:3001');
const player2 = io('http://localhost:3001');

let gameId = null;
let player1Color = null;
let player2Color = null;

// Player 1 setup
player1.on('connect', () => {
    console.log('✅ Player 1 connected');
    
    // Register player 1
    player1.emit('register', {
        username: 'CheckPlayer1',
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
        username: 'CheckPlayer2',
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
    player1Color = data.color;
    
    if (data.started) {
        console.log('🎯 Game started! Player 1 is', data.color);
        testCheckmateSequence();
    }
});

player2.on('chess:game_joined', (data) => {
    console.log('🎮 Player 2 joined game:', data);
    player2Color = data.color;
    
    if (data.started) {
        console.log('🎯 Game started! Player 2 is', data.color);
    }
});

// Game started handler
player1.on('chess:game_started', (data) => {
    console.log('🚀 Game started event:', data);
    testCheckmateSequence();
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

function testCheckmateSequence() {
    if (!gameId || !player1Color) {
        console.log('⏳ Waiting for game setup...');
        return;
    }
    
    console.log('🎯 Testing checkmate sequence...');
    
    // Test a simple checkmate sequence (Fool's Mate)
    const moves = [
        // Move 1: White pawn f2 to f3
        { from: 'f2', to: 'f3', player: 'CheckPlayer1', delay: 1000 },
        // Move 2: Black pawn e7 to e6
        { from: 'e7', to: 'e6', player: 'CheckPlayer2', delay: 2000 },
        // Move 3: White pawn g2 to g4
        { from: 'g2', to: 'g4', player: 'CheckPlayer1', delay: 3000 },
        // Move 4: Black queen d8 to h4 (checkmate!)
        { from: 'd8', to: 'h4', player: 'CheckPlayer2', delay: 4000 }
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
            
            if (move.player === 'CheckPlayer1') {
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
}, 15000);

console.log('🧪 Check/Checkmate test started. Check server logs for chess events...'); 