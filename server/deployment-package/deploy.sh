#!/bin/bash

# Zell0 Server Deployment Script
# This script automates the deployment of the Zell0 walkie-talkie server

echo "🚀 Starting Zell0 Server Deployment..."
echo "Target IP: 172.94.3.216"
echo "Target Port: 3000"
echo "Date: $(date)"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Installing Node.js..."
    
    # Install Node.js (Ubuntu/Debian)
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y nodejs npm
    # Install Node.js (CentOS/RHEL)
    elif command -v yum &> /dev/null; then
        sudo yum install -y nodejs npm
    # Install Node.js (macOS with Homebrew)
    elif command -v brew &> /dev/null; then
        brew install node
    else
        echo "❌ Could not install Node.js. Please install it manually."
        exit 1
    fi
else
    echo "✅ Node.js is already installed: $(node --version)"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js with npm."
    exit 1
else
    echo "✅ npm is installed: $(npm --version)"
fi

# Create server directory if it doesn't exist
SERVER_DIR="/opt/zell0-server"
if [ ! -d "$SERVER_DIR" ]; then
    echo "📁 Creating server directory: $SERVER_DIR"
    sudo mkdir -p "$SERVER_DIR"
    sudo chown $(whoami):$(whoami) "$SERVER_DIR"
fi

# Copy server files
echo "📋 Copying server files..."
cp server.js "$SERVER_DIR/"
cp package.json "$SERVER_DIR/"

# Change to server directory
cd "$SERVER_DIR"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create systemd service file
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/zell0-server.service > /dev/null <<EOF
[Unit]
Description=Zell0 Walkie-Talkie Server
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$SERVER_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0

# Logging
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
echo "🔄 Reloading systemd and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable zell0-server
sudo systemctl start zell0-server

# Check service status
echo "📊 Checking service status..."
sudo systemctl status zell0-server --no-pager

# Check if port 3000 is open
echo "🔍 Checking if port 3000 is accessible..."
if command -v ufw &> /dev/null; then
    echo "🔥 Opening port 3000 with ufw..."
    sudo ufw allow 3000/tcp
elif command -v firewall-cmd &> /dev/null; then
    echo "🔥 Opening port 3000 with firewalld..."
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
else
    echo "⚠️ Please manually open port 3000 in your firewall"
fi

# Test server
echo "🧪 Testing server..."
sleep 5
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Server is responding to health checks"
else
    echo "❌ Server is not responding. Check logs with: sudo journalctl -u zell0-server -f"
fi

echo "============================================="
echo "🎉 Deployment completed!"
echo "Server is running at: http://172.94.3.216:3000"
echo "Health check: http://172.94.3.216:3000/health"
echo ""
echo "Useful commands:"
echo "  Start server:    sudo systemctl start zell0-server"
echo "  Stop server:     sudo systemctl stop zell0-server"
echo "  Restart server:  sudo systemctl restart zell0-server"
echo "  View logs:       sudo journalctl -u zell0-server -f"
echo "  Check status:    sudo systemctl status zell0-server"
echo "=============================================" 