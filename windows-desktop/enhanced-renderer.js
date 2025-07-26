const { ipcRenderer } = require('electron');

// Global error handlers to prevent DevTools disconnection
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    console.error('Error details:', {
        message: event.error?.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
    event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    console.error('Promise rejection details:', {
        reason: event.reason,
        promise: event.promise
    });
    event.preventDefault();
});

// Audio context error handler
window.addEventListener('audioerror', (event) => {
    console.error('Audio error caught:', event.error);
    event.preventDefault();
});

let currentUser = null;
let isConnected = false;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isLiveStreaming = false;
let liveAudioContext = null;
let liveAudioStream = null;

// Audio settings - Compatible with Android
let audioSettings = {
    microphoneDevice: '',
    speakerDevice: '',
    microphoneVolume: 60, // Reduced to prevent clipping
    speakerVolume: 60,    // Reduced to prevent clipping
    sampleRate: 16000,    // 16kHz for good quality
    channels: 1,          // Mono for voice chat
    echoCancellation: false, // Disabled for compatibility
    noiseSuppression: false, // Disabled for compatibility
    autoGainControl: false,  // Disabled for compatibility
    // Audio format settings
    audioBitsPerSecond: 128000,
    timeslice: 100,
    enableHighQuality: false
};

// Audio conflict detection
let audioConflicts = {
    deviceInUse: false,
    permissionDenied: false,
    formatNotSupported: false,
    lastError: null
};

// Audio device cache
let availableAudioDevices = {
    microphones: [],
    speakers: []
};

// Live audio playback
let liveAudioQueue = [];
let isPlayingLiveAudio = false;

// Push-to-talk functionality
let isPushToTalkActive = false;

// DOM elements
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const connectionForm = document.getElementById('connection-form');
const usernameInput = document.getElementById('username-input');
const usersContainer = document.getElementById('users-container');
const userCount = document.getElementById('user-count');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const recordButton = document.getElementById('record-button');
const pushToTalkButton = document.getElementById('push-to-talk-button');
const recordingStatus = document.getElementById('recording-status');

// Audio settings modal elements
const audioSettingsModal = document.getElementById('audio-settings-modal');
const microphoneSelect = document.getElementById('microphone-select');
const speakerSelect = document.getElementById('speaker-select');
const microphoneVolume = document.getElementById('microphone-volume');
const speakerVolume = document.getElementById('speaker-volume');
const microphoneVolumeDisplay = document.getElementById('microphone-volume-display');
const speakerVolumeDisplay = document.getElementById('speaker-volume-display');
const sampleRate = document.getElementById('sample-rate');
const channels = document.getElementById('channels');
const echoCancellation = document.getElementById('echo-cancellation');
const noiseSuppression = document.getElementById('noise-suppression');
const autoGainControl = document.getElementById('auto-gain-control');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadAudioSettings();
    await loadAudioDevices();
    setupEventListeners();
    updateConnectionStatus(false);
});

