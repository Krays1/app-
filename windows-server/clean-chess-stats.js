const ChessSaveSystem = require('./chess-save-system');

console.log('🧹 CLEANING CHESS STATS - REMOVING TEST DATA');
console.log('============================================');

function cleanChessStats() {
    console.log('\n1️⃣ Loading chess save system...');
    
    const saveSystem = new ChessSaveSystem();
    
    console.log('\n2️⃣ Current stats before cleaning:');
    const oldStats = saveSystem.getStats();
    console.log(`- Total Games: ${oldStats.overall.totalGames}`);
    console.log(`- Unique Players: ${oldStats.overall.uniquePlayers}`);
    console.log(`- Top Players: ${oldStats.topPlayers.length}`);
    console.log(`- Recent Games: ${oldStats.recentGames.length}`);
    
    console.log('\n3️⃣ Players to remove: Alice, Charlie, Bob');
    const playersToRemove = ['Alice', 'Charlie', 'Bob'];
    
    console.log('\n4️⃣ Cleaning player stats...');
    playersToRemove.forEach(playerName => {
        if (saveSystem.stats.players[playerName]) {
            delete saveSystem.stats.players[playerName];
            console.log(`✅ Removed player: ${playerName}`);
        } else {
            console.log(`⚠️  Player not found: ${playerName}`);
        }
    });
    
    console.log('\n5️⃣ Cleaning games history...');
    const originalGamesCount = saveSystem.games.length;
    saveSystem.games = saveSystem.games.filter(game => {
        const shouldKeep = !playersToRemove.includes(game.whitePlayer) && 
                          !playersToRemove.includes(game.blackPlayer);
        if (!shouldKeep) {
            console.log(`🗑️  Removing game: ${game.whitePlayer} vs ${game.blackPlayer}`);
        }
        return shouldKeep;
    });
    console.log(`✅ Removed ${originalGamesCount - saveSystem.games.length} games`);
    
    console.log('\n6️⃣ Cleaning recent games...');
    const originalRecentCount = saveSystem.stats.recentGames.length;
    saveSystem.stats.recentGames = saveSystem.stats.recentGames.filter(game => {
        const shouldKeep = !playersToRemove.includes(game.whitePlayer) && 
                          !playersToRemove.includes(game.blackPlayer);
        if (!shouldKeep) {
            console.log(`🗑️  Removing recent game: ${game.whitePlayer} vs ${game.blackPlayer}`);
        }
        return shouldKeep;
    });
    console.log(`✅ Removed ${originalRecentCount - saveSystem.stats.recentGames.length} recent games`);
    
    console.log('\n7️⃣ Cleaning unfinished games...');
    const originalUnfinishedCount = Object.keys(saveSystem.unfinishedGames).length;
    Object.keys(saveSystem.unfinishedGames).forEach(gameId => {
        const game = saveSystem.unfinishedGames[gameId];
        if (playersToRemove.includes(game.whitePlayer) || playersToRemove.includes(game.blackPlayer)) {
            console.log(`🗑️  Removing unfinished game: ${game.whitePlayer} vs ${game.blackPlayer}`);
            delete saveSystem.unfinishedGames[gameId];
        }
    });
    console.log(`✅ Removed ${originalUnfinishedCount - Object.keys(saveSystem.unfinishedGames).length} unfinished games`);
    
    console.log('\n8️⃣ Regenerating stats...');
    saveSystem.saveStats();
    saveSystem.saveGames();
    saveSystem.saveUnfinishedGames();
    
    console.log('\n9️⃣ New stats after cleaning:');
    const newStats = saveSystem.getStats();
    console.log(`- Total Games: ${newStats.overall.totalGames}`);
    console.log(`- Unique Players: ${newStats.overall.uniquePlayers}`);
    console.log(`- Top Players: ${newStats.topPlayers.length}`);
    console.log(`- Recent Games: ${newStats.recentGames.length}`);
    
    console.log('\n🔟 Remaining players:');
    newStats.topPlayers.forEach((player, index) => {
        console.log(`✅ Player ${index + 1}: ${player.name} (${player.winRate}%)`);
    });
    
    console.log('\n1️⃣1️⃣ Remaining recent games:');
    newStats.recentGames.forEach((game, index) => {
        console.log(`✅ Game ${index + 1}: ${game.whitePlayer} vs ${game.blackPlayer} - ${game.winner}`);
    });
    
    console.log('\n✅ CHESS STATS CLEANING COMPLETE!');
    console.log('🎯 Test data (Alice, Charlie, Bob) has been removed');
    console.log('🎮 Real player data (krays1, mijnbattlefield3, DJDELBOY23) has been preserved');
}

// Run the cleaning
cleanChessStats(); 