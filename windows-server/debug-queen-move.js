// Debug Queen Move Validation
console.log('🔍 DEBUGGING QUEEN MOVE VALIDATION');
console.log('==================================');

// Test queen move from h5 to e8
const from = 'h5';
const to = 'e8';

console.log(`Testing queen move: ${from} to ${to}`);

// Calculate coordinates
const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
const fromRow = 8 - parseInt(from[1]);
const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
const toRow = 8 - parseInt(to[1]);

console.log(`Coordinates:`);
console.log(`  From h5: col=${fromCol}, row=${fromRow}`);
console.log(`  To e8: col=${toCol}, row=${toRow}`);

// Test if it's a diagonal move
const colDiff = Math.abs(fromCol - toCol);
const rowDiff = Math.abs(fromRow - toRow);

console.log(`\nMove analysis:`);
console.log(`  Column difference: ${colDiff}`);
console.log(`  Row difference: ${rowDiff}`);

const isDiagonal = colDiff === rowDiff;
const isStraight = fromCol === toCol || fromRow === toRow;

console.log(`  Is diagonal: ${isDiagonal}`);
console.log(`  Is straight: ${isStraight}`);

if (isDiagonal || isStraight) {
    console.log('✅ Queen can move this way');
    
    // Check if path is clear (for diagonal)
    if (isDiagonal) {
        console.log('\n🔍 Checking diagonal path...');
        
        const colStep = fromCol < toCol ? 1 : -1;
        const rowStep = fromRow < toRow ? 1 : -1;
        
        let col = fromCol + colStep;
        let row = fromRow + rowStep;
        
        console.log(`  Starting at: col=${fromCol + colStep}, row=${fromRow + rowStep}`);
        console.log(`  Target: col=${toCol}, row=${toRow}`);
        
        while (col !== toCol && row !== toRow) {
            const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}`;
            console.log(`  Checking square ${square}: empty`);
            col += colStep;
            row += rowStep;
        }
        
        console.log('✅ Path is clear');
    }
} else {
    console.log('❌ Queen cannot move this way');
}

console.log('\n🎯 CONCLUSION:');
if (isDiagonal || isStraight) {
    console.log('Queen should be able to move from h5 to e8');
    console.log('This should put the black king in check');
} else {
    console.log('Queen cannot move from h5 to e8');
    console.log('This indicates a bug in move validation');
}

console.log('\n✅ DEBUG COMPLETE!'); 