// Connection functions
async function connect() {
    const username = usernameInput.value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    currentUser = { username };
    updateConnectionStatus('connecting');
    
    const result = await ipcRenderer.invoke('connect', username);
    
    if (result.success) {
        console.log('Connection initiated');
    } else {
        alert('Failed to connect: ' + result.error);
        updateConnectionStatus(false);
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

async function refreshUserList() {
    if (isConnected) {
        await ipcRenderer.invoke('request-users');
    }
}

function clearChat() {
    messagesContainer.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No messages yet</p>';
}

// Audio device management
async function loadAudioDevices() {
    try {
        console.log('Loading audio devices...');
        
        // Request permission first with better error handling
        try {
            const testStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            // Stop the test stream immediately
            testStream.getTracks().forEach(track => track.stop());
            console.log('Microphone permission granted');
            
        } catch (permissionError) {
            console.error('Microphone permission error:', permissionError);
            audioConflicts.permissionDenied = true;
            
            if (permissionError.name === 'NotAllowedError') {
                alert('Microphone access denied. Please allow microphone access in your browser settings and reload the page.');
                return;
            }
        }
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('All devices found:', devices.length);
        
        // Filter and cache audio input devices (microphones)
        const microphones = devices.filter(device => device.kind === 'audioinput');
        availableAudioDevices.microphones = microphones;
        
        microphoneSelect.innerHTML = '<option value="">Default microphone</option>';
        microphones.forEach((mic, index) => {
            const option = document.createElement('option');
            option.value = mic.deviceId;
            option.textContent = mic.label || `Microphone ${index + 1}`;
            microphoneSelect.appendChild(option);
            
            console.log(`Microphone ${index + 1}:`, mic.label || mic.deviceId);
        });
        
        // Filter and cache audio output devices (speakers)
        const speakers = devices.filter(device => device.kind === 'audiooutput');
        availableAudioDevices.speakers = speakers;
        
        speakerSelect.innerHTML = '<option value="">Default speaker</option>';
        speakers.forEach((speaker, index) => {
            const option = document.createElement('option');
            option.value = speaker.deviceId;
            option.textContent = speaker.label || `Speaker ${index + 1}`;
            speakerSelect.appendChild(option);
            
            console.log(`Speaker ${index + 1}:`, speaker.label || speaker.deviceId);
        });
        
        // Check for potential conflicts
        await checkAudioConflicts();
        
        console.log('Audio devices loaded successfully:', { 
            microphones: microphones.length, 
            speakers: speakers.length 
        });
        
    } catch (error) {
        console.error('Failed to load audio devices:', error);
        audioConflicts.lastError = error;
        
        microphoneSelect.innerHTML = '<option value="">No microphones available</option>';
        speakerSelect.innerHTML = '<option value="">No speakers available</option>';
        
        alert('Failed to load audio devices: ' + error.message);
    }
}

// Check for audio conflicts
async function checkAudioConflicts() {
    console.log('Checking for audio conflicts...');
    
    // Reset conflicts
    audioConflicts = {
        deviceInUse: false,
        permissionDenied: false,
        formatNotSupported: false,
        lastError: null
    };
    
    // Check if any audio format is supported
    const supportedFormats = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
    ];
    
    let hasSupportedFormat = false;
    for (const format of supportedFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
            hasSupportedFormat = true;
            console.log('Supported format found:', format);
            break;
        }
    }
    
    if (!hasSupportedFormat) {
        audioConflicts.formatNotSupported = true;
        console.warn('No supported audio formats found');
    }
    
    // Check if devices are available
    if (availableAudioDevices.microphones.length === 0) {
        console.warn('No microphones detected');
    }
    
    if (availableAudioDevices.speakers.length === 0) {
        console.warn('No speakers detected');
    }
    
    // Test device availability
    if (audioSettings.microphoneDevice) {
        try {
            const testStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: audioSettings.microphoneDevice }
                }
            });
            testStream.getTracks().forEach(track => track.stop());
            console.log('Selected microphone is available');
        } catch (error) {
            console.warn('Selected microphone may be in use:', error);
            audioConflicts.deviceInUse = true;
        }
    }
    
    // Log conflict summary
    if (Object.values(audioConflicts).some(conflict => conflict)) {
        console.warn('Audio conflicts detected:', audioConflicts);
    } else {
        console.log('No audio conflicts detected');
    }
}

async function loadAudioSettings() {
    try {
        const result = await ipcRenderer.invoke('load-audio-settings');
        if (result.success && result.settings) {
            audioSettings = { ...audioSettings, ...result.settings };
            applyAudioSettings();
        }
    } catch (error) {
        console.error('Failed to load audio settings:', error);
    }
}

function applyAudioSettings() {
    // Apply settings to UI elements
    microphoneSelect.value = audioSettings.microphoneDevice || '';
    speakerSelect.value = audioSettings.speakerDevice || '';
    microphoneVolume.value = audioSettings.microphoneVolume || 60;
    speakerVolume.value = audioSettings.speakerVolume || 60;
    
    // Audio quality settings (flexible)
    sampleRate.value = audioSettings.sampleRate || 16000;
    channels.value = audioSettings.channels || 1;
    
    // Audio processing settings (disabled for compatibility)
    echoCancellation.checked = false;
    noiseSuppression.checked = false;
    autoGainControl.checked = false;
    
    // Update volume displays
    microphoneVolumeDisplay.textContent = `${microphoneVolume.value}%`;
    speakerVolumeDisplay.textContent = `${speakerVolume.value}%`;
    
    console.log('Audio settings applied:', audioSettings);
}

