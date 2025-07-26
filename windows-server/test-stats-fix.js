const ChessSaveSystem = require('./chess-save-system');

console.log('🧪 TESTING STATS FIX');
console.log('====================');

function testStatsFix() {
    console.log('\n1️⃣ Creating chess save system...');
    
    const saveSystem = new ChessSaveSystem();
    
    console.log('\n2️⃣ Forcing stats refresh...');
    saveSystem.saveStats();
    
    console.log('\n3️⃣ Getting updated stats...');
    const stats = saveSystem.getStats();
    
    console.log('\n4️⃣ Checking top players:');
    stats.topPlayers.forEach((player, index) => {
        if (player.name) {
            console.log(`✅ Player ${index + 1}: ${player.name} (${player.winRate}%)`);
        } else {
            console.log(`❌ Player ${index + 1}: Missing name field`);
        }
    });
    
    console.log('\n5️⃣ Checking recent games:');
    stats.recentGames.forEach((game, index) => {
        console.log(`✅ Game ${index + 1}: ${game.whitePlayer} vs ${game.blackPlayer} - ${game.winner}`);
    });
    
    console.log('\n6️⃣ API Response Structure:');
    const apiResponse = {
        overall: stats.overall,
        topPlayers: stats.topPlayers,
        recentGames: stats.recentGames
    };
    
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // Check if names are present
    const hasNames = apiResponse.topPlayers.length > 0 && apiResponse.topPlayers[0].name;
    const hasRecentGames = apiResponse.recentGames.length > 0;
    
    console.log('\n7️⃣ Results:');
    console.log(`- Top Players have names: ${hasNames ? '✅ YES' : '❌ NO'}`);
    console.log(`- Recent Games present: ${hasRecentGames ? '✅ YES' : '❌ NO'}`);
    
    if (hasNames && hasRecentGames) {
        console.log('✅ SUCCESS: Stats fix is working correctly!');
    } else {
        console.log('❌ ISSUE: Stats fix has problems');
    }
}

testStatsFix(); 