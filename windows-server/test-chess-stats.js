const ChessSaveSystem = require('./chess-save-system');

console.log('🧪 TESTING CHESS STATS SYSTEM');
console.log('=============================');

async function testChessStats() {
    console.log('\n1️⃣ Creating chess save system...');
    
    const saveSystem = new ChessSaveSystem();
    
    console.log('\n2️⃣ Recording test games...');
    
    // Record some test games
    const testGame1 = {
        gameId: 'test-game-1',
        whitePlayer: 'Alice',
        blackPlayer: 'Bob',
        winner: 'white',
        moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'],
        gameType: 'standard',
        startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        endTime: new Date().toISOString()
    };
    
    const testGame2 = {
        gameId: 'test-game-2',
        whitePlayer: 'Bob',
        blackPlayer: 'Charlie',
        winner: 'black',
        moves: ['d2d4', 'd7d5', 'c2c4', 'd5c4'],
        gameType: 'standard',
        startTime: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        endTime: new Date().toISOString()
    };
    
    const testGame3 = {
        gameId: 'test-game-3',
        whitePlayer: 'Alice',
        blackPlayer: 'Charlie',
        winner: 'draw',
        moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5'],
        gameType: 'standard',
        startTime: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        endTime: new Date().toISOString()
    };
    
    // Record the games
    const recorded1 = saveSystem.recordGame(testGame1);
    const recorded2 = saveSystem.recordGame(testGame2);
    const recorded3 = saveSystem.recordGame(testGame3);
    
    console.log(`✅ Game 1 recorded: ${recorded1}`);
    console.log(`✅ Game 2 recorded: ${recorded2}`);
    console.log(`✅ Game 3 recorded: ${recorded3}`);
    
    console.log('\n3️⃣ Testing stats retrieval...');
    
    // Get stats
    const stats = saveSystem.getStats();
    
    console.log('\n📊 Overall Stats:');
    console.log(`- Total Games: ${stats.overall.totalGames}`);
    console.log(`- Total Wins: ${stats.overall.totalWins}`);
    console.log(`- Total Draws: ${stats.overall.totalDraws}`);
    console.log(`- Unique Players: ${stats.overall.uniquePlayers}`);
    
    console.log('\n🏆 Top Players:');
    stats.topPlayers.forEach((player, index) => {
        console.log(`${index + 1}. ${player.name}: ${player.wins}W/${player.losses}L/${player.draws}D (${player.winRate}%)`);
    });
    
    console.log('\n🎮 Recent Games:');
    stats.recentGames.forEach((game, index) => {
        console.log(`${index + 1}. ${game.whitePlayer} vs ${game.blackPlayer} - Winner: ${game.winner}`);
    });
    
    console.log('\n4️⃣ Testing individual player stats...');
    
    // Test Alice's stats
    const aliceStats = saveSystem.getPlayerStats('Alice');
    if (aliceStats) {
        console.log('\n👤 Alice Stats:');
        console.log(`- Games: ${aliceStats.games}`);
        console.log(`- Wins: ${aliceStats.wins}`);
        console.log(`- Losses: ${aliceStats.losses}`);
        console.log(`- Draws: ${aliceStats.draws}`);
        console.log(`- Win Rate: ${aliceStats.winRate}%`);
    }
    
    // Test Bob's stats
    const bobStats = saveSystem.getPlayerStats('Bob');
    if (bobStats) {
        console.log('\n👤 Bob Stats:');
        console.log(`- Games: ${bobStats.games}`);
        console.log(`- Wins: ${bobStats.wins}`);
        console.log(`- Losses: ${bobStats.losses}`);
        console.log(`- Draws: ${bobStats.draws}`);
        console.log(`- Win Rate: ${bobStats.winRate}%`);
    }
    
    console.log('\n5️⃣ Testing API endpoint simulation...');
    
    // Simulate what the API endpoint returns
    const apiResponse = {
        overall: stats.overall,
        topPlayers: stats.topPlayers,
        recentGames: stats.recentGames
    };
    
    console.log('\n🌐 API Response Structure:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    console.log('\n✅ CHESS STATS TEST FINISHED!');
    
    // Verify the data is correct
    const expectedGames = 3;
    const expectedPlayers = 3; // Alice, Bob, Charlie
    
    if (stats.overall.totalGames === expectedGames && stats.overall.uniquePlayers === expectedPlayers) {
        console.log('✅ SUCCESS: Chess stats system is working correctly!');
    } else {
        console.log('❌ ISSUE: Chess stats system has problems');
        console.log(`Expected ${expectedGames} games, got ${stats.overall.totalGames}`);
        console.log(`Expected ${expectedPlayers} players, got ${stats.overall.uniquePlayers}`);
    }
}

// Run the test
testChessStats().catch(console.error); 