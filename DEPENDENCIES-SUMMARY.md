# 📦 Zell0 Project Dependencies Summary

## 🔍 **Project Overview**
This document lists all dependencies required to run the Zell0 walkie-talkie project on a new PC.

## 🖥️ **System Requirements**

### **Operating System**
- **Windows 10/11** (64-bit)
- **macOS 10.15+** (for development only)
- **Linux** (Ubuntu 20.04+) (for development only)

### **Hardware Requirements**
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **Network**: Internet connection + VPN access to 172.94.3.216

## 📱 **Android App Dependencies**

### **Core Development Tools**
```
Java JDK 17 (Eclipse Adoptium)
├── Version: 17.0.15.6-hotspot
├── Download: https://adoptium.net/temurin/releases/?version=17
└── Path: C:\Program Files\Eclipse Adoptium\jdk-17.0.15.6-hotspot

Android Studio
├── Version: 2023.2.1 or newer
├── Download: https://developer.android.com/studio
└── Components: SDK Platform 36, Build-Tools, Platform-Tools

Gradle
├── Version: 8.13
├── Wrapper: Included in project
└── Configuration: gradle.properties
```

### **Android SDK Components**
```
Android SDK Platform 36 (API 36)
├── Target SDK for latest features
└── Required for modern Android support

Android SDK Platform 21 (API 21)
├── Minimum SDK for older device support
└── Covers 95% of Android devices

Android SDK Build-Tools
├── Required for APK compilation
└── Version: Latest stable

Android SDK Platform-Tools
├── Required for device communication
└── Version: Latest stable
```

### **Kotlin Dependencies**
```kotlin
// Core Android
implementation("androidx.core:core-ktx:1.16.0")
implementation("androidx.appcompat:appcompat:1.6.1")
implementation("com.google.android.material:material:1.10.0")
implementation("androidx.activity:activity:1.10.1")
implementation("androidx.constraintlayout:constraintlayout:2.1.4")

// Networking
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
implementation("com.squareup.retrofit2:retrofit:2.9.0")
implementation("com.squareup.retrofit2:converter-gson:2.9.0")

// Audio and Media
implementation("androidx.media:media:1.7.0")
implementation("androidx.media3:media3-exoplayer:1.2.1")
implementation("androidx.media3:media3-ui:1.2.1")
implementation("androidx.media3:media3-common:1.2.1")
implementation("androidx.media3:media3-datasource:1.2.1")
implementation("androidx.media3:media3-session:1.2.1")

// Real-time Communication
implementation("io.socket:socket.io-client:2.1.2")

// UI Components
implementation("androidx.recyclerview:recyclerview:1.3.2")
implementation("com.github.bumptech.glide:glide:4.13.2")

// HTTP Requests
implementation("com.android.volley:volley:1.2.1")

// Async Operations
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
implementation("androidx.lifecycle:lifecycle-livedata-ktx:2.7.0")
```

## 🖥️ **Windows Server Dependencies**

### **Node.js Runtime**
```
Node.js
├── Version: 18.x or 20.x LTS
├── Download: https://nodejs.org/
└── Verify: node --version && npm --version
```

### **Server Dependencies (package.json)**
```json
{
  "dependencies": {
    "auto-launch": "^5.0.5",
    "cors": "^2.8.5",
    "electron-store": "^8.1.0",
    "express": "^4.21.2",
    "node-notifier": "^10.0.1",
    "socket.io": "^4.7.2",
    "socket.io-client": "^4.8.1",
    "systray2": "^2.0.0"
  },
  "devDependencies": {
    "electron": "^27.0.0",
    "electron-builder": "^24.6.4"
  }
}
```

### **Server Features**
```
Express Server
├── HTTP server for API endpoints
├── Static file serving
└── CORS support

Socket.IO
├── Real-time communication
├── WebSocket fallback
└── Room management

Electron
├── Desktop application wrapper
├── System tray integration
└── Auto-launch capability

File Management
├── Video file serving (X: drive)
├── Thumbnail generation
└── Upload handling
```

## 🖥️ **Desktop App Dependencies**

