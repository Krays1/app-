const io = require('socket.io-client');

console.log('🧪 DEEP CHESS TEST - MULTIPLE GAMES');
console.log('=====================================');

// Test scenarios
const testScenarios = [
    {
        name: "Fool's Mate Test",
        description: "Fastest possible checkmate (2 moves)",
        moves: [
            { from: 'f2', to: 'f4', player: 'white' },
            { from: 'e7', to: 'e6', player: 'black' },
            { from: 'g2', to: 'g4', player: 'white' },
            { from: 'd8', to: 'h4', player: 'black' } // Should be checkmate
        ]
    },
    {
        name: "Scholar's Mate Test", 
        description: "Classic 4-move checkmate",
        moves: [
            { from: 'e2', to: 'e4', player: 'white' },
            { from: 'e7', to: 'e5', player: 'black' },
            { from: 'f1', to: 'c4', player: 'white' },
            { from: 'b7', to: 'b6', player: 'black' },
            { from: 'd1', to: 'h5', player: 'white' },
            { from: 'g7', to: 'g6', player: 'black' },
            { from: 'h5', to: 'f7', player: 'white' } // Should be checkmate
        ]
    },
    {
        name: "Check Escape Test",
        description: "Put opponent in check, then escape",
        moves: [
            { from: 'e2', to: 'e4', player: 'white' },
            { from: 'e7', to: 'e5', player: 'black' },
            { from: 'd1', to: 'h5', player: 'white' }, // Should put black in check
            { from: 'e8', to: 'e7', player: 'black' }, // Should escape check
            { from: 'h5', to: 'e8', player: 'white' }  // Should be checkmate
        ]
    },
    {
        name: "Illegal Move Test",
        description: "Try to move into check",
        moves: [
            { from: 'e2', to: 'e4', player: 'white' },
            { from: 'e7', to: 'e5', player: 'black' },
            { from: 'd1', to: 'h5', player: 'white' }, // Should put black in check
            { from: 'e8', to: 'f7', player: 'black' }, // Should be illegal (still in check)
            { from: 'h5', to: 'e8', player: 'white' }  // Should be checkmate
        ]
    }
];

let currentTest = 0;
let currentMove = 0;
let player1 = null;
let player2 = null;
let gameId = null;
let testResults = [];

function runNextTest() {
    if (currentTest >= testScenarios.length) {
        console.log('\n🏁 ALL TESTS COMPLETED!');
        console.log('========================');
        testResults.forEach((result, index) => {
            console.log(`\n${index + 1}. ${result.name}: ${result.status}`);
            if (result.issues.length > 0) {
                console.log('   Issues:');
                result.issues.forEach(issue => console.log(`   - ${issue}`));
            }
        });
        
        // Cleanup
        if (player1) player1.disconnect();
        if (player2) player2.disconnect();
        process.exit(0);
        return;
    }
    
    const scenario = testScenarios[currentTest];
    console.log(`\n🎯 TEST ${currentTest + 1}: ${scenario.name}`);
    console.log(`📝 ${scenario.description}`);
    console.log(`📋 Moves: ${scenario.moves.length}`);
    
    testResults[currentTest] = {
        name: scenario.name,
        status: 'RUNNING',
        issues: [],
        checkDetected: false,
        checkmateDetected: false,
        illegalMoveBlocked: false
    };
    
    currentMove = 0;
    startNewGame();
}

function startNewGame() {
    // Create new players for each test
    if (player1) player1.disconnect();
    if (player2) player2.disconnect();
    
    player1 = io('http://localhost:3001');
    player2 = io('http://localhost:3001');
    
    setupPlayerListeners();
    
    // Register players
    player1.emit('register', {
        username: `TestPlayer1_${currentTest}`,
        deviceId: `device1_${currentTest}`,
        deviceName: `Test Device 1 - ${currentTest}`
    });
    
    player2.emit('register', {
        username: `TestPlayer2_${currentTest}`,
        deviceId: `device2_${currentTest}`,
        deviceName: `Test Device 2 - ${currentTest}`
    });
    
    // Find game
    setTimeout(() => {
        console.log(`🔍 Starting game for test ${currentTest + 1}...`);
        player1.emit('chess:find_game');
    }, 1000);
}

