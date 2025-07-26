// Debug First Move Stalemate
console.log('🔍 DEBUGGING FIRST MOVE STALEMATE');
console.log('==================================');

// Test the initial board setup
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

// Copy the functions from server
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

function isValidKnightMove(from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const colDiff = Math.abs(fromCol - toCol);
    const rowDiff = Math.abs(fromRow - toRow);
    
    return (colDiff === 2 && rowDiff === 1) || (colDiff === 1 && rowDiff === 2);
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

function isValidKingMove(from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const colDiff = Math.abs(fromCol - toCol);
    const rowDiff = Math.abs(fromRow - toRow);
    
    return colDiff <= 1 && rowDiff <= 1;
}

function getPieceColor(piece) {
    return piece === piece.toUpperCase() ? 'white' : 'black';
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
        case 'q': return isValidQueenMove(board, from, to);
        case 'r': return isValidRookMove(board, from, to);
        case 'b': return isValidBishopMove(board, from, to);
        case 'n': return isValidKnightMove(from, to);
        case 'p': return isValidPawnMove(board, from, to, color);
        case 'k': return isValidKingMove(from, to);
        default: return false;
    }
}

function isInCheck(board, color) {
    console.log(`[Chess Debug] Checking if ${color} is in check...`);
    
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
        console.log(`[Chess Debug] No ${color} king found on board!`);
        return false;
    }
    
    console.log(`[Chess Debug] ${color} king found at ${kingPosition}`);
    
    // Check if any opponent piece can capture the king
    const opponentColor = color === 'white' ? 'black' : 'white';
    console.log(`[Chess Debug] Checking if any ${opponentColor} pieces can capture king at ${kingPosition}`);
    
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === opponentColor) {
            console.log(`[Chess Debug] Checking ${opponentColor} piece ${piece} at ${square} against king at ${kingPosition}`);
            if (isValidMove(board, square, kingPosition, opponentColor)) {
                console.log(`[Chess Debug] CHECK! ${opponentColor} piece ${piece} at ${square} can capture king at ${kingPosition}`);
                return true;
            }
        }
    }
    
    console.log(`[Chess Debug] ${color} is NOT in check`);
    return false;
}

function hasValidMoves(board, color) {
    console.log(`[Chess Debug] Checking if ${color} has valid moves...`);
    
    // Check if any piece of the given color has valid moves
    for (let square in board) {
        const piece = board[square];
        if (piece && getPieceColor(piece) === color) {
            for (let targetSquare in board) {
                // Skip if same square
                if (square === targetSquare) continue;
                
                // Check if this move would be valid
                if (isValidMove(board, square, targetSquare, color)) {
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

// Test the initial board
console.log('🧪 TESTING INITIAL BOARD SETUP:');

const board = initializeChessBoard();

console.log('\n📊 INITIAL BOARD STATE:');
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

console.log('\n🎯 TESTING GAME STATE DETECTION:');

// Test if white is in check or stalemated
const whiteInCheck = isInCheck(board, 'white');
const whiteStalemated = isStalemate(board, 'white');

console.log(`\n📋 RESULTS FOR WHITE:`);
console.log(`- White in check: ${whiteInCheck}`);
console.log(`- White stalemated: ${whiteStalemated}`);

// Test if black is in check or stalemated
const blackInCheck = isInCheck(board, 'black');
const blackStalemated = isStalemate(board, 'black');

console.log(`\n📋 RESULTS FOR BLACK:`);
console.log(`- Black in check: ${blackInCheck}`);
console.log(`- Black stalemated: ${blackStalemated}`);

if (whiteStalemated || blackStalemated) {
    console.log('\n❌ BUG FOUND: Stalemate detected on initial board!');
    console.log('This should never happen on a properly set up chess board.');
} else {
    console.log('\n✅ CORRECT: No stalemate on initial board');
}

console.log('\n✅ DEBUG COMPLETE!'); 