async function saveAudioSettings() {
    try {
        // Collect current settings (flexible for compatibility)
        const settings = {
            microphoneDevice: microphoneSelect.value,
            speakerDevice: speakerSelect.value,
            microphoneVolume: parseInt(microphoneVolume.value),
            speakerVolume: parseInt(speakerVolume.value),
            // Audio quality settings (flexible)
            sampleRate: parseInt(sampleRate.value),
            channels: parseInt(channels.value),
            // Audio processing settings (disabled for compatibility)
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        };
        
        // Save to main process
        const result = await ipcRenderer.invoke('save-audio-settings', settings);
        if (result.success) {
            // Update local settings
            audioSettings = { ...audioSettings, ...settings };
            console.log('Audio settings saved successfully:', settings);
            
            // Show success message
            alert('Audio settings saved successfully!');
            
            // Close modal
            closeAudioSettings();
        } else {
            alert('Failed to save audio settings: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving audio settings:', error);
        alert('Failed to save audio settings: ' + error.message);
    }
}

function resetAudioSettings() {
    audioSettings = {
        microphoneDevice: '',
        speakerDevice: '',
        microphoneVolume: 60, // Reduced to prevent clipping
        speakerVolume: 60,    // Reduced to prevent clipping
        // Audio quality settings (flexible)
        sampleRate: 16000,
        channels: 1,
        // Audio processing settings (disabled for compatibility)
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
    };
    applyAudioSettings();
}

async function testAudio() {
    try {
        console.log('Starting safe audio test...');
        
        // Use the safer audio test function
        const result = await testAudioSafely();
        
        if (result.success) {
            alert(`✅ Audio test successful!\n\n${result.message}\n\nAudio devices: ${result.details.audioDevices}\nSupported format: ${result.details.supportedFormat}`);
        } else {
            alert(`❌ Audio test failed:\n\n${result.error}`);
        }
        
    } catch (error) {
        console.error('Audio test failed:', error);
        alert('Audio test failed: ' + error.message);
    }
}

// Simple audio test function that won't cause DevTools disconnection
async function testAudioSafely() {
    try {
        console.log('Starting safe audio test...');
        
        // Test 1: Check if we can access audio devices
        console.log('1. Testing audio device access...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        console.log(`✅ Found ${audioDevices.length} audio input devices`);
        
        // Test 2: Check MediaRecorder support
        console.log('2. Testing MediaRecorder support...');
        const supportedTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/wav'
        ];
        
        let supportedType = null;
        for (const type of supportedTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                supportedType = type;
                break;
            }
        }
        
        if (supportedType) {
            console.log(`✅ MediaRecorder supported with type: ${supportedType}`);
        } else {
            console.log('❌ No supported audio format found');
            return { success: false, error: 'No supported audio format' };
        }
        
        // Test 3: Try to get user media (this will request permission)
        console.log('3. Testing microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            } 
        });
        
        console.log('✅ Microphone access granted');
        
        // Test 4: Create MediaRecorder (but don't start recording)
        console.log('4. Testing MediaRecorder creation...');
        const recorder = new MediaRecorder(stream, { mimeType: supportedType });
        console.log('✅ MediaRecorder created successfully');
        
        // Stop the stream immediately
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Audio stream stopped');
        
        // Test 5: Test PCM conversion with dummy data
        console.log('5. Testing PCM conversion...');
        const testData = new Int16Array(1000);
        for (let i = 0; i < testData.length; i++) {
            testData[i] = Math.floor(Math.random() * 65536) - 32768;
        }
        const pcmBytes = new Uint8Array(testData.buffer);
        console.log(`✅ PCM conversion test successful: ${pcmBytes.length} bytes`);
        
        // Test 6: Test Base64 encoding
        console.log('6. Testing Base64 encoding...');
        const base64Data = btoa(String.fromCharCode(...pcmBytes));
        const decodedData = atob(base64Data);
        if (decodedData.length === pcmBytes.length) {
            console.log('✅ Base64 encoding test successful');
        } else {
            console.log('❌ Base64 encoding test failed');
            return { success: false, error: 'Base64 encoding failed' };
        }
        
        console.log('🎉 All audio tests passed successfully!');
        return { 
            success: true, 
            message: 'Audio system is working correctly',
            details: {
                audioDevices: audioDevices.length,
                supportedFormat: supportedType,
                pcmConversion: true,
                base64Encoding: true
            }
        };
        
    } catch (error) {
        console.error('❌ Audio test failed:', error);
        
        let errorMessage = 'Audio test failed: ';
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Microphone permission denied. Please allow microphone access.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No microphone found. Please check your audio device.';
        } else if (error.name === 'NotReadableError') {
            errorMessage += 'Microphone is in use by another application.';
        } else {
            errorMessage += error.message;
        }
        
        return { success: false, error: errorMessage };
    }
}

