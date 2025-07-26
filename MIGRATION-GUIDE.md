# 🚀 Zell0 Project Migration Guide

## 📋 **Overview**
This guide will help you migrate the complete Zell0 walkie-talkie project to a new PC. The project includes:
- **Android App** (Kotlin/Android Studio)
- **Windows Server** (Node.js/Electron)
- **Desktop App** (Electron)
- **VPN Configuration** (172.94.3.216)

## 🖥️ **New PC Requirements**

### **Minimum System Requirements**
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **Network**: Internet connection for downloads
- **VPN**: Same VPN network access (172.94.3.216)

### **Required Software**

#### **1. Java Development Kit (JDK)**
- **Version**: JDK 17 (Eclipse Adoptium recommended)
- **Download**: https://adoptium.net/temurin/releases/?version=17
- **Install Path**: `C:\Program Files\Eclipse Adoptium\jdk-17.0.15.6-hotspot`

#### **2. Android Studio**
- **Version**: Latest stable (2023.2.1 or newer)
- **Download**: https://developer.android.com/studio
- **Components to Install**:
  - Android SDK Platform 36
  - Android SDK Platform 21 (for older device support)
  - Android SDK Build-Tools
  - Android Emulator
  - Android SDK Platform-Tools

#### **3. Node.js**
- **Version**: 18.x or 20.x LTS
- **Download**: https://nodejs.org/
- **Verify**: Run `node --version` and `npm --version`

#### **4. Git (Optional but Recommended)**
- **Download**: https://git-scm.com/
- **Purpose**: Version control and easy updates

## 📦 **Migration Package Contents**

### **Core Project Files**
```
zell0-migration/
├── android-app/                    # Complete Android project
├── windows-server/                 # Node.js server with VPN config
├── windows-desktop/                # Electron desktop app
├── server/                         # Simple Socket.IO server
├── setup-scripts/                  # Installation scripts
├── dependencies/                   # Pre-downloaded dependencies
└── README-MIGRATION.md            # This file
```

### **Key Configuration Files**
- `gradle.properties` - Java/Android configuration
- `app/build.gradle.kts` - Android app dependencies
- `windows-server/package.json` - Server dependencies
- `windows-server/server-vpn.js` - VPN server (172.94.3.216)
- `windows-desktop/package.json` - Desktop app dependencies

## 🛠️ **Installation Steps**

### **Step 1: Install Required Software**
```batch
# Run these commands in Command Prompt as Administrator

# 1. Install Java JDK 17
# Download and install from: https://adoptium.net/temurin/releases/?version=17

# 2. Install Android Studio
# Download and install from: https://developer.android.com/studio

# 3. Install Node.js
# Download and install from: https://nodejs.org/

# 4. Verify installations
java -version
node --version
npm --version
```

### **Step 2: Extract Migration Package**
```batch
# Extract the zell0-migration.zip to C:\zell0-migration\
# Or your preferred location
```

### **Step 3: Setup Android Development**
```batch
# 1. Open Android Studio
# 2. Open the android-app folder
# 3. Let Gradle sync and download dependencies
# 4. Install required SDK components if prompted
```

### **Step 4: Setup Server Dependencies**
```batch
# Navigate to server directory
cd C:\zell0-migration\windows-server

# Install Node.js dependencies
npm install

# Verify installation
npm start
```

### **Step 5: Setup Desktop App**
```batch
# Navigate to desktop directory
cd C:\zell0-migration\windows-desktop

# Install dependencies
npm install

# Test the app
npm start
```

## 🔧 **Configuration Files**

### **Java Configuration (gradle.properties)**
```properties
# Update this path to match your Java installation
org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.15.6-hotspot
```

### **VPN Configuration (server-vpn.js)**
```javascript
// This is already configured for your VPN
const SERVER_IP = '172.94.3.216';
const SERVER_PORT = 3001;
```

### **Android App Configuration (NetworkManager.kt)**
```kotlin
// Already configured for VPN
private const val SERVER_URL = "http://172.94.3.216:3001"
```

## 🚀 **Quick Start Commands**

### **Start VPN Server**
```batch
cd C:\zell0-migration\windows-server
START-VPN-SERVER.bat
```

### **Build Android APK**
```batch
cd C:\zell0-migration\android-app
gradlew assembleRelease
```

### **Start Desktop App**
```batch
cd C:\zell0-migration\windows-desktop
npm start
```

## 📱 **Android App Features**
- **Minimum SDK**: API 21 (Android 5.0) - 95% device coverage
- **Target SDK**: API 36 (Android 14)
- **Features**: Push-to-talk, text messaging, real-time communication
- **VPN Support**: Configured for 172.94.3.216:3001

## 🖥️ **Server Features**
- **Socket.IO**: Real-time communication
- **Express**: HTTP server
- **VPN Binding**: 172.94.3.216:3001
- **File Upload**: Video and image support
- **Chess Game**: Multiplayer chess with save system

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Java Home Not Found**
```batch
# Check Java installation
java -version

# Update gradle.properties with correct path
org.gradle.java.home=C:\\Your\\Java\\Path
```

#### **2. Android SDK Issues**
```batch
# Open Android Studio
# Go to Tools > SDK Manager
# Install missing SDK components
```

#### **3. Node.js Dependencies**
```batch
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

#### **4. VPN Connection Issues**
```batch
# Test VPN connectivity
ping 172.94.3.216

# Check firewall settings
# Ensure port 3001 is open
```

### **Verification Commands**
```batch
# Test server
curl http://172.94.3.216:3001

# Test Android build
cd android-app
gradlew assembleDebug

# Test Node.js
node --version
npm --version
```

## 📞 **Support**

### **Log Files**
- **Android**: `android-app/app/build/outputs/logs/`
- **Server**: `windows-server/logs/`
- **Desktop**: `windows-desktop/logs/`

### **Configuration Files**
- **VPN**: `windows-server/server-vpn.js`
- **Android**: `app/src/main/java/com/example/zell0/NetworkManager.kt`
- **Gradle**: `gradle.properties`

## ✅ **Migration Checklist**

- [ ] Java JDK 17 installed
- [ ] Android Studio installed with SDK
- [ ] Node.js installed
- [ ] Project files extracted
- [ ] Android dependencies downloaded
- [ ] Server dependencies installed
- [ ] Desktop app dependencies installed
- [ ] VPN connectivity tested
- [ ] Server starts successfully
- [ ] Android app builds successfully
- [ ] Desktop app runs successfully

## 🎯 **Next Steps**

1. **Test VPN connectivity** to 172.94.3.216
2. **Start the server** using `START-VPN-SERVER.bat`
3. **Build and install** the Android APK
4. **Test communication** between devices
5. **Configure any additional settings** as needed

---

**Migration Complete!** 🎉

Your Zell0 project is now ready to run on the new PC with full VPN support. 