### **Desktop App Dependencies (package.json)**
```json
{
  "dependencies": {
    "electron": "^28.0.0",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "electron-builder": "^24.0.0"
  }
}
```

### **Desktop Features**
```
Electron App
├── Cross-platform desktop app
├── Audio support
└── Real-time messaging

Socket.IO Client
├── Connect to VPN server
├── Audio streaming
└── Text messaging
```

## 🔧 **Simple Server Dependencies**

### **Simple Server (package.json)**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## 🌐 **Network Configuration**

### **VPN Settings**
```
Server IP: 172.94.3.216
Server Port: 3001
Protocol: HTTP/WebSocket
Features: Audio, Text, Chess, File sharing
```

### **Firewall Requirements**
```
Inbound Rules:
├── Port 3001 (TCP) - Server communication
├── Port 8080 (TCP) - Audio streaming
└── Port 8081 (TCP) - Text messaging

Outbound Rules:
├── All traffic to VPN network
└── Internet access for dependencies
```

## 📁 **File Structure Requirements**

### **Required Directories**
```
zell0-project/
├── app/                          # Android app
├── windows-server/               # Windows server
├── windows-desktop/              # Desktop app
├── server/                       # Simple server
├── gradle/                       # Gradle wrapper
├── gradlew                       # Gradle wrapper script
├── gradlew.bat                   # Gradle wrapper script (Windows)
├── build.gradle.kts              # Root build file
├── app/build.gradle.kts          # App build file
├── gradle.properties             # Gradle configuration
└── settings.gradle.kts           # Project settings
```

### **Server Data Directories**
```
windows-server/
├── chess-saves/                  # Chess game saves
├── thumbnails/                   # Video thumbnails
├── uploads/                      # File uploads
├── user_profiles.json            # User data
└── logs/                         # Server logs
```

## 🔍 **Installation Verification**

### **Pre-Installation Checks**
```batch
# Check Java
java -version

# Check Node.js
node --version
npm --version

# Check Android Studio
# Open Android Studio and verify SDK installation

# Check VPN connectivity
ping 172.94.3.216
```

### **Post-Installation Tests**
```batch
# Test server
cd windows-server
npm start

# Test Android build
cd app
gradlew assembleDebug

# Test desktop app
cd windows-desktop
npm start
```

## 🚨 **Common Issues & Solutions**

### **Java Issues**
```
Problem: "Java home not found"
Solution: Update gradle.properties with correct Java path
Fix: org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.15.6-hotspot
```

### **Android SDK Issues**
```
Problem: "SDK not found"
Solution: Install required SDK components in Android Studio
Components: Platform 36, Platform 21, Build-Tools, Platform-Tools
```

### **Node.js Issues**
```
Problem: "npm install fails"
Solution: Clear cache and reinstall
Commands: npm cache clean --force && npm install
```

### **VPN Issues**
```
Problem: "Cannot connect to server"
Solution: Check VPN connection and firewall
Test: ping 172.94.3.216
```

## 📋 **Migration Checklist**

### **Software Installation**
- [ ] Java JDK 17 installed
- [ ] Android Studio installed
- [ ] Node.js installed
- [ ] Git installed (optional)

### **Project Setup**
- [ ] Project files extracted
- [ ] Android dependencies downloaded
- [ ] Server dependencies installed
- [ ] Desktop app dependencies installed

### **Configuration**
- [ ] Java path configured in gradle.properties
- [ ] VPN connectivity confirmed
- [ ] Firewall rules configured
- [ ] Android SDK components installed

### **Testing**
- [ ] Server starts successfully
- [ ] Android app builds successfully
- [ ] Desktop app runs successfully
- [ ] VPN communication works

## 🎯 **Quick Start Commands**

```batch
# Setup new PC
setup-new-pc.bat

# Start VPN server
cd windows-server
START-VPN-SERVER.bat

# Build Android APK
cd app
gradlew assembleRelease

# Start desktop app
cd windows-desktop
npm start
```

---

**All dependencies are included in the migration package!** 📦

The setup script will automatically install and configure everything needed. 