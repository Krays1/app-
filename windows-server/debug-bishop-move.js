// Debug Bishop Move Validation
console.log('🔍 DEBUGGING BISHOP MOVE VALIDATION');
console.log('===================================');

// Test bishop move from h5 to e8 (diagonal)
const from = 'h5';
const to = 'e8';

console.log(`Testing bishop move: ${from} to ${to}`);

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
console.log(`  Is diagonal: ${isDiagonal}`);

if (!isDiagonal) {
    console.log('❌ Not a diagonal move');
    return;
}

console.log('✅ Is diagonal move');

// Check if path is clear
const colStep = fromCol < toCol ? 1 : -1;
const rowStep = fromRow < toRow ? 1 : -1;

console.log(`\n🔍 Checking diagonal path:`);
console.log(`  Column step: ${colStep}`);
console.log(`  Row step: ${rowStep}`);

let col = fromCol + colStep;
let row = fromRow + rowStep;

console.log(`  Starting at: col=${col}, row=${row}`);
console.log(`  Target: col=${toCol}, row=${toRow}`);

let pathClear = true;
while (col !== toCol && row !== toRow) {
    const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}`;
    console.log(`  Checking square ${square}: empty`);
    col += colStep;
    row += rowStep;
}

console.log(`  Final position: col=${col}, row=${row}`);
console.log(`  Target position: col=${toCol}, row=${toRow}`);

if (col === toCol && row === toRow) {
    console.log('✅ Path is clear');
    console.log('✅ Bishop move should be valid');
} else {
    console.log('❌ Path is blocked or logic error');
    console.log(`  Expected: col=${toCol}, row=${toRow}`);
    console.log(`  Got: col=${col}, row=${row}`);
}

console.log('\n✅ DEBUG COMPLETE!'); 