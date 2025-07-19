// Test script for chess move validation
const fs = require('fs');

// Import the validation functions from server-vpn.js
// For testing, we'll recreate the key functions here

function initializeChessBoard() {
    const board = {};
    
    // Set up initial chess position
    // Black pieces (top)
    board['a8'] = 'r'; board['b8'] = 'n'; board['c8'] = 'b'; board['d8'] = 'q';
    board['e8'] = 'k'; board['f8'] = 'b'; board['g8'] = 'n'; board['h8'] = 'r';
    
    for (let i = 0; i < 8; i++) {
        board[`${String.fromCharCode('a'.charCodeAt(0) + i)}7`] = 'p';
    }
    
    // White pieces (bottom)
    board['a1'] = 'R'; board['b1'] = 'N'; board['c1'] = 'B'; board['d1'] = 'Q';
    board['e1'] = 'K'; board['f1'] = 'B'; board['g1'] = 'N'; board['h1'] = 'R';
    
    for (let i = 0; i < 8; i++) {
        board[`${String.fromCharCode('a'.charCodeAt(0) + i)}2`] = 'P';
    }
    
    return board;
}

function isValidPawnMove(board, from, to, color) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    console.log(`Pawn move: ${from}(${fromRow},${fromCol}) to ${to}(${toRow},${toCol}), color: ${color}, direction: ${direction}, startRow: ${startRow}`);
    
    // Forward move (no capture)
    if (fromCol === toCol && !board[to]) {
        if (toRow === fromRow + direction) {
            console.log(`Valid single pawn move`);
            return true;
        }
        // Double move from starting position
        if (fromRow === startRow && toRow === fromRow + 2 * direction) {
            const intermediateSquare = `${from[0]}${8 - (fromRow + direction)}`;
            const isIntermediateClear = !board[intermediateSquare];
            console.log(`Double pawn move check: intermediate square ${intermediateSquare} clear: ${isIntermediateClear}`);
            return isIntermediateClear;
        }
    }
    
    // Capture (diagonal move with opponent piece)
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
        const targetPiece = board[to];
        if (targetPiece) {
            const isTargetWhite = targetPiece === targetPiece.toUpperCase();
            const isValidCapture = (color === 'white' && !isTargetWhite) || (color === 'black' && isTargetWhite);
            console.log(`Pawn capture: target piece ${targetPiece}, isTargetWhite: ${isTargetWhite}, isValidCapture: ${isValidCapture}`);
            return isValidCapture;
        } else {
            console.log(`Pawn diagonal move but no target piece`);
        }
    }
    
    console.log(`Invalid pawn move`);
    return false;
}

function isValidMove(board, from, to, color) {
    console.log(`Validating move: ${from} to ${to} by ${color}`);
    
    const piece = board[from];
    if (!piece) {
        console.log(`No piece at ${from}`);
        return false;
    }
    
    console.log(`Piece at ${from}: ${piece}`);
    
    // Check if piece belongs to the player
    const isWhitePiece = piece === piece.toUpperCase();
    if ((color === 'white' && !isWhitePiece) || (color === 'black' && isWhitePiece)) {
        console.log(`Piece ${piece} doesn't belong to ${color} player`);
        return false;
    }
    
    // Check if destination is not occupied by own piece
    const targetPiece = board[to];
    if (targetPiece) {
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();
        if ((color === 'white' && isTargetWhite) || (color === 'black' && !isTargetWhite)) {
            console.log(`Destination ${to} occupied by own piece ${targetPiece}`);
            return false;
        }
    }
    
    const pieceType = piece.toLowerCase();
    console.log(`Piece type: ${pieceType}`);
    
    if (pieceType === 'p') {
        return isValidPawnMove(board, from, to, color);
    }
    
    // For now, just test pawns
    console.log(`Piece type ${pieceType} not implemented for testing`);
    return false;
}

// Test cases
console.log('=== CHESS MOVE VALIDATION TEST ===\n');

const board = initializeChessBoard();

// Test 1: White pawn single move
console.log('Test 1: White pawn single move e2-e3');
const test1 = isValidMove(board, 'e2', 'e3', 'white');
console.log(`Result: ${test1}\n`);

// Test 2: White pawn double move
console.log('Test 2: White pawn double move e2-e4');
const test2 = isValidMove(board, 'e2', 'e4', 'white');
console.log(`Result: ${test2}\n`);

// Test 3: Black pawn single move
console.log('Test 3: Black pawn single move e7-e6');
const test3 = isValidMove(board, 'e7', 'e6', 'black');
console.log(`Result: ${test3}\n`);

// Test 4: Invalid pawn move (wrong direction)
console.log('Test 4: Invalid pawn move e2-e1 (wrong direction)');
const test4 = isValidMove(board, 'e2', 'e1', 'white');
console.log(`Result: ${test4}\n`);

// Test 5: Invalid pawn move (diagonal without capture)
console.log('Test 5: Invalid pawn move e2-f3 (diagonal without capture)');
const test5 = isValidMove(board, 'e2', 'f3', 'white');
console.log(`Result: ${test5}\n`);

// Test 6: Valid pawn capture (after setting up position)
console.log('Test 6: Setting up position for pawn capture...');
board['f3'] = 'p'; // Place black pawn at f3
console.log('Test 6: Valid pawn capture e2xf3');
const test6 = isValidMove(board, 'e2', 'f3', 'white');
console.log(`Result: ${test6}\n`);

console.log('=== TEST COMPLETE ==='); 