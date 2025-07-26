const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

console.log('=== Audio Fix Test ===');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Audio Fix Test'
    });

    mainWindow.loadFile('test-audio-fix.html');
    mainWindow.webContents.openDevTools();
}

// Test audio functionality
async function testAudioFunctionality() {
    console.log('Testing audio functionality...');
    
    const results = {
        timestamp: new Date().toISOString(),
        audioDevices: [],
        supportedFormats: [],
        recordingTest: false,
        playbackTest: false,
        errors: []
    };
    
    try {
        // Test audio device enumeration
        console.log('Testing audio device enumeration...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => 
            device.kind === 'audioinput' || device.kind === 'audiooutput'
        );
        
        results.audioDevices = audioDevices.map(device => ({
            kind: device.kind,
            deviceId: device.deviceId,
            label: device.label || 'Unknown device',
            groupId: device.groupId
        }));
        
        console.log(`Found ${audioDevices.length} audio devices`);
        
        // Test supported audio formats
        console.log('Testing supported audio formats...');
        const formats = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/wav'
        ];
        
        formats.forEach(format => {
            if (MediaRecorder.isTypeSupported(format)) {
                results.supportedFormats.push(format);
                console.log(`✅ Supported: ${format}`);
            } else {
                console.log(`❌ Not supported: ${format}`);
            }
        });
        
        // Test audio recording
        console.log('Testing audio recording...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: { ideal: 16000 },
                channelCount: { ideal: 1 },
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        
        const selectedFormat = results.supportedFormats[0] || 'audio/webm';
        const recorder = new MediaRecorder(stream, {
            mimeType: selectedFormat,
            audioBitsPerSecond: 128000
        });
        
        const chunks = [];
        recorder.ondataavailable = (event) => chunks.push(event.data);
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: selectedFormat });
            console.log(`✅ Recording test successful: ${blob.size} bytes`);
            results.recordingTest = true;
        };
        
        recorder.start(100);
        setTimeout(() => {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }, 1000);
        
        stream.getTracks().forEach(track => track.stop());
        
        // Test audio playback
        console.log('Testing audio playback...');
        const testAudio = new Audio();
        testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        testAudio.volume = 0.1;
        
        testAudio.oncanplaythrough = () => {
            console.log('✅ Audio playback test successful');
            results.playbackTest = true;
        };
        
        testAudio.onerror = (e) => {
            console.log('❌ Audio playback test failed');
            results.errors.push('Audio playback failed');
        };
        
        await testAudio.play();
        
    } catch (error) {
        console.error('❌ Audio test failed:', error);
        results.errors.push(error.message);
    }
    
    // Generate test report
    console.log('\n=== Audio Fix Test Report ===');
    console.log(`Audio Devices: ${results.audioDevices.length}`);
    console.log(`Supported Formats: ${results.supportedFormats.length}`);
    console.log(`Recording Test: ${results.recordingTest ? '✅' : '❌'}`);
    console.log(`Playback Test: ${results.playbackTest ? '✅' : '❌'}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('\n=== Errors ===');
        results.errors.forEach(error => console.log(`- ${error}`));
    }
    
    if (results.supportedFormats.length > 0) {
        console.log('\n=== Recommended Settings ===');
        console.log(`Use format: ${results.supportedFormats[0]}`);
        console.log('Sample rate: 16,000 Hz');
        console.log('Channels: Mono (1)');
        console.log('Bitrate: 128,000 bps');
        console.log('Echo cancellation: Disabled');
        console.log('Noise suppression: Disabled');
        console.log('Auto gain control: Disabled');
    }
    
    return results;
}

// IPC handlers
ipcMain.handle('test-audio', async () => {
    return await testAudioFunctionality();
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
module.exports = { testAudioFunctionality }; 