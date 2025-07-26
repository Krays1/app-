// Debug Valid Moves Detection
console.log('🔍 DEBUGGING VALID MOVES DETECTION');
console.log('==================================');

// Set up the initial board
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

console.log('📊 BOARD STATE:');
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

// Test functions
function isValidPawnMove(board, from, to, color) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    console.log(`  Pawn move: ${from} to ${to}, color: ${color}`);
    console.log(`    From: col=${fromCol}, row=${fromRow}`);
    console.log(`    To: col=${toCol}, row=${toRow}`);
    console.log(`    Direction: ${direction}, StartRow: ${startRow}`);
    
    // Forward move (no capture)
    if (fromCol === toCol && !board[to]) {
        console.log(`    Same column, no piece at destination`);
        if (toRow === fromRow + direction) {
            console.log(`    ✅ Single move forward`);
            return true;
        }
        // Double move from starting position
        if (fromRow === startRow && toRow === fromRow + 2 * direction) {
            const intermediateSquare = `${from[0]}${8 - (fromRow + direction)}`;
            console.log(`    Double move check: intermediate square ${intermediateSquare}`);
            if (!board[intermediateSquare]) {
                console.log(`    ✅ Double move forward`);
                return true;
            } else {
                console.log(`    ❌ Intermediate square blocked`);
            }
        }
    }
    
    // Capture (diagonal move with opponent piece)
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
        const targetPiece = board[to];
        if (targetPiece) {
            const isTargetWhite = targetPiece === targetPiece.toUpperCase();
            const canCapture = (color === 'white' && !isTargetWhite) || (color === 'black' && isTargetWhite);
            console.log(`    Diagonal capture: target=${targetPiece}, canCapture=${canCapture}`);
            return canCapture;
        }
    }
    
    console.log(`    ❌ Invalid pawn move`);
    return false;
}

function getPieceColor(piece) {
    return piece === piece.toUpperCase() ? 'white' : 'black';
}

function isValidMove(board, from, to, color) {
    const piece = board[from];
    if (!piece) return false;
    
    // Check if piece belongs to the player
    const isWhitePiece = piece === piece.toUpperCase();
    if ((color === 'white' && !isWhitePiece) || (color === 'black' && isWhitePiece)) {
        return false;
    }
    
    // Check if destination is not occupied by own piece
    const targetPiece = board[to];
    if (targetPiece) {
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();
        if ((color === 'white' && isTargetWhite) || (color === 'black' && !isTargetWhite)) {
            return false;
        }
    }
    
    const pieceType = piece.toLowerCase();
    switch (pieceType) {
        case 'p': return isValidPawnMove(board, from, to, color);
        default: return false;
    }
}

// Test specific pawn moves
console.log('\n🧪 TESTING SPECIFIC PAWN MOVES:');

// Test white pawn moves
console.log('\n🔍 Testing white pawn moves:');
const whitePawnMoves = [
    { from: 'e2', to: 'e3' }, // Single move
    { from: 'e2', to: 'e4' }, // Double move
    { from: 'a2', to: 'a3' }, // Single move
    { from: 'a2', to: 'a4' }  // Double move
];

for (let move of whitePawnMoves) {
    console.log(`\nTesting ${move.from} to ${move.to}:`);
    const isValid = isValidMove(board, move.from, move.to, 'white');
    console.log(`Result: ${isValid}`);
}

// Test black pawn moves
console.log('\n🔍 Testing black pawn moves:');
const blackPawnMoves = [
    { from: 'e7', to: 'e6' }, // Single move
    { from: 'e7', to: 'e5' }, // Double move
    { from: 'a7', to: 'a6' }, // Single move
    { from: 'a7', to: 'a5' }  // Double move
];

for (let move of blackPawnMoves) {
    console.log(`\nTesting ${move.from} to ${move.to}:`);
    const isValid = isValidMove(board, move.from, move.to, 'black');
    console.log(`Result: ${isValid}`);
}

console.log('\n✅ DEBUG COMPLETE!'); 