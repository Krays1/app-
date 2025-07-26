const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files for web dashboard (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const connectedUsers = new Map();
const userSockets = new Map();

// Chess game management
const chessGames = new Map();
const gameIdCounter = 1;

const CHESS_GAMES_FILE = 'X:/zell0_chess_games.json';

// Persistent chess game storage
function loadChessGames() {
    try {
        if (fs.existsSync(CHESS_GAMES_FILE)) {
            const data = fs.readFileSync(CHESS_GAMES_FILE, 'utf8');
            const games = JSON.parse(data);
            for (const game of games) {
                chessGames.set(game.id, game);
            }
            console.log(`[Chess] Loaded ${games.length} games from disk.`);
        }
    } catch (e) {
        console.error('[Chess] Failed to load games:', e);
    }
}

function saveChessGames() {
    try {
        const games = Array.from(chessGames.values());
        fs.writeFileSync(CHESS_GAMES_FILE, JSON.stringify(games, null, 2), 'utf8');
    } catch (e) {
        console.error('[Chess] Failed to save games:', e);
    }
}

// Load games on startup
loadChessGames();

// Snake leaderboard
const SNAKE_LEADERBOARD_FILE = path.join(__dirname, 'snake-leaderboard.json');
let snakeLeaderboard = [];

function loadSnakeLeaderboard() {
    try {
        if (fs.existsSync(SNAKE_LEADERBOARD_FILE)) {
            const data = fs.readFileSync(SNAKE_LEADERBOARD_FILE, 'utf8');
            snakeLeaderboard = JSON.parse(data);
            console.log(`[Snake] Loaded ${snakeLeaderboard.length} scores from disk.`);
        }
    } catch (e) {
        console.error('[Snake] Failed to load leaderboard:', e);
    }
}

function saveSnakeLeaderboard() {
    try {
        fs.writeFileSync(SNAKE_LEADERBOARD_FILE, JSON.stringify(snakeLeaderboard, null, 2), 'utf8');
    } catch (e) {
        console.error('[Snake] Failed to save leaderboard:', e);
    }
}

// Load leaderboard on startup
loadSnakeLeaderboard();

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        connectedUsers: connectedUsers.size,
        onlineUsers: connectedUsers.size,
        totalConnections: connectedUsers.size,
        uptime: process.uptime()
    });
});

