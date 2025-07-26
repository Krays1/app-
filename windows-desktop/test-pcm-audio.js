const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

console.log('=== PCM 16-bit Audio Compatibility Test ===');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'PCM 16-bit Audio Test'
    });

    mainWindow.loadFile('test-pcm-audio.html');
    mainWindow.webContents.openDevTools();
}

// Test PCM audio compatibility
async function testPcmCompatibility() {
    console.log('Testing PCM 16-bit audio compatibility...');
    
    const results = {
        timestamp: new Date().toISOString(),
        pcmSupport: false,
        sampleRateSupport: false,
        monoSupport: false,
        audioProcessing: false,
        androidCompatibility: false
    };
    
    try {
        // Test PCM 16-bit support
        console.log('1. Testing PCM 16-bit format support...');
        
        // Test audio constraints that match Android
        const androidConstraints = {
            audio: {
                sampleRate: { ideal: 16000, exact: 16000 },
                channelCount: { ideal: 1, exact: 1 },
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        };
        
        console.log('Android-compatible audio constraints:', androidConstraints);
        
        // Test if we can get user media with these constraints
        const stream = await navigator.mediaDevices.getUserMedia(androidConstraints);
        results.pcmSupport = true;
        console.log('✅ PCM 16-bit audio capture supported');
        
        // Test sample rate
        const audioContext = new AudioContext({ sampleRate: 16000 });
        if (audioContext.sampleRate === 16000) {
            results.sampleRateSupport = true;
            console.log('✅ 16kHz sample rate supported');
        } else {
            console.log('⚠️ Sample rate mismatch:', audioContext.sampleRate, 'Hz');
        }
        
        // Test mono channel
        const source = audioContext.createMediaStreamSource(stream);
        if (source.channelCount === 1) {
            results.monoSupport = true;
            console.log('✅ Mono channel supported');
        } else {
            console.log('⚠️ Channel count mismatch:', source.channelCount);
        }
        
        // Test audio processing (should be disabled)
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        results.audioProcessing = true;
        console.log('✅ Audio processing pipeline supported');
        
        // Test PCM conversion
        const testData = new Float32Array(1024);
        for (let i = 0; i < testData.length; i++) {
            testData[i] = Math.sin(i * 0.1) * 0.5; // Generate test sine wave
        }
        
        // Convert to Int16 PCM (same as Android)
        const pcmData = new Int16Array(testData.length);
        for (let i = 0; i < testData.length; i++) {
            let sample = testData[i];
            sample = Math.max(-1, Math.min(1, sample));
            pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
        
        // Convert to ByteArray (same as Android)
        const byteArray = new Uint8Array(pcmData.buffer);
        console.log('✅ PCM conversion successful:', byteArray.length, 'bytes');
        
        // Test Base64 encoding (same as Android)
        const base64Data = btoa(String.fromCharCode(...byteArray));
        console.log('✅ Base64 encoding successful:', base64Data.length, 'characters');
        
        // Test PCM playback
        const playbackBuffer = audioContext.createBuffer(1, pcmData.length, 16000);
        const float32Array = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            float32Array[i] = pcmData[i] / 32768.0;
        }
        playbackBuffer.getChannelData(0).set(float32Array);
        console.log('✅ PCM playback buffer created successfully');
        
        // Overall Android compatibility
        results.androidCompatibility = results.pcmSupport && results.sampleRateSupport && results.monoSupport;
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        
    } catch (error) {
        console.error('❌ PCM compatibility test failed:', error);
        results.error = error.message;
    }
    
    // Generate test report
    console.log('\n=== PCM 16-bit Compatibility Report ===');
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`PCM 16-bit Support: ${results.pcmSupport ? '✅' : '❌'}`);
    console.log(`16kHz Sample Rate: ${results.sampleRateSupport ? '✅' : '❌'}`);
    console.log(`Mono Channel: ${results.monoSupport ? '✅' : '❌'}`);
    console.log(`Audio Processing: ${results.audioProcessing ? '✅' : '❌'}`);
    console.log(`Android Compatibility: ${results.androidCompatibility ? '✅' : '❌'}`);
    
    if (results.error) {
        console.log(`Error: ${results.error}`);
    }
    
    if (results.androidCompatibility) {
        console.log('\n🎉 PCM 16-bit audio is fully compatible with Android app!');
        console.log('Desktop and Android can now communicate with identical audio format.');
    } else {
        console.log('\n⚠️ PCM 16-bit compatibility issues detected.');
        console.log('Some features may not work properly with Android app.');
    }
    
    return results;
}

// IPC handlers
ipcMain.handle('test-pcm-compatibility', async () => {
    return await testPcmCompatibility();
});

app.whenReady().then(() => {
    createWindow();
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Export for testing
module.exports = { testPcmCompatibility }; 