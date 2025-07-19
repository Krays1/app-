# 🚀 Zell0 Server Setup Guide

## 📋 **Quick Start Options**

### Option 1: Auto-IP Server (Recommended)
**Double-click:** `START-AUTO-SERVER.bat`
- Automatically detects your network IP
- Shows all available network interfaces
- Selects the best IP address for your Android devices

### Option 2: Localhost Testing
**Double-click:** `start-server.bat`
- Runs on localhost (127.0.0.1:3000)
- Good for testing server functionality
- Not accessible from other devices

### Option 3: Full GUI Application
**Double-click:** `dist/Zell0Server-Setup.exe`
- Complete installer with GUI dashboard
- Auto-start with Windows
- System tray integration

## 🔧 **Manual Commands**

If you prefer command line:

```bash
# Auto-IP detection server
node server-auto-ip.js

# Localhost testing
node server-localhost.js

# Original server (requires correct IP)
node server-only.js

# GUI version (requires Electron)
npx electron . --disable-gpu --no-sandbox
```

## 📱 **Android App Configuration**

1. **Start the server** using any option above
2. **Note the IP address** shown in the server output
3. **Update your Android app** to connect to this IP:
   - Open `app/src/main/java/com/example/zell0/NetworkManager.kt`
   - Change the SERVER_URL to match your server IP
   - Example: `private const val SERVER_URL = "http://192.168.1.100:3000"`

## 🔍 **Testing the Server**

### Test Health Endpoint
```bash
# Test with the server's IP address
node test-server.js

# Or visit in browser
http://YOUR_SERVER_IP:3000/health
```

### Test Info Endpoint
```bash
# Visit in browser
http://YOUR_SERVER_IP:3000/info
```

## 🌐 **Network Requirements**

1. **Same Network**: Android devices must be on the same network as the server
2. **Firewall**: Port 3000 must be open (auto-configured by installer)
3. **IP Address**: Use the IP shown by the auto-IP server

## 🎯 **Troubleshooting**

### Server Won't Start
- Check if port 3000 is already in use
- Try the localhost version first
- Ensure Node.js is installed

### Android Can't Connect
- Verify both devices are on same network
- Check the IP address in Android app matches server
- Ensure Windows Firewall allows port 3000

### GUI Issues
- Use the command-line version (`server-auto-ip.js`)
- Install/update Node.js
- Try running as Administrator

## 📊 **Server Features**

- ✅ Real-time text messaging
- ✅ Voice/audio messaging
- ✅ Multiple device support
- ✅ User registration
- ✅ Connection management
- ✅ Health monitoring
- ✅ Auto-cleanup of stale connections

## 🎉 **Success Indicators**

When the server is running correctly, you'll see:
- Server IP address displayed
- "Ready to accept Android client connections!"
- Health endpoint responding
- No connection errors

## 💡 **Next Steps**

1. **Start server** with `START-AUTO-SERVER.bat`
2. **Note the IP address** from server output
3. **Update Android app** with the correct IP
4. **Test connection** from Android device
5. **Enjoy your walkie-talkie app!** 