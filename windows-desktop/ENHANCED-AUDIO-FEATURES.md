# Enhanced Audio Features - Zell0 Desktop App

## Overview

The enhanced desktop app now includes comprehensive audio device management and settings to resolve static noise issues and provide better audio quality control.

## New Features

### 1. Audio Device Selection
- **Microphone Selection**: Choose from all available input devices
- **Speaker Selection**: Choose from all available output devices
- **Default Device Support**: Automatically uses system defaults if no specific device is selected

### 2. Volume Controls
- **Microphone Volume**: Adjust input volume (0-100%)
- **Speaker Volume**: Adjust output volume (0-100%)
- **Real-time Updates**: Volume changes apply immediately

### 3. Audio Quality Settings
- **Sample Rate Options**:
  - 8,000 Hz (Low quality, smaller files)
  - 16,000 Hz (Medium quality, recommended)
  - 22,050 Hz (High quality)
  - 44,100 Hz (CD quality, larger files)
- **Channel Options**:
  - Mono (1 channel) - Recommended for voice chat
  - Stereo (2 channels) - For music/audio content

### 4. Audio Processing
- **Echo Cancellation**: Reduces echo and feedback
- **Noise Suppression**: Filters out background noise
- **Auto Gain Control**: Automatically adjusts microphone sensitivity

### 5. Audio Testing
- **Test Recording**: Record and play back your voice
- **Device Verification**: Confirm selected devices are working
- **Quality Check**: Verify audio settings are optimal

## How to Use

### Starting the Enhanced App
```bash
# Option 1: Use the batch file
start-enhanced.bat

# Option 2: Use npm script
npm run start-enhanced

# Option 3: Direct electron command
npx electron enhanced-desktop.js
```

### Accessing Audio Settings
1. Click the "🎵 Audio Settings" button in the header
2. Configure your preferred devices and settings
3. Click "Test Audio" to verify everything works
4. Click "Save Settings" to apply changes

## Troubleshooting Static Noise

### Immediate Fixes for Static Noise

#### Step 1: Volume Adjustment (Most Common Fix)
1. Open Audio Settings
2. **Set microphone volume to 50-70%** (NOT 100%)
3. **Set speaker volume to 50-70%** (NOT 100%)
4. Click "Test Audio" to verify

#### Step 2: Audio Processing Settings
1. **Enable "Noise Suppression"** ✅
2. **Enable "Echo Cancellation"** ✅
3. **Disable "Auto Gain Control"** ❌ (This often causes static)
4. Click "Test Audio" to verify

#### Step 3: Quality Settings
1. **Use 16,000 Hz sample rate** (not higher)
2. **Use Mono (1 channel)** for voice chat
3. Click "Test Audio" to verify

### Advanced Troubleshooting

#### Issue: Loud Static Noise
**Causes:**
- Volume set too high (causing clipping)
- Auto Gain Control enabled
- Sample rate too high
- Device conflicts

**Solutions:**
1. **Lower microphone volume to 50-60%**
2. **Disable Auto Gain Control**
3. **Use 16,000 Hz sample rate**
4. **Enable Noise Suppression**
5. **Close other audio applications**
6. **Try a different microphone device**

#### Issue: No Audio Output
**Causes:**
- Speaker device not selected
- Volume too low
- Audio format not supported

**Solutions:**
1. **Select correct speaker device**
2. **Increase speaker volume to 60-80%**
3. **Check system audio settings**
4. **Test with system audio player**

#### Issue: Echo or Feedback
**Causes:**
- Speakers too close to microphone
- Echo cancellation disabled
- Volume too high

**Solutions:**
1. **Enable Echo Cancellation**
2. **Use headphones instead of speakers**
3. **Lower speaker volume**
4. **Increase distance between mic and speakers**

#### Issue: Poor Audio Quality
**Causes:**
- Sample rate too low
- Noise suppression disabled
- Poor microphone quality

**Solutions:**
1. **Use 16,000 Hz or 22,050 Hz sample rate**
2. **Enable Noise Suppression**
3. **Use a better quality microphone**
4. **Check for background noise sources**

### Device-Specific Issues

#### USB Headset Issues
1. **Unplug and replug the headset**
2. **Select the correct USB device in settings**
3. **Check Windows audio settings**
4. **Update headset drivers**

#### Built-in Microphone Issues
1. **Check microphone permissions**
2. **Verify microphone is not muted**
3. **Test in Windows Sound settings**
4. **Try external microphone**

#### Bluetooth Device Issues
1. **Ensure device is paired and connected**
2. **Check Bluetooth audio codec settings**
3. **Try wired connection instead**
4. **Update Bluetooth drivers**

### Conflict Resolution

#### Application Conflicts
1. **Close other audio applications** (Discord, Teams, etc.)
2. **Check Windows audio settings**
3. **Restart the Zell0 app**
4. **Restart your computer if needed**

#### Driver Conflicts
1. **Update audio drivers**
2. **Check for Windows updates**
3. **Disable audio enhancements**
4. **Try different audio device**