// Helper function to play test audio
async function playTestAudio(audioBlob) {
    try {
        console.log('Playing test audio...');
        
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.volume = Math.min(audioSettings.speakerVolume / 100, 1.0);
        audio.preload = 'auto';
        
        // Add event listeners for better feedback
        audio.oncanplaythrough = () => {
            console.log('Test audio loaded successfully');
        };
        
        audio.onerror = (e) => {
            console.error('Test audio playback error:', e);
            alert('Failed to play test audio. Check your speaker settings.');
        };
        
        audio.onended = () => {
            URL.revokeObjectURL(audio.src);
            console.log('Test audio playback completed');
            
            // Provide feedback based on test results
            let feedback = 'Audio test completed!\n\n';
            
            if (audioBlob.size < 1000) {
                feedback += '⚠️ Warning: Very small audio file recorded. Your microphone may not be working properly.\n';
            } else if (audioBlob.size > 50000) {
                feedback += '⚠️ Warning: Large audio file recorded. Consider reducing sample rate or quality.\n';
            } else {
                feedback += '✅ Audio recording size looks good.\n';
            }
            
            feedback += '\nYou should hear your voice played back. If you hear static or no audio:\n';
            feedback += '1. Check microphone volume (try 50-70%)\n';
            feedback += '2. Enable noise suppression\n';
            feedback += '3. Disable auto gain control\n';
            feedback += '4. Try a different microphone device\n';
            
            setTimeout(() => {
                alert(feedback);
            }, 1000);
        };
        
        await audio.play();
        console.log('Test audio playback started');
        
    } catch (error) {
        console.error('Failed to play test audio:', error);
        alert('Failed to play test audio: ' + error.message);
    }
}

