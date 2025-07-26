const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

console.log('=== Zell0 Audio Diagnostic Tool ===');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: 'Zell0 Audio Diagnostic'
    });

    mainWindow.loadFile('audio-diagnostic.html');
    mainWindow.webContents.openDevTools();
}

// Audio diagnostic functions
async function runAudioDiagnostic() {
    console.log('Running comprehensive audio diagnostic...');
    
    const results = {
        timestamp: new Date().toISOString(),
        system: {
            platform: process.platform,
            arch: process.arch,
            electronVersion: process.versions.electron,
            chromeVersion: process.versions.chrome
        },
        audio: {
            devices: [],
            permissions: false,
            formats: [],
            conflicts: []
        }
    };
    
    try {
        // Test audio permissions
        console.log('Testing audio permissions...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        results.audio.permissions = true;
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Audio permissions granted');
    } catch (error) {
        console.error('❌ Audio permission error:', error);
        results.audio.conflicts.push({
            type: 'permission',
            error: error.message,
            name: error.name
        });
    }
    
    try {
        // Enumerate audio devices
        console.log('Enumerating audio devices...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => 
            device.kind === 'audioinput' || device.kind === 'audiooutput'
        );
        
        results.audio.devices = audioDevices.map(device => ({
            kind: device.kind,
            deviceId: device.deviceId,
            label: device.label || 'Unknown device',
            groupId: device.groupId
        }));
        
        console.log(`✅ Found ${audioDevices.length} audio devices`);
    } catch (error) {
        console.error('❌ Device enumeration error:', error);
        results.audio.conflicts.push({
            type: 'enumeration',
            error: error.message
        });
    }
    
    // Test supported audio formats
    console.log('Testing supported audio formats...');
    const formats = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav',
        'audio/ogg;codecs=opus',
        'audio/ogg'
    ];
    
    formats.forEach(format => {
        if (MediaRecorder.isTypeSupported(format)) {
            results.audio.formats.push(format);
            console.log(`✅ Supported: ${format}`);
        } else {
            console.log(`❌ Not supported: ${format}`);
        }
    });
    
    // Test audio recording
    try {
        console.log('Testing audio recording...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        
        const recorder = new MediaRecorder(stream, {
            mimeType: results.audio.formats[0] || 'audio/webm'
        });
        
        const chunks = [];
        recorder.ondataavailable = (event) => chunks.push(event.data);
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            console.log(`✅ Recording test successful: ${blob.size} bytes`);
            results.audio.recordingTest = {
                success: true,
                size: blob.size,
                format: recorder.mimeType
            };
        };
        
        recorder.start();
        setTimeout(() => {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }, 1000);
        
        stream.getTracks().forEach(track => track.stop());
        
    } catch (error) {
        console.error('❌ Recording test failed:', error);
        results.audio.conflicts.push({
            type: 'recording',
            error: error.message
        });
    }
    
    // Generate diagnostic report
    console.log('\n=== Audio Diagnostic Report ===');
    console.log(`System: ${results.system.platform} ${results.system.arch}`);
    console.log(`Electron: ${results.system.electronVersion}`);
    console.log(`Chrome: ${results.system.chromeVersion}`);
    console.log(`Audio Permissions: ${results.audio.permissions ? '✅' : '❌'}`);
    console.log(`Audio Devices: ${results.audio.devices.length}`);
    console.log(`Supported Formats: ${results.audio.formats.length}`);
    console.log(`Conflicts: ${results.audio.conflicts.length}`);
    
    if (results.audio.conflicts.length > 0) {
        console.log('\n=== Conflicts Found ===');
        results.audio.conflicts.forEach(conflict => {
            console.log(`- ${conflict.type}: ${conflict.error}`);
        });
    }
    
    // Provide recommendations
    console.log('\n=== Recommendations ===');
    
    if (!results.audio.permissions) {
        console.log('1. Allow microphone access in browser settings');
    }
    
    if (results.audio.devices.length === 0) {
        console.log('2. Check audio drivers and device connections');
    }
    
    if (results.audio.formats.length === 0) {
        console.log('3. Update Electron/Chrome to latest version');
    }
    
    if (results.audio.conflicts.length > 0) {
        console.log('4. Close other audio applications');
        console.log('5. Check Windows audio settings');
    }
    
    console.log('\n6. Use these recommended settings:');
    console.log('   - Microphone Volume: 60%');
    console.log('   - Speaker Volume: 60%');
    console.log('   - Sample Rate: 16,000 Hz');
    console.log('   - Channels: Mono (1)');
    console.log('   - Echo Cancellation: Enabled');
    console.log('   - Noise Suppression: Enabled');
    console.log('   - Auto Gain Control: Disabled');
    
    return results;
}

// IPC handlers
ipcMain.handle('run-diagnostic', async () => {
    return await runAudioDiagnostic();
});

ipcMain.handle('get-system-info', () => {
    return {
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        nodeVersion: process.versions.node
    };
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
module.exports = { runAudioDiagnostic }; 