// Test Server Functions Directly
console.log('🧪 TESTING SERVER FUNCTIONS DIRECTLY');
console.log('====================================');

// Import the server module
const serverPath = './server-vpn.js';

// Create a mock environment for the server functions
global.console = console;
global.setTimeout = setTimeout;
global.setInterval = setInterval;
global.clearInterval = clearInterval;

// Mock Socket.IO and other dependencies
global.io = {
    emit: () => {},
    to: () => ({ emit: () => {} }),
    on: () => {}
};

// Mock Express
global.express = () => ({
    use: () => {},
    get: () => {},
    post: () => {},
    listen: () => {}
});

// Mock other dependencies
global.fs = require('fs');
global.path = require('path');
global.http = require('http');
global.https = require('https');
global.url = require('url');
global.crypto = require('crypto');

// Load the server file
try {
    // Extract just the chess functions from the server
    const serverContent = require('fs').readFileSync(serverPath, 'utf8');
    
    // Extract the chess functions
    const chessFunctions = `
        ${serverContent.match(/function initializeChessBoard\(\)[\s\S]*?}/)[0]}
        ${serverContent.match(/function isValidMove\([\s\S]*?}/)[0]}
        ${serverContent.match(/function isValidPawnMove\([\s\S]*?}/)[0]}
        ${serverContent.match(/function isValidRookMove\([\s\S]*?}/)[0]}
        ${serverContent.match(/function isValidBishopMove\([\s\S]*?}/)[0]}
        ${serverContent.match(/function isValidQueenMove\([\s\S]*?}/)[0]}
        ${serverContent.match(/function isValidKnightMove\([\s\S]*?}/)[0]}
        ${serverContent.match(/function isValidKingMove\([\s\S]*?}/)[0]}
        ${serverContent.match(/function isInCheck\([\s\S]*?}/)[0]}
        ${serverContent.match(/function getPieceColor\([\s\S]*?}/)[0]}
        ${serverContent.match(/function hasValidMoves\([\s\S]*?}/)[0]}
        ${serverContent.match(/function isStalemate\([\s\S]*?}/)[0]}
    `;
    
    // Execute the functions
    eval(chessFunctions);
    
    console.log('✅ Chess functions loaded successfully');
    
    // Test the initial board
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
    
    console.log('\n🎯 TESTING GAME STATE:');
    
    // Test if white is stalemated
    const whiteStalemated = isStalemate(board, 'white');
    const blackStalemated = isStalemate(board, 'black');
    
    console.log(`\n📋 RESULTS:`);
    console.log(`- White stalemated: ${whiteStalemated}`);
    console.log(`- Black stalemated: ${blackStalemated}`);
    
    if (whiteStalemated || blackStalemated) {
        console.log('\n❌ BUG: Stalemate detected on initial board!');
    } else {
        console.log('\n✅ CORRECT: No stalemate on initial board');
    }
    
} catch (error) {
    console.error('❌ Error loading server functions:', error.message);
}

console.log('\n✅ TEST COMPLETE!'); 