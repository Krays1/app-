const { ipcRenderer } = require('electron');

// Global state
let isConnected = false;
let currentUser = null;
let connectedUsers = [];
let chessGame = null;
let settings = {};

// DOM elements
const elements = {
    // Status elements
    statusIcon: document.getElementById('statusIcon'),
    statusText: document.getElementById('statusText'),
    
    // User list elements
    userCount: document.getElementById('userCount'),
    userList: document.getElementById('userList'),
    
    // Chess elements
    findGameBtn: document.getElementById('findGameBtn'),
    leaveGameBtn: document.getElementById('leaveGameBtn'),
    chessStatus: document.getElementById('chessStatus'),
    
    // Chat elements
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    clearChatBtn: document.getElementById('clearChatBtn'),
    
    // Voice elements
    voiceBtn: document.getElementById('voiceBtn'),
    voiceStatus: document.getElementById('voiceStatus'),
    
    // Modal elements
    settingsModal: document.getElementById('settingsModal'),
    connectionModal: document.getElementById('connectionModal'),
    chessModal: document.getElementById('chessModal'),
    
    // Settings elements
    usernameInput: document.getElementById('usernameInput'),
    autoConnectCheck: document.getElementById('autoConnectCheck'),
    voiceEnabledCheck: document.getElementById('voiceEnabledCheck'),
    notificationsCheck: document.getElementById('notificationsCheck'),
    darkThemeCheck: document.getElementById('darkThemeCheck'),
    microphoneInput: document.getElementById('microphoneInput'),
    speakerInput: document.getElementById('speakerInput'),
    voiceVolume: document.getElementById('voiceVolume'),
    volumeDisplay: document.getElementById('volumeDisplay'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    testAudioBtn: document.getElementById('testAudioBtn'),
    
    // Connection elements
    connectUsernameInput: document.getElementById('connectUsernameInput'),
    connectBtn: document.getElementById('connectBtn'),
    cancelConnectBtn: document.getElementById('cancelConnectBtn'),
    connectionModalStatus: document.getElementById('connectionModalStatus'),
    
    // Chess elements
    chessBoard: document.getElementById('chessBoard'),
    chessStatusInfo: document.getElementById('chessStatusInfo'),
    resignBtn: document.getElementById('resignBtn'),
    saveGameBtn: document.getElementById('saveGameBtn'),
    
    // Header elements
    settingsBtn: document.getElementById('settingsBtn'),
    minimizeBtn: document.getElementById('minimizeBtn'),
    testConnectionBtn: document.getElementById('testConnectionBtn'), // Added test connection button
    refreshBtn: document.getElementById('refreshBtn'), // Added refresh button
    testUIBtn: document.getElementById('testUIBtn') // Added test UI button
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('=== Zell0 Desktop App Initialized ===');
    
    // Load settings
    await loadSettings();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup IPC listeners
    setupIpcListeners();
    
    // Detect audio devices
    await detectAudioDevices();
    
    // Apply theme
    applyTheme();
    
    console.log('App initialization complete');
    
    // Force auto-connect on first run or show connection modal
    setTimeout(() => {
        if (!settings.username) {
            // No username set, show connection modal
            console.log('No username set, showing connection modal');
            showConnectionModal();
        } else if (settings.autoConnect) {
            // Auto-connect with saved username
            console.log('Auto-connecting with saved username:', settings.username);
            autoConnectWithSavedUsername();
        } else {
            // Show connection modal for manual connection
            console.log('Auto-connect disabled, showing connection modal');
            showConnectionModal();
        }
    }, 1000);
});

