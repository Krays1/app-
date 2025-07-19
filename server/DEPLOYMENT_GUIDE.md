# Zell0 Server Deployment Guide

This guide will help you deploy the Zell0 walkie-talkie server on your VPN server at **172.94.3.216**.

## Prerequisites

- **Server Access**: SSH access to your server at 172.94.3.216
- **Operating System**: Linux (Ubuntu/Debian/CentOS/RHEL)
- **Network**: Port 3000 must be accessible from the internet
- **Permissions**: sudo access on the server

## Quick Deployment (Recommended)

### Step 1: Connect to Your Server

```bash
ssh user@172.94.3.216
```

### Step 2: Download and Run Auto-Deploy Script

```bash
# Download the server files (if you have them locally)
# Or copy the files from this directory to your server

# Make the deploy script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

This script will:
- Install Node.js and npm if not present
- Create the server directory
- Install dependencies
- Create a systemd service
- Configure firewall
- Start the server

## Manual Deployment

If you prefer to deploy manually or the auto-script doesn't work:

### Step 1: Install Node.js

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nodejs npm -y
```

**CentOS/RHEL:**
```bash
sudo yum install nodejs npm -y
```

**Verify installation:**
```bash
node --version
npm --version
```

### Step 2: Create Server Directory

```bash
sudo mkdir -p /opt/zell0-server
sudo chown $(whoami):$(whoami) /opt/zell0-server
cd /opt/zell0-server
```

### Step 3: Copy Server Files

Copy the following files to `/opt/zell0-server/`:
- `server.js`
- `package.json`

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Test the Server

```bash
# Test run (press Ctrl+C to stop)
node server.js
```

You should see:
```
2024-01-XX - Zell0 Server running on 0.0.0.0:3000
2024-01-XX - Health check available at http://0.0.0.0:3000/health
```

### Step 6: Create Systemd Service

```bash
sudo nano /etc/systemd/system/zell0-server.service
```

Add the following content:

```ini
[Unit]
Description=Zell0 Walkie-Talkie Server
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/opt/zell0-server
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
```

Replace `YOUR_USERNAME` with your actual username.

### Step 7: Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable zell0-server
sudo systemctl start zell0-server
sudo systemctl status zell0-server
```

### Step 8: Configure Firewall

**Ubuntu (ufw):**
```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

**CentOS/RHEL (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

**iptables:**
```bash
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables-save
```

## Testing the Deployment

### Test 1: Health Check
```bash
curl http://172.94.3.216:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "connectedUsers": 0,
  "uptime": 123.45
}
```

### Test 2: From Another Machine
```bash
curl http://172.94.3.216:3000/health
```

### Test 3: Port Check
```bash
telnet 172.94.3.216 3000
```

## Server Management Commands

### Start/Stop/Restart
```bash
sudo systemctl start zell0-server
sudo systemctl stop zell0-server
sudo systemctl restart zell0-server
```

### View Logs
```bash
# Real-time logs
sudo journalctl -u zell0-server -f

# Recent logs
sudo journalctl -u zell0-server -n 50

# Logs for specific time
sudo journalctl -u zell0-server --since "2024-01-01 00:00:00"
```

### Check Status
```bash
sudo systemctl status zell0-server
```

## Troubleshooting

### Server Won't Start

1. **Check Node.js installation:**
   ```bash
   node --version
   npm --version
   ```

2. **Check file permissions:**
   ```bash
   ls -la /opt/zell0-server/
   ```

3. **Check port availability:**
   ```bash
   sudo netstat -tlnp | grep 3000
   ```

4. **Check logs:**
   ```bash
   sudo journalctl -u zell0-server -f
   ```

### Cannot Connect from Android App

1. **Check firewall:**
   ```bash
   sudo ufw status
   # or
   sudo firewall-cmd --list-all
   ```

2. **Check if server is listening on all interfaces:**
   ```bash
   sudo netstat -tlnp | grep 3000
   ```
   Should show `0.0.0.0:3000` not `127.0.0.1:3000`

3. **Test connectivity:**
   ```bash
   curl -v http://172.94.3.216:3000/health
   ```

4. **Check server logs for connection attempts:**
   ```bash
   sudo journalctl -u zell0-server -f
   ```

### High CPU/Memory Usage

1. **Check resource usage:**
   ```bash
   top -p $(pgrep node)
   ```

2. **Monitor connections:**
   ```bash
   sudo netstat -tn | grep :3000
   ```

3. **Check for stuck connections in logs:**
   ```bash
   sudo journalctl -u zell0-server | grep "stale connection"
   ```

## Security Considerations

### Production Deployment

1. **Use HTTPS:**
   - Install SSL certificate
   - Configure reverse proxy (nginx/apache)
   - Update Android app to use `https://`

2. **Firewall Rules:**
   - Only allow necessary ports
   - Consider rate limiting

3. **Process Management:**
   - Use PM2 for better process management
   - Configure monitoring

4. **Updates:**
   - Keep Node.js updated
   - Monitor for security updates

### Basic Security Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install fail2ban for brute force protection
sudo apt install fail2ban -y

# Configure basic UFW rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw enable
```

## Monitoring

### Server Health Monitoring

Create a simple monitoring script:

```bash
#!/bin/bash
# monitor.sh
while true; do
    if curl -s http://172.94.3.216:3000/health > /dev/null; then
        echo "$(date): Server is healthy"
    else
        echo "$(date): Server is down!"
        # Send notification or restart service
        sudo systemctl restart zell0-server
    fi
    sleep 60
done
```

### Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/zell0-server

# Add:
/var/log/zell0-server.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
```

## Backup and Recovery

### Backup Server Configuration

```bash
# Create backup directory
mkdir -p ~/zell0-backups

# Backup server files
cp -r /opt/zell0-server ~/zell0-backups/
cp /etc/systemd/system/zell0-server.service ~/zell0-backups/

# Create backup script
echo "#!/bin/bash
rsync -av /opt/zell0-server/ ~/zell0-backups/server-$(date +%Y%m%d)/
" > ~/backup-zell0.sh
chmod +x ~/backup-zell0.sh
```

### Recovery

```bash
# Restore from backup
sudo systemctl stop zell0-server
sudo cp -r ~/zell0-backups/zell0-server /opt/
sudo systemctl start zell0-server
```

## Performance Optimization

### For High Load

1. **Increase Node.js memory:**
   ```bash
   # Edit service file
   sudo nano /etc/systemd/system/zell0-server.service
   
   # Add to [Service] section:
   Environment=NODE_OPTIONS="--max-old-space-size=4096"
   ```

2. **Use PM2 for clustering:**
   ```bash
   npm install -g pm2
   pm2 start server.js -i max
   pm2 startup
   pm2 save
   ```

3. **Configure reverse proxy with nginx:**
   ```nginx
   server {
       listen 80;
       server_name 172.94.3.216;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Support

If you encounter issues:

1. Check the logs: `sudo journalctl -u zell0-server -f`
2. Verify network connectivity: `curl http://172.94.3.216:3000/health`
3. Check firewall settings
4. Ensure all dependencies are installed

For additional support, collect the following information:
- Server OS and version
- Node.js version
- Error logs
- Network configuration
- Firewall rules 