#!/bin/bash

# Simple Zell0 Server Setup Script
# Run this on your server at 172.94.3.216

echo "🚀 Setting up Zell0 Server..."
echo "============================================="

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y nodejs npm
    elif command -v yum &> /dev/null; then
        sudo yum install -y nodejs npm
    else
        echo "❌ Please install Node.js manually"
        exit 1
    fi
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the server
echo "🚀 Starting Zell0 Server..."
echo "Server will run on port 3000"
echo "Press Ctrl+C to stop"
echo "============================================="

node server.js 