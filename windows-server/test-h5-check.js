// Test the specific h5 queen check scenario
console.log('🧪 Testing h5 Queen Check Scenario...');

// Create a board with the specific position
const board = {};

// Set up the pieces as they were after move 5 (Qd1-h5)
// White pieces
board['a1'] = 'R'; board['b1'] = 'N'; board['c1'] = 'B'; board['d1'] = null; // Queen moved
board['e1'] = 'K'; board['f1'] = null; board['g1'] = 'N'; board['h1'] = 'R';
board['a2'] = 'P'; board['b2'] = 'P'; board['c2'] = 'P'; board['d2'] = 'P';
board['e2'] = null; board['f2'] = 'P'; board['g2'] = 'P'; board['h2'] = 'P';
board['e4'] = 'P'; // White pawn moved to e4
board['c4'] = 'B'; // White bishop moved to c4
board['h5'] = 'Q'; // White queen moved to h5

// Black pieces
board['a8'] = 'r'; board['b8'] = 'n'; board['c8'] = 'b'; board['d8'] = 'q';
board['e8'] = 'k'; board['f8'] = 'b'; board['g8'] = 'n'; board['h8'] = 'r';
board['a7'] = 'p'; board['b7'] = 'p'; board['c7'] = 'p'; board['d7'] = 'p';
board['e7'] = 'p'; board['f7'] = null; board['g7'] = null; board['h7'] = 'p';
board['f6'] = 'p'; // Black pawn moved to f6
board['g5'] = 'p'; // Black pawn moved to g5

console.log('Board state after Qd1-h5:');
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

// Test if white queen at h5 can attack black king at e8
console.log('\n🧪 Testing if white queen at h5 can attack black king at e8...');

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

// Test queen move from h5 to e8
const queenCanAttack = isValidQueenMove(board, 'h5', 'e8');
console.log(`Queen at h5 can attack king at e8: ${queenCanAttack ? 'YES' : 'NO'}`);

if (queenCanAttack) {
    console.log('✅ Black king should be in check!');
} else {
    console.log('❌ Black king should NOT be in check');
}

// Test the diagonal path from h5 to e8
console.log('\n🧪 Testing diagonal path from h5 to e8...');
const fromCol = 'h'.charCodeAt(0) - 'a'.charCodeAt(0); // 7
const fromRow = 8 - 5; // 3
const toCol = 'e'.charCodeAt(0) - 'a'.charCodeAt(0); // 4
const toRow = 8 - 8; // 0

console.log(`From h5: col=${fromCol}, row=${fromRow}`);
console.log(`To e8: col=${toCol}, row=${toRow}`);
console.log(`Col difference: ${Math.abs(fromCol - toCol)}`);
console.log(`Row difference: ${Math.abs(fromRow - toRow)}`);

const isDiagonal = Math.abs(fromCol - toCol) === Math.abs(fromRow - toRow);
console.log(`Is diagonal move: ${isDiagonal}`);

if (isDiagonal) {
    console.log('✅ Move is diagonal');
    
    // Check path
    const colStep = fromCol < toCol ? 1 : -1;
    const rowStep = fromRow < toRow ? 1 : -1;
    
    let col = fromCol + colStep;
    let row = fromRow + rowStep;
    
    console.log('Checking path:');
    while (col !== toCol && row !== toRow) {
        const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}`;
        const piece = board[square] || '.';
        console.log(`  Square ${square}: ${piece}`);
        if (board[square]) {
            console.log(`  ❌ Path blocked by ${piece} at ${square}`);
            break;
        }
        col += colStep;
        row += rowStep;
    }
} else {
    console.log('❌ Move is not diagonal');
}

console.log('\n�� Test completed!'); 