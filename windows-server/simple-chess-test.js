// Simple Chess Test
console.log('🧪 SIMPLE CHESS TEST');
console.log('====================');

// Set up the initial board
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

// Simple chess functions
function getPieceColor(piece) {
    return piece === piece.toUpperCase() ? 'white' : 'black';
}

function isValidPawnMove(board, from, to, color) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    // Forward move (no capture)
    if (fromCol === toCol && !board[to]) {
        if (toRow === fromRow + direction) return true;
        // Double move from starting position
        if (fromRow === startRow && toRow === fromRow + 2 * direction) {
            const intermediateSquare = `${from[0]}${8 - (fromRow + direction)}`;
            return !board[intermediateSquare];
        }
    }
    
    // Capture (diagonal move with opponent piece)
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
        const targetPiece = board[to];
        if (targetPiece) {
            const isTargetWhite = targetPiece === targetPiece.toUpperCase();
            return (color === 'white' && !isTargetWhite) || (color === 'black' && isTargetWhite);
        }
    }
    
    return false;
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
        case 'p': return isValidPawnMove(board, from, to, color);
        default: return false;
    }
}

function isInCheck(board, color) {
    // Simplified - always return false for testing
    return false;
}

function hasValidMoves(board, color) {
    console.log(`[Chess Debug] Checking if ${color} has valid moves...`);
    
    // Check if any piece of the given color has valid moves
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === color) {
            console.log(`[Chess Debug] Checking ${color} piece ${piece} at ${square}`);
            
            // Check all possible squares on the board (including empty ones)
            for (let row = 1; row <= 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const targetSquare = `${String.fromCharCode('a'.charCodeAt(0) + col)}${row}`;
                    
                    // Skip if same square
                    if (square === targetSquare) continue;
                    
                    // Check if this move would be valid
                    if (isValidMove(board, square, targetSquare, color)) {
                        console.log(`[Chess Debug] Found valid move: ${square} to ${targetSquare}`);
                        
                        // Make a temporary move to check if it would put own king in check
                        const tempBoard = JSON.parse(JSON.stringify(board));
                        const pieceToMove = tempBoard[square];
                        tempBoard[targetSquare] = pieceToMove;
                        tempBoard[square] = null;
                        
                        // If this move doesn't put own king in check, it's a legal move
                        if (!isInCheck(tempBoard, color)) {
                            console.log(`[Chess Debug] ${color} has valid move: ${square} to ${targetSquare}`);
                            return true;
                        } else {
                            console.log(`[Chess Debug] Move ${square} to ${targetSquare} would put ${color} king in check`);
                        }
                    }
                }
            }
        }
    }
    
    console.log(`[Chess Debug] ${color} has no valid moves`);
    return false;
}

function isStalemate(board, color) {
    console.log(`[Chess Debug] Checking if ${color} is stalemated...`);
    
    // Stalemate occurs when player is NOT in check but has no legal moves
    if (isInCheck(board, color)) {
        console.log(`[Chess Debug] ${color} is in check, so not stalemated`);
        return false;
    }
    
    console.log(`[Chess Debug] ${color} is not in check, checking for legal moves...`);
    
    // Check if player has any legal moves
    if (hasValidMoves(board, color)) {
        console.log(`[Chess Debug] ${color} has legal moves, not stalemated`);
        return false;
    }
    
    console.log(`[Chess Debug] STALEMATE! ${color} has no legal moves but is not in check`);
    return true;
}

// Test the functions
console.log('\n🧪 TESTING CHESS FUNCTIONS:');

// Test specific pawn moves first
console.log('\n🔍 Testing specific pawn moves:');
console.log('White pawn e2 to e3:', isValidMove(board, 'e2', 'e3', 'white'));
console.log('White pawn e2 to e4:', isValidMove(board, 'e2', 'e4', 'white'));
console.log('Black pawn e7 to e6:', isValidMove(board, 'e7', 'e6', 'black'));
console.log('Black pawn e7 to e5:', isValidMove(board, 'e7', 'e5', 'black'));

// Test hasValidMoves
console.log('\n🔍 Testing hasValidMoves:');
const whiteHasMoves = hasValidMoves(board, 'white');
console.log(`White has valid moves: ${whiteHasMoves}`);

// Test stalemate
console.log('\n🔍 Testing stalemate:');
const whiteStalemated = isStalemate(board, 'white');
console.log(`White is stalemated: ${whiteStalemated}`);

if (whiteStalemated) {
    console.log('\n❌ BUG: White is stalemated on initial board!');
} else {
    console.log('\n✅ CORRECT: White is not stalemated on initial board');
}

console.log('\n✅ TEST COMPLETE!'); 