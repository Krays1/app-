# 🚀 Railway Deployment Guide for Zell0 Server

This guide will help you deploy the Zell0 walkie-talkie server on Railway cloud platform.

## Prerequisites

- **Railway Account**: Sign up at [railway.app](https://railway.app)
- **GitHub Repository**: Your server code should be in a GitHub repository
- **Node.js**: Railway will automatically detect and use Node.js

## Quick Deployment Steps

### Step 1: Prepare Your Repository

1. **Ensure your repository has these files:**
   - `server.js` (main server file)
   - `package.json` (dependencies)
   - `railway.json` (Railway configuration)
   - `README.md` (optional)

2. **Verify your `package.json` has:**
   ```json
   {
     "name": "zell0-server",
     "version": "1.0.0",
     "main": "server.js",
     "scripts": {
       "start": "node server.js"
     },
     "dependencies": {
       "express": "^4.18.2",
       "socket.io": "^4.7.2"
     },
     "engines": {
       "node": ">=14.0.0"
     }
   }
   ```

### Step 2: Deploy to Railway

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Sign in with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Deployment**
   - Railway will automatically detect it's a Node.js app
   - The `railway.json` file will configure the deployment
   - Click "Deploy"

4. **Wait for Deployment**
   - Railway will build and deploy your server
   - You'll see logs of the build process
   - Wait for "Deployment successful" message

### Step 3: Get Your Server URL

After successful deployment:

1. **Copy the generated URL**
   - It will look like: `https://your-app-name.railway.app`
   - This is your server's public URL

2. **Test the server**
   - Health check: `https://your-app-name.railway.app/health`
   - Should return: `{"status":"ok","timestamp":"...","connectedUsers":0,"uptime":...}`

### Step 4: Update Your Android App

1. **Update NetworkManager.kt**
   ```kotlin
   private const val SERVER_URL = "https://your-app-name.railway.app"
   ```

2. **Update network_security_config.xml**
   ```xml
   <domain includeSubdomains="true">your-app-name.railway.app</domain>
   ```

3. **Rebuild and install your APK**

## Troubleshooting

### Server Not Starting
- Check Railway logs for errors
- Ensure `package.json` has correct `start` script
- Verify all dependencies are listed in `package.json`

### Connection Issues
- Test the health endpoint: `https://your-app-name.railway.app/health`
- Check if the URL is correct in your Android app
- Ensure network security config includes your Railway domain

### 404 Errors
- Verify the server is actually running (check Railway logs)
- Ensure the health endpoint exists in your `server.js`
- Check if Railway has properly deployed your code

## Environment Variables (Optional)

If you need to configure environment variables:

1. **In Railway Dashboard:**
   - Go to your project
   - Click "Variables" tab
   - Add any environment variables your server needs

2. **Common variables:**
   - `PORT` (Railway sets this automatically)
   - `NODE_ENV=production`
   - Any API keys or configuration

## Monitoring

1. **Check Railway Dashboard:**
   - View real-time logs
   - Monitor resource usage
   - Check deployment status

2. **Health Monitoring:**
   - Railway will automatically check `/health` endpoint
   - Failed health checks will trigger restarts

## Cost Management

- Railway offers free tier with limitations
- Monitor your usage in the Railway dashboard
- Consider upgrading if you exceed free tier limits

## Support

If you encounter issues:
1. Check Railway logs first
2. Verify your server code works locally
3. Test the health endpoint manually
4. Check Railway documentation: [docs.railway.app](https://docs.railway.app) 