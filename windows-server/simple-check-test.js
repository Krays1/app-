// Simple check detection test
console.log('🧪 Simple Check Detection Test...');

// Test 1: Queen attacking king directly
const board1 = {};
board1['h5'] = 'Q';  // White queen
board1['e8'] = 'k';  // Black king

console.log('Test 1: Queen at h5, King at e8');
console.log('Board:', board1);

function isInCheck(board, color) {
    console.log(`Checking if ${color} is in check...`);
    
    // Find the king
    const kingPiece = color === 'white' ? 'K' : 'k';
    let kingPosition = null;
    
    for (let square in board) {
        if (board[square] === kingPiece) {
            kingPosition = square;
            break;
        }
    }
    
    if (!kingPosition) {
        console.log(`No ${color} king found!`);
        return false;
    }
    
    console.log(`${color} king found at ${kingPosition}`);
    
    // Check if any opponent piece can capture the king
    const opponentColor = color === 'white' ? 'black' : 'white';
    console.log(`Checking if any ${opponentColor} pieces can capture king at ${kingPosition}`);
    
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === opponentColor) {
            console.log(`Checking ${opponentColor} piece ${piece} at ${square} against king at ${kingPosition}`);
            
            // Simple check: if it's a queen, check if it can move to king's square
            if (piece.toLowerCase() === 'q') {
                const fromCol = square.charCodeAt(0) - 'a'.charCodeAt(0);
                const fromRow = 8 - parseInt(square[1]);
                const toCol = kingPosition.charCodeAt(0) - 'a'.charCodeAt(0);
                const toRow = 8 - parseInt(kingPosition[1]);
                
                // Check if it's a valid queen move (diagonal or straight)
                const isDiagonal = Math.abs(fromCol - toCol) === Math.abs(fromRow - toRow);
                const isStraight = fromCol === toCol || fromRow === toRow;
                
                if (isDiagonal || isStraight) {
                    console.log(`✅ Queen can attack king! Diagonal: ${isDiagonal}, Straight: ${isStraight}`);
                    return true;
                }
            }
        }
    }
    
    console.log(`${color} is NOT in check`);
    return false;
}

function getPieceColor(piece) {
    return piece === piece.toUpperCase() ? 'white' : 'black';
}

// Test if black is in check
const blackInCheck = isInCheck(board1, 'black');
console.log(`Result: Black in check = ${blackInCheck}`);

console.log('\n�� Test completed!'); 