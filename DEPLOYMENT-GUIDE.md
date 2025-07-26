# Zell0 Server Deployment Guide

## Quick Deploy to Railway (Recommended)

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### Step 2: Deploy Your Server
1. Connect your GitHub repository
2. Select the `windows-server` folder
3. Railway will automatically detect it's a Node.js app
4. Deploy!

### Step 3: Get Your Server URL
After deployment, Railway will give you a URL like:
```
https://your-app-name.railway.app
```

### Step 4: Update Your Website
Replace the demo data in your website with the real server URL:

```javascript
// In your website's index.html, replace demo data with:
const response = await fetch('https://your-app-name.railway.app/api/online-users');
```

### Step 5: Update Your Android App
Update your Android app to connect to the cloud server:
```javascript
// Replace your local server IP with the Railway URL
const serverUrl = 'https://your-app-name.railway.app';
```

## Alternative: Deploy to Render

1. Go to [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repo
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Deploy!

## Alternative: Deploy to Heroku

1. Install Heroku CLI
2. Run these commands:
```bash
heroku create your-app-name
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

## Testing Your Deployment

Once deployed, test your server:
1. Health check: `https://your-app-name.railway.app/health`
2. Online users: `https://your-app-name.railway.app/api/online-users`
3. Battlefield stats: `https://your-app-name.railway.app/api/battlefield-stats/krays1`

## Environment Variables

The server will automatically use:
- `PORT` - Set by the cloud service
- `IP` - Set by the cloud service

No additional configuration needed!

## Next Steps

1. Deploy to Railway (5 minutes)
2. Get your server URL
3. Update your website to use the real server
4. Update your Android app to use the real server
5. Test everything works!

Your website will then show real data from your Android app! 🎉 