#### Permission Issues
1. **Allow microphone access when prompted**
2. **Check browser/Electron permissions**
3. **Reset permissions in Windows settings**
4. **Run app as administrator**

## Recommended Settings

### For Voice Chat (Recommended)
```
Microphone Volume: 60%
Speaker Volume: 60%
Sample Rate: 16,000 Hz
Channels: Mono (1)
Echo Cancellation: Enabled
Noise Suppression: Enabled
Auto Gain Control: Disabled
```

### For Music/Audio Content
```
Microphone Volume: 70%
Speaker Volume: 70%
Sample Rate: 44,100 Hz
Channels: Stereo (2)
Echo Cancellation: Enabled
Noise Suppression: Disabled
Auto Gain Control: Enabled
```

### For Low-End Systems
```
Microphone Volume: 50%
Speaker Volume: 50%
Sample Rate: 8,000 Hz
Channels: Mono (1)
Echo Cancellation: Enabled
Noise Suppression: Enabled
Auto Gain Control: Disabled
```

## Technical Details

### Audio Format
- **Recording Format**: WebM with Opus codec (primary), fallback to MP4/WAV
- **Sample Rate**: Configurable (8kHz - 44.1kHz)
- **Channels**: Mono or Stereo
- **Bit Depth**: 16-bit
- **Compression**: Opus codec for efficient transmission
- **Bitrate**: 128 kbps for good quality

### Device Management
- **Device Enumeration**: Uses Web Audio API
- **Permission Handling**: Automatic microphone permission request
- **Settings Persistence**: Saved to user data directory
- **Real-time Switching**: Devices can be changed without restart
- **Conflict Detection**: Automatic detection of device conflicts

### Network Optimization
- **Audio Chunking**: Live audio sent in 100ms chunks
- **Base64 Encoding**: Efficient binary data transmission
- **Volume Normalization**: Consistent audio levels across devices
- **Error Handling**: Graceful fallback for audio issues
- **Format Fallback**: Multiple audio format support

## Settings File Location

Audio settings are saved to:
```
%APPDATA%/zell0-desktop/audio-settings.json
```

Example settings file:
```json
{
  "microphoneDevice": "default",
  "speakerDevice": "default",
  "microphoneVolume": 60,
  "speakerVolume": 60,
  "sampleRate": 16000,
  "channels": 1,
  "echoCancellation": true,
  "noiseSuppression": true,
  "autoGainControl": false,
  "audioBitsPerSecond": 128000,
  "timeslice": 100,
  "enableHighQuality": false
}
```

## Performance Considerations

### Recommended Settings for Voice Chat
- **Sample Rate**: 16,000 Hz
- **Channels**: Mono (1)
- **Microphone Volume**: 50-70%
- **Speaker Volume**: 50-70%
- **Echo Cancellation**: Enabled
- **Noise Suppression**: Enabled
- **Auto Gain Control**: Disabled

### Recommended Settings for Music/Audio Content
- **Sample Rate**: 44,100 Hz
- **Channels**: Stereo (2)
- **Microphone Volume**: 60-80%
- **Speaker Volume**: 60-80%
- **Echo Cancellation**: Enabled
- **Noise Suppression**: Disabled
- **Auto Gain Control**: Enabled

### Recommended Settings for Low-End Systems
- **Sample Rate**: 8,000 Hz
- **Channels**: Mono (1)
- **Microphone Volume**: 40-60%
- **Speaker Volume**: 40-60%
- **Echo Cancellation**: Enabled
- **Noise Suppression**: Enabled
- **Auto Gain Control**: Disabled

## Browser Compatibility

The enhanced audio features require:
- **Chrome/Chromium**: Version 66+
- **Electron**: Version 8+
- **Web Audio API**: Full support
- **MediaDevices API**: Full support
- **MediaRecorder API**: Full support

## Future Enhancements

Planned improvements:
- **Audio Effects**: Reverb, equalizer, compression
- **Device Profiles**: Save/load different audio configurations
- **Advanced Processing**: AI-powered noise reduction
- **Multi-device Support**: Use multiple microphones simultaneously
- **Audio Visualization**: Real-time audio level meters
- **Recording History**: Save voice messages locally
- **Audio Filters**: Custom audio processing chains

## Support

For issues with the enhanced audio features:
1. **Check this documentation first**
2. **Use the "Test Audio" function**
3. **Try the recommended settings**
4. **Check for device conflicts**
5. **Update audio drivers**
6. **Contact support with detailed error information**

### Quick Diagnostic Steps
1. Click "🎵 Audio Settings"
2. Click "Test Audio"
3. Follow the feedback provided
4. Adjust settings based on recommendations
5. Test again until audio is clear

### Common Error Messages
- **"Microphone permission denied"**: Allow microphone access
- **"No supported audio formats"**: Update browser/Electron
- **"Device in use"**: Close other audio applications
- **"OverconstrainedError"**: Try different audio settings 