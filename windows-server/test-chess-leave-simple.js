const io = require('socket.io-client');

console.log('🧪 SIMPLE CHESS LEAVE TEST');
console.log('==========================');

async function testChessLeaveSimple() {
    console.log('\n1️⃣ Connecting player 1...');
    const player1 = io('http://172.94.3.216:3001');
    
    await new Promise((resolve) => {
        player1.on('connect', () => {
            console.log('✅ Player 1 connected');
            resolve();
        });
    });
    
    console.log('\n2️⃣ Registering player 1...');
    player1.emit('register', {
        username: 'TestPlayer1',
        deviceId: 'test-device-1',
        deviceName: 'Test Device 1',
        profilePic: null
    });
    
    await new Promise((resolve) => {
        player1.on('registration_success', (data) => {
            console.log('✅ Player 1 registered:', data.username);
            resolve();
        });
    });
    
    console.log('\n3️⃣ Connecting player 2...');
    const player2 = io('http://172.94.3.216:3001');
    
    await new Promise((resolve) => {
        player2.on('connect', () => {
            console.log('✅ Player 2 connected');
            resolve();
        });
    });
    
    console.log('\n4️⃣ Registering player 2...');
    player2.emit('register', {
        username: 'TestPlayer2',
        deviceId: 'test-device-2',
        deviceName: 'Test Device 2',
        profilePic: null
    });
    
    await new Promise((resolve) => {
        player2.on('registration_success', (data) => {
            console.log('✅ Player 2 registered:', data.username);
            resolve();
        });
    });
    
    console.log('\n5️⃣ Player 1 entering chess game...');
    player1.emit('chess:find_game');
    
    let gameId = null;
    await new Promise((resolve) => {
        player1.on('chess:game_joined', (data) => {
            gameId = data.gameId;
            console.log('✅ Player 1 joined chess game:', gameId);
            resolve();
        });
    });
    
    console.log('\n6️⃣ Player 2 joining chess game...');
    player2.emit('chess:find_game');
    
    await new Promise((resolve) => {
        player2.on('chess:game_joined', (data) => {
            console.log('✅ Player 2 joined chess game:', data.gameId);
            resolve();
        });
    });
    
    console.log('\n7️⃣ Waiting for game to start...');
    await new Promise((resolve) => {
        player1.on('chess:game_started', (data) => {
            console.log('✅ Chess game started:', data);
            resolve();
        });
    });
    
    console.log('\n8️⃣ Player 1 leaving chess game...');
    
    let leftGameConfirmation = false;
    player1.on('chess:left_game_confirmation', (data) => {
        console.log('✅ Player 1 received leave confirmation:', data.message);
        leftGameConfirmation = true;
    });
    
    player1.emit('chess:leave_game', { gameId });
    
    await new Promise((resolve) => {
        setTimeout(() => {
            if (leftGameConfirmation) {
                console.log('✅ Player 1 successfully left chess game with confirmation');
            } else {
                console.log('❌ Player 1 did not receive leave confirmation');
            }
            resolve();
        }, 2000);
    });
    
    console.log('\n9️⃣ Testing if player 1 can still send messages...');
    
    let textMessageReceived = false;
    player2.on('text_message_received', (data) => {
        console.log('✅ Player 2 received text message from player 1:', data.message);
        textMessageReceived = true;
    });
    
    player1.emit('text-message', {
        message: 'Test message after leaving chess game',
        timestamp: Date.now()
    });
    
    await new Promise((resolve) => {
        setTimeout(() => {
            if (textMessageReceived) {
                console.log('✅ Player 1 can still send messages after leaving chess');
            } else {
                console.log('❌ Player 1 cannot send messages after leaving chess');
            }
            resolve();
        }, 2000);
    });
    
    console.log('\n✅ TEST COMPLETE!');
    
    // Cleanup
    player1.disconnect();
    player2.disconnect();
    
    console.log('\n📊 SUMMARY:');
    console.log('- Chess leave confirmation received:', leftGameConfirmation ? '✅ YES' : '❌ NO');
    console.log('- Can send messages after leaving chess:', textMessageReceived ? '✅ YES' : '❌ NO');
    
    if (leftGameConfirmation && textMessageReceived) {
        console.log('🎉 SUCCESS: User remains connected after leaving chess game!');
    } else {
        console.log('❌ ISSUE: User connection problem after leaving chess game');
    }
}

// Run the test
testChessLeaveSimple().catch(console.error); 