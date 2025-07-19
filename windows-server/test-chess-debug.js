// Test script to debug chess game creation and joining
const io = require('socket.io-client');

const SERVER_URL = 'http://172.94.3.216:3001';

console.log('🧪 Chess Game Debug Test');
console.log('========================');

// Simulate two players connecting and joining a chess game
async function testChessGame() {
    console.log('\n1. Creating first player connection...');
    const player1 = io(SERVER_URL);
    
    await new Promise((resolve) => {
        player1.on('connect', () => {
            console.log('✅ Player 1 connected');
            resolve();
        });
    });
    
    // Register player 1
    player1.emit('register', {
        username: 'Player1',
        deviceId: 'device1',
        deviceName: 'Android Device 1'
    });
    
    await new Promise((resolve) => {
        player1.on('registered', (data) => {
            console.log('✅ Player 1 registered:', data);
            resolve();
        });
    });
    
    console.log('\n2. Creating second player connection...');
    const player2 = io(SERVER_URL);
    
    await new Promise((resolve) => {
        player2.on('connect', () => {
            console.log('✅ Player 2 connected');
            resolve();
        });
    });
    
    // Register player 2
    player2.emit('register', {
        username: 'Player2',
        deviceId: 'device2',
        deviceName: 'Android Device 2'
    });
    
    await new Promise((resolve) => {
        player2.on('registered', (data) => {
            console.log('✅ Player 2 registered:', data);
            resolve();
        });
    });
    
    console.log('\n3. Player 1 creating chess game...');
    player1.emit('chess:create_game');
    
    let gameId = null;
    await new Promise((resolve) => {
        player1.on('chess:game_joined', (data) => {
            console.log('✅ Player 1 joined game:', data);
            gameId = data.gameId;
            resolve();
        });
    });
    
    console.log('\n4. Player 2 joining chess game...');
    player2.emit('chess:join_game', { gameId });
    
    await new Promise((resolve) => {
        player2.on('chess:game_joined', (data) => {
            console.log('✅ Player 2 joined game:', data);
            resolve();
        });
    });
    
    // Wait for dice roll start
    console.log('\n5. Waiting for dice roll to start...');
    let diceRollStarted = false;
    
    player1.on('chess:start_dice_roll', (data) => {
        console.log('🎲 Dice roll started for Player 1:', data);
        diceRollStarted = true;
    });
    
    player2.on('chess:start_dice_roll', (data) => {
        console.log('🎲 Dice roll started for Player 2:', data);
        diceRollStarted = true;
    });
    
    // Wait 3 seconds for dice roll
    await new Promise((resolve) => {
        setTimeout(() => {
            if (!diceRollStarted) {
                console.log('❌ Dice roll did not start within 3 seconds');
            } else {
                console.log('✅ Dice roll started successfully');
            }
            resolve();
        }, 3000);
    });
    
    console.log('\n6. Testing dice rolls...');
    player1.emit('chess:roll_dice', { gameId });
    player2.emit('chess:roll_dice', { gameId });
    
    // Wait for dice roll results
    await new Promise((resolve) => {
        let rollsReceived = 0;
        
        const onDiceRolled = (data) => {
            console.log('🎲 Dice rolled:', data);
            rollsReceived++;
            if (rollsReceived >= 2) {
                resolve();
            }
        };
        
        player1.on('chess:dice_rolled', onDiceRolled);
        player2.on('chess:dice_rolled', onDiceRolled);
        
        setTimeout(() => {
            if (rollsReceived < 2) {
                console.log('❌ Not all dice rolls received');
            }
            resolve();
        }, 3000);
    });
    
    console.log('\n7. Waiting for game to start...');
    let gameStarted = false;
    
    player1.on('chess:game_started', (data) => {
        console.log('🎮 Game started for Player 1:', data);
        gameStarted = true;
    });
    
    player2.on('chess:game_started', (data) => {
        console.log('🎮 Game started for Player 2:', data);
        gameStarted = true;
    });
    
    await new Promise((resolve) => {
        setTimeout(() => {
            if (!gameStarted) {
                console.log('❌ Game did not start within 5 seconds');
            } else {
                console.log('✅ Game started successfully');
            }
            resolve();
        }, 5000);
    });
    
    console.log('\n8. Cleaning up...');
    player1.disconnect();
    player2.disconnect();
    
    console.log('\n🏁 Test completed');
}

testChessGame().catch(console.error); 