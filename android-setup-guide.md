# 📱 Android App Server Configuration Guide

## 🎯 **Quick Setup Steps**

### Step 1: Get Your Server IP Address
**Option A: Use the batch file (Easiest)**
1. Navigate to `windows-server` folder
2. Double-click: `GET-MY-IP.bat`
3. Copy the **RECOMMENDED IP** shown

**Option B: Start the server and note the IP**
1. Double-click: `START-AUTO-SERVER.bat`
2. Look for "🎯 Selected IP:" in the server output
3. Note this IP address

### Step 2: Update Android App Configuration
1. **Open file:** `app/src/main/java/com/example/zell0/NetworkManager.kt`
2. **Find line 22:** `private const val SERVER_URL = "http://192.168.1.100:3000"`
3. **Replace the IP** with your server's IP address
4. **Save the file**

### Step 3: Rebuild and Test
1. **Rebuild** your Android app in Android Studio
2. **Install** the updated app on your device
3. **Start the server** using `START-AUTO-SERVER.bat`
4. **Test connection** from your Android app

## 📝 **Example Configuration**

If your server IP is `192.168.1.150`, change this line:

**Before:**
```kotlin
private const val SERVER_URL = "http://192.168.1.100:3000" // 🔄 CHANGE THIS IP!
```

**After:**
```kotlin
private const val SERVER_URL = "http://192.168.1.150:3000" // ✅ Updated with your IP!
```

## 🌐 **Common IP Address Patterns**

- **Home WiFi:** Usually `192.168.1.x` or `192.168.0.x`
- **Office Network:** Often `10.0.x.x` or `172.16.x.x`
- **Localhost Testing:** `127.0.0.1` (only works on same computer)

## 🔧 **Troubleshooting**

### Android App Can't Connect
1. ✅ **Check IP Address:** Ensure it matches server output exactly
2. ✅ **Same Network:** Both devices must be on same WiFi/network
3. ✅ **Server Running:** Ensure server is started and responding
4. ✅ **Firewall:** Windows Firewall should allow port 3000
5. ✅ **Rebuild App:** Always rebuild after changing NetworkManager.kt

### Server Not Starting
1. ✅ **Try localhost first:** Use `127.0.0.1` for testing
2. ✅ **Check Node.js:** Ensure Node.js is installed
3. ✅ **Port 3000:** Make sure port isn't already in use

### Connection Errors
1. ✅ **Network Connectivity:** Ping the server IP from Android device
2. ✅ **Port Access:** Ensure port 3000 is accessible
3. ✅ **App Permissions:** Check Android app has INTERNET permission

## 🎉 **Success Indicators**

**Server Side:**
- Shows "Ready to accept Android client connections!"
- Health endpoint responds: `http://YOUR_IP:3000/health`

**Android Side:**
- App connects successfully
- Shows connection status as "Connected"
- Can send/receive messages

## 📂 **Files Modified**

- ✅ `app/src/main/java/com/example/zell0/NetworkManager.kt` - Updated with clear instructions
- ✅ `windows-server/GET-MY-IP.bat` - Quick IP detection tool
- ✅ `windows-server/show-ip.js` - IP detection script

## 💡 **Pro Tips**

1. **Use Static IP:** Configure your computer with a static IP to avoid changes
2. **Bookmark Health URL:** Save `http://YOUR_IP:3000/health` for quick testing
3. **Test First:** Always test server with browser before testing Android app
4. **Document IP:** Write down your IP address for future reference

Ready to connect your Android walkie-talkie app! 🚀 