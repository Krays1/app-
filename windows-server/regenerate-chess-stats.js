const ChessSaveSystem = require('./chess-save-system');

console.log('🔄 REGENERATING CHESS STATS');
console.log('===========================');

async function regenerateChessStats() {
    console.log('\n1️⃣ Loading chess save system...');
    
    const saveSystem = new ChessSaveSystem();
    
    console.log('\n2️⃣ Current stats before regeneration:');
    const oldStats = saveSystem.getStats();
    console.log(`- Total Games: ${oldStats.overall.totalGames}`);
    console.log(`- Unique Players: ${oldStats.overall.uniquePlayers}`);
    console.log(`- Top Players Count: ${oldStats.topPlayers.length}`);
    
    console.log('\n3️⃣ Regenerating stats with player names...');
    
    // Force regeneration of stats
    saveSystem.saveStats();
    
    console.log('\n4️⃣ New stats after regeneration:');
    const newStats = saveSystem.getStats();
    console.log(`- Total Games: ${newStats.overall.totalGames}`);
    console.log(`- Unique Players: ${newStats.overall.uniquePlayers}`);
    console.log(`- Top Players Count: ${newStats.topPlayers.length}`);
    
    console.log('\n5️⃣ Checking top players for name field:');
    newStats.topPlayers.forEach((player, index) => {
        if (player.name) {
            console.log(`✅ Player ${index + 1}: ${player.name} (${player.winRate}%)`);
        } else {
            console.log(`❌ Player ${index + 1}: Missing name field`);
        }
    });
    
    console.log('\n6️⃣ Checking recent games:');
    newStats.recentGames.forEach((game, index) => {
        console.log(`✅ Game ${index + 1}: ${game.whitePlayer} vs ${game.blackPlayer} - ${game.winner}`);
    });
    
    console.log('\n✅ CHESS STATS REGENERATION COMPLETE!');
    
    // Test API endpoint
    console.log('\n7️⃣ Testing API endpoint...');
    const http = require('http');
    
    const options = {
        hostname: '172.94.3.216',
        port: 3001,
        path: '/api/chess/stats',
        method: 'GET'
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            try {
                const apiResponse = JSON.parse(data);
                console.log('\n🌐 API Response Test:');
                console.log(`- Overall Games: ${apiResponse.overall.totalGames}`);
                console.log(`- Top Players: ${apiResponse.topPlayers.length}`);
                console.log(`- Recent Games: ${apiResponse.recentGames.length}`);
                
                if (apiResponse.topPlayers.length > 0 && apiResponse.topPlayers[0].name) {
                    console.log('✅ SUCCESS: Player names are now included in API response!');
                } else {
                    console.log('❌ ISSUE: Player names still missing from API response');
                }
            } catch (e) {
                console.log('❌ Error parsing API response:', e.message);
            }
        });
    });
    
    req.on('error', (e) => {
        console.log('❌ Error testing API:', e.message);
    });
    
    req.end();
}

// Run the regeneration
regenerateChessStats().catch(console.error); 