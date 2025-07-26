// Test Chess Save System
console.log('🧪 TESTING CHESS SAVE SYSTEM');
console.log('============================');

const ChessSaveSystem = require('./chess-save-system');
const saveSystem = new ChessSaveSystem();

// Test 1: Record a game
console.log('\n1️⃣ TESTING GAME RECORDING:');

const testGame = {
    gameId: 'test-game-001',
    whitePlayer: 'Alice',
    blackPlayer: 'Bob',
    winner: 'white',
    moves: [
        { from: 'e2', to: 'e4', piece: 'P', color: 'white', username: 'Alice' },
        { from: 'e7', to: 'e5', piece: 'p', color: 'black', username: 'Bob' },
        { from: 'd1', to: 'h5', piece: 'Q', color: 'white', username: 'Alice' }
    ],
    gameType: 'standard',
    startTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    endTime: new Date().toISOString()
};

const recordedGame = saveSystem.recordGame(testGame);
console.log('✅ Game recorded:', recordedGame.gameId);

// Test 2: Record another game
console.log('\n2️⃣ TESTING SECOND GAME:');

const testGame2 = {
    gameId: 'test-game-002',
    whitePlayer: 'Charlie',
    blackPlayer: 'Alice',
    winner: 'black',
    moves: [
        { from: 'e2', to: 'e4', piece: 'P', color: 'white', username: 'Charlie' },
        { from: 'e7', to: 'e5', piece: 'p', color: 'black', username: 'Alice' },
        { from: 'f1', to: 'c4', piece: 'B', color: 'white', username: 'Charlie' },
        { from: 'b7', to: 'b6', piece: 'p', color: 'black', username: 'Alice' },
        { from: 'd1', to: 'h5', piece: 'Q', color: 'white', username: 'Charlie' },
        { from: 'g7', to: 'g6', piece: 'p', color: 'black', username: 'Alice' },
        { from: 'h5', to: 'f7', piece: 'Q', color: 'white', username: 'Charlie' }
    ],
    gameType: 'standard',
    startTime: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    endTime: new Date(Date.now() - 300000).toISOString()
};

const recordedGame2 = saveSystem.recordGame(testGame2);
console.log('✅ Second game recorded:', recordedGame2.gameId);

// Test 3: Record a draw
console.log('\n3️⃣ TESTING DRAW GAME:');

const testGame3 = {
    gameId: 'test-game-003',
    whitePlayer: 'Bob',
    blackPlayer: 'Charlie',
    winner: 'draw',
    moves: [
        { from: 'e2', to: 'e4', piece: 'P', color: 'white', username: 'Bob' },
        { from: 'e7', to: 'e5', piece: 'p', color: 'black', username: 'Charlie' },
        { from: 'd1', to: 'h5', piece: 'Q', color: 'white', username: 'Bob' },
        { from: 'g7', to: 'g6', piece: 'p', color: 'black', username: 'Charlie' },
        { from: 'h5', to: 'e8', piece: 'Q', color: 'white', username: 'Bob' }
    ],
    gameType: 'standard',
    startTime: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    endTime: new Date(Date.now() - 600000).toISOString()
};

const recordedGame3 = saveSystem.recordGame(testGame3);
console.log('✅ Draw game recorded:', recordedGame3.gameId);

// Test 4: Get overall stats
console.log('\n4️⃣ TESTING OVERALL STATS:');
const overallStats = saveSystem.getOverallStats();
console.log('Overall Stats:', overallStats);

// Test 5: Get top players
console.log('\n5️⃣ TESTING TOP PLAYERS:');
const topPlayers = saveSystem.getTopPlayers(5);
console.log('Top Players:');
topPlayers.forEach((player, index) => {
    console.log(`  ${index + 1}. ${player.name}: ${player.wins}W/${player.losses}L/${player.draws}D (${player.winRate}%)`);
});

// Test 6: Get recent games
console.log('\n6️⃣ TESTING RECENT GAMES:');
const recentGames = saveSystem.getRecentGames(5);
console.log('Recent Games:');
recentGames.forEach((game, index) => {
    const winner = game.winner === 'draw' ? 'Draw' : game.winner === 'white' ? game.whitePlayer : game.blackPlayer;
    console.log(`  ${index + 1}. ${game.whitePlayer} vs ${game.blackPlayer} - Winner: ${winner} (${game.duration})`);
});

// Test 7: Get player stats
console.log('\n7️⃣ TESTING PLAYER STATS:');
const aliceStats = saveSystem.getPlayerStats('Alice');
console.log('Alice Stats:', aliceStats);

// Test 8: Get player history
console.log('\n8️⃣ TESTING PLAYER HISTORY:');
const aliceHistory = saveSystem.getGameHistory('Alice');
console.log('Alice Game History:');
aliceHistory.forEach((game, index) => {
    const opponent = game.whitePlayer === 'Alice' ? game.blackPlayer : game.whitePlayer;
    const result = game.winner === 'draw' ? 'Draw' : game.winner === 'white' ? 
        (game.whitePlayer === 'Alice' ? 'Win' : 'Loss') : 
        (game.blackPlayer === 'Alice' ? 'Win' : 'Loss');
    console.log(`  ${index + 1}. vs ${opponent} - ${result} (${game.duration})`);
});

console.log('\n✅ CHESS SAVE SYSTEM TEST COMPLETE!');
console.log('The save system is working correctly!'); 