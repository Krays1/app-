// Debug Bishop Move Validation with Board Context
console.log('🔍 DEBUGGING BISHOP MOVE WITH BOARD CONTEXT');
console.log('===========================================');

// Set up the board exactly as in the test
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

// Test the exact isValidBishopMove function from server
function isValidBishopMove(board, from, to) {
    console.log(`\n🔍 isValidBishopMove(${from}, ${to})`);
    
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    console.log(`  From: col=${fromCol}, row=${fromRow}`);
    console.log(`  To: col=${toCol}, row=${toRow}`);
    
    if (Math.abs(fromCol - toCol) !== Math.abs(fromRow - toRow)) {
        console.log(`  ❌ Not diagonal: colDiff=${Math.abs(fromCol - toCol)}, rowDiff=${Math.abs(fromRow - toRow)}`);
        return false;
    }
    
    console.log(`  ✅ Is diagonal`);
    
    // Check if path is clear
    const colStep = fromCol < toCol ? 1 : -1;
    const rowStep = fromRow < toRow ? 1 : -1;
    
    console.log(`  Steps: colStep=${colStep}, rowStep=${rowStep}`);
    
    let col = fromCol + colStep;
    let row = fromRow + rowStep;
    
    console.log(`  Starting path check at: col=${col}, row=${row}`);
    
    while (col !== toCol && row !== toRow) {
        const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}`;
        const piece = board[square];
        console.log(`  Checking ${square}: ${piece || 'empty'}`);
        
        if (board[square]) {
            console.log(`  ❌ Path blocked at ${square} by ${piece}`);
            return false;
        }
        
        col += colStep;
        row += rowStep;
    }
    
    console.log(`  ✅ Path is clear`);
    return true;
}

// Test the bishop move
const from = 'h5';
const to = 'e8';

console.log(`\n🧪 TESTING BISHOP MOVE: ${from} to ${to}`);

const result = isValidBishopMove(board, from, to);
console.log(`\n🎯 RESULT: ${result}`);

if (result) {
    console.log('✅ Bishop move is valid - queen should be able to attack king');
} else {
    console.log('❌ Bishop move is invalid - this is the bug!');
}

console.log('\n✅ DEBUG COMPLETE!'); 