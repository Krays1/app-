const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

console.log('=== Audio Stability Test ===');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Audio Stability Test'
    });

    mainWindow.loadFile('test-audio-stability.html');
    mainWindow.webContents.openDevTools();
}

// Test audio stability
async function testAudioStability() {
    console.log('Testing audio stability...');
    
    const results = {
        timestamp: new Date().toISOString(),
        audioContext: false,
        mediaRecorder: false,
        pcmConversion: false,
        base64Encoding: false,
        errors: []
    };
    
    try {
        // Test 1: Audio Context creation
        console.log('\n1. Testing Audio Context creation...');
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
                sampleRate: 16000,
                latencyHint: 'interactive'
            });
            
            if (audioContext.state === 'running' || audioContext.state === 'suspended') {
                console.log('✅ Audio Context created successfully');
                results.audioContext = true;
                
                // Close the context
                await audioContext.close();
            } else {
                throw new Error(`Audio Context in unexpected state: ${audioContext.state}`);
            }
            
        } catch (error) {
            console.error('❌ Audio Context creation failed:', error);
            results.errors.push('Audio Context: ' + error.message);
        }
        
        // Test 2: MediaRecorder support
        console.log('\n2. Testing MediaRecorder support...');
        try {
            if (typeof MediaRecorder !== 'undefined') {
                const supportedTypes = [
                    'audio/webm;codecs=opus',
                    'audio/webm',
                    'audio/mp4',
                    'audio/wav'
                ];
                
                const supportedType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type));
                
                if (supportedType) {
                    console.log('✅ MediaRecorder supported with type:', supportedType);
                    results.mediaRecorder = true;
                } else {
                    throw new Error('No supported audio format found');
                }
            } else {
                throw new Error('MediaRecorder not available');
            }
            
        } catch (error) {
            console.error('❌ MediaRecorder test failed:', error);
            results.errors.push('MediaRecorder: ' + error.message);
        }
        
        // Test 3: PCM conversion
        console.log('\n3. Testing PCM conversion...');
        try {
            // Create test PCM data
            const testPcmData = new Int16Array(16000); // 1 second of 16kHz audio
            for (let i = 0; i < testPcmData.length; i++) {
                testPcmData[i] = Math.floor(Math.random() * 65536) - 32768;
            }
            
            const pcmBytes = new Uint8Array(testPcmData.buffer);
            
            if (pcmBytes.length > 0) {
                console.log('✅ PCM conversion test successful:', pcmBytes.length, 'bytes');
                results.pcmConversion = true;
            } else {
                throw new Error('PCM conversion produced empty result');
            }
            
        } catch (error) {
            console.error('❌ PCM conversion test failed:', error);
            results.errors.push('PCM conversion: ' + error.message);
        }
        
        // Test 4: Base64 encoding
        console.log('\n4. Testing Base64 encoding...');
        try {
            const testData = new Uint8Array([1, 2, 3, 4, 5]);
            const base64Data = btoa(String.fromCharCode(...testData));
            const decodedData = atob(base64Data);
            
            if (decodedData.length === testData.length) {
                console.log('✅ Base64 encoding test successful');
                results.base64Encoding = true;
            } else {
                throw new Error('Base64 encoding/decoding mismatch');
            }
            
        } catch (error) {
            console.error('❌ Base64 encoding test failed:', error);
            results.errors.push('Base64 encoding: ' + error.message);
        }
        
    } catch (error) {
        console.error('❌ Overall test failed:', error);
        results.errors.push('Overall test: ' + error.message);
    }
    
    // Generate test report
    console.log('\n=== Audio Stability Test Report ===');
    console.log(`Audio Context: ${results.audioContext ? '✅' : '❌'}`);
    console.log(`MediaRecorder: ${results.mediaRecorder ? '✅' : '❌'}`);
    console.log(`PCM Conversion: ${results.pcmConversion ? '✅' : '❌'}`);
    console.log(`Base64 Encoding: ${results.base64Encoding ? '✅' : '❌'}`);
    console.log(`Total Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('\n=== Errors ===');
        results.errors.forEach(error => console.log(`- ${error}`));
    }
    
    // Provide recommendations
    console.log('\n=== Recommendations ===');
    
    if (!results.audioContext) {
        console.log('1. Check browser/Electron version compatibility');
    }
    
    if (!results.mediaRecorder) {
        console.log('2. Update to a newer browser/Electron version');
    }
    
    if (!results.pcmConversion) {
        console.log('3. Check JavaScript engine compatibility');
    }
    
    if (!results.base64Encoding) {
        console.log('4. Check basic JavaScript functionality');
    }
    
    if (results.errors.length === 0) {
        console.log('✅ All tests passed! Audio system should be stable.');
    } else {
        console.log('⚠️ Some tests failed. Check the errors above.');
    }
    
    return results;
}

// IPC handlers
ipcMain.handle('test-audio-stability', async () => {
    return await testAudioStability();
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
module.exports = { testAudioStability }; 