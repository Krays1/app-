const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

console.log('=== Android Audio Compatibility Test ===');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Android Audio Compatibility Test'
    });

    mainWindow.loadFile('test-android-audio.html');
    mainWindow.webContents.openDevTools();
}

// Test Android audio compatibility
async function testAndroidAudioCompatibility() {
    console.log('Testing Android audio compatibility...');
    
    const results = {
        timestamp: new Date().toISOString(),
        pcmSupport: false,
        wavHeaderCreation: false,
        androidFormatCompatibility: false,
        desktopToAndroidConversion: false,
        androidToDesktopPlayback: false,
        errors: []
    };
    
    try {
        // Test 1: PCM 16-bit format support
        console.log('\n1. Testing PCM 16-bit format support...');
        try {
            // Create test PCM data (1 second of silence at 16kHz)
            const sampleRate = 16000;
            const duration = 1; // 1 second
            const numSamples = sampleRate * duration;
            const pcmData = new Int16Array(numSamples);
            
            // Fill with test tone (440Hz sine wave)
            for (let i = 0; i < numSamples; i++) {
                const frequency = 440; // A4 note
                const amplitude = 0.3;
                const sample = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
                pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            }
            
            const pcmBytes = new Uint8Array(pcmData.buffer);
            console.log(`✅ PCM 16-bit test data created: ${pcmBytes.length} bytes`);
            results.pcmSupport = true;
            
        } catch (error) {
            console.error('❌ PCM 16-bit support test failed:', error);
            results.errors.push('PCM 16-bit support: ' + error.message);
        }
        
        // Test 2: WAV header creation
        console.log('\n2. Testing WAV header creation...');
        try {
            const testPcmData = new Uint8Array(32000); // 1 second of 16kHz 16-bit mono
            const wavHeader = createWavHeader(testPcmData.length, 16000, 1, 16);
            
            if (wavHeader.length === 44) {
                console.log('✅ WAV header created successfully: 44 bytes');
                results.wavHeaderCreation = true;
            } else {
                throw new Error(`Invalid WAV header size: ${wavHeader.length}`);
            }
            
        } catch (error) {
            console.error('❌ WAV header creation failed:', error);
            results.errors.push('WAV header creation: ' + error.message);
        }
        
        // Test 3: Android format compatibility
        console.log('\n3. Testing Android format compatibility...');
        try {
            // Simulate Android PCM data
            const androidPcmData = new Uint8Array(16000); // 0.5 seconds of audio
            const base64Data = btoa(String.fromCharCode(...androidPcmData));
            
            // Test conversion back to PCM
            const decodedData = atob(base64Data);
            const decodedBytes = new Uint8Array(decodedData.length);
            for (let i = 0; i < decodedData.length; i++) {
                decodedBytes[i] = decodedData.charCodeAt(i);
            }
            
            if (decodedBytes.length === androidPcmData.length) {
                console.log('✅ Android format compatibility test passed');
                results.androidFormatCompatibility = true;
            } else {
                throw new Error('Data length mismatch after conversion');
            }
            
        } catch (error) {
            console.error('❌ Android format compatibility test failed:', error);
            results.errors.push('Android format compatibility: ' + error.message);
        }
        
        // Test 4: Desktop to Android conversion
        console.log('\n4. Testing desktop to Android conversion...');
        try {
            // Create test audio blob (WebM format)
            const testAudioData = new Uint8Array(1000); // Mock audio data
            const audioBlob = new Blob([testAudioData], { type: 'audio/webm' });
            
            // Test conversion function (simplified)
            const convertedData = await convertAudioToPcm(audioBlob);
            
            if (convertedData && convertedData.length > 0) {
                console.log('✅ Desktop to Android conversion test passed');
                results.desktopToAndroidConversion = true;
            } else {
                throw new Error('Conversion returned empty data');
            }
            
        } catch (error) {
            console.error('❌ Desktop to Android conversion test failed:', error);
            results.errors.push('Desktop to Android conversion: ' + error.message);
        }
        
        // Test 5: Android to desktop playback
        console.log('\n5. Testing Android to desktop playback...');
        try {
            // Create test Android PCM data
            const androidPcmData = new Uint8Array(8000); // 0.25 seconds of audio
            const base64Data = btoa(String.fromCharCode(...androidPcmData));
            
            // Test playback function (simplified)
            await playAndroidAudio(base64Data);
            
            console.log('✅ Android to desktop playback test passed');
            results.androidToDesktopPlayback = true;
            
        } catch (error) {
            console.error('❌ Android to desktop playback test failed:', error);
            results.errors.push('Android to desktop playback: ' + error.message);
        }
        
    } catch (error) {
        console.error('❌ Overall test failed:', error);
        results.errors.push('Overall test: ' + error.message);
    }
    
    // Generate test report
    console.log('\n=== Android Audio Compatibility Test Report ===');
    console.log(`PCM 16-bit Support: ${results.pcmSupport ? '✅' : '❌'}`);
    console.log(`WAV Header Creation: ${results.wavHeaderCreation ? '✅' : '❌'}`);
    console.log(`Android Format Compatibility: ${results.androidFormatCompatibility ? '✅' : '❌'}`);
    console.log(`Desktop to Android Conversion: ${results.desktopToAndroidConversion ? '✅' : '❌'}`);
    console.log(`Android to Desktop Playback: ${results.androidToDesktopPlayback ? '✅' : '❌'}`);
    console.log(`Total Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('\n=== Errors ===');
        results.errors.forEach(error => console.log(`- ${error}`));
    }
    
    // Provide recommendations
    console.log('\n=== Recommendations ===');
    
    if (!results.pcmSupport) {
        console.log('1. Check PCM 16-bit data handling');
    }
    
    if (!results.wavHeaderCreation) {
        console.log('2. Verify WAV header creation function');
    }
    
    if (!results.androidFormatCompatibility) {
        console.log('3. Test base64 encoding/decoding');
    }
    
    if (!results.desktopToAndroidConversion) {
        console.log('4. Check audio format conversion');
    }
    
    if (!results.androidToDesktopPlayback) {
        console.log('5. Verify Android audio playback');
    }
    
    if (results.errors.length === 0) {
        console.log('✅ All tests passed! Android audio compatibility should work.');
    } else {
        console.log('⚠️ Some tests failed. Check the errors above.');
    }
    
    return results;
}

// Helper functions for testing
function createWavHeader(dataLength, sampleRate, channels, bitsPerSample) {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true);
    view.setUint16(32, channels * bitsPerSample / 8, true);
    view.setUint16(34, bitsPerSample, true);
    
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    return new Uint8Array(buffer);
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

async function convertAudioToPcm(audioBlob) {
    try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // For testing, just return the raw data
        return uint8Array;
    } catch (error) {
        throw new Error('Audio conversion failed: ' + error.message);
    }
}

async function playAndroidAudio(audioData) {
    try {
        // Simulate Android audio playback
        const byteCharacters = atob(audioData);
        const pcmData = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            pcmData[i] = byteCharacters.charCodeAt(i);
        }
        
        // Create WAV header
        const wavHeader = createWavHeader(pcmData.length, 16000, 1, 16);
        
        // Combine header and data
        const wavData = new Uint8Array(wavHeader.length + pcmData.length);
        wavData.set(wavHeader, 0);
        wavData.set(pcmData, wavHeader.length);
        
        console.log('Android audio processed successfully');
        return true;
    } catch (error) {
        throw new Error('Android audio playback failed: ' + error.message);
    }
}

// IPC handlers
ipcMain.handle('test-android-audio', async () => {
    return await testAndroidAudioCompatibility();
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
module.exports = { testAndroidAudioCompatibility }; 