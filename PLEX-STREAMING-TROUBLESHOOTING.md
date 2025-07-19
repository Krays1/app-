# 🔧 Plex Streaming Troubleshooting Guide

## 🎯 **Current Status**

✅ **Token Authentication**: Working (S1L-FyC_rMXn3BumTR4z)  
✅ **Library Access**: Working (you can see files)  
❌ **Video Playback**: Still not working  

## 🔍 **What I've Implemented**

### **7 Different Streaming Methods**
The app now tries these methods in order:

1. **Simple Stream**: Basic Plex API
   ```
   http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?X-Plex-Token=S1L-FyC_rMXn3BumTR4z&ratingKey={id}
   ```

2. **Direct Play**: No transcoding
   ```
   http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?X-Plex-Token=S1L-FyC_rMXn3BumTR4z&ratingKey={id}&directPlay=1&noTranscode=1
   ```

3. **Direct File Access**: Library API
   ```
   http://192.168.1.182:32400/library/metadata/{id}/file?X-Plex-Token=S1L-FyC_rMXn3BumTR4z
   ```

4. **Direct Stream**: HTTP protocol
   ```
   http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?X-Plex-Token=S1L-FyC_rMXn3BumTR4z&ratingKey={id}&protocol=http&directPlay=1
   ```

5. **Optimized Stream**: Mobile-optimized HLS
   ```
   http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?X-Plex-Token=S1L-FyC_rMXn3BumTR4z&ratingKey={id}&protocol=hls&includeCodecs=1&maxVideoBitrate=4000&videoQuality=80
   ```

6. **HLS Stream**: Standard HLS
   ```
   http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?X-Plex-Token=S1L-FyC_rMXn3BumTR4z&ratingKey={id}&protocol=hls
   ```

7. **File Path**: Convert file paths to HTTP URLs
   ```
   /path/to/video.mp4 → http://192.168.1.182:32400/path/to/video.mp4?X-Plex-Token=S1L-FyC_rMXn3BumTR4z
   ```

## 🔧 **Enhanced Debugging**

### **Detailed Logging**
Each method is logged with:
```
PlexVideoPlayer: Trying simple stream URL: http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?X-Plex-Token=S1L-FyC_rMXn3BumTR4z&ratingKey=123
PlexVideoPlayer: Stream test response code: 404
PlexVideoPlayer: Trying direct play URL: http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?X-Plex-Token=S1L-FyC_rMXn3BumTR4z&ratingKey=123&directPlay=1&noTranscode=1
```

### **Error Dialog**
If all methods fail, you'll see:
- **All tried URLs** with their response codes
- **Your token and video ID**
- **Server information**
- **Copy all URLs** option for external testing

## 🚀 **Next Steps to Debug**

### **Step 1: Check the Logs**
```bash
adb logcat | grep "PlexVideoPlayer"
```

Look for:
- Which URLs are being tried
- What response codes you're getting
- Any error messages

### **Step 2: Test URLs Manually**
Copy the URLs from the error dialog and test them in:
- **Browser**: Paste the URL directly
- **VLC Media Player**: Open network stream
- **MX Player**: Open network stream

### **Step 3: Check Plex Server Settings**
1. **Open Plex Web**: `http://192.168.1.182:32400/web`
2. **Go to Settings** → **Server** → **Transcoder**
3. **Check**: "Enable video transcoding" is ON
4. **Check**: "Transcoder quality" is set appropriately

### **Step 4: Test Direct File Access**
Try accessing a video file directly:
```
http://192.168.1.182:32400/library/metadata/{video_id}?X-Plex-Token=S1L-FyC_rMXn3BumTR4z
```

This should return JSON with the actual file path.

## 🎯 **Common Issues & Solutions**

### **Issue 1: 404 Not Found**
**Cause**: Video ID doesn't exist or wrong server URL
**Solution**: 
- Verify the video ID in Plex Web
- Check if server IP is correct
- Try different videos

### **Issue 2: 401 Unauthorized**
**Cause**: Token expired or invalid
**Solution**:
- Get a new token from Plex Web
- Check token permissions

### **Issue 3: 500 Server Error**
**Cause**: Plex server transcoding issue
**Solution**:
- Restart Plex server
- Check server logs
- Try direct play (no transcoding)

### **Issue 4: Network Timeout**
**Cause**: Firewall or network issue
**Solution**:
- Check Windows Firewall
- Verify port 32400 is open
- Try from same network

## 🔧 **Alternative Solutions**

### **Option 1: Use Plex Web**
If streaming fails, the app will offer to open in Plex Web:
```
http://192.168.1.182:32400/web/index.html#!/media/{id}?X-Plex-Token=S1L-FyC_rMXn3BumTR4z
```

### **Option 2: External Players**
Copy the stream URLs and use:
- **VLC Media Player**
- **MX Player**
- **Kodi**
- **Plex for Android**

### **Option 3: Direct File Access**
If you can get the file path, try:
- **SMB/CIFS**: `\\192.168.1.182\path\to\video.mp4`
- **HTTP**: Convert file path to HTTP URL
- **FTP**: If Plex server has FTP enabled

## 📱 **Testing Commands**

### **Test Plex Server**
```bash
curl -H "X-Plex-Token: S1L-FyC_rMXn3BumTR4z" http://192.168.1.182:32400/identity
```

### **Test Video Metadata**
```bash
curl -H "X-Plex-Token: S1L-FyC_rMXn3BumTR4z" http://192.168.1.182:32400/library/metadata/{video_id}
```

### **Test Stream URL**
```bash
curl -I -H "X-Plex-Token: S1L-FyC_rMXn3BumTR4z" "http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?ratingKey={video_id}"
```

## 🎯 **What to Try Now**

1. **Install the updated app**
2. **Try to play a video**
3. **Check the logs** for specific error messages
4. **Share the error dialog** with all the URLs
5. **Test one URL manually** in a browser or VLC

The enhanced debugging will show us exactly what's happening with each streaming method, so we can identify the specific issue and fix it! 