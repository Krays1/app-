# Quick Deploy Script for Zell0 Server
# Use this in a fresh PowerShell window

Write-Host "🚀 Zell0 Quick Deploy to 172.94.3.216" -ForegroundColor Green
Write-Host "Username: krays1" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Yellow

# Step 1: Copy files
Write-Host "📋 Step 1: Copying files to server..." -ForegroundColor Blue
Write-Host "Enter password '123123' when prompted:" -ForegroundColor Yellow

scp server.js package.json setup.sh krays1@172.94.3.216:~/

# Step 2: Connect and setup
Write-Host "🔧 Step 2: Setting up server..." -ForegroundColor Blue
Write-Host "Enter password '123123' when prompted:" -ForegroundColor Yellow

$SetupCommands = @"
mkdir -p ~/zell0-server
mv server.js package.json setup.sh ~/zell0-server/ 2>/dev/null
cd ~/zell0-server

echo '📦 Installing Node.js if needed...'
if ! command -v node &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y nodejs npm
fi

echo '✅ Node.js version:' `$(node --version)
echo '📦 Installing dependencies...'
npm install

echo '🚀 Starting server...'
echo 'Server will run on port 3000'
echo 'Testing in background...'

# Start server in background for testing
nohup node server.js > server.log 2>&1 &
sleep 5

# Test server
if curl -s http://localhost:3000/health > /dev/null; then
    echo '✅ Server is running successfully!'
    echo '🌐 Server URL: http://172.94.3.216:3000'
    echo '🔍 Health check: http://172.94.3.216:3000/health'
    echo ''
    echo 'To manage the server:'
    echo '  pkill node          # Stop server'
    echo '  node server.js      # Start server'
    echo '  tail -f server.log  # View logs'
else
    echo '❌ Server failed to start'
    echo 'Check logs: cat server.log'
fi

echo ''
echo 'Opening firewall port 3000...'
sudo ufw allow 3000/tcp 2>/dev/null || echo 'Firewall config may need manual setup'

echo '🎉 Deployment completed!'
"@

ssh krays1@172.94.3.216 "$SetupCommands"

Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "🎉 Deployment completed!" -ForegroundColor Green
Write-Host "Test your server: http://172.94.3.216:3000/health" -ForegroundColor Cyan 