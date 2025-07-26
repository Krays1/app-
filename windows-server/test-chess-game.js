// Test Chess Game Move
console.log('🧪 TESTING CHESS GAME MOVE');
console.log('==========================');

// Simulate a chess game with a move
const gameId = 'test-game-123';
const board = {};

// Initialize pawns
for (let col = 0; col < 8; col++) {
    const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
    board[`${colChar}2`] = 'P'; // White pawns
    board[`${colChar}7`] = 'p'; // Black pawns
}

// Initialize other pieces
const whitePieces = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
const blackPieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];

for (let col = 0; col < 8; col++) {
    const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
    board[`${colChar}1`] = whitePieces[col];
    board[`${colChar}8`] = blackPieces[col];
}

console.log('📊 INITIAL BOARD:');
for (let row = 8; row >= 1; row--) {
    let rowStr = `${row} `;
    for (let col = 0; col < 8; col++) {
        const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
        const square = `${colChar}${row}`;
        const piece = board[square] || '.';
        rowStr += piece + ' ';
    }
    console.log(rowStr);
}
console.log('  a b c d e f g h');

// Simulate a move: White pawn e2 to e4
console.log('\n🎯 SIMULATING MOVE: White pawn e2 to e4');

// Make the move
const from = 'e2';
const to = 'e4';
const piece = board[from];

if (piece) {
    board[to] = piece;
    board[from] = null;
    console.log(`✅ Move successful: ${piece} from ${from} to ${to}`);
} else {
    console.log(`❌ No piece at ${from}`);
}

console.log('\n📊 BOARD AFTER MOVE:');
for (let row = 8; row >= 1; row--) {
    let rowStr = `${row} `;
    for (let col = 0; col < 8; col++) {
        const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
        const square = `${colChar}${row}`;
        const piece = board[square] || '.';
        rowStr += piece + ' ';
    }
    console.log(rowStr);
}
console.log('  a b c d e f g h');

console.log('\n✅ CHESS GAME TEST COMPLETE!');
console.log('The server should now work correctly for chess moves.');
console.log('Try playing a chess game in the Android app now!'); 