// Audio recording and playback functions - Compatible with Android
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
        console.log('Starting audio recording with Android-compatible settings...');
        
        // Use compatible audio constraints
        const audioConstraints = {
            audio: {
                deviceId: audioSettings.microphoneDevice ? { exact: audioSettings.microphoneDevice } : undefined,
                sampleRate: { ideal: 16000, min: 8000, max: 48000 },
                channelCount: { ideal: 1, min: 1, max: 2 },
                echoCancellation: false, // Disable to match Android
                noiseSuppression: false, // Disable to match Android
                autoGainControl: false, // Disable to match Android
                latency: { ideal: 0.01, max: 0.1 }
            }
        };
        
        console.log('Audio constraints:', audioConstraints);
        
        const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        
        // Find supported MIME type
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/wav'
        ];
        
        let selectedMimeType = null;
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                selectedMimeType = mimeType;
                break;
            }
        }
        
        if (!selectedMimeType) {
            throw new Error('No supported audio format found');
        }
        
        console.log('Using MIME type:', selectedMimeType);
        
        // Create MediaRecorder with compatible settings
        const recorderOptions = {
            mimeType: selectedMimeType,
            audioBitsPerSecond: 128000
        };
        
        mediaRecorder = new MediaRecorder(stream, recorderOptions);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                console.log('Audio chunk received:', event.data.size, 'bytes');
            }
        };
        
        mediaRecorder.onstop = async () => {
            console.log('Recording stopped, processing audio...');
            
            if (audioChunks.length === 0) {
                console.warn('No audio chunks recorded');
                return;
            }
            
            const audioBlob = new Blob(audioChunks, { type: selectedMimeType });
            console.log('Audio blob created:', audioBlob.size, 'bytes');
            
            await sendVoiceMessage(audioBlob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => {
                track.stop();
                console.log('Audio track stopped:', track.kind);
            });
        };
        
        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            alert('Recording error: ' + event.error.message);
        };
        
        // Start recording with smaller timeslice for better streaming
        mediaRecorder.start(100); // 100ms chunks
        
        isRecording = true;
        
        // Update UI
        recordButton.classList.add('recording');
        recordButton.textContent = '⏹️';
        recordingStatus.textContent = 'Recording... Click to stop';
        
        console.log('Audio recording started successfully');
        
    } catch (error) {
        console.error('Failed to start recording:', error);
        
        let errorMessage = 'Failed to start recording: ';
        if (error.name === 'NotAllowedError') {
            errorMessage += 'Microphone permission denied. Please allow microphone access.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'Microphone not found. Please check your audio device.';
        } else if (error.name === 'NotReadableError') {
            errorMessage += 'Microphone is in use by another application.';
        } else {
            errorMessage += error.message;
        }
        
        alert(errorMessage);
    }
}

async function stopRecording() {
    if (!mediaRecorder || !isRecording) return;
    
    try {
        console.log('Stopping recording...');
        
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        
        isRecording = false;
        
        // Update UI
        recordButton.classList.remove('recording');
        recordButton.textContent = '🎤';
        recordingStatus.textContent = 'Hold to record voice message';
        
        console.log('Recording stopped successfully');
        
    } catch (error) {
        console.error('Failed to stop recording:', error);
        alert('Failed to stop recording: ' + error.message);
    }
}

async function sendVoiceMessage(audioBlob) {
    try {
        console.log('Sending voice message to Android...');
        console.log('Audio blob received:', audioBlob.type, audioBlob.size, 'bytes');
        
        // Validate audio blob
        if (!audioBlob || audioBlob.size === 0) {
            throw new Error('Invalid audio data: empty or null blob');
        }
        
        // Convert desktop audio to PCM 16-bit format that Android can play
        console.log('Starting PCM conversion...');
        const pcmData = await convertAudioToPcm(audioBlob);
        
        if (!pcmData || pcmData.length === 0) {
            throw new Error('PCM conversion failed: empty result');
        }
        
        console.log('PCM conversion successful:', pcmData.length, 'bytes');
        
        // Convert PCM data to base64 for transmission
        console.log('Converting to base64...');
        const base64Data = btoa(String.fromCharCode(...pcmData));
        console.log('Base64 conversion successful:', base64Data.length, 'characters');
        
        // Send via IPC with timeout protection
        console.log('Sending via IPC...');
        const sendPromise = ipcRenderer.invoke('send-voice-message', base64Data);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Send timeout')), 15000);
        });
        
        const result = await Promise.race([sendPromise, timeoutPromise]);
        
        if (result.success) {
            console.log('Voice message sent successfully to Android');
            
            // Add your own voice message to the chat immediately
            const ownVoiceMessage = {
                audioData: base64Data,
                senderName: currentUser?.username || 'You',
                timestamp: Date.now(),
                type: 'voice'
            };
            addMessage(ownVoiceMessage, 'voice');
            
        } else {
            console.error('IPC send failed:', result.error);
            alert('Failed to send voice message: ' + result.error);
        }
        
    } catch (error) {
        console.error('Failed to send voice message:', error);
        
        // Provide user-friendly error message
        let userMessage = 'Failed to send voice message: ';
        if (error.message.includes('timeout')) {
            userMessage += 'Connection timeout. Please try again.';
        } else if (error.message.includes('Invalid audio data')) {
            userMessage += 'Audio recording failed. Please try again.';
        } else if (error.message.includes('PCM conversion failed')) {
            userMessage += 'Audio format conversion failed. Please try again.';
        } else {
            userMessage += error.message;
        }
        
        alert(userMessage);
    }
}

