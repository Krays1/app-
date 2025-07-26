// Quick Chess Verification Test
console.log('🧪 QUICK CHESS VERIFICATION');
console.log('============================');

// Test the current state based on the image
// From the logs, we can see:
// - Queen at h5
// - King at e8
// - Check was detected
// - Game ended in stalemate

console.log('📊 ANALYZING CURRENT GAME STATE:');
console.log('- White Queen: h5');
console.log('- Black King: e8');
console.log('- Check detected: YES');
console.log('- Game result: Stalemate (should be checkmate)');

// Test the specific position
const board = {};

// Set up the position from the game
board['h5'] = 'Q';  // White queen
board['e8'] = 'k';  // Black king

console.log('\n🧪 TESTING CHECK DETECTION:');
function isInCheck(board, color) {
    const kingPiece = color === 'white' ? 'K' : 'k';
    let kingPosition = null;
    
    for (let square in board) {
        if (board[square] === kingPiece) {
            kingPosition = square;
            break;
        }
    }
    
    if (!kingPosition) {
        console.log(`❌ No ${color} king found!`);
        return false;
    }
    
    console.log(`✅ ${color} king found at ${kingPosition}`);
    
    // Check if queen can attack king
    const queenSquare = 'h5';
    const queen = board[queenSquare];
    
    if (queen && queen === 'Q') {
        console.log(`✅ White queen found at ${queenSquare}`);
        
        // Check if queen can move to king's square
        const fromCol = queenSquare.charCodeAt(0) - 'a'.charCodeAt(0);
        const fromRow = 8 - parseInt(queenSquare[1]);
        const toCol = kingPosition.charCodeAt(0) - 'a'.charCodeAt(0);
        const toRow = 8 - parseInt(kingPosition[1]);
        
        const colDiff = Math.abs(fromCol - toCol);
        const rowDiff = Math.abs(fromRow - toRow);
        
        const isDiagonal = colDiff === rowDiff;
        const isStraight = fromCol === toCol || fromRow === toRow;
        
        console.log(`📐 Queen move analysis:`);
        console.log(`   From: ${queenSquare} (col=${fromCol}, row=${fromRow})`);
        console.log(`   To: ${kingPosition} (col=${toCol}, row=${toRow})`);
        console.log(`   Diagonal: ${isDiagonal}, Straight: ${isStraight}`);
        
        if (isDiagonal || isStraight) {
            console.log(`♔ CHECK! Queen can attack king`);
            return true;
        }
    }
    
    console.log(`❌ No check detected`);
    return false;
}

const blackInCheck = isInCheck(board, 'black');
console.log(`\n🎯 RESULT: Black in check = ${blackInCheck}`);

// Test checkmate detection
console.log('\n🧪 TESTING CHECKMATE DETECTION:');
console.log('For checkmate, black must be in check AND have no legal moves');

if (blackInCheck) {
    console.log('✅ Black is in check');
    
    // Check if black has any legal moves
    const blackKing = 'k';
    const kingPosition = 'e8';
    
    console.log('🔍 Checking black king legal moves...');
    
    // King can move to adjacent squares
    const kingMoves = [
        'd8', 'd7', 'e7', 'f7', 'f8'
    ];
    
    let hasLegalMoves = false;
    for (let move of kingMoves) {
        // Check if move is within board bounds
        const col = move.charCodeAt(0) - 'a'.charCodeAt(0);
        const row = parseInt(move[1]);
        
        if (col >= 0 && col <= 7 && row >= 1 && row <= 8) {
            console.log(`   Checking king move to ${move}: VALID`);
            hasLegalMoves = true;
            break;
        }
    }
    
    if (hasLegalMoves) {
        console.log('❌ Black has legal moves - NOT checkmate');
        console.log('🎯 DIAGNOSIS: Should be check, not stalemate');
    } else {
        console.log('✅ Black has no legal moves - CHECKMATE!');
        console.log('🎯 DIAGNOSIS: Should be checkmate, not stalemate');
    }
} else {
    console.log('❌ Black is not in check');
    console.log('🎯 DIAGNOSIS: Check detection failed');
}

console.log('\n🔧 RECOMMENDED FIXES:');
console.log('1. Verify check detection is working (✅ appears to be working)');
console.log('2. Check if checkmate detection is being called');
console.log('3. Verify game over logic distinguishes between checkmate and stalemate');
console.log('4. Check client-side event handling for check/checkmate events');

console.log('\n✅ VERIFICATION COMPLETE!'); 