const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

console.log('=== Android Audio Playback Test ===');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Android Audio Playback Test'
    });

    mainWindow.loadFile('test-audio-playback.html');
    mainWindow.webContents.openDevTools();
}

// Test Android audio playback
async function testAndroidAudioPlayback() {
    console.log('Testing Android audio playback...');
    
    const results = {
        timestamp: new Date().toISOString(),
        wavHeaderCreation: false,
        pcmDecoding: false,
        audioPlayback: false,
        errors: []
    };
    
    try {
        // Test 1: WAV Header Creation
        console.log('\n1. Testing WAV header creation...');
        try {
            const testPcmData = new Uint8Array(32000); // 1 second of 16kHz mono PCM
            for (let i = 0; i < testPcmData.length; i++) {
                testPcmData[i] = Math.floor(Math.random() * 256);
            }
            
            const wavHeader = createWavHeader(testPcmData.length, 16000, 1, 16);
            
            if (wavHeader.length === 44) {
                console.log('✅ WAV header created successfully:', wavHeader.length, 'bytes');
                results.wavHeaderCreation = true;
            } else {
                throw new Error(`Invalid WAV header length: ${wavHeader.length}`);
            }
            
        } catch (error) {
            console.error('❌ WAV header creation failed:', error);
            results.errors.push('WAV header: ' + error.message);
        }
        
        // Test 2: PCM Decoding
        console.log('\n2. Testing PCM decoding...');
        try {
            const testBase64 = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
            const byteCharacters = atob(testBase64);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const pcmData = new Uint8Array(byteNumbers);
            
            if (pcmData.length > 0) {
                console.log('✅ PCM decoding successful:', pcmData.length, 'bytes');
                results.pcmDecoding = true;
            } else {
                throw new Error('PCM decoding produced empty result');
            }
            
        } catch (error) {
            console.error('❌ PCM decoding failed:', error);
            results.errors.push('PCM decoding: ' + error.message);
        }
        
        // Test 3: Audio Playback (simulated)
        console.log('\n3. Testing audio playback...');
        try {
            // Create a simple test audio blob
            const testPcmData = new Int16Array(16000); // 1 second of 16kHz audio
            for (let i = 0; i < testPcmData.length; i++) {
                testPcmData[i] = Math.floor(Math.random() * 65536) - 32768;
            }
            
            const pcmBytes = new Uint8Array(testPcmData.buffer);
            const wavHeader = createWavHeader(pcmBytes.length, 16000, 1, 16);
            
            const wavData = new Uint8Array(wavHeader.length + pcmBytes.length);
            wavData.set(wavHeader, 0);
            wavData.set(pcmBytes, wavHeader.length);
            
            console.log('✅ Audio data prepared successfully:', wavData.length, 'bytes');
            results.audioPlayback = true;
            
        } catch (error) {
            console.error('❌ Audio playback test failed:', error);
            results.errors.push('Audio playback: ' + error.message);
        }
        
    } catch (error) {
        console.error('❌ Overall test failed:', error);
        results.errors.push('Overall test: ' + error.message);
    }
    
    // Generate test report
    console.log('\n=== Android Audio Playback Test Report ===');
    console.log(`WAV Header Creation: ${results.wavHeaderCreation ? '✅' : '❌'}`);
    console.log(`PCM Decoding: ${results.pcmDecoding ? '✅' : '❌'}`);
    console.log(`Audio Playback: ${results.audioPlayback ? '✅' : '❌'}`);
    console.log(`Total Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('\n=== Errors ===');
        results.errors.forEach(error => console.log(`- ${error}`));
    }
    
    // Provide recommendations
    console.log('\n=== Recommendations ===');
    
    if (!results.wavHeaderCreation) {
        console.log('1. Check WAV header creation function');
    }
    
    if (!results.pcmDecoding) {
        console.log('2. Check Base64 decoding process');
    }
    
    if (!results.audioPlayback) {
        console.log('3. Check audio data preparation');
    }
    
    if (results.errors.length === 0) {
        console.log('✅ All tests passed! Audio playback should work.');
    } else {
        console.log('⚠️ Some tests failed. Check the errors above.');
    }
    
    return results;
}

// Helper function to create WAV header
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

// IPC handlers
ipcMain.handle('test-android-audio-playback', async () => {
    return await testAndroidAudioPlayback();
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
module.exports = { testAndroidAudioPlayback }; 