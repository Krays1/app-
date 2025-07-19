# 🔍 Plex Authentication Debugging Guide

## 🚨 **Enhanced Error Logging**

I've added comprehensive logging to help identify exactly what's going wrong with the Plex authentication. The app now logs detailed information about each step of the authentication process.

## 📱 **How to Check Logs**

### **Method 1: Android Studio Logcat**
1. Open Android Studio
2. Connect your device
3. Go to **View → Tool Windows → Logcat**
4. Filter by tag: `PlexAuthHelper`
5. Try the Plex authentication and watch the logs

### **Method 2: ADB Logcat (Command Line)**
```bash
adb logcat | grep "PlexAuthHelper"
```

### **Method 3: App Logs**
The app now shows detailed error dialogs with specific error messages.

## 🔍 **What to Look For**

### **1. Connectivity Test**
```
PlexAuthHelper: Testing Plex API connectivity...
PlexAuthHelper: Plex API connectivity test response code: 200
```
- **✅ Success**: Code 200-399
- **❌ Failure**: Code 400+ or connection error

### **2. New API Authentication**
```
PlexAuthHelper: Attempting new API authentication for user: you...
PlexAuthHelper: Sending payload to https://app.plex.tv/api/v2/users/signin
PlexAuthHelper: New API sign-in response code: 200
PlexAuthHelper: New API sign-in response: {"authToken":"abc123..."}
PlexAuthHelper: ✅ Successfully got auth token from new API: abc123...
```

### **3. Legacy API Authentication**
```
PlexAuthHelper: Attempting legacy API authentication for user: you...
PlexAuthHelper: Sending legacy form data to https://app.plex.tv/users/sign_in.json
PlexAuthHelper: Legacy sign-in response code: 201
PlexAuthHelper: Legacy sign-in response: {"user":{"authentication_token":"xyz789..."}}
PlexAuthHelper: ✅ Successfully got auth token from legacy API: xyz789...
```

## 🚨 **Common Error Patterns**

### **Network Connectivity Issues**
```
❌ Plex API connectivity test failed: java.net.UnknownHostException
❌ Plex API connectivity test response code: 403
```
**Solution**: Try "No Authentication" option

### **New API Errors**
```
❌ New API sign-in failed with code 401: {"error":"Invalid credentials"}
❌ New API sign-in failed with code 429: {"error":"Rate limited"}
❌ New API sign-in response code: 500
```
**Solutions**: 
- Check username/password
- Wait and try again
- Use legacy API (automatic fallback)

### **Legacy API Errors**
```
❌ Legacy sign-in failed with code 401: {"error":"Invalid credentials"}
❌ Legacy sign-in failed with code 403: {"error":"Forbidden"}
```
**Solutions**:
- Verify Plex account credentials
- Check if account is active
- Try "No Authentication" option

### **Response Parsing Errors**
```
❌ No auth token found in new API response
❌ Response keys: [error, message]
❌ No user object found in legacy API response
```
**Solutions**:
- Plex API format changed
- Use "No Authentication" option
- Try manual configuration

## 🎯 **Recommended Debugging Steps**

### **Step 1: Test Connectivity**
1. Open Plex feature
2. Select "Use Plex Account"
3. Check logs for connectivity test
4. If connectivity fails, use "No Authentication"

### **Step 2: Test New API**
1. Watch logs during authentication
2. Look for "New API sign-in response code"
3. If 200/201, check for auth token
4. If error, note the specific error message

### **Step 3: Test Legacy API**
1. If new API fails, app automatically tries legacy
2. Look for "Legacy sign-in response code"
3. Check for authentication_token in response

### **Step 4: Check Response Content**
1. Look for actual response JSON in logs
2. Check if auth token is present
3. Note any error messages from Plex

## 🔧 **Quick Fixes Based on Errors**

### **If You See "Invalid Credentials"**
- Double-check your Plex email/password
- Try logging into plex.tv in a browser
- Use "No Authentication" for local access

### **If You See "Rate Limited"**
- Wait 5-10 minutes and try again
- Use "No Authentication" option
- Try manual configuration

### **If You See "Network Error"**
- Check your internet connection
- Try "No Authentication" (local only)
- Check firewall settings

### **If You See "API Error"**
- Plex servers might be down
- Use "No Authentication" for local access
- Try again later

## 📋 **Error Reporting Template**

When reporting issues, include:

```
**Error Type**: [Connectivity/Authentication/Response]
**Error Message**: [Exact error from logs]
**Response Code**: [HTTP status code]
**Response Body**: [JSON response if available]
**Steps Taken**: [What you tried]
**Expected Result**: [What should happen]
```

## 🎉 **Success Indicators**

### **Successful Authentication**
```
✅ Successfully got auth token from new API: abc123...
✅ Authentication successful!
🏠 Select Plex Server: Your Server (192.168.1.182:32400)
```

### **Successful Local Connection**
```
✅ Connected without authentication!
📺 Server: Your Plex Server
🔌 Libraries: Available
🎬 Videos: Ready to play
```

## 💡 **Pro Tips**

1. **Start with "No Authentication"** - It bypasses all API issues
2. **Check logs first** - They tell you exactly what's wrong
3. **Try multiple methods** - The app has 5 different connection options
4. **Local access is most reliable** - No external dependencies
5. **Manual configuration works** - If all else fails

The enhanced logging will help us identify exactly what's causing the authentication failures and provide specific solutions! 