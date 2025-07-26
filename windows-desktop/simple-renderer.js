const { ipcRenderer } = require('electron');

let currentUser = null;
let isConnected = false;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isLiveStreaming = false;
let liveAudioContext = null;
let liveAudioStream = null;

// Live audio playback
let liveAudioQueue = [];
let isPlayingLiveAudio = false;

// Push-to-talk functionality
let isPushToTalkActive = false;
const pushToTalkButton = document.getElementById('push-to-talk-button');

// DOM elements
const statusElement = document.getElementById('status');
const statusText = document.getElementById('status-text');
const connectionForm = document.getElementById('connection-form');
const usernameInput = document.getElementById('username-input');
const usersContainer = document.getElementById('users-container');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const recordButton = document.getElementById('record-button');
const recordingStatus = document.getElementById('recording-status');

// Connection functions
async function connect() {
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    currentUser = { username };
    const result = await ipcRenderer.invoke('connect', username);
    
    if (result.success) {
        console.log('Connection initiated');
    } else {
        alert('Failed to connect: ' + result.error);
    }
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !isConnected) return;
    
    const result = await ipcRenderer.invoke('send-message', message);
    if (result.success) {
        // Add your own message to the chat immediately
        const ownMessage = {
            text: message,
            senderName: currentUser?.username || 'You',
            timestamp: Date.now(),
            type: 'text'
        };
        addMessage(ownMessage, 'text');
        
        messageInput.value = '';
    } else {
        alert('Failed to send message: ' + result.error);
    }
}

// Audio recording and playback functions
async function toggleRecording() {
    if (!isConnected) {
        alert('Please connect first');
        return;
    }
    
    if (isRecording) {
        await stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        console.log('Starting audio recording...');
        
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendVoiceMessage(audioBlob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        // Update UI
        recordButton.classList.add('recording');
        recordButton.textContent = '⏹️';
        recordingStatus.textContent = 'Recording... Click to stop';
        
        console.log('Recording started');
        
    } catch (error) {
        console.error('Failed to start recording:', error);
        alert('Failed to start recording: ' + error.message);
    }
}

async function stopRecording() {
    if (!mediaRecorder || !isRecording) return;
    
    try {
        console.log('Stopping recording...');
        mediaRecorder.stop();
        isRecording = false;
        
        // Update UI
        recordButton.classList.remove('recording');
        recordButton.textContent = '🎤';
        recordingStatus.textContent = 'Hold to record voice message';
        
        console.log('Recording stopped');
        
    } catch (error) {
        console.error('Failed to stop recording:', error);
    }
}

async function sendVoiceMessage(audioBlob) {
    try {
        console.log('Sending voice message...');
        
        // Convert to base64
        const reader = new FileReader();
        reader.onload = async () => {
            const base64Data = reader.result.split(',')[1]; // Remove data URL prefix
            
            const result = await ipcRenderer.invoke('send-voice-message', base64Data);
            if (result.success) {
                console.log('Voice message sent successfully');
                
                // Add your own voice message to the chat immediately
                const ownVoiceMessage = {
                    audioData: base64Data,
                    senderName: currentUser?.username || 'You',
                    timestamp: Date.now(),
                    type: 'voice'
                };
                addMessage(ownVoiceMessage, 'voice');
                
            } else {
                alert('Failed to send voice message: ' + result.error);
            }
        };
        reader.readAsDataURL(audioBlob);
        
    } catch (error) {
        console.error('Failed to send voice message:', error);
        alert('Failed to send voice message: ' + error.message);
    }
}

async function playAudioMessage(audioData) {
    try {
        console.log('Playing audio message...');
        
        // Convert base64 to blob
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const audioBlob = new Blob([byteArray], { type: 'audio/webm' });
        
        // Create audio element and play
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.play();
        
        console.log('Audio playback started');
        
    } catch (error) {
        console.error('Failed to play audio:', error);
        alert('Failed to play audio: ' + error.message);
    }
}

// Live audio streaming functions
async function startLiveStreaming() {
    try {
        console.log('Starting live audio streaming...');
        
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            } 
        });
        
        liveAudioStream = stream;
        liveAudioContext = new AudioContext();
        
        // Create audio processor for live streaming
        const source = liveAudioContext.createMediaStreamSource(stream);
        const processor = liveAudioContext.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = async (event) => {
            if (isLiveStreaming) {
                const inputData = event.inputBuffer.getChannelData(0);
                
                // Convert to base64
                const audioBuffer = new Float32Array(inputData);
                const audioData = new Int16Array(audioBuffer.length);
                
                for (let i = 0; i < audioBuffer.length; i++) {
                    audioData[i] = Math.max(-32768, Math.min(32767, audioBuffer[i] * 32768));
                }
                
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(audioData.buffer)));
                
                // Send live audio chunk
                await ipcRenderer.invoke('send-live-audio-chunk', base64Data);
            }
        };
        
        source.connect(processor);
        processor.connect(liveAudioContext.destination);
        
        isLiveStreaming = true;
        console.log('Live audio streaming started');
        
    } catch (error) {
        console.error('Failed to start live streaming:', error);
        alert('Failed to start live streaming: ' + error.message);
    }
}

