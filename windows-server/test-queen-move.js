// Test queen move validation
function initializeChessBoard() {
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
    
    return board;
}

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

// Test the specific scenario from the chess game
console.log('🧪 Testing Queen Move Validation...');

// Create a board with the specific position from the game
const board = initializeChessBoard();

// Set up the specific position from the game
board['e4'] = 'P';  // White pawn moved to e4
board['e2'] = null; // Remove from original position
board['c4'] = 'B';  // White bishop moved to c4
board['f1'] = null; // Remove from original position
board['h5'] = 'Q';  // White queen moved to h5
board['d1'] = null; // Remove from original position
board['g5'] = 'p';  // Black pawn moved to g5
board['g7'] = null; // Remove from original position
board['f6'] = 'p';  // Black pawn moved to f6
board['f7'] = null; // Remove from original position
board['f7'] = 'k';  // Black king moved to f7
board['e8'] = null; // Remove from original position

console.log('Board state:');
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

// Test if queen can move from h5 to f7 (should be valid diagonal move)
console.log('\n🧪 Testing Queen move from h5 to f7...');
const queenMoveValid = isValidQueenMove(board, 'h5', 'f7');
console.log(`Queen move h5 to f7: ${queenMoveValid ? 'VALID' : 'INVALID'}`);

// Test if this would put black king in check
console.log('\n🧪 Testing if this move would put black king in check...');
const tempBoard = JSON.parse(JSON.stringify(board));
tempBoard['f7'] = 'Q';  // Move queen to f7
tempBoard['h5'] = null; // Remove from h5

// Check if black king is in check
let blackKingFound = false;
for (let square in tempBoard) {
    if (tempBoard[square] === 'k') {
        console.log(`Black king found at ${square}`);
        blackKingFound = true;
        break;
    }
}

if (blackKingFound) {
    console.log('Black king is on the board');
} else {
    console.log('ERROR: Black king not found!');
}

console.log('\n�� Test completed!'); 