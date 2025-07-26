const io = require('socket.io-client');

const SERVER_URL = 'http://172.94.3.216:3001';

console.log('Testing Snake server functionality...');

const socket = io(SERVER_URL);

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Test 1: Submit a score
    console.log('📊 Submitting test score...');
    socket.emit('snake:submit_score', {
        username: 'TestPlayer',
        score: 150,
        time: 45,
        pieces: 15
    });
});

socket.on('snake:submit_result', (data) => {
    console.log('📊 Score submission result:', data);
    
    if (data.success) {
        // Test 2: Get leaderboard
        console.log('🏆 Getting leaderboard...');
        socket.emit('snake:get_leaderboard');
    } else {
        console.error('❌ Score submission failed:', data.error);
        socket.disconnect();
    }
});

socket.on('snake:leaderboard', (data) => {
    console.log('🏆 Leaderboard received:', data);
    console.log('📊 Number of scores:', data.leaderboard.length);
    
    if (data.leaderboard.length > 0) {
        console.log('📊 Top scores:');
        data.leaderboard.forEach((score, index) => {
            console.log(`  ${index + 1}. ${score.username} - Score: ${score.score}, Time: ${score.time}s, Pieces: ${score.pieces}`);
        });
    } else {
        console.log('📊 No scores in leaderboard yet');
    }
    
    socket.disconnect();
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.error('❌ Test timeout');
    socket.disconnect();
    process.exit(1);
}, 10000); 