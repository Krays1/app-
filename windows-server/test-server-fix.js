// Test Server Fix
console.log('🧪 TESTING SERVER FIX');
console.log('=====================');

// Import the server functions directly
const fs = require('fs');
const path = require('path');

// Read the server file to check if it has the fix
const serverPath = path.join(__dirname, 'server-vpn.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

console.log('📋 CHECKING SERVER CODE:');

// Check if the fix is applied
if (serverContent.includes('for (let row = 1; row <= 8; row++)')) {
    console.log('✅ hasValidMoves fix is applied');
} else {
    console.log('❌ hasValidMoves fix is NOT applied');
}

// Check if the old code is still there
if (serverContent.includes('for (let targetSquare in board)')) {
    console.log('❌ Old hasValidMoves code is still present');
} else {
    console.log('✅ Old hasValidMoves code has been replaced');
}

console.log('\n✅ SERVER CODE CHECK COMPLETE!'); 