// Setup event listeners
function setupEventListeners() {
    // Header buttons
    elements.settingsBtn.addEventListener('click', showSettingsModal);
    elements.minimizeBtn.addEventListener('click', () => {
        ipcRenderer.invoke('minimize-window');
    });
    elements.testUIBtn.addEventListener('click', () => {
        console.log('Test UI button clicked');
        
        // Force update connection status
        updateConnectionStatus('connected');
        
        // Force update user list with test data
        const testUsers = [
            {
                username: 'krays1',
                deviceId: 'android-device',
                deviceName: 'Android Device',
                profilePic: null
            },
            {
                username: 'krays2',
                deviceId: 'desktop-device',
                deviceName: 'Windows Desktop',
                profilePic: null
            }
        ];
        handleUserList(testUsers);
        
        // Force add test message
        const testMessage = {
            id: Date.now(),
            text: 'Test message from Android',
            senderId: 'krays1',
            senderName: 'krays1',
            senderProfilePic: null,
            timestamp: Date.now(),
            type: 'text'
        };
        handleTextMessage(testMessage);
        
        showNotification('UI test completed', 'success');
    });
    elements.refreshBtn.addEventListener('click', async () => {
        console.log('Refresh button clicked');
        try {
            // Force request user list
            const result = await ipcRenderer.invoke('request-user-list');
            console.log('Refresh result:', result);
            
            // Force update connection status
            if (isConnected) {
                updateConnectionStatus('connected');
            }
            
            showNotification('UI refreshed', 'success');
        } catch (error) {
            console.error('Refresh failed:', error);
            showNotification('Refresh failed', 'error');
        }
    });
    elements.testConnectionBtn.addEventListener('click', async () => {
        console.log('Test connection button clicked');
        try {
            const result = await ipcRenderer.invoke('request-user-list');
            console.log('Test connection result:', result);
            if (result.success) {
                showNotification('Connection test successful', 'success');
            } else {
                showNotification('Connection test failed: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Test connection failed:', error);
            showNotification('Connection test failed', 'error');
        }
    });
    
    // Connection modal
    elements.connectBtn.addEventListener('click', handleConnect);
    elements.cancelConnectBtn.addEventListener('click', hideConnectionModal);
    
    // Settings modal
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.closeSettingsBtn.addEventListener('click', hideSettingsModal);
    elements.testAudioBtn.addEventListener('click', testAudio);
    elements.darkThemeCheck.addEventListener('change', () => {
        settings.darkTheme = elements.darkThemeCheck.checked;
        applyTheme();
    });
    elements.voiceVolume.addEventListener('input', () => {
        elements.volumeDisplay.textContent = `${elements.voiceVolume.value}%`;
    });
    
    // Chat functionality
    elements.sendBtn.addEventListener('click', sendTextMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendTextMessage();
        }
    });
    elements.clearChatBtn.addEventListener('click', clearChat);
    
    // Voice functionality
    elements.voiceBtn.addEventListener('mousedown', startVoiceRecording);
    elements.voiceBtn.addEventListener('mouseup', stopVoiceRecording);
    elements.voiceBtn.addEventListener('mouseleave', stopVoiceRecording);
    
    // Chess functionality
    elements.findGameBtn.addEventListener('click', findChessGame);
    elements.leaveGameBtn.addEventListener('click', leaveChessGame);
    elements.resignBtn.addEventListener('click', resignChessGame);
    elements.saveGameBtn.addEventListener('click', saveChessGame);
    
    // Modal close buttons
    elements.closeChessBtn.addEventListener('click', hideChessModal);
    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

