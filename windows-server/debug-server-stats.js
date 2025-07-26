const ChessSaveSystem = require('./chess-save-system');

console.log('🔍 DEBUGGING SERVER STATS');
console.log('=========================');

function debugServerStats() {
    console.log('\n1️⃣ Creating chess save system...');
    
    const saveSystem = new ChessSaveSystem();
    
    console.log('\n2️⃣ Loading stats from file...');
    saveSystem.loadStats();
    
    console.log('\n3️⃣ Current stats in memory:');
    const stats = saveSystem.getStats();
    console.log(`- Total Games: ${stats.overall.totalGames}`);
    console.log(`- Unique Players: ${stats.overall.uniquePlayers}`);
    console.log(`- Top Players Count: ${stats.topPlayers.length}`);
    
    console.log('\n4️⃣ Top Players:');
    stats.topPlayers.forEach((player, index) => {
        console.log(`- Player ${index + 1}: ${player.name} (${player.winRate}%)`);
    });
    
    console.log('\n5️⃣ Recent Games:');
    stats.recentGames.forEach((game, index) => {
        console.log(`- Game ${index + 1}: ${game.whitePlayer} vs ${game.blackPlayer} - ${game.winner}`);
    });
    
    console.log('\n6️⃣ All Players in stats:');
    Object.keys(stats.players).forEach(playerName => {
        const player = stats.players[playerName];
        console.log(`- ${playerName}: ${player.games} games, ${player.wins} wins, ${player.losses} losses`);
    });
    
    console.log('\n7️⃣ Checking for test players:');
    const testPlayers = ['Alice', 'Charlie', 'Bob'];
    testPlayers.forEach(playerName => {
        if (stats.players[playerName]) {
            console.log(`❌ FOUND: ${playerName} is still in stats`);
        } else {
            console.log(`✅ CLEAN: ${playerName} is not in stats`);
        }
    });
    
    console.log('\n8️⃣ File paths:');
    console.log(`- Stats file: ${saveSystem.statsFile}`);
    console.log(`- Games file: ${saveSystem.gamesFile}`);
    console.log(`- Unfinished games file: ${saveSystem.unfinishedGamesFile}`);
}

debugServerStats(); 