// Get online users endpoint
app.get('/api/online-users', (req, res) => {
    const users = Array.from(connectedUsers.values()).map(user => ({
        username: user.username || user.deviceId,
        deviceId: user.deviceId,
        connectedAt: user.connectedAt,
        lastSeen: user.lastSeen,
        clientIP: user.clientIP
    }));
    
    res.json({
        users: users,
        count: users.length,
        timestamp: new Date().toISOString()
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    const clientIP = socket.handshake.address;
    console.log(`${new Date().toISOString()} - User connected: ${socket.id} from ${clientIP}`);
    
    // Handle user registration
    socket.on('register', (data) => {
        try {
            const { username, deviceId, timestamp } = data;
            const userId = username || deviceId; // Use username if available, fallback to deviceId
            
            // Store user information
            connectedUsers.set(socket.id, {
                deviceId: userId,
                username: userId,
                socketId: socket.id,
                connectedAt: new Date().toISOString(),
                lastSeen: Date.now(), // Store as timestamp
                clientIP
            });
            
            userSockets.set(userId, socket.id);
            
            // Notify other users
            socket.broadcast.emit('user_joined', { 
                userId: userId,
                timestamp: new Date().toISOString()
            });
            
            console.log(`${new Date().toISOString()} - User registered: ${userId} (${socket.id})`);
            
            // Send registration confirmation
            socket.emit('registration_confirmed', {
                deviceId: userId,
                username: userId,
                serverTime: new Date().toISOString(),
                connectedUsers: Array.from(connectedUsers.values()).map(u => u.username || u.deviceId)
            });
            
            // Send updated user list to all clients
            const userList = Array.from(connectedUsers.values()).map(user => ({
                username: user.username || user.deviceId,
                profilePic: null,
                isOnline: true,
                lastSeen: user.lastSeen
            }));
            
            io.emit('user_list_updated', {
                users: userList
            });
            
        } catch (error) {
            console.error('Error in register:', error);
            socket.emit('error', { message: 'Registration failed' });
        }
    });
    
    // Handle text messages
    socket.on('text-message', (data) => {
        try {
            const { message, username, timestamp, type } = data;
            
            // Update last seen
            const userInfo = connectedUsers.get(socket.id);
            if (userInfo) {
                userInfo.lastSeen = Date.now(); // Update as timestamp
            }
            
            // Broadcast to all other users
            socket.broadcast.emit('text_message_received', {
                text: message,
                senderId: username,
                senderName: username,
                timestamp: timestamp,
                serverTimestamp: new Date().toISOString()
            });
            
            console.log(`${new Date().toISOString()} - Text message from ${username}: ${message.substring(0, 50)}...`);
            
        } catch (error) {
            console.error('Error in text-message:', error);
            socket.emit('error', { message: 'Failed to send text message' });
        }
    });
    
    // Handle audio messages
    socket.on('voice-message', (data) => {
        try {
            const { audioData, username, timestamp, type, duration } = data;
            
            // Update last seen
            const userInfo = connectedUsers.get(socket.id);
            if (userInfo) {
                userInfo.lastSeen = Date.now(); // Update as timestamp
            }
            
            // Broadcast to all other users
            socket.broadcast.emit('voice_message_received', {
                audioData: audioData,
                senderId: username,
                senderName: username,
                duration: duration,
                timestamp: timestamp,
                serverTimestamp: new Date().toISOString()
            });
            
            console.log(`${new Date().toISOString()} - Voice message from ${username}: ${duration}ms`);
            
        } catch (error) {
            console.error('Error in voice-message:', error);
            socket.emit('error', { message: 'Failed to send voice message' });
        }
    });
    
    // Handle keep alive
    socket.on('keep_alive', (data) => {
        try {
            const { deviceId, timestamp } = data;
            
            // Update last seen
            const userInfo = connectedUsers.get(socket.id);
            if (userInfo) {
                userInfo.lastSeen = Date.now(); // Update as timestamp
            }
            
            // Send keep alive response
            socket.emit('keep_alive_response', {
                serverTime: new Date().toISOString(),
                status: 'ok'
            });
            
        } catch (error) {
            console.error('Error in keep_alive:', error);
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            if (userInfo) {
                const { deviceId, username } = userInfo;
                const userId = username || deviceId;
                
                // Remove user from maps
                connectedUsers.delete(socket.id);
                userSockets.delete(userId);
                
                // Notify other users
                socket.broadcast.emit('user_left', { 
                    userId: userId,
                    timestamp: new Date().toISOString()
                });
                
                // Send updated user list to remaining clients
                const userList = Array.from(connectedUsers.values()).map(user => ({
                    username: user.username || user.deviceId,
                    profilePic: null,
                    isOnline: true,
                    lastSeen: user.lastSeen
                }));
                
                io.emit('user_list_updated', {
                    users: userList
                });
                
                console.log(`${new Date().toISOString()} - User disconnected: ${userId} (${socket.id}) - Reason: ${reason}`);
            } else {
                console.log(`${new Date().toISOString()} - Unknown user disconnected: ${socket.id} - Reason: ${reason}`);
            }
        } catch (error) {
            console.error('Error in disconnect:', error);
        }
    });
    
    // Handle errors
    socket.on('error', (error) => {
        console.error(`${new Date().toISOString()} - Socket error for ${socket.id}:`, error);
    });
    
    // Chess game handlers
    socket.on('chess:get_games', () => {
        try {
            const availableGames = Array.from(chessGames.values()).filter(game => 
                !game.ended && (!game.whitePlayer || !game.blackPlayer)
            );
            
            socket.emit('chess:games_list', {
                games: availableGames.map(game => ({
                    id: game.id,
                    whitePlayer: game.whitePlayer || null,
                    blackPlayer: game.blackPlayer || null,
                    started: game.started,
                    createdAt: game.createdAt
                }))
            });
            
            console.log(`[Chess] Sent ${availableGames.length} available games to ${socket.id}`);
        } catch (error) {
            console.error('Error in chess:get_games:', error);
        }
    });
    
    socket.on('chess:create_game', () => {
        try {
            const userInfo = connectedUsers.get(socket.id);
            const username = userInfo?.deviceId || socket.id;
            // Check for unfinished game where this user is white or black and game not over
            let game = Array.from(chessGames.values()).find(g =>
                (g.whitePlayer === username || g.blackPlayer === username) && !g.ended
            );
            if (!game) {
                const gameId = `game_${Date.now()}_${Math.floor(Math.random()*10000)}`;
                game = {
                    id: gameId,
                    whitePlayer: username,
                    blackPlayer: null,
                    started: false,
                    currentPlayer: 'white',
                    board: initializeChessBoard(),
                    moves: [],
                    spectators: new Set(),
                    createdAt: new Date().toISOString(),
                    ended: false
                };
                chessGames.set(gameId, game);
                saveChessGames();
            }
            socket.join(game.id);
            socket.emit('chess:game_joined', {
                gameId: game.id,
                color: game.whitePlayer === username ? 'white' : 'black',
                started: game.started
            });
            console.log(`[Chess] Game created or resumed: ${game.id} by ${username}`);
        } catch (error) {
            console.error('Error in chess:create_game:', error);
        }
    });

    socket.on('chess:join_game', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const userInfo = connectedUsers.get(socket.id);
            const username = userInfo?.deviceId || socket.id;
            
            if (!game) {
                socket.emit('error', { message: 'Game not found' });
                return;
            }
            
            if (game.ended) {
                socket.emit('error', { message: 'Game has ended' });
                return;
            }
            
            // Check if user is already a player in this game
            if (game.whitePlayer === username || game.blackPlayer === username) {
                // Rejoin as existing player
                socket.join(gameId);
                socket.emit('chess:game_joined', {
                    gameId,
                    color: game.whitePlayer === username ? 'white' : 'black',
                    started: game.started
                });
                console.log(`[Chess] Player rejoined game ${gameId}: ${username} as ${game.whitePlayer === username ? 'white' : 'black'}`);
                return;
            }
            
            // Check if game is full
            if (game.whitePlayer && game.blackPlayer) {
                // Join as spectator
                game.spectators = game.spectators || new Set();
                game.spectators.add(socket.id);
                socket.join(gameId);
                socket.emit('chess:game_joined', {
                    gameId,
                    color: 'spectator',
                    started: game.started
                });
                console.log(`[Chess] Spectator joined game ${gameId}: ${username}`);
                return;
            }
            
            // Join as available player
            let playerColor = '';
            if (!game.whitePlayer) {
                game.whitePlayer = username;
                playerColor = 'white';
            } else if (!game.blackPlayer) {
                game.blackPlayer = username;
                playerColor = 'black';
            }
            
            // Start the game if both players are now present
            if (game.whitePlayer && game.blackPlayer) {
                game.started = true;
                game.currentPlayer = 'white'; // White always goes first
            }
            
            socket.join(gameId);
            socket.emit('chess:game_joined', {
                gameId,
                color: playerColor,
                started: game.started
            });
            
            // If game just started, notify both players
            if (game.started) {
                io.to(gameId).emit('chess:game_started', {
                    currentPlayer: 'white'
                });
            }
            
            saveChessGames();
            console.log(`[Chess] Player joined game ${gameId} as ${playerColor}: ${username}`);
            
        } catch (error) {
            console.error('Error in chess:join_game:', error);
        }
    });
    
    socket.on('chess:make_move', (data) => {
        try {
            const { gameId, from, to } = data;
            const game = chessGames.get(gameId);
            const userInfo = connectedUsers.get(socket.id);
            
            if (!game) {
                socket.emit('error', { message: 'Game not found' });
                return;
            }
            
            if (!game.started) {
                socket.emit('error', { message: 'Game not started' });
                return;
            }
            
            // Check if it's the player's turn
            const playerColor = game.whitePlayer === (userInfo?.deviceId || socket.id) ? 'white' : 
                               game.blackPlayer === (userInfo?.deviceId || socket.id) ? 'black' : null;
            
            if (playerColor !== game.currentPlayer) {
                socket.emit('error', { message: 'Not your turn' });
                return;
            }
            
            // Validate move (simplified validation)
            if (isValidMove(game.board, from, to, playerColor)) {
                // Make the move
                const piece = game.board[from];
                const isCapture = game.board[to] !== null;
                
                game.board[to] = piece;
                game.board[from] = null;
                
                // Add to move history
                game.moves.push({
                    from,
                    to,
                    piece,
                    color: playerColor,
                    isCapture,
                    timestamp: new Date().toISOString()
                });
                
                // Switch turns
                game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
                
                // Broadcast move to all players in the game
                io.to(gameId).emit('chess:move_made', {
                    from,
                    to,
                    piece,
                    color: playerColor,
                    capture: isCapture
                });
                
                // Check for game over conditions
                if (isCheckmate(game.board, game.currentPlayer) || isStalemate(game.board, game.currentPlayer)) {
                    const winner = isCheckmate(game.board, game.currentPlayer) ? 
                        (game.currentPlayer === 'white' ? 'black' : 'white') : null;
                    const reason = isCheckmate(game.board, game.currentPlayer) ? 'Checkmate' : 'Stalemate';
                    
                    io.to(gameId).emit('chess:game_over', {
                        winner,
                        reason
                    });
                }
                
                console.log(`Chess move in game ${gameId}: ${from} to ${to} by ${playerColor}`);
                saveChessGames(); // Save after move
            } else {
                socket.emit('error', { message: 'Invalid move' });
            }
        } catch (error) {
            console.error('Error in chess:make_move:', error);
        }
    });
    
    socket.on('chess:leave_game', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            
            if (game) {
                socket.leave(gameId);
                game.spectators.delete(socket.id);
                
                // If a player leaves, end the game
                const userInfo = connectedUsers.get(socket.id);
                if (userInfo?.deviceId === game.whitePlayer || userInfo?.deviceId === game.blackPlayer) {
                    io.to(gameId).emit('chess:game_over', {
                        winner: null,
                        reason: 'Player left'
                    });
                    chessGames.delete(gameId);
                }
                saveChessGames(); // Save after leaving game
            }
        } catch (error) {
            console.error('Error in chess:leave_game:', error);
        }
    });
    
    socket.on('chess:resign_game', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const userInfo = connectedUsers.get(socket.id);
            
            if (game && userInfo) {
                const resignedPlayer = userInfo.deviceId === game.whitePlayer ? 'white' : 'black';
                const winner = resignedPlayer === 'white' ? 'black' : 'white';
                
                io.to(gameId).emit('chess:player_resigned', {
                    player: resignedPlayer
                });
                
                io.to(gameId).emit('chess:game_over', {
                    winner,
                    reason: 'Resignation'
                });
                
                chessGames.delete(gameId);
                saveChessGames(); // Save after resigning
            }
        } catch (error) {
            console.error('Error in chess:resign_game:', error);
        }
    });
    
    socket.on('chess:offer_draw', (data) => {
        try {
            const { gameId } = data;
            const game = chessGames.get(gameId);
            const userInfo = connectedUsers.get(socket.id);
            
            if (game && userInfo) {
                const offeringPlayer = userInfo.deviceId === game.whitePlayer ? 'white' : 'black';
                io.to(gameId).emit('chess:draw_offered', {
                    player: offeringPlayer
                });
            }
        } catch (error) {
            console.error('Error in chess:offer_draw:', error);
        }
    });
    
    socket.on('chess:respond_draw', (data) => {
        try {
            const { gameId, accepted } = data;
            const game = chessGames.get(gameId);
            
            if (game) {
                if (accepted) {
                    io.to(gameId).emit('chess:draw_accepted');
                    io.to(gameId).emit('chess:game_over', {
                        winner: null,
                        reason: 'Draw by agreement'
                    });
                    chessGames.delete(gameId);
                } else {
                    io.to(gameId).emit('chess:draw_declined');
                }
                saveChessGames(); // Save after responding to draw
            }
        } catch (error) {
            console.error('Error in chess:respond_draw:', error);
        }
    });

    // SNAKE: Submit score
    socket.on('snake:submit_score', (data) => {
        try {
            const { username, score, time, pieces } = data;
            if (!username || typeof score !== 'number' || typeof time !== 'number' || typeof pieces !== 'number') {
                socket.emit('snake:submit_result', { success: false, error: 'Invalid data' });
                return;
            }
            // Add to leaderboard
            snakeLeaderboard.push({ username, score, time, pieces, timestamp: new Date().toISOString() });
            // Sort by score DESC, then time ASC (lower time is better)
            snakeLeaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
            // Keep only top 10
            if (snakeLeaderboard.length > 10) snakeLeaderboard = snakeLeaderboard.slice(0, 10);
            saveSnakeLeaderboard();
            socket.emit('snake:submit_result', { success: true });
            io.emit('snake:leaderboard_updated', { leaderboard: snakeLeaderboard });
            console.log(`[Snake] Score submitted: ${username} - Score: ${score}, Time: ${time}, Pieces: ${pieces}`);
        } catch (e) {
            socket.emit('snake:submit_result', { success: false, error: 'Server error' });
            console.error('[Snake] Error submitting score:', e);
        }
    });
    // SNAKE: Get leaderboard
    socket.on('snake:get_leaderboard', () => {
        socket.emit('snake:leaderboard', { leaderboard: snakeLeaderboard });
    });
});