// Setup IPC listeners
function setupIpcListeners() {
    console.log('Setting up IPC listeners...');
    
    // Network events
    ipcRenderer.on('network-connected', (event, data) => {
        console.log('IPC: network-connected received', data);
        handleNetworkConnected();
    });
    
    ipcRenderer.on('network-disconnected', (event, data) => {
        console.log('IPC: network-disconnected received', data);
        handleNetworkDisconnected();
    });
    
    ipcRenderer.on('network-error', (event, error) => {
        console.log('IPC: network-error received', error);
        handleNetworkError(error);
    });
    
    // User events
    ipcRenderer.on('user-joined', (event, user) => {
        console.log('IPC: user-joined received', user);
        handleUserJoined(user);
    });
    
    ipcRenderer.on('user-left', (event, user) => {
        console.log('IPC: user-left received', user);
        handleUserLeft(user);
    });
    
    ipcRenderer.on('user-list', (event, users) => {
        console.log('IPC: user-list received', users);
        handleUserList(users);
    });
    
    // Message events
    ipcRenderer.on('text-message', (event, message) => {
        console.log('IPC: text-message received', message);
        handleTextMessage(message);
    });
    
    ipcRenderer.on('voice-message', (event, message) => {
        console.log('IPC: voice-message received', message);
        handleVoiceMessage(message);
    });
    
    // Chess events
    ipcRenderer.on('chess-game-joined', (event, data) => {
        console.log('IPC: chess-game-joined received', data);
        handleChessGameJoined(data);
    });
    
    ipcRenderer.on('chess-game-started', (event, data) => {
        console.log('IPC: chess-game-started received', data);
        handleChessGameStarted(data);
    });
    
    ipcRenderer.on('chess-move', (event, data) => {
        console.log('IPC: chess-move received', data);
        handleChessMove(data);
    });
    
    ipcRenderer.on('chess-game-over', (event, data) => {
        console.log('IPC: chess-game-over received', data);
        handleChessGameOver(data);
    });
    
    ipcRenderer.on('chess-left-confirmation', (event, data) => {
        console.log('IPC: chess-left-confirmation received', data);
        handleChessLeftConfirmation(data);
    });
    
    ipcRenderer.on('chess-error', (event, data) => {
        console.log('IPC: chess-error received', data);
        handleChessError(data);
    });
    
    console.log('IPC listeners setup complete');
}

// Settings management
async function loadSettings() {
    try {
        settings = await ipcRenderer.invoke('get-settings');
        console.log('Settings loaded:', settings);
        
        // Update UI with settings
        elements.usernameInput.value = settings.username || '';
        elements.autoConnectCheck.checked = settings.autoConnect || false;
        elements.voiceEnabledCheck.checked = settings.voiceEnabled !== false;
        elements.notificationsCheck.checked = settings.notificationsEnabled !== false;
        elements.darkThemeCheck.checked = settings.darkTheme || false;
        elements.microphoneInput.value = settings.microphoneDevice || '';
        elements.speakerInput.value = settings.speakerDevice || '';
        elements.voiceVolume.value = settings.voiceVolume || 80;
        elements.volumeDisplay.textContent = `${elements.voiceVolume.value}%`;
    } catch (error) {
        console.error('Failed to load settings:', error);
        showNotification('Failed to load settings', 'error');
    }
}

async function saveSettings() {
    try {
        const newSettings = {
            username: elements.usernameInput.value,
            autoConnect: elements.autoConnectCheck.checked,
            voiceEnabled: elements.voiceEnabledCheck.checked,
            notificationsEnabled: elements.notificationsCheck.checked,
            darkTheme: elements.darkThemeCheck.checked,
            microphoneDevice: elements.microphoneInput.value,
            speakerDevice: elements.speakerInput.value,
            voiceVolume: parseInt(elements.voiceVolume.value)
        };
        
        await ipcRenderer.invoke('save-settings', newSettings);
        settings = newSettings;
        
        // Apply theme immediately
        applyTheme();
        
        showNotification('Settings saved successfully', 'success');
        hideSettingsModal();
    } catch (error) {
        console.error('Failed to save settings:', error);
        showNotification('Failed to save settings', 'error');
    }
}

// Connection management
function showConnectionModal() {
    elements.connectionModal.classList.add('show');
    elements.connectUsernameInput.value = settings.username || '';
    elements.connectUsernameInput.focus();
}

function hideConnectionModal() {
    elements.connectionModal.classList.remove('show');
}