function setupPlayerListeners() {
    // Player 1 listeners
    player1.on('chess:game_joined', (data) => {
        console.log(`✅ Player 1 joined game: ${data.gameId}`);
        gameId = data.gameId;
        
        if (data.started) {
            console.log('🚀 Game started! Beginning moves...');
            setTimeout(() => makeNextMove(), 500);
        }
    });
    
    player1.on('chess:game_started', (data) => {
        console.log('🚀 Game started event received');
        setTimeout(() => makeNextMove(), 500);
    });
    
    player1.on('chess_move_made', (data) => {
        console.log(`♟ Move made: ${data.from} to ${data.to} by ${data.playerName}`);
        console.log(`   Check: ${data.isCheck}, Checkmate: ${data.isCheckmate}`);
        
        const result = testResults[currentTest];
        if (data.isCheck) {
            result.checkDetected = true;
            console.log('♔ CHECK DETECTED! ✅');
        }
        if (data.isCheckmate) {
            result.checkmateDetected = true;
            console.log('♔ CHECKMATE DETECTED! ✅');
        }
        
        setTimeout(() => makeNextMove(), 1000);
    });
    
    player1.on('chess_error', (data) => {
        console.log(`❌ Chess error: ${data.message}`);
        const result = testResults[currentTest];
        
        if (data.message.includes('put your king in check')) {
            result.illegalMoveBlocked = true;
            console.log('🚫 ILLEGAL MOVE BLOCKED! ✅');
        }
        
        result.issues.push(`Error: ${data.message}`);
        setTimeout(() => makeNextMove(), 1000);
    });
    
    player1.on('chess:game_over', (data) => {
        console.log(`🏁 Game over: ${data.reason}`);
        const result = testResults[currentTest];
        
        if (data.reason === 'Checkmate') {
            result.checkmateDetected = true;
            console.log('♔ CHECKMATE CONFIRMED! ✅');
        }
        
        // Move to next test
        setTimeout(() => {
            currentTest++;
            runNextTest();
        }, 2000);
    });
    
    // Player 2 listeners
    player2.on('chess:game_joined', (data) => {
        console.log(`✅ Player 2 joined game: ${data.gameId}`);
    });
    
    player2.on('chess_move_made', (data) => {
        console.log(`♟ Move made: ${data.from} to ${data.to} by ${data.playerName}`);
        console.log(`   Check: ${data.isCheck}, Checkmate: ${data.isCheckmate}`);
        
        const result = testResults[currentTest];
        if (data.isCheck) {
            result.checkDetected = true;
            console.log('♔ CHECK DETECTED! ✅');
        }
        if (data.isCheckmate) {
            result.checkmateDetected = true;
            console.log('♔ CHECKMATE DETECTED! ✅');
        }
    });
    
    player2.on('chess_error', (data) => {
        console.log(`❌ Chess error: ${data.message}`);
        const result = testResults[currentTest];
        
        if (data.message.includes('put your king in check')) {
            result.illegalMoveBlocked = true;
            console.log('🚫 ILLEGAL MOVE BLOCKED! ✅');
        }
        
        result.issues.push(`Error: ${data.message}`);
    });
    
    player2.on('chess:game_over', (data) => {
        console.log(`🏁 Game over: ${data.reason}`);
        const result = testResults[currentTest];
        
        if (data.reason === 'Checkmate') {
            result.checkmateDetected = true;
            console.log('♔ CHECKMATE CONFIRMED! ✅');
        }
    });
}

function makeNextMove() {
    const scenario = testScenarios[currentTest];
    
    if (currentMove >= scenario.moves.length) {
        console.log('📋 All moves completed for this test');
        return;
    }
    
    const move = scenario.moves[currentMove];
    const player = move.player === 'white' ? player1 : player2;
    const playerName = move.player === 'white' ? `TestPlayer1_${currentTest}` : `TestPlayer2_${currentTest}`;
    
    console.log(`♟ Making move ${currentMove + 1}: ${move.player} ${move.from} to ${move.to}`);
    
    const moveData = {
        gameId: gameId,
        from: move.from,
        to: move.to,
        username: playerName,
        timestamp: new Date().toISOString()
    };
    
    player.emit('chess_move', moveData);
    currentMove++;
}

// Start the test sequence
console.log('🚀 Starting deep chess test...');
setTimeout(() => {
    runNextTest();
}, 2000);

// Cleanup on exit
process.on('SIGINT', () => {
    console.log('\n🛑 Test interrupted');
    if (player1) player1.disconnect();
    if (player2) player2.disconnect();
    process.exit(0);
});

console.log('🧪 Deep chess test initialized. Starting in 2 seconds...'); 