// Periodic cleanup of stale connections
setInterval(() => {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [socketId, userInfo] of connectedUsers.entries()) {
        const lastSeen = new Date(userInfo.lastSeen);
        if (now - lastSeen > staleThreshold) {
            console.log(`${new Date().toISOString()} - Cleaning up stale connection: ${userInfo.deviceId}`);
            connectedUsers.delete(socketId);
            userSockets.delete(userInfo.deviceId);
        }
    }
}, 60000); // Check every minute

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`${new Date().toISOString()} - Zell0 Server running on ${HOST}:${PORT}`);
    console.log(`${new Date().toISOString()} - Health check available at http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Chess game helper functions
function initializeChessBoard() {
    const board = {};
    
    // Initialize pawns
    for (let col = 0; col < 8; col++) {
        const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
        board[`${colChar}2`] = 'P'; // White pawns
        board[`${colChar}7`] = 'p'; // Black pawns
    }
    
    // Initialize other pieces
    const whitePieces = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    const blackPieces = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    
    for (let col = 0; col < 8; col++) {
        const colChar = String.fromCharCode('a'.charCodeAt(0) + col);
        board[`${colChar}1`] = whitePieces[col];
        board[`${colChar}8`] = blackPieces[col];
    }
    
    return board;
}

function isValidMove(board, from, to, color) {
    // Simplified move validation
    // In a real implementation, this would be much more complex
    
    const piece = board[from];
    if (!piece) return false;
    
    // Check if piece belongs to the player
    const isWhitePiece = piece === piece.toUpperCase();
    if ((color === 'white' && !isWhitePiece) || (color === 'black' && isWhitePiece)) {
        return false;
    }
    
    // Check if destination is not occupied by own piece
    const targetPiece = board[to];
    if (targetPiece) {
        const isTargetWhite = targetPiece === targetPiece.toUpperCase();
        if ((color === 'white' && isTargetWhite) || (color === 'black' && !isTargetWhite)) {
            return false;
        }
    }
    
    // Basic move validation (simplified)
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const pieceType = piece.toLowerCase();
    
    switch (pieceType) {
        case 'p': // Pawn
            return isValidPawnMove(board, from, to, color);
        case 'r': // Rook
            return isValidRookMove(board, from, to);
        case 'n': // Knight
            return isValidKnightMove(from, to);
        case 'b': // Bishop
            return isValidBishopMove(board, from, to);
        case 'q': // Queen
            return isValidQueenMove(board, from, to);
        case 'k': // King
            return isValidKingMove(from, to);
        default:
            return false;
    }
}

function isValidPawnMove(board, from, to, color) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;
    
    // Forward move
    if (fromCol === toCol && !board[to]) {
        if (toRow === fromRow + direction) {
            return true;
        }
        if (fromRow === startRow && toRow === fromRow + 2 * direction && !board[`${from[0]}${8 - (fromRow + direction)}`]) {
            return true;
        }
    }
    
    // Capture
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
        return board[to] !== null;
    }
    
    return false;
}

function isValidRookMove(board, from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    if (fromCol !== toCol && fromRow !== toRow) return false;
    
    // Check if path is clear
    if (fromCol === toCol) {
        const start = Math.min(fromRow, toRow);
        const end = Math.max(fromRow, toRow);
        for (let row = start + 1; row < end; row++) {
            const square = `${String.fromCharCode('a'.charCodeAt(0) + fromCol)}${8 - row}`;
            if (board[square]) return false;
        }
    } else {
        const start = Math.min(fromCol, toCol);
        const end = Math.max(fromCol, toCol);
        for (let col = start + 1; col < end; col++) {
            const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - fromRow}`;
            if (board[square]) return false;
        }
    }
    
    return true;
}

