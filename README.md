# Zell0 - Walkie-Talkie App

A real-time walkie-talkie application for Android that allows voice and text communication between multiple devices over a network connection.

## Features

- **Push-to-Talk (PTT)**: Hold the button to record and send voice messages
- **Text Messaging**: Send and receive text messages in real-time
- **Real-time Communication**: Uses Socket.IO for low-latency communication
- **Audio Visualization**: Visual feedback during recording
- **Connection Status**: Shows current connection state
- **Multi-device Support**: Connect multiple Android devices to the same server

## Technical Requirements

### Android App
- **Minimum SDK**: API 24 (Android 7.0)
- **Target SDK**: API 36
- **Permissions Required**:
  - RECORD_AUDIO
  - INTERNET
  - ACCESS_NETWORK_STATE
  - MODIFY_AUDIO_SETTINGS
  - WAKE_LOCK

### Server Requirements
You need to set up a Socket.IO server at the specified IP address (172.94.3.216:3000). 

## Server Setup

Create a Node.js server with Socket.IO support:

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('register', (data) => {
        const { deviceId } = data;
        connectedUsers.set(socket.id, deviceId);
        socket.broadcast.emit('user_joined', { userId: deviceId });
        console.log('User registered:', deviceId);
    });
    
    socket.on('text_message', (data) => {
        console.log('Text message:', data);
        socket.broadcast.emit('text_message', data);
    });
    
    socket.on('audio_message', (data) => {
        console.log('Audio message from:', data.senderId);
        socket.broadcast.emit('audio_message', data);
    });
    
    socket.on('keep_alive', (data) => {
        console.log('Keep alive from:', data.deviceId);
    });
    
    socket.on('disconnect', () => {
        const deviceId = connectedUsers.get(socket.id);
        if (deviceId) {
            socket.broadcast.emit('user_left', { userId: deviceId });
            connectedUsers.delete(socket.id);
            console.log('User disconnected:', deviceId);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
```

### Server Dependencies (package.json)
```json
{
  "name": "zell0-server",
  "version": "1.0.0",
  "description": "Socket.IO server for Zell0 walkie-talkie app",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2"
  }
}
```

## Installation & Setup

1. **Clone the repository**
2. **Server Setup**:
   - Install Node.js on your server (172.94.3.216)
   - Create the server files above
   - Run `npm install`
   - Start the server with `npm start`
   - Ensure port 3000 is open and accessible

3. **Android App**:
   - Open the project in Android Studio
   - Sync the project to download dependencies
   - Connect your Android device or use an emulator
   - Grant audio recording permissions when prompted
   - Build and run the app

## Usage

1. **Starting the App**:
   - Launch the app on your Android device
   - The app will automatically attempt to connect to the server
   - Green indicator shows connected state, red shows disconnected

2. **Push-to-Talk**:
   - Press and hold the large green button to record
   - Release to stop recording and send the audio message
   - Audio messages are automatically sent to all connected devices

3. **Text Messaging**:
   - Type your message in the text input at the bottom
   - Tap the send button or press Enter
   - Messages are displayed in the chat area

4. **Audio Playback**:
   - Tap the play button on received audio messages to listen
   - Audio plays through the device speaker

## Network Configuration

The app is configured to connect to:
- **Server IP**: 172.94.3.216
- **Port**: 3000
- **Protocol**: HTTP/WebSocket

To change the server IP, modify the `SERVER_URL` constant in `NetworkManager.kt`:

```kotlin
private const val SERVER_URL = "http://YOUR_SERVER_IP:3000"
```

## Architecture

- **AudioManager**: Handles audio recording and playback
- **NetworkManager**: Manages Socket.IO connections and messaging
- **MessageAdapter**: RecyclerView adapter for displaying messages
- **MainActivity**: Main UI controller integrating all components

## Troubleshooting

1. **Connection Issues**:
   - Verify server is running and accessible
   - Check network connectivity
   - Ensure firewall allows traffic on port 3000

2. **Audio Issues**:
   - Grant microphone permissions
   - Check device audio settings
   - Verify RECORD_AUDIO permission is granted

3. **Message Delivery**:
   - Ensure all devices are connected to the same server
   - Check server logs for connection status
   - Verify network stability

## Building for Production

1. Update the server IP address in `NetworkManager.kt`
2. Configure proper SSL/TLS certificates for production
3. Use HTTPS instead of HTTP for security
4. Implement proper error handling and reconnection logic
5. Add user authentication if needed

## License

This project is created for educational purposes. Please ensure you have proper rights to use all dependencies and follow their respective licenses. 