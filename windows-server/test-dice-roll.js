// Test script for dice roll system
console.log('🎲 Testing dice roll system...');

// Simulate dice rolls
function testDiceRoll() {
    const player1 = "Player1";
    const player2 = "Player2";
    
    const diceRolls = {};
    
    // Simulate dice rolls
    diceRolls[player1] = Math.floor(Math.random() * 6) + 1;
    diceRolls[player2] = Math.floor(Math.random() * 6) + 1;
    
    console.log(`🎲 ${player1} rolled: ${diceRolls[player1]}`);
    console.log(`🎲 ${player2} rolled: ${diceRolls[player2]}`);
    
    // Determine winner
    let whitePlayer, blackPlayer;
    if (diceRolls[player1] > diceRolls[player2]) {
        whitePlayer = player1;
        blackPlayer = player2;
        console.log(`✅ ${player1} gets WHITE (rolled ${diceRolls[player1]} vs ${diceRolls[player2]})`);
    } else if (diceRolls[player2] > diceRolls[player1]) {
        whitePlayer = player2;
        blackPlayer = player1;
        console.log(`✅ ${player2} gets WHITE (rolled ${diceRolls[player2]} vs ${diceRolls[player1]})`);
    } else {
        console.log(`🤝 Tie! Both rolled ${diceRolls[player1]}, need to roll again`);
        return false;
    }
    
    console.log(`🎮 Game assignment: White=${whitePlayer}, Black=${blackPlayer}`);
    return true;
}

// Test multiple times
console.log('\n=== Testing Dice Roll System ===');
for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Test ${i} ---`);
    const success = testDiceRoll();
    if (!success) {
        console.log('Tie detected, would need to roll again');
    }
}

console.log('\n✅ Dice roll system test completed!'); 