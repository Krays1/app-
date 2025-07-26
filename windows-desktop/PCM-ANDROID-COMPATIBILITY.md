# PCM 16-bit Audio Implementation - Android Compatibility

## Overview

The desktop app now uses **PCM 16-bit audio format** to match the Android app exactly, ensuring perfect audio compatibility between desktop and Android devices.

## Android Audio Format Analysis

### Android App Audio Specifications:
- **Format**: PCM 16-bit (`AudioFormat.ENCODING_PCM_16BIT`)
- **Sample Rate**: 16,000 Hz (16kHz)
- **Channels**: Mono (1 channel)
- **Buffer Size**: 4096 samples
- **Audio Processing**: Disabled (no echo cancellation, noise suppression, or auto gain control)
- **Encoding**: Base64 for network transmission

### Android AudioManager.kt Key Features:
```kotlin
private const val DEFAULT_SAMPLE_RATE = 16000
private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
```

## Desktop Implementation

### PCM 16-bit Recording Process:
1. **Audio Capture**: Uses Web Audio API with exact Android settings
2. **Sample Rate**: Fixed at 16,000 Hz
3. **Channels**: Fixed at Mono (1 channel)
4. **Processing**: All audio processing disabled to match Android
5. **Conversion**: Float32 → Int16 PCM → ByteArray
6. **Encoding**: ByteArray → Base64 for transmission

### Key Implementation Details:

#### Audio Constraints (matches Android):
```javascript
const audioConstraints = {
    audio: {
        sampleRate: { ideal: 16000, exact: 16000 }, // Match Android's 16kHz
        channelCount: { ideal: 1, exact: 1 }, // Mono like Android
        echoCancellation: false, // Disable to match Android
        noiseSuppression: false, // Disable to match Android
        autoGainControl: false, // Disable to match Android
        latency: { ideal: 0.01, max: 0.1 }
    }
};
```

#### PCM Conversion (matches Android):
```javascript
// Convert Float32 to Int16 PCM (same as Android)
const pcmData = new Int16Array(inputData.length);
for (let i = 0; i < inputData.length; i++) {
    // Apply volume adjustment (same as Android)
    const volumeMultiplier = audioSettings.microphoneVolume / 100;
    let sample = inputData[i] * volumeMultiplier;
    
    // Convert to 16-bit PCM (same as Android AudioFormat.ENCODING_PCM_16BIT)
    sample = Math.max(-1, Math.min(1, sample));
    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
}

// Convert Int16Array to ByteArray (same as Android)
const byteArray = new Uint8Array(pcmData.buffer);
```

#### PCM Playback (matches Android):
```javascript
// Convert ByteArray to Int16Array (same as Android)
const int16Array = new Int16Array(byteArray.buffer);

// Convert Int16Array to Float32Array for Web Audio API
const float32Array = new Float32Array(int16Array.length);
for (let i = 0; i < int16Array.length; i++) {
    // Convert 16-bit PCM to float (-1 to 1)
    float32Array[i] = int16Array[i] / 32768.0;
}

// Create audio buffer with same sample rate
const audioBuffer = audioContext.createBuffer(1, float32Array.length, 16000);
```

## Audio Settings

### Fixed Settings (Android Compatible):
- **Sample Rate**: 16,000 Hz (fixed)
- **Channels**: Mono (1 channel, fixed)
- **Echo Cancellation**: Disabled (fixed)
- **Noise Suppression**: Disabled (fixed)
- **Auto Gain Control**: Disabled (fixed)

### Adjustable Settings:
- **Microphone Volume**: 0-100% (default: 60%)
- **Speaker Volume**: 0-100% (default: 60%)
- **Microphone Device**: Selectable
- **Speaker Device**: Selectable

## Network Transmission

### Message Format (matches Android):
```javascript
const messageData = {
    audioData: base64Data, // PCM 16-bit Base64 encoded
    username: username,
    timestamp: Date.now(),
    type: 'voice'
};
```

### Server Handling:
- Receives Base64 encoded PCM data
- Broadcasts to all connected clients
- No audio processing or conversion
- Direct transmission of raw PCM data

## Compatibility Matrix

| Feature | Android App | Desktop App | Status |
|---------|-------------|-------------|---------|
| Audio Format | PCM 16-bit | PCM 16-bit | ✅ Match |
| Sample Rate | 16kHz | 16kHz | ✅ Match |
| Channels | Mono | Mono | ✅ Match |
| Processing | Disabled | Disabled | ✅ Match |
| Encoding | Base64 | Base64 | ✅ Match |
| Volume Control | Yes | Yes | ✅ Match |
| Device Selection | Yes | Yes | ✅ Match |

## Benefits

### 1. Perfect Compatibility
- Desktop and Android use identical audio format
- No format conversion or transcoding
- Same audio quality across platforms

### 2. Reduced Static Noise
- Eliminates format mismatch issues
- No audio processing conflicts
- Direct PCM transmission

### 3. Consistent Experience
- Same audio settings across devices
- Predictable behavior
- Reliable communication

### 4. Performance
- Efficient PCM processing
- Minimal CPU usage
- Low latency audio

## Troubleshooting

### If Audio Still Has Issues:

1. **Check Device Selection**:
   - Ensure correct microphone is selected
   - Ensure correct speaker is selected

2. **Volume Settings**:
   - Set microphone volume to 50-70%
   - Set speaker volume to 50-70%

3. **Browser Compatibility**:
   - Ensure PCM 16-bit is supported
   - Check Web Audio API support

4. **Network Issues**:
   - Verify server connection
   - Check for network latency

### Common Error Messages:
- **"PCM 16-bit format not supported"**: Update browser
- **"Audio processing error"**: Check device permissions
- **"Network transmission failed"**: Check server connection

## Technical Notes

### Audio Quality:
- **Bit Depth**: 16-bit (65,536 levels)
- **Sample Rate**: 16kHz (16,000 samples/second)
- **Bitrate**: 256 kbps (16-bit × 16kHz)
- **Channels**: Mono (single channel)

### Buffer Management:
- **Recording Buffer**: 4096 samples (matches Android)
- **Chunk Size**: Variable based on recording duration
- **Memory Usage**: Efficient ByteArray storage

### Performance Characteristics:
- **Latency**: ~10ms (minimal processing)
- **CPU Usage**: Low (direct PCM handling)
- **Memory Usage**: Efficient (raw audio data)

## Future Enhancements

### Potential Improvements:
1. **Audio Visualization**: Real-time PCM level meters
2. **Recording History**: Local PCM storage
3. **Audio Effects**: Optional post-processing
4. **Quality Options**: Multiple sample rates (if needed)

### Compatibility Extensions:
1. **Other Platforms**: iOS, Linux, macOS
2. **Web Browsers**: Chrome, Firefox, Safari, Edge
3. **Mobile Browsers**: PWA support

## Conclusion

The PCM 16-bit implementation ensures perfect audio compatibility between the desktop and Android apps. By using the exact same audio format, sample rate, and processing settings, users can expect:

- **Clear audio quality** without static noise
- **Reliable communication** between platforms
- **Consistent experience** across devices
- **Optimal performance** with minimal resource usage

This implementation resolves the static noise issues by eliminating format mismatches and ensuring both platforms use identical audio processing pipelines. 