// Test Queen Attack Detection with Full Board Context
console.log('🧪 TESTING QUEEN ATTACK DETECTION');
console.log('==================================');

// Set up the board with the specific position
const board = {};

// Initialize the board with the game position
// White pieces
board['a1'] = 'R'; board['b1'] = 'N'; board['c1'] = 'B'; board['d1'] = null; // Queen moved
board['e1'] = 'K'; board['f1'] = 'B'; board['g1'] = 'N'; board['h1'] = 'R';
board['a2'] = 'P'; board['b2'] = 'P'; board['c2'] = 'P'; board['d2'] = 'P';
board['e2'] = null; board['f2'] = 'P'; board['g2'] = 'P'; board['h2'] = 'P';
board['e4'] = 'P'; // White pawn moved to e4
board['h5'] = 'Q'; // White queen moved to h5

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

// Test functions from server
function isValidRookMove(board, from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    if (fromCol !== toCol && fromRow !== toRow) return false;
    
    // Check if path is clear
    if (fromCol === toCol) {
        const start = Math.min(fromRow, toRow);
        const end = Math.max(fromRow, toRow);
        for (let row = start + 1; row < end; row++) {
            const square = `${String.fromCharCode('a'.charCodeAt(0) + fromCol)}${8 - row}`;
            if (board[square]) return false;
        }
    } else {
        const start = Math.min(fromCol, toCol);
        const end = Math.max(fromCol, toCol);
        for (let col = start + 1; col < end; col++) {
            const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - fromRow}`;
            if (board[square]) return false;
        }
    }
    
    return true;
}

function isValidBishopMove(board, from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    if (Math.abs(fromCol - toCol) !== Math.abs(fromRow - toRow)) return false;
    
    // Check if path is clear
    const colStep = fromCol < toCol ? 1 : -1;
    const rowStep = fromRow < toRow ? 1 : -1;
    
    let col = fromCol + colStep;
    let row = fromRow + rowStep;
    
    while (col !== toCol && row !== toRow) {
        const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}`;
        if (board[square]) return false;
        col += colStep;
        row += rowStep;
    }
    
    return true;
}

function isValidQueenMove(board, from, to) {
    return isValidRookMove(board, from, to) || isValidBishopMove(board, from, to);
}

function getPieceColor(piece) {
    return piece === piece.toUpperCase() ? 'white' : 'black';
}

function isValidMove(board, from, to, color) {
    const piece = board[from];
    if (!piece) {
        console.log(`❌ No piece at ${from}`);
        return false;
    }
    
    console.log(`🔍 Checking move: ${piece} from ${from} to ${to} by ${color}`);
    
    // Check if piece belongs to the player
    const isWhitePiece = piece === piece.toUpperCase();
    if ((color === 'white' && !isWhitePiece) || (color === 'black' && isWhitePiece)) {
        console.log(`❌ Piece ${piece} doesn't belong to ${color} player`);
        return false;
    }
    
    // Check if destination is not occupied by own piece
    const targetPiece = board[to];
    if (targetPiece) {
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();
        if ((color === 'white' && isTargetWhite) || (color === 'black' && !isTargetWhite)) {
            console.log(`❌ Destination ${to} occupied by own piece ${targetPiece}`);
            return false;
        }
    }
    
    const pieceType = piece.toLowerCase();
    console.log(`📋 Piece type: ${pieceType}`);
    
    let isValid = false;
    switch (pieceType) {
        case 'q':
            isValid = isValidQueenMove(board, from, to);
            console.log(`♕ Queen move valid: ${isValid}`);
            break;
        default:
            console.log(`❌ Unknown piece type: ${pieceType}`);
            return false;
    }
    
    return isValid;
}

// Test queen attack
console.log('\n🧪 TESTING QUEEN ATTACK:');
console.log('Queen at h5 attacking king at e8');

const queenMoveValid = isValidMove(board, 'h5', 'e8', 'white');
console.log(`\n🎯 RESULT: Queen can attack king = ${queenMoveValid}`);

if (queenMoveValid) {
    console.log('✅ Queen should put black king in check!');
} else {
    console.log('❌ Queen cannot attack king - this is wrong!');
}

console.log('\n✅ TEST COMPLETE!'); 