async function stopLiveStreaming() {
    try {
        console.log('Stopping live audio streaming...');
        
        isLiveStreaming = false;
        
        if (liveAudioContext) {
            await liveAudioContext.close();
            liveAudioContext = null;
        }
        
        if (liveAudioStream) {
            liveAudioStream.getTracks().forEach(track => track.stop());
            liveAudioStream = null;
        }
        
        console.log('Live audio streaming stopped');
        
    } catch (error) {
        console.error('Failed to stop live streaming:', error);
    }
}

// Live audio playback
async function playLiveAudioChunk(audioData) {
    try {
        // Convert base64 to audio buffer
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // Create audio context for playback
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(byteArray.buffer);
        
        // Play the audio
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        
        console.log('Live audio chunk played');
        
    } catch (error) {
        console.error('Failed to play live audio chunk:', error);
    }
}

// Push-to-talk functionality
async function togglePushToTalk() {
    if (!isConnected) {
        alert('Please connect first');
        return;
    }
    
    if (isPushToTalkActive) {
        await stopPushToTalk();
    } else {
        await startPushToTalk();
    }
}

async function startPushToTalk() {
    try {
        console.log('Starting push-to-talk...');
        await startLiveStreaming();
        isPushToTalkActive = true;
        
        // Update UI
        pushToTalkButton.classList.add('active');
        pushToTalkButton.textContent = '⏹️';
        recordingStatus.textContent = 'Push-to-talk active - Click to stop';
        
        console.log('Push-to-talk started');
        
    } catch (error) {
        console.error('Failed to start push-to-talk:', error);
        alert('Failed to start push-to-talk: ' + error.message);
    }
}

async function stopPushToTalk() {
    try {
        console.log('Stopping push-to-talk...');
        await stopLiveStreaming();
        isPushToTalkActive = false;
        
        // Update UI
        pushToTalkButton.classList.remove('active');
        pushToTalkButton.textContent = '🎙️';
        recordingStatus.textContent = 'Hold to record voice message';
        
        console.log('Push-to-talk stopped');
        
    } catch (error) {
        console.error('Failed to stop push-to-talk:', error);
    }
}

// Message display functions
function addMessage(message, type) {
    const messageElement = document.createElement('div');
    const isOwnMessage = message.senderName === currentUser?.username || message.sender === currentUser?.username;
    messageElement.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp || Date.now()).toLocaleTimeString();
    const sender = message.senderName || message.sender || 'Unknown';
    const messageText = message.text || message.message || '';
    
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
                <div class="message-text voice-message">
                    <button class="play-button" onclick="playAudioMessage('${message.audioData}')">▶️</button>
                    <span>Voice message</span>
                </div>
            </div>
        `;
    }
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    console.log('Message added to UI:', { sender, messageText, isOwnMessage, type });
}

function updateUserList(users) {
    if (users.length === 0) {
        usersContainer.innerHTML = '<p>No users connected</p>';
        return;
    }
    
    usersContainer.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div>
                <div>${user.username}</div>
                <small>${user.deviceName || 'Unknown device'}</small>
            </div>
        </div>
    `).join('');
}

function updateConnectionStatus(connected) {
    isConnected = connected;
    const statusDot = statusElement.querySelector('.status');
    const statusTextElement = document.getElementById('status-text');
    
    if (connected) {
        statusDot.className = 'status connected';
        statusTextElement.textContent = 'Connected';
        connectionForm.style.display = 'none';
        recordButton.disabled = false;
        pushToTalkButton.disabled = false;
    } else {
        statusDot.className = 'status disconnected';
        statusTextElement.textContent = 'Disconnected';
        connectionForm.style.display = 'block';
        recordButton.disabled = true;
        pushToTalkButton.disabled = true;
    }
}

// Event listeners
ipcRenderer.on('connection-status', (event, data) => {
    updateConnectionStatus(data.connected);
});

ipcRenderer.on('user-list', (event, users) => {
    updateUserList(users);
});

ipcRenderer.on('text-message', (event, message) => {
    addMessage(message, 'text');
});

ipcRenderer.on('voice-message', (event, message) => {
    addMessage(message, 'voice');
});

// Keyboard shortcuts
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Initialize
updateConnectionStatus(false); 

// Event listener for live audio chunks
ipcRenderer.on('live-audio-chunk', (event, chunk) => {
    console.log('Live audio chunk received:', chunk);
    playLiveAudioChunk(chunk.audioData);
}); 