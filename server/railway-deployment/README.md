# Zell0 Server - Railway Deployment

This is the Zell0 walkie-talkie server configured for Railway deployment.

## Features

- Real-time text messaging
- Push-to-talk voice messaging
- Multiple Android device support
- Secure HTTPS connection
- Health monitoring
- Auto-restart on failure

## Deployment

This server is configured to run on Railway cloud platform.

### Health Check

The server provides a health check endpoint at `/health` that returns:

```json
{
  "status": "ok",
  "timestamp": "2024-01-XX...",
  "connectedUsers": 0,
  "uptime": 123.456
}
```

### API Endpoints

- `GET /health` - Health check
- `GET /api/online-users` - List online users
- WebSocket connections for real-time communication

## Environment Variables

- `PORT` - Set automatically by Railway
- `NODE_ENV` - Set to "production" by Railway

## Support

For issues or questions, check the Railway logs in the dashboard. 