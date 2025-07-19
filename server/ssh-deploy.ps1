# Zell0 Server SSH Deployment Script
# Automated deployment using SSH credentials

param(
    [string]$ServerIP = "172.94.3.216",
    [string]$Username = "",
    [string]$Password = "",
    [switch]$UseKeyFile = $false,
    [string]$KeyFile = ""
)

Write-Host "🚀 Zell0 Server SSH Deployment" -ForegroundColor Green
Write-Host "Target Server: $ServerIP" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date)" -ForegroundColor Gray
Write-Host "=============================================" -ForegroundColor Yellow

# Get SSH credentials if not provided
if (-not $Username) {
    $Username = Read-Host "Enter SSH username for $ServerIP"
}

if (-not $UseKeyFile -and -not $Password) {
    $SecurePassword = Read-Host "Enter SSH password" -AsSecureString
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword))
}

if ($UseKeyFile -and -not $KeyFile) {
    $KeyFile = Read-Host "Enter path to SSH key file"
}

# Check if required files exist
$RequiredFiles = @("server.js", "package.json", "setup.sh")
foreach ($file in $RequiredFiles) {
    if (-not (Test-Path $file)) {
        Write-Host "❌ Missing file: $file" -ForegroundColor Red
        Write-Host "Please run this script from the deployment-package directory" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ All required files found" -ForegroundColor Green

# Test SSH connection
Write-Host "🔍 Testing SSH connection..." -ForegroundColor Blue

try {
    if ($UseKeyFile) {
        $TestResult = ssh -i "$KeyFile" -o ConnectTimeout=10 -o BatchMode=yes "$Username@$ServerIP" "echo 'Connection successful'"
    } else {
        # For password authentication, we'll use sshpass if available, otherwise manual
        if (Get-Command sshpass -ErrorAction SilentlyContinue) {
            $env:SSHPASS = $Password
            $TestResult = sshpass -e ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$Username@$ServerIP" "echo 'Connection successful'"
        } else {
            Write-Host "⚠️ sshpass not found. You'll need to enter password manually during deployment." -ForegroundColor Yellow
            $TestResult = ssh -o ConnectTimeout=10 "$Username@$ServerIP" "echo 'Connection successful'"
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ SSH connection successful" -ForegroundColor Green
    } else {
        Write-Host "❌ SSH connection failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ SSH connection failed: $_" -ForegroundColor Red
    exit 1
}

# Create deployment commands
$DeploymentCommands = @"
# Create deployment directory
mkdir -p ~/zell0-deployment
cd ~/zell0-deployment

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo '📦 Installing Node.js...'
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y nodejs npm
    elif command -v yum &> /dev/null; then
        sudo yum install -y nodejs npm
    else
        echo '❌ Please install Node.js manually'
        exit 1
    fi
fi

echo '✅ Node.js version:' \$(node --version)
echo '✅ NPM version:' \$(npm --version)
"@

Write-Host "📋 Copying files to server..." -ForegroundColor Blue

try {
    # Copy files using SCP
    if ($UseKeyFile) {
        scp -i "$KeyFile" server.js package.json setup.sh "$Username@$ServerIP`:~/zell0-deployment/"
    } else {
        if (Get-Command sshpass -ErrorAction SilentlyContinue) {
            $env:SSHPASS = $Password
            sshpass -e scp server.js package.json setup.sh "$Username@$ServerIP`:~/zell0-deployment/"
        } else {
            Write-Host "Enter password when prompted for file transfer..." -ForegroundColor Yellow
            scp server.js package.json setup.sh "$Username@$ServerIP`:~/zell0-deployment/"
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Files copied successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ File copy failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to copy files: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🔧 Setting up server on remote machine..." -ForegroundColor Blue

# Execute setup commands on remote server
$SetupCommands = @"
cd ~/zell0-deployment

# Install dependencies
echo '📦 Installing dependencies...'
npm install

# Make setup script executable
chmod +x setup.sh

# Create systemd service (optional)
echo '⚙️ Creating server service...'
sudo tee /etc/systemd/system/zell0-server.service > /dev/null <<EOF
[Unit]
Description=Zell0 Walkie-Talkie Server
After=network.target

[Service]
Type=simple
User=$Username
WorkingDirectory=/home/$Username/zell0-deployment
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable zell0-server
sudo systemctl start zell0-server

# Check service status
echo '📊 Server status:'
sudo systemctl status zell0-server --no-pager

# Open firewall port
echo '🔥 Configuring firewall...'
if command -v ufw &> /dev/null; then
    sudo ufw allow 3000/tcp
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
fi

echo '🧪 Testing server...'
sleep 5
if curl -s http://localhost:3000/health > /dev/null; then
    echo '✅ Server is running and responding'
    echo '🎉 Deployment completed successfully!'
    echo 'Server URL: http://172.94.3.216:3000'
    echo 'Health check: http://172.94.3.216:3000/health'
else
    echo '❌ Server is not responding'
    echo 'Check logs with: sudo journalctl -u zell0-server -f'
fi
"@

try {
    if ($UseKeyFile) {
        ssh -i "$KeyFile" "$Username@$ServerIP" "$SetupCommands"
    } else {
        if (Get-Command sshpass -ErrorAction SilentlyContinue) {
            $env:SSHPASS = $Password
            sshpass -e ssh "$Username@$ServerIP" "$SetupCommands"
        } else {
            Write-Host "Enter password when prompted for setup commands..." -ForegroundColor Yellow
            ssh "$Username@$ServerIP" "$SetupCommands"
        }
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Server setup completed!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Setup completed with warnings. Check server logs." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Setup failed: $_" -ForegroundColor Red
    exit 1
}

# Clean up sensitive data
$Password = $null
$env:SSHPASS = $null

Write-Host "=============================================" -ForegroundColor Yellow
Write-Host "🎉 Zell0 Server Deployment Completed!" -ForegroundColor Green
Write-Host "Server URL: http://$ServerIP:3000" -ForegroundColor Cyan
Write-Host "Health check: http://$ServerIP:3000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server Management Commands (SSH to server):" -ForegroundColor Yellow
Write-Host "  sudo systemctl start zell0-server" -ForegroundColor White
Write-Host "  sudo systemctl stop zell0-server" -ForegroundColor White
Write-Host "  sudo systemctl restart zell0-server" -ForegroundColor White
Write-Host "  sudo systemctl status zell0-server" -ForegroundColor White
Write-Host "  sudo journalctl -u zell0-server -f" -ForegroundColor White
Write-Host ""
Write-Host "Test the deployment:" -ForegroundColor Yellow
Write-Host "  curl http://$ServerIP:3000/health" -ForegroundColor White
Write-Host "=============================================" -ForegroundColor Yellow 