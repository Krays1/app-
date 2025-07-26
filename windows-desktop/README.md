# Zell0 Desktop App for Windows

A Windows desktop application that provides the same functionality as the Zell0 Android app, allowing seamless communication between desktop and mobile users.

## Features

- **Real-time Communication**: Text and voice messaging with other Zell0 users
- **Cross-Platform Compatibility**: Works with Android app users on the same server
- **Chess Gaming**: Multiplayer chess games with voice chat
- **User Management**: See all connected users in real-time
- **Modern UI**: Clean, professional interface optimized for desktop
- **System Tray**: Minimize to system tray for background operation
- **Settings Management**: Customizable preferences and auto-connect options

## System Requirements

- Windows 10 or Windows 11
- Node.js 16+ (for development)
- Internet connection for server communication
- Microphone for voice messaging
- Speakers/headphones for audio playback

## Installation

### Option 1: Download Pre-built Executable

1. Download the latest release from the releases page
2. Run the installer (`Zell0-Desktop-Setup.exe`)
3. Follow the installation wizard
4. Launch Zell0 Desktop from Start Menu or Desktop shortcut

### Option 2: Build from Source

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd windows-desktop
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the executable**:
   ```bash
   npm run build-win
   ```

4. **Find the installer** in the `dist` folder

## Quick Start

1. **Launch the app** - Zell0 Desktop will start and show the main interface

2. **Connect to server**:
   - Click the settings icon (gear) in the top-right
   - Enter your username
   - Enable "Auto-connect on startup" if desired
   - Save settings

3. **Join the network**:
   - The app will automatically connect to the Zell0 server
   - You'll see your connection status in the header
   - Other users (desktop and mobile) will appear in the sidebar

4. **Start communicating**:
   - Type messages in the chat area
   - Hold the microphone button to send voice messages
   - Click "Find Game" to join a chess match

## Server Configuration

The desktop app connects to the same server as the Android app:

- **Server IP**: 172.94.3.216
- **Port**: 3001
- **Protocol**: HTTP/WebSocket

This ensures seamless communication between desktop and mobile users.

## Features Guide

### Text Messaging
- Type your message in the input field
- Press Enter or click the send button
- Messages appear in real-time for all connected users

### Voice Messaging
- Click and hold the microphone button
- Speak your message
- Release to send
- Voice messages are automatically played for other users

### Chess Gaming
- Click "Find Game" to join a chess match
- Wait for an opponent to join
- Make moves by clicking on the chess board
- Use voice chat during gameplay
- Click "Leave Game" to exit

### User Management
- See all connected users in the left sidebar
- User count updates in real-time
- Users show their device type (Desktop/Android)

### Settings
- **Username**: Your display name
- **Auto-connect**: Automatically connect on startup
- **Voice Enabled**: Enable/disable voice messaging
- **Notifications**: Show desktop notifications

## Troubleshooting

### Connection Issues
- Ensure the Zell0 server is running
- Check your internet connection
- Verify firewall settings allow the app
- Try restarting the application

### Voice Issues
- Check microphone permissions
- Ensure microphone is not muted
- Try different audio devices
- Restart the app if issues persist

### Performance Issues
- Close other resource-intensive applications
- Check available system memory
- Update graphics drivers if needed
- Restart the application

## Development

### Project Structure
```
windows-desktop/
├── main.js              # Main Electron process
├── network-manager.js   # Network communication
├── renderer.js          # UI logic
├── index.html           # Main UI
├── styles.css           # Styling
├── package.json         # Dependencies and scripts
└── assets/              # Icons and resources
```

### Available Scripts
- `npm start` - Run in development mode
- `npm run dev` - Run with development flags
- `npm run build` - Build for all platforms
- `npm run build-win` - Build Windows executable
- `npm run dist` - Create distribution package

### Building for Distribution
```bash
# Install dependencies
npm install

# Build Windows executable
npm run build-win

# Find installer in dist folder
```

## Security

- All communication is encrypted via HTTPS/WebSocket
- No personal data is stored on the server
- Voice messages are not permanently stored
- User authentication is handled securely

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the server logs
3. Contact the development team
4. Check for updates

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Version History

- **v1.0.0** - Initial release with basic functionality
- Cross-platform communication with Android app
- Real-time messaging and voice chat
- Chess gaming integration
- Modern desktop UI

---

**Note**: This desktop app is designed to work seamlessly with the existing Zell0 Android app and server infrastructure. All users (desktop and mobile) can communicate and play games together on the same network. 