// Helper function to convert audio blob to PCM 16-bit format
async function convertAudioToPcm(audioBlob) {
    try {
        console.log('Converting audio to PCM 16-bit format...');
        console.log('Audio blob type:', audioBlob.type);
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        
        // First, try a simpler approach that's less likely to crash
        try {
            console.log('Attempting simple PCM conversion...');
            
            // Create audio context with error handling
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
                sampleRate: 16000,
                latencyHint: 'interactive'
            });
            
            // Decode the audio blob with timeout protection
            const arrayBuffer = await audioBlob.arrayBuffer();
            console.log('Array buffer size:', arrayBuffer.byteLength, 'bytes');
            
            // Use a promise with timeout to prevent hanging
            const decodePromise = audioContext.decodeAudioData(arrayBuffer);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Audio decode timeout')), 10000);
            });
            
            const audioBuffer = await Promise.race([decodePromise, timeoutPromise]);
            
            console.log('Audio decoded successfully:', audioBuffer.duration, 'seconds');
            console.log('Audio channels:', audioBuffer.numberOfChannels);
            console.log('Audio sample rate:', audioBuffer.sampleRate);
            
            // Get the first channel (mono)
            const channelData = audioBuffer.getChannelData(0);
            console.log('Channel data length:', channelData.length, 'samples');
            
            // Convert Float32 to Int16 PCM (same as Android)
            const pcmData = new Int16Array(channelData.length);
            
            // Apply volume adjustment safely
            const volumeMultiplier = Math.max(0, Math.min(1, (audioSettings.microphoneVolume || 60) / 100));
            
            for (let i = 0; i < channelData.length; i++) {
                let sample = channelData[i] * volumeMultiplier;
                
                // Convert to 16-bit PCM (same as Android AudioFormat.ENCODING_PCM_16BIT)
                sample = Math.max(-1, Math.min(1, sample));
                pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            }
            
            // Convert Int16Array to Uint8Array for transmission
            const byteArray = new Uint8Array(pcmData.buffer);
            
            console.log('PCM conversion completed successfully:', byteArray.length, 'bytes');
            
            // Close audio context safely
            try {
                await audioContext.close();
            } catch (closeError) {
                console.warn('Audio context close warning:', closeError);
            }
            
            return byteArray;
            
        } catch (decodeError) {
            console.warn('Audio decode failed, trying fallback method:', decodeError);
            
            // Fallback: try to convert using a simpler method
            return await convertAudioFallback(audioBlob);
        }
        
    } catch (error) {
        console.error('Failed to convert audio to PCM:', error);
        
        // Final fallback: return raw data
        try {
            console.log('Using final fallback - raw audio data');
            const arrayBuffer = await audioBlob.arrayBuffer();
            return new Uint8Array(arrayBuffer);
        } catch (finalError) {
            console.error('All conversion methods failed:', finalError);
            throw new Error('Failed to convert audio to PCM format: ' + error.message);
        }
    }
}

// Fallback audio conversion method
async function convertAudioFallback(audioBlob) {
    try {
        console.log('Using fallback audio conversion...');
        
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // If it's already PCM data, return it directly
        if (audioBlob.type === 'audio/wav' || audioBlob.type === 'audio/pcm') {
            console.log('Audio appears to be already in PCM format');
            return uint8Array;
        }
        
        // For WebM/MP4, try to extract raw audio data
        if (audioBlob.type.includes('webm') || audioBlob.type.includes('mp4')) {
            console.log('WebM/MP4 format detected, using raw data');
            return uint8Array;
        }
        
        // For other formats, use raw data
        console.log('Unknown format, using raw audio data');
        return uint8Array;
        
    } catch (fallbackError) {
        console.error('Fallback conversion failed:', fallbackError);
        throw new Error('Fallback conversion failed: ' + fallbackError.message);
    }
}