function isValidKnightMove(from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const colDiff = Math.abs(fromCol - toCol);
    const rowDiff = Math.abs(fromRow - toRow);
    
    return (colDiff === 2 && rowDiff === 1) || (colDiff === 1 && rowDiff === 2);
}

function isValidBishopMove(board, from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    if (Math.abs(fromCol - toCol) !== Math.abs(fromRow - toRow)) return false;
    
    // Check if path is clear
    const colStep = fromCol < toCol ? 1 : -1;
    const rowStep = fromRow < toRow ? 1 : -1;
    
    let col = fromCol + colStep;
    let row = fromRow + rowStep;
    
    while (col !== toCol && row !== toRow) {
        const square = `${String.fromCharCode('a'.charCodeAt(0) + col)}${8 - row}`;
        if (board[square]) return false;
        col += colStep;
        row += rowStep;
    }
    
    return true;
}

function isValidQueenMove(board, from, to) {
    return isValidRookMove(board, from, to) || isValidBishopMove(board, from, to);
}

function isValidKingMove(from, to) {
    const fromCol = from.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRow = 8 - parseInt(from[1]);
    const toCol = to.charCodeAt(0) - 'a'.charCodeAt(0);
    const toRow = 8 - parseInt(to[1]);
    
    const colDiff = Math.abs(fromCol - toCol);
    const rowDiff = Math.abs(fromRow - toRow);
    
    return colDiff <= 1 && rowDiff <= 1;
}

function isCheckmate(board, color) {
    // Simplified checkmate detection
    // In a real implementation, this would check if the king is in check and has no legal moves
    return false;
}

function isStalemate(board, color) {
    // Simplified stalemate detection
    // In a real implementation, this would check if the player has no legal moves but is not in check
    return false;
} 