async function autoConnectWithDefaultUsername() {
    const defaultUsername = `DesktopUser${Math.floor(Math.random() * 1000)}`;
    
    try {
        const userData = {
            username: defaultUsername,
            deviceId: `desktop-${Date.now()}`,
            deviceName: 'Windows Desktop',
            profilePic: null
        };
        
        const result = await ipcRenderer.invoke('connect-to-server', userData);
        
        if (result.success) {
            currentUser = userData;
            showNotification(`Connected as ${defaultUsername}`, 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Auto-connection failed:', error);
        showNotification('Auto-connection failed, please connect manually', 'warning');
    }
}

async function autoConnectWithSavedUsername() {
    try {
        const userData = {
            username: settings.username,
            deviceId: `desktop-${Date.now()}`,
            deviceName: 'Windows Desktop',
            profilePic: null
        };
        
        const result = await ipcRenderer.invoke('connect-to-server', userData);
        
        if (result.success) {
            currentUser = userData;
            showNotification(`Connected as ${settings.username}`, 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Auto-connection failed:', error);
        showNotification('Auto-connection failed, please connect manually', 'warning');
    }
}

async function handleConnect() {
    const username = elements.connectUsernameInput.value.trim();
    if (!username) {
        showNotification('Please enter a username', 'error');
        return;
    }
    
    try {
        elements.connectBtn.disabled = true;
        elements.connectionModalStatus.textContent = 'Connecting...';
        
        const userData = {
            username: username,
            deviceId: `desktop-${Date.now()}`,
            deviceName: 'Windows Desktop',
            profilePic: null
        };
        
        const result = await ipcRenderer.invoke('connect-to-server', userData);
        
        if (result.success) {
            currentUser = userData;
            hideConnectionModal();
            showNotification('Connected to server successfully', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Connection failed:', error);
        elements.connectionModalStatus.textContent = 'Connection failed';
        showNotification(`Connection failed: ${error.message}`, 'error');
    } finally {
        elements.connectBtn.disabled = false;
    }
}

// Network event handlers
function handleNetworkConnected() {
    console.log('Network connected event received');
    isConnected = true;
    updateConnectionStatus('connected');
    showNotification('Connected to server', 'success');
    
    // Request user list after connection
    setTimeout(() => {
        requestUserList();
    }, 1000);
}

function handleNetworkDisconnected() {
    console.log('Network disconnected event received');
    isConnected = false;
    updateConnectionStatus('disconnected');
    showNotification('Disconnected from server', 'warning');
}

function handleNetworkError(error) {
    console.error('Network error:', error);
    isConnected = false;
    updateConnectionStatus('disconnected');
    showNotification(`Network error: ${error.message}`, 'error');
}

// Request user list from server
async function requestUserList() {
    try {
        const result = await ipcRenderer.invoke('request-user-list');
        if (!result.success) {
            console.error('Failed to request user list:', result.error);
        }
    } catch (error) {
        console.error('Failed to request user list:', error);
    }
}

// User event handlers
function handleUserJoined(user) {
    console.log('User joined:', user);
    if (!connectedUsers.find(u => u.deviceId === user.deviceId)) {
        connectedUsers.push(user);
        updateUserList();
    }
    
    if (settings.notificationsEnabled) {
        showNotification(`${user.username} joined the chat`, 'success');
    }
}

function handleUserLeft(user) {
    console.log('User left:', user);
    connectedUsers = connectedUsers.filter(u => u.deviceId !== user.deviceId);
    updateUserList();
    
    if (settings.notificationsEnabled) {
        showNotification(`${user.username} left the chat`, 'warning');
    }
}

function handleUserList(users) {
    console.log('User list received:', users);
    connectedUsers = users || [];
    updateUserList();
}

// Message handlers
function handleTextMessage(message) {
    console.log('Text message received:', message);
    
    // Handle different message formats from server
    const messageData = {
        sender: message.sender || message.senderName || 'Unknown',
        message: message.message || message.text || '',
        timestamp: message.timestamp || Date.now()
    };
    
    addMessage(messageData, 'text');
    
    if (settings.notificationsEnabled) {
        showNotification(`New message from ${messageData.sender}`, 'success');
    }
}

function handleVoiceMessage(message) {
    console.log('Voice message received:', message);
    
    // Handle different message formats from server
    const messageData = {
        sender: message.sender || message.senderName || 'Unknown',
        message: message.message || message.text || '',
        timestamp: message.timestamp || Date.now()
    };
    
    addMessage(messageData, 'voice');
    
    if (settings.notificationsEnabled) {
        showNotification(`Voice message from ${messageData.sender}`, 'success');
    }
}

// Chess event handlers
function handleChessGameJoined(data) {
    console.log('Chess game joined:', data);
    chessGame = data;
    updateChessStatus();
    showChessModal();
    showNotification(`Joined chess game as ${data.color}`, 'success');
}

function handleChessGameStarted(data) {
    console.log('Chess game started:', data);
    if (chessGame) {
        chessGame.started = true;
        updateChessStatus();
        updateChessBoard();
    }
    showNotification('Chess game started!', 'success');
}

function handleChessMove(data) {
    console.log('Chess move made:', data);
    if (chessGame) {
        chessGame.board = data.board;
        chessGame.isMyTurn = data.isMyTurn;
        updateChessStatus();
        updateChessBoard();
    }
}

function handleChessGameOver(data) {
    console.log('Chess game over:', data);
    chessGame = null;
    updateChessStatus();
    hideChessModal();
    showNotification(`Chess game ended: ${data.result}`, 'warning');
}

function handleChessLeftConfirmation(data) {
    console.log('Chess leave confirmation:', data);
    chessGame = null;
    updateChessStatus();
    hideChessModal();
    showNotification('Left chess game', 'success');
}

function handleChessError(data) {
    console.error('Chess error:', data);
    showNotification(`Chess error: ${data.message}`, 'error');
}

// UI update functions
function updateConnectionStatus(status) {
    const statusIcon = elements.statusIcon;
    const statusText = elements.statusText;
    
    // Remove all status classes
    statusIcon.classList.remove('connected', 'disconnected', 'connecting');
    
    switch (status) {
        case 'connected':
            statusIcon.classList.add('connected');
            statusText.textContent = 'Connected';
            isConnected = true;
            
            // Request user list after connection
            setTimeout(() => {
                requestUserList();
            }, 1000);
            break;
            
        case 'disconnected':
            statusIcon.classList.add('disconnected');
            statusText.textContent = 'Disconnected';
            isConnected = false;
            connectedUsers = [];
            updateUserList();
            break;
            
        case 'connecting':
            statusIcon.classList.add('connecting');
            statusText.textContent = 'Connecting...';
            break;
            
        default:
            statusIcon.classList.add('disconnected');
            statusText.textContent = 'Disconnected';
            isConnected = false;
    }
}

function updateUserList() {
    console.log('Updating user list with', connectedUsers.length, 'users');
    
    // Update user count
    elements.userCount.textContent = `${connectedUsers.length} user${connectedUsers.length !== 1 ? 's' : ''}`;
    
    // Clear existing list
    elements.userList.innerHTML = '';
    
    // Add each user
    connectedUsers.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = user.username.charAt(0).toUpperCase();
        
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        
        const userName = document.createElement('div');
        userName.className = 'user-name';
        userName.textContent = user.username;
        
        const userDevice = document.createElement('div');
        userDevice.className = 'user-device';
        userDevice.textContent = user.deviceName || 'Unknown Device';
        
        userInfo.appendChild(userName);
        userInfo.appendChild(userDevice);
        userItem.appendChild(avatar);
        userItem.appendChild(userInfo);
        elements.userList.appendChild(userItem);
    });
    
    console.log('User list updated');
}

function updateChessStatus() {
    if (chessGame) {
        elements.findGameBtn.style.display = 'none';
        elements.leaveGameBtn.style.display = 'block';
        
        const status = chessGame.started 
            ? `Playing as ${chessGame.color} - ${chessGame.isMyTurn ? 'Your turn' : 'Opponent\'s turn'}`
            : `Waiting for opponent (${chessGame.color})`;
        
        elements.chessStatus.textContent = status;
    } else {
        elements.findGameBtn.style.display = 'block';
        elements.leaveGameBtn.style.display = 'none';
        elements.chessStatus.textContent = 'Not in a game';
    }
}

// Message functions
function addMessage(message, type) {
    console.log('Adding message to UI:', message, 'type:', type);
    
    const messageElement = document.createElement('div');
    const isOwnMessage = message.sender === currentUser?.username || message.senderName === currentUser?.username;
    messageElement.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp || Date.now()).toLocaleTimeString();
    const sender = message.sender || message.senderName || 'Unknown';
    const messageText = message.message || message.text || '';
    
    if (type === 'text') {
        messageElement.innerHTML = `
            <div class="message-avatar">${sender.charAt(0).toUpperCase()}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${sender}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${messageText}</div>
            </div>
        `;
    } else if (type === 'voice') {
        messageElement.innerHTML = `
            <div class="message-avatar">${sender.charAt(0).toUpperCase()}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${sender}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="voice-message">
                    <i class="fas fa-play voice-icon"></i>
                    <span class="voice-duration">Voice message</span>
                </div>
            </div>
        `;
    }
    
    elements.messagesContainer.appendChild(messageElement);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    
    console.log('Message added to UI successfully');
}

async function sendTextMessage() {
    const message = elements.messageInput.value.trim();
    if (!message) return;
    
    console.log('Attempting to send message:', message);
    
    if (!isConnected) {
        console.log('Not connected, cannot send message');
        showNotification('Not connected to server', 'error');
        return;
    }
    
    try {
        console.log('Sending message via IPC...');
        const result = await ipcRenderer.invoke('send-text-message', message);
        
        if (result.success) {
            console.log('Message sent successfully');
            // Add message to chat immediately
            const messageData = {
                sender: currentUser?.username || 'You',
                message: message,
                timestamp: Date.now()
            };
            addMessage(messageData, 'text');
            
            // Clear input
            elements.messageInput.value = '';
        } else {
            console.error('Failed to send message:', result.error);
            showNotification(`Failed to send message: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Failed to send message:', error);
        showNotification('Failed to send message', 'error');
    }
}

function clearChat() {
    elements.messagesContainer.innerHTML = '';
}

// Voice functions
let mediaRecorder = null;
let audioChunks = [];

async function startVoiceRecording() {
    if (!settings.voiceEnabled || !isConnected) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const arrayBuffer = await audioBlob.arrayBuffer();
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            
            try {
                await ipcRenderer.invoke('send-voice-message', base64Audio);
            } catch (error) {
                console.error('Failed to send voice message:', error);
                showNotification('Failed to send voice message', 'error');
            }
            
            audioChunks = [];
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        elements.voiceBtn.classList.add('recording');
        elements.voiceStatus.textContent = 'Recording... Release to send';
    } catch (error) {
        console.error('Failed to start recording:', error);
        showNotification('Failed to start recording', 'error');
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        elements.voiceBtn.classList.remove('recording');
        elements.voiceStatus.textContent = 'Click to record voice message';
    }
}

// Chess functions
async function findChessGame() {
    if (!isConnected) {
        showNotification('Not connected to server', 'error');
        return;
    }
    
    try {
        await ipcRenderer.invoke('chess-find-game');
        showNotification('Looking for chess game...', 'success');
    } catch (error) {
        console.error('Failed to find chess game:', error);
        showNotification('Failed to find chess game', 'error');
    }
}

async function leaveChessGame() {
    if (!chessGame) return;
    
    try {
        await ipcRenderer.invoke('chess-leave-game', chessGame.gameId);
    } catch (error) {
        console.error('Failed to leave chess game:', error);
        showNotification('Failed to leave chess game', 'error');
    }
}

async function resignChessGame() {
    if (!chessGame) return;
    
    try {
        await ipcRenderer.invoke('chess-resign-game');
    } catch (error) {
        console.error('Failed to resign chess game:', error);
        showNotification('Failed to resign chess game', 'error');
    }
}

async function saveChessGame() {
    if (!chessGame) return;
    
    try {
        await ipcRenderer.invoke('chess-save-game');
        showNotification('Game saved successfully', 'success');
    } catch (error) {
        console.error('Failed to save chess game:', error);
        showNotification('Failed to save chess game', 'error');
    }
}

// Chess board functions
function showChessModal() {
    elements.chessModal.classList.add('show');
    updateChessBoard();
}

function hideChessModal() {
    elements.chessModal.classList.remove('show');
}

function updateChessBoard() {
    if (!chessGame || !chessGame.board) return;
    
    elements.chessBoard.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `chess-square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            const piece = chessGame.board[row][col];
            if (piece) {
                square.textContent = getChessPieceSymbol(piece);
            }
            
            square.addEventListener('click', () => handleChessSquareClick(row, col));
            elements.chessBoard.appendChild(square);
        }
    }
    
    updateChessStatusInfo();
}

function getChessPieceSymbol(piece) {
    const symbols = {
        'white-pawn': '♙', 'white-rook': '♖', 'white-knight': '♘', 
        'white-bishop': '♗', 'white-queen': '♕', 'white-king': '♔',
        'black-pawn': '♟', 'black-rook': '♜', 'black-knight': '♞', 
        'black-bishop': '♝', 'black-queen': '♛', 'black-king': '♚'
    };
    return symbols[piece] || '';
}

function handleChessSquareClick(row, col) {
    // Simple chess move handling - would need more sophisticated logic
    console.log(`Clicked square: ${row}, ${col}`);
}

function updateChessStatusInfo() {
    if (!chessGame) return;
    
    const status = chessGame.started 
        ? `Playing as ${chessGame.color} - ${chessGame.isMyTurn ? 'Your turn' : 'Opponent\'s turn'}`
        : 'Waiting for opponent to join...';
    
    elements.chessStatusInfo.textContent = status;
}

// Modal functions
function showSettingsModal() {
    elements.settingsModal.classList.add('show');
}

function hideSettingsModal() {
    elements.settingsModal.classList.remove('show');
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    elements.notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Utility functions
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
}

// Audio device detection
async function detectAudioDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        // Populate microphone dropdown
        elements.microphoneInput.innerHTML = '<option value="">Default microphone</option>';
        audioInputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${device.deviceId.slice(0, 8)}`;
            elements.microphoneInput.appendChild(option);
        });
        
        // Populate speaker dropdown
        elements.speakerInput.innerHTML = '<option value="">Default speakers</option>';
        audioOutputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Speaker ${device.deviceId.slice(0, 8)}`;
            elements.speakerInput.appendChild(option);
        });
        
        console.log('Audio devices detected:', { inputs: audioInputs.length, outputs: audioOutputs.length });
    } catch (error) {
        console.error('Failed to detect audio devices:', error);
    }
}

// Theme management
function applyTheme() {
    if (settings.darkTheme) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function toggleTheme() {
    settings.darkTheme = !settings.darkTheme;
    applyTheme();
    saveSettings();
}

// Audio testing
async function testAudio() {
    try {
        showNotification('Testing audio...', 'info');
        
        // Test microphone
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                deviceId: settings.microphoneDevice ? { exact: settings.microphoneDevice } : undefined
            }
        });
        
        // Create audio context for testing
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Set up audio chain
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play test tone
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start();
        
        // Stop after 2 seconds
        setTimeout(() => {
            oscillator.stop();
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
            showNotification('Audio test completed', 'success');
        }, 2000);
        
    } catch (error) {
        console.error('Audio test failed:', error);
        showNotification('Audio test failed: ' + error.message, 'error');
    }
}

// Export for testing
window.Zell0Desktop = {
    isConnected,
    currentUser,
    connectedUsers,
    chessGame,
    settings
}; 