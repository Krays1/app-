ZELL0 SERVER DEPLOYMENT PACKAGE
================================

This package contains everything needed to run the Zell0 walkie-talkie server
on your server at 172.94.3.216.

CONTENTS:
- server.js (Main server file)
- package.json (Dependencies)
- setup.sh (Linux/Mac setup script)
- setup.bat (Windows setup script)
- deploy.sh (Full deployment script)
- README.txt (This file)

QUICK START:
===========

1. Copy all files to your server at 172.94.3.216
2. Run the appropriate setup script:

   For Linux/Mac servers:
   chmod +x setup.sh
   ./setup.sh

   For Windows servers:
   setup.bat

3. The server will start on port 3000
4. Test by visiting: http://172.94.3.216:3000/health

MANUAL SETUP:
============

If the setup scripts don't work, run these commands manually:

1. Install Node.js (if not installed):
   Ubuntu/Debian: sudo apt-get install nodejs npm
   CentOS/RHEL: sudo yum install nodejs npm
   Windows: Download from https://nodejs.org/

2. Install dependencies:
   npm install

3. Start the server:
   node server.js

TESTING:
========

Once the server is running:
1. Visit http://172.94.3.216:3000/health
2. You should see a JSON response with server status
3. Build and run the Android app to test communication

TROUBLESHOOTING:
===============

If the server doesn't start:
- Check Node.js is installed: node --version
- Check port 3000 is available: netstat -an | grep 3000
- Check firewall allows port 3000
- Check server logs for errors

For production use:
- Use PM2 or similar process manager
- Configure reverse proxy (nginx/apache)
- Set up SSL/HTTPS
- Configure proper logging

SUPPORT:
========

Check the main README.md and DEPLOYMENT_GUIDE.md for detailed instructions.

Server runs on: http://172.94.3.216:3000
Health check: http://172.94.3.216:3000/health 