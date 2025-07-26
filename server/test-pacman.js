const io = require('socket.io-client');

const SERVER_URL = 'http://172.94.3.216:3001';

console.log('🧪 Testing Pac-Man Leaderboard System');
console.log(`🔗 Connecting to: ${SERVER_URL}`);

const socket = io(SERVER_URL);

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Test 1: Submit a score
    console.log('📊 Submitting test Pac-Man score...');
    socket.emit('pacman:submit_score', {
        username: 'TestPacmanPlayer',
        score: 2500,
        level: 3,
        dotsEaten: 45
    });
});

socket.on('pacman:submit_result', (data) => {
    console.log('📊 Score submission result:', data);
    
    if (data.success) {
        // Test 2: Get leaderboard
        console.log('🏆 Getting Pac-Man leaderboard...');
        socket.emit('pacman:get_leaderboard');
    } else {
        console.error('❌ Score submission failed:', data.error);
        socket.disconnect();
    }
});

socket.on('pacman:leaderboard', (data) => {
    console.log('🏆 Pac-Man leaderboard received:', data);
    console.log('📊 Number of scores:', data.leaderboard.length);
    
    if (data.leaderboard.length > 0) {
        console.log('📊 Top Pac-Man scores:');
        data.leaderboard.forEach((score, index) => {
            console.log(`  ${index + 1}. ${score.username} - Score: ${score.score}, Level: ${score.level}, Dots: ${score.dotsEaten}`);
        });
    } else {
        console.log('📊 No Pac-Man scores in leaderboard yet');
    }
    
    socket.disconnect();
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
}); 