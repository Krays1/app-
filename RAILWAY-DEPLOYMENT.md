# 🚀 Railway Deployment Guide for Zell0 Server

## Quick Deploy Steps (5 minutes)

### 1. Go to Railway
- Visit [railway.app](https://railway.app)
- Sign up with GitHub

### 2. Create New Project
- Click "New Project"
- Choose "Deploy from GitHub repo"
- Select your repository

### 3. Configure Deployment
- **Root Directory**: `windows-server` (select this folder)
- **Build Command**: `npm install` (auto-detected)
- **Start Command**: `npm start` (auto-detected)

### 4. Deploy
- Click "Deploy Now"
- Wait for build to complete

### 5. Get Your URL
- Copy the generated URL (e.g., `https://your-app.railway.app`)
- This is your public server URL!

## Test Your Deployment

Once deployed, test these endpoints:

1. **Health Check**: `https://your-app.railway.app/health`
2. **Online Users**: `https://your-app.railway.app/api/online-users`
3. **Battlefield Stats**: `https://your-app.railway.app/api/battlefield-stats/krays1`

## Update Your Website

Replace demo data in your website with real API calls:

```javascript
// Replace this in your website's index.html:
const response = await fetch('https://your-app.railway.app/api/online-users');
```

## Update Your Android App

Change your Android app to connect to the cloud server:

```javascript
// Replace your local IP with the Railway URL
const serverUrl = 'https://your-app.railway.app';
```

## Done! 🎉

Your website will now show real data from your Android app! 