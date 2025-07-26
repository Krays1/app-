const io = require('socket.io-client');

console.log('🧪 Testing Simple Chess System...');

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
        username: 'Player1',
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
        username: 'Player2',
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
        testFirstMove();
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
    testFirstMove();
});

player2.on('chess:game_started', (data) => {
    console.log('🚀 Game started event:', data);
});

// Move made handlers
player1.on('chess_move_made', (data) => {
    console.log('♟ Player 1 received move:', data);
});

player2.on('chess_move_made', (data) => {
    console.log('♟ Player 2 received move:', data);
});

// Error handlers
player1.on('chess_error', (data) => {
    console.log('❌ Player 1 error:', data);
});

player2.on('chess_error', (data) => {
    console.log('❌ Player 2 error:', data);
});

function testFirstMove() {
    if (!gameId || !player1Color) {
        console.log('⏳ Waiting for game setup...');
        return;
    }
    
    console.log('🎯 Testing first move...');
    
    // Player 1 makes first move (e2 to e4)
    const moveData = {
        gameId: gameId,
        from: 'e2',
        to: 'e4',
        username: 'Player1',
        timestamp: new Date().toISOString()
    };
    
    console.log('♟ Player 1 making move:', moveData);
    player1.emit('chess_move', moveData);
    
    // Test second move after a delay
    setTimeout(() => {
        const moveData2 = {
            gameId: gameId,
            from: 'e7',
            to: 'e5',
            username: 'Player2',
            timestamp: new Date().toISOString()
        };
        
        console.log('♟ Player 2 making move:', moveData2);
        player2.emit('chess_move', moveData2);
    }, 2000);
}

// Cleanup after test
setTimeout(() => {
    console.log('🧹 Cleaning up test...');
    player1.disconnect();
    player2.disconnect();
    process.exit(0);
}, 10000);

console.log('🧪 Test started. Check server logs for chess events...'); 