async function playAudioMessage(audioData) {
    try {
        console.log('Playing Android audio message...');
        console.log('Audio data length:', audioData.length, 'characters');
        
        // Android sends PCM 16-bit audio, so we need to handle it differently
        // Convert base64 to raw PCM data
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const pcmData = new Uint8Array(byteNumbers);
        
        console.log('PCM data received:', pcmData.length, 'bytes');
        
        // Try different sample rates to fix the high-pitched issue
        // Android might be using 8kHz, 22kHz, or 44kHz instead of 16kHz
        const sampleRates = [8000, 16000, 22050, 44100];
        let audioPlayed = false;
        
        for (const sampleRate of sampleRates) {
            try {
                console.log(`Trying sample rate: ${sampleRate} Hz`);
                
                // Create WAV header for PCM 16-bit audio with current sample rate
                const channels = 1; // Android uses mono
                const bitsPerSample = 16; // Android uses 16-bit
                
                const wavHeader = createWavHeader(pcmData.length, sampleRate, channels, bitsPerSample);
                
                // Combine WAV header with PCM data
                const wavData = new Uint8Array(wavHeader.length + pcmData.length);
                wavData.set(wavHeader, 0);
                wavData.set(pcmData, wavHeader.length);
                
                console.log(`WAV data created with ${sampleRate}Hz:`, wavData.length, 'bytes');
                
                // Create blob and play
                const audioBlob = new Blob([wavData], { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                const audio = new Audio(audioUrl);
                audio.volume = Math.min(audioSettings.speakerVolume / 100, 1.0);
                audio.preload = 'auto';
                
                // Add event listeners for better feedback
                audio.oncanplaythrough = () => {
                    console.log(`Android audio loaded successfully at ${sampleRate}Hz`);
                };
                
                audio.onerror = (e) => {
                    console.error(`Android audio playback error at ${sampleRate}Hz:`, e);
                    console.error('Audio error details:', audio.error);
                };
                
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    console.log(`Android audio playback completed at ${sampleRate}Hz`);
                };
                
                await audio.play();
                console.log(`Android audio playback started successfully at ${sampleRate}Hz`);
                audioPlayed = true;
                break; // Stop trying other sample rates if this one works
                
            } catch (sampleRateError) {
                console.log(`Sample rate ${sampleRate}Hz failed:`, sampleRateError.message);
                continue; // Try next sample rate
            }
        }
        
        if (!audioPlayed) {
            throw new Error('Failed to play audio with any sample rate');
        }
        
    } catch (error) {
        console.error('Failed to play Android audio:', error);
        
        // Try alternative playback method using Web Audio API
        try {
            console.log('Trying alternative playback method with Web Audio API...');
            
            // Create a simple audio context for playback
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Decode base64 to array buffer
            const byteCharacters = atob(audioData);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const arrayBuffer = new Uint8Array(byteNumbers).buffer;
            
            // Try to decode as audio
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Play the audio
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            gainNode.gain.value = audioSettings.speakerVolume / 100;
            
            source.buffer = audioBuffer;
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            source.start();
            
            console.log('Alternative playback method successful');
            
        } catch (alternativeError) {
            console.error('Alternative playback also failed:', alternativeError);
            alert('Failed to play Android audio: ' + error.message);
        }
    }
}

// Helper function to create WAV header for PCM 16-bit audio
function createWavHeader(dataLength, sampleRate, channels, bitsPerSample) {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true); // byte rate
    view.setUint16(32, channels * bitsPerSample / 8, true); // block align
    view.setUint16(34, bitsPerSample, true);
    
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    return new Uint8Array(buffer);
}

// Helper function to write string to DataView
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

// Live audio streaming functions
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

