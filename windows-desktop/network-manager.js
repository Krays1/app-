const { EventEmitter } = require('events');
const io = require('socket.io-client');
const crypto = require('crypto');

class NetworkManager extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.socket = null;
        this.isConnected = false;
        this.userData = null;
        this.deviceId = crypto.randomUUID();
        this.deviceName = `Windows-${require('os').hostname()}`;
        
        // Chess game state
        this.chessGameId = null;
        this.chessPlayerColor = null;
        this.chessIsMyTurn = false;
        this.chessGameStarted = false;
    }

    async connect(userData = null) {
        try {
            if (this.isConnected) {
                console.log('Already connected to server');
                return;
            }

            this.userData = userData || {
                username: 'DesktopUser',
                deviceId: this.deviceId,
                deviceName: this.deviceName,
                profilePic: null
            };

            const serverUrl = `http://${this.config.host}:${this.config.port}`;
            console.log(`Connecting to server: ${serverUrl}`);

            this.socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                forceNew: true
            });

            this.setupSocketListeners();
            
            // Wait for connection
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);

                this.socket.on('connect', () => {
                    clearTimeout(timeout);
                    console.log('Connected to server');
                    this.isConnected = true;
                    this.emit('connected');
                    resolve();
                });

                this.socket.on('connect_error', (error) => {
                    clearTimeout(timeout);
                    console.error('Connection error:', error);
                    this.emit('error', error);
                    reject(error);
                });
            });

            // Register with server
            await this.register();

        } catch (error) {
            console.error('Failed to connect:', error);
            this.emit('error', error);
            throw error;
        }
    }

    async register() {
        return new Promise((resolve, reject) => {
            if (!this.socket || !this.isConnected) {
                reject(new Error('Not connected to server'));
                return;
            }

            const registrationData = {
                username: this.userData.username,
                deviceId: this.userData.deviceId,
                deviceName: this.userData.deviceName,
                profilePic: this.userData.profilePic
            };

            console.log('Registering with server:', registrationData);

            this.socket.emit('register', registrationData);

            this.socket.once('registration_success', (data) => {
                console.log('Registration successful:', data);
                this.emit('registered', data);
                resolve(data);
            });

            this.socket.once('registration_error', (error) => {
                console.error('Registration failed:', error);
                this.emit('error', error);
                reject(error);
            });
        });
    }

    disconnect() {
        if (this.socket) {
            console.log('Disconnecting from server');
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.emit('disconnected');
        }
    }

    setupSocketListeners() {
        if (!this.socket) return;

        // Connection events
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
            this.emit('disconnected');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.emit('error', error);
        });

        // User events
        this.socket.on('user_joined', (data) => {
            console.log('User joined:', data);
            this.emit('user-joined', data);
        });

        this.socket.on('user_left', (data) => {
            console.log('User left:', data);
            this.emit('user-left', data);
        });

        this.socket.on('user_list', (data) => {
            console.log('User list received:', data.users.length, 'users');
            this.emit('user-list', data.users);
        });

        // Message events
        this.socket.on('text_message_received', (data) => {
            console.log('Text message received:', data);
            this.emit('text-message', data);
        });

        this.socket.on('voice_message_received', (data) => {
            console.log('Voice message received:', data);
            this.emit('voice-message', data);
        });

        // Chess events
        this.socket.on('chess:game_joined', (data) => {
            console.log('Chess game joined:', data);
            this.chessGameId = data.gameId;
            this.chessPlayerColor = data.color;
            this.chessIsMyTurn = data.isMyTurn;
            this.chessGameStarted = data.started;
            this.emit('chess-game-joined', data);
        });

        this.socket.on('chess:game_started', (data) => {
            console.log('Chess game started:', data);
            this.chessGameStarted = true;
            this.emit('chess-game-started', data);
        });

        this.socket.on('chess:move_made', (data) => {
            console.log('Chess move made:', data);
            this.chessIsMyTurn = data.isMyTurn;
            this.emit('chess-move', data);
        });

        this.socket.on('chess:game_over', (data) => {
            console.log('Chess game over:', data);
            this.resetChessGame();
            this.emit('chess-game-over', data);
        });

        this.socket.on('chess:left_game_confirmation', (data) => {
            console.log('Chess leave confirmation:', data);
            this.resetChessGame();
            this.emit('chess-left-confirmation', data);
        });

        // Error events
        this.socket.on('chess:error', (data) => {
            console.error('Chess error:', data);
            this.emit('chess-error', data);
        });

        // Ping/Pong for keep-alive
        this.socket.on('ping', () => {
            console.log('Received ping, sending pong');
            this.socket.emit('pong');
        });

        this.socket.on('pong', () => {
            console.log('Received pong');
        });
    }

    // Message sending methods
    sendTextMessage(message) {
        if (!this.socket || !this.isConnected) {
            throw new Error('Not connected to server');
        }

        const messageData = {
            message: message,
            timestamp: Date.now()
        };

        console.log('Sending text message:', messageData);
        this.socket.emit('text-message', messageData);
    }

    sendVoiceMessage(audioData) {
        if (!this.socket || !this.isConnected) {
            throw new Error('Not connected to server');
        }

        const messageData = {
            audioData: audioData,
            timestamp: Date.now(),
            duration: 0 // Will be calculated if needed
        };

        console.log('Sending voice message:', messageData.audioData.length, 'bytes');
        this.socket.emit('voice-message', messageData);
    }

    // Chess methods
    findChessGame() {
        if (!this.socket || !this.isConnected) {
            throw new Error('Not connected to server');
        }

        console.log('Finding chess game...');
        this.socket.emit('chess:find_game');
    }

    makeChessMove(moveData) {
        if (!this.socket || !this.isConnected) {
            throw new Error('Not connected to server');
        }

        if (!this.chessGameId) {
            throw new Error('Not in a chess game');
        }

        if (!this.chessIsMyTurn) {
            throw new Error('Not your turn');
        }

        const move = {
            gameId: this.chessGameId,
            from: moveData.from,
            to: moveData.to,
            piece: moveData.piece
        };

        console.log('Making chess move:', move);
        this.socket.emit('chess:move', move);
    }

    leaveChessGame(gameId = null) {
        if (!this.socket || !this.isConnected) {
            throw new Error('Not connected to server');
        }

        const gameToLeave = gameId || this.chessGameId;
        if (!gameToLeave) {
            throw new Error('Not in a chess game');
        }

        console.log('Leaving chess game:', gameToLeave);
        this.socket.emit('chess:leave_game', { gameId: gameToLeave });
    }

    resignChessGame() {
        if (!this.socket || !this.isConnected) {
            throw new Error('Not connected to server');
        }

        if (!this.chessGameId) {
            throw new Error('Not in a chess game');
        }

        console.log('Resigning chess game:', this.chessGameId);
        this.socket.emit('chess:resign_game', { gameId: this.chessGameId });
    }

    saveChessGame() {
        if (!this.socket || !this.isConnected) {
            throw new Error('Not connected to server');
        }

        if (!this.chessGameId) {
            throw new Error('Not in a chess game');
        }

        console.log('Saving chess game:', this.chessGameId);
        this.socket.emit('chess:save_game', { 
            gameId: this.chessGameId,
            playerName: this.userData.username
        });
    }

    // Utility methods
    resetChessGame() {
        this.chessGameId = null;
        this.chessPlayerColor = null;
        this.chessIsMyTurn = false;
        this.chessGameStarted = false;
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            deviceId: this.deviceId,
            deviceName: this.deviceName,
            username: this.userData?.username
        };
    }

    getChessGameStatus() {
        return {
            gameId: this.chessGameId,
            playerColor: this.chessPlayerColor,
            isMyTurn: this.chessIsMyTurn,
            gameStarted: this.chessGameStarted
        };
    }

    // Request user list
    requestUserList() {
        if (!this.socket || !this.isConnected) {
            throw new Error('Not connected to server');
        }

        console.log('Requesting user list...');
        this.socket.emit('get_user_list');
    }

    // Send ping for keep-alive
    sendPing() {
        if (!this.socket || !this.isConnected) {
            return;
        }

        this.socket.emit('ping');
    }
}

module.exports = { NetworkManager }; 