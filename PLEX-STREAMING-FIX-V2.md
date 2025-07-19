# 🎬 Plex Streaming Fix V2 - Direct File Access Solution

## 🎯 **Issue Identified**

From the error dialog and testing, I found the exact problem:

**❌ Plex Transcoding API Returns 400 Bad Request**
```
HTTP/1.1 400 Bad Request
X-Plex-Protocol: 1.0
Content-Type: text/html
```

This means the Plex transcoding API (`video/:/transcode/universal/start.m3u8`) is not working correctly for your video files.

## ✅ **Solution Implemented**

### **New Streaming Priority Order**
I've reordered the streaming methods to try **direct file access first**, bypassing the problematic transcoding API:

1. **Direct File Stream** (NEW - bypasses transcoding)
   ```
   http://192.168.1.182:32400/library/metadata/{id}/file?X-Plex-Token=token&directPlay=1
   ```

2. **HTTP Stream** (NEW - direct file access)
   ```
   http://192.168.1.182:32400/library/metadata/{id}/file?X-Plex-Token=token&protocol=http
   ```

3. **Direct File Access** (existing)
   ```
   http://192.168.1.182:32400/library/metadata/{id}/file?X-Plex-Token=token
   ```

4. **Simple Stream** (transcoding - moved down)
   ```
   http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?X-Plex-Token=token&ratingKey={id}
   ```

5. **Direct Play** (transcoding - moved down)
   ```
   http://192.168.1.182:32400/video/:/transcode/universal/start.m3u8?X-Plex-Token=token&ratingKey={id}&directPlay=1&noTranscode=1
   ```

## 🔧 **Why This Should Work**

### **Direct File Access vs Transcoding**
- **Direct File**: Streams the original file without any processing
- **Transcoding**: Converts the video format (causing the 400 error)

### **Your Video Format**
The video "01 I Spit on Your Grave Horror 1978 Eng Subs" is likely in a format that Plex can't transcode properly, but it can stream directly.

### **Token Authentication**
Your token `S1L-FyC_rMXn3BumTR4z` is working perfectly (HTTP 200 OK for metadata), so the issue is specifically with transcoding.

## 🚀 **What's New**

### **1. Direct File Stream Method**
```kotlin
private fun createDirectFileStreamUrl(): String {
    return "$baseUrl/library/metadata/$videoId/file?" +
            "X-Plex-Token=$plexToken&" +
            "directPlay=1"
}
```

### **2. HTTP Stream Method**
```kotlin
private fun createHttpStreamUrl(): String {
    return "$baseUrl/library/metadata/$videoId/file?" +
            "X-Plex-Token=$plexToken&" +
            "protocol=http"
}
```

### **3. Updated Error Dialog**
Shows the specific issue:
```
Issue Identified:
Plex transcoding API returns 400 Bad Request.
This means the video format may not be supported for transcoding.
```

## 🎯 **Expected Results**

### **Successful Playback**
The app should now:
1. **Try direct file access first** (most likely to work)
2. **Bypass transcoding completely** (avoiding the 400 error)
3. **Stream the original video file** directly
4. **Play in ExoPlayer** with full controls

### **If Still Fails**
The error dialog will show:
- **All tried URLs** with their response codes
- **Specific issue identification** (transcoding problem)
- **Copy URLs** option for external players
- **Plex Web fallback** option

## 🔍 **Testing Commands**

### **Test Direct File Access**
```bash
curl -I "http://192.168.1.182:32400/library/metadata/268360/file?X-Plex-Token=S1L-FyC_rMXn3BumTR4z"
```

### **Test HTTP Stream**
```bash
curl -I "http://192.168.1.182:32400/library/metadata/268360/file?X-Plex-Token=S1L-FyC_rMXn3BumTR4z&protocol=http"
```

## 🎉 **What to Try Now**

1. **Install the updated app**
2. **Open Plex feature**
3. **Select the same video** (ID: 268360)
4. **Choose "Play with ExoPlayer"**
5. **Watch for "Direct File Stream" or "HTTP Stream"** in the logs
6. **Should play directly** without transcoding!

The new approach bypasses the problematic transcoding API entirely and streams the video files directly, which should resolve the 400 Bad Request error. 