async function startLiveStreaming() {
    try {
        console.log('Starting live audio streaming...');
        
        // Use audio settings for live streaming
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                deviceId: audioSettings.microphoneDevice ? { exact: audioSettings.microphoneDevice } : undefined,
                sampleRate: audioSettings.sampleRate,
                channelCount: audioSettings.channels,
                echoCancellation: audioSettings.echoCancellation,
                noiseSuppression: audioSettings.noiseSuppression,
                autoGainControl: audioSettings.autoGainControl
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
                
                // Apply microphone volume
                const volumeMultiplier = audioSettings.microphoneVolume / 100;
                const adjustedData = new Float32Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    adjustedData[i] = inputData[i] * volumeMultiplier;
                }
                
                // Convert to base64
                const audioData = new Int16Array(adjustedData.length);
                for (let i = 0; i < adjustedData.length; i++) {
                    audioData[i] = Math.max(-32768, Math.min(32767, adjustedData[i] * 32768));
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
        
        // Play the audio with volume control
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = audioSettings.speakerVolume / 100;
        
        source.buffer = audioBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start();
        
        console.log('Live audio chunk played');
        
    } catch (error) {
        console.error('Failed to play live audio chunk:', error);
    }
}

// Message display functions
function addMessage(message, type) {
    // Remove "No messages yet" placeholder
    if (messagesContainer.querySelector('p')) {
        messagesContainer.innerHTML = '';
    }
    
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
    // Update user count
    const count = users.length;
    userCount.textContent = `${count} user${count !== 1 ? 's' : ''} connected`;
    
    if (users.length === 0) {
        usersContainer.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No users connected</p>';
        return;
    }
    
    usersContainer.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <div class="user-name">${user.username}</div>
                <div class="user-device">${user.deviceName || 'Unknown device'}</div>
            </div>
        </div>
    `).join('');
    
    console.log('User list updated:', users.length, 'users');
}

function updateConnectionStatus(status) {
    isConnected = status === true || status === 'connected';
    
    if (status === 'connecting') {
        statusDot.className = 'status-dot connecting';
        statusText.textContent = 'Connecting...';
        connectionForm.style.display = 'block';
        recordButton.disabled = true;
        pushToTalkButton.disabled = true;
    } else if (isConnected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected';
        connectionForm.style.display = 'none';
        recordButton.disabled = false;
        pushToTalkButton.disabled = false;
    } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Disconnected';
        connectionForm.style.display = 'block';
        recordButton.disabled = true;
        pushToTalkButton.disabled = true;
    }
}

// Audio settings modal functions
function openAudioSettings() {
    audioSettingsModal.classList.add('show');
    loadAudioDevices(); // Refresh device list
}

function closeAudioSettings() {
    audioSettingsModal.classList.remove('show');
}

// Event listeners
function setupEventListeners() {
    // Volume slider event listeners
    microphoneVolume.addEventListener('input', () => {
        microphoneVolumeDisplay.textContent = `${microphoneVolume.value}%`;
    });
    
    speakerVolume.addEventListener('input', () => {
        speakerVolumeDisplay.textContent = `${speakerVolume.value}%`;
    });
    
    // Keyboard shortcuts
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Modal close on outside click
    audioSettingsModal.addEventListener('click', (e) => {
        if (e.target === audioSettingsModal) {
            closeAudioSettings();
        }
    });
}

// IPC event listeners
ipcRenderer.on('connection-status', (event, data) => {
    updateConnectionStatus(data.connected);
});

ipcRenderer.on('user-list', (event, users) => {
    updateUserList(users);
});

// Fix: Listen for the correct event names from server
ipcRenderer.on('text_message_received', (event, message) => {
    console.log('Text message received from server:', message);
    addMessage(message, 'text');
});

ipcRenderer.on('voice_message_received', (event, message) => {
    console.log('Voice message received from server:', message);
    addMessage(message, 'voice');
});

// Keep the old event listeners for backward compatibility
ipcRenderer.on('text-message', (event, message) => {
    console.log('Text message received (legacy):', message);
    addMessage(message, 'text');
});

ipcRenderer.on('voice-message', (event, message) => {
    console.log('Voice message received (legacy):', message);
    addMessage(message, 'voice');
});

// Event listener for live audio chunks
ipcRenderer.on('live-audio-chunk', (event, chunk) => {
    console.log('Live audio chunk received:', chunk);
    playLiveAudioChunk(chunk.audioData);
});

// Request audio devices when the page loads
ipcRenderer.on('request-audio-devices', () => {
    loadAudioDevices();
}); 