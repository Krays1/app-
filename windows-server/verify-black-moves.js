// Verify Black Legal Moves
console.log('🔍 VERIFYING BLACK LEGAL MOVES');
console.log('==============================');

// Set up the board with the actual game position
const board = {};

// Initialize the board with the game position
// White pieces
board['a1'] = 'R'; board['b1'] = 'N'; board['c1'] = 'B'; board['d1'] = null;
board['e1'] = 'K'; board['f1'] = 'B'; board['g1'] = 'N'; board['h1'] = 'R';
board['a2'] = 'P'; board['b2'] = 'P'; board['c2'] = 'P'; board['d2'] = 'P';
board['e2'] = null; board['f2'] = 'P'; board['g2'] = 'P'; board['h2'] = 'P';
board['e4'] = 'P';
board['h5'] = 'Q';

// Black pieces
board['a8'] = 'r'; board['b8'] = 'n'; board['c8'] = 'b'; board['d8'] = 'q';
board['e8'] = 'k'; board['f8'] = 'b'; board['g8'] = 'n'; board['h8'] = 'r';
board['a7'] = 'p'; board['b7'] = 'p'; board['c7'] = 'p'; board['d7'] = 'p';
board['e7'] = 'p'; board['f7'] = 'p'; board['g7'] = 'p'; board['h7'] = 'p';

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
function isValidKingMove(from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const colDiff = Math.abs(fromCol - toCol);
    const rowDiff = Math.abs(fromRow - toRow);
    
    return colDiff <= 1 && rowDiff <= 1;
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
        case 'k': return isValidKingMove(from, to);
        default: return false;
    }
}

// Check black king legal moves
console.log('\n🧪 CHECKING BLACK KING LEGAL MOVES:');
console.log('Black king at e8');

const kingMoves = [
    'd8', 'd7', 'e7', 'f7', 'f8'
];

let hasLegalMoves = false;
for (let move of kingMoves) {
    console.log(`\n🔍 Testing king move to ${move}:`);
    
    // Check if move is within board bounds
    const col = move.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = parseInt(move[1]);
    
    if (col < 0 || col > 7 || row < 1 || row > 8) {
        console.log(`  ❌ Out of bounds`);
        continue;
    }
    
    // Check if move is valid according to king rules
    if (!isValidKingMove('e8', move)) {
        console.log(`  ❌ Invalid king move`);
        continue;
    }
    
    // Check if destination is occupied by own piece
    const targetPiece = board[move];
    if (targetPiece && getPieceColor(targetPiece) === 'black') {
        console.log(`  ❌ Own piece at ${move}: ${targetPiece}`);
        continue;
    }
    
    console.log(`  ✅ Valid king move to ${move}`);
    hasLegalMoves = true;
    break;
}

console.log(`\n🎯 RESULT: Black king has legal moves = ${hasLegalMoves}`);

if (hasLegalMoves) {
    console.log('✅ Black has legal moves - should NOT be stalemate');
    console.log('❌ Game ending in stalemate is incorrect');
} else {
    console.log('❌ Black has no legal moves - stalemate is correct');
}

console.log('\n✅ VERIFICATION COMPLETE!'); 