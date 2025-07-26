const io = require('socket.io-client');

console.log('🧪 TESTING CHESS CONNECTION FIX');
console.log('================================');

async function testChessConnectionFix() {
    console.log('\n1️⃣ Connecting player 1 (main app)...');
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
    
    console.log('\n3️⃣ Connecting player 2 (main app)...');
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
    
    console.log('\n5️⃣ Checking initial user list...');
    let initialUserList = [];
    player2.on('user_list', (data) => {
        initialUserList = data.users.map(u => u.username);
        console.log('✅ Initial user list:', initialUserList);
    });
    
    player2.emit('get_user_list');
    
    await new Promise((resolve) => {
        setTimeout(() => {
            if (initialUserList.length > 0) {
                console.log('✅ Initial user list received');
            } else {
                console.log('❌ No initial user list received');
            }
            resolve();
        }, 2000);
    });
    
    console.log('\n6️⃣ Player 1 entering chess game...');
    player1.emit('chess:find_game');
    
    let gameId = null;
    await new Promise((resolve) => {
        player1.on('chess:game_joined', (data) => {
            gameId = data.gameId;
            console.log('✅ Player 1 joined chess game:', gameId);
            resolve();
        });
    });
    
    console.log('\n7️⃣ Checking user list after player 1 enters chess...');
    let userListAfterEntering = [];
    player2.on('user_list', (data) => {
        userListAfterEntering = data.users.map(u => u.username);
        console.log('✅ User list after entering chess:', userListAfterEntering);
    });
    
    player2.emit('get_user_list');
    
    await new Promise((resolve) => {
        setTimeout(() => {
            if (userListAfterEntering.length > 0) {
                console.log('✅ User list after entering chess received');
            } else {
                console.log('❌ No user list after entering chess received');
            }
            resolve();
        }, 2000);
    });
    
    console.log('\n8️⃣ Player 2 joining chess game...');
    player2.emit('chess:find_game');
    
    await new Promise((resolve) => {
        player2.on('chess:game_joined', (data) => {
            console.log('✅ Player 2 joined chess game:', data.gameId);
            resolve();
        });
    });
    
    console.log('\n9️⃣ Waiting for game to start...');
    await new Promise((resolve) => {
        player1.on('chess:game_started', (data) => {
            console.log('✅ Chess game started:', data);
            resolve();
        });
    });
    
    console.log('\n🔟 Checking user list during chess game...');
    let userListDuringGame = [];
    player2.on('user_list', (data) => {
        userListDuringGame = data.users.map(u => u.username);
        console.log('✅ User list during chess game:', userListDuringGame);
    });
    
    player2.emit('get_user_list');
    
    await new Promise((resolve) => {
        setTimeout(() => {
            if (userListDuringGame.length > 0) {
                console.log('✅ User list during chess game received');
            } else {
                console.log('❌ No user list during chess game received');
            }
            resolve();
        }, 2000);
    });
    
    console.log('\n1️⃣1️⃣ Player 1 leaving chess game...');
    
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
    
    console.log('\n1️⃣2️⃣ Checking user list after player 1 leaves chess...');
    let userListAfterLeaving = [];
    player2.on('user_list', (data) => {
        userListAfterLeaving = data.users.map(u => u.username);
        console.log('✅ User list after leaving chess:', userListAfterLeaving);
    });
    
    player2.emit('get_user_list');
    
    await new Promise((resolve) => {
        setTimeout(() => {
            if (userListAfterLeaving.length > 0) {
                console.log('✅ User list after leaving chess received');
            } else {
                console.log('❌ No user list after leaving chess received');
            }
            resolve();
        }, 2000);
    });
    
    console.log('\n1️⃣3️⃣ Testing if player 1 can still send messages...');
    
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
    console.log('- Initial user list:', initialUserList);
    console.log('- User list after entering chess:', userListAfterEntering);
    console.log('- User list during chess game:', userListDuringGame);
    console.log('- User list after leaving chess:', userListAfterLeaving);
    console.log('- Chess leave confirmation received:', leftGameConfirmation ? '✅ YES' : '❌ NO');
    console.log('- Can send messages after leaving chess:', textMessageReceived ? '✅ YES' : '❌ NO');
    
    // Check if player 1 remained in user list throughout
    const player1InInitial = initialUserList.includes('TestPlayer1');
    const player1InAfterEntering = userListAfterEntering.includes('TestPlayer1');
    const player1InDuringGame = userListDuringGame.includes('TestPlayer1');
    const player1InAfterLeaving = userListAfterLeaving.includes('TestPlayer1');
    
    console.log('\n🔍 PLAYER 1 CONNECTION STATUS:');
    console.log('- In initial list:', player1InInitial ? '✅ YES' : '❌ NO');
    console.log('- In list after entering chess:', player1InAfterEntering ? '✅ YES' : '❌ NO');
    console.log('- In list during chess game:', player1InDuringGame ? '✅ YES' : '❌ NO');
    console.log('- In list after leaving chess:', player1InAfterLeaving ? '✅ YES' : '❌ NO');
    
    if (player1InInitial && player1InAfterEntering && player1InDuringGame && player1InAfterLeaving && leftGameConfirmation && textMessageReceived) {
        console.log('🎉 SUCCESS: User remains connected throughout chess game lifecycle!');
    } else {
        console.log('❌ ISSUE: User connection problem during chess game lifecycle');
    }
}

// Run the test
testChessConnectionFix().catch(console.error); 