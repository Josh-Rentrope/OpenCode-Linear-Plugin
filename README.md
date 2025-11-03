# Linear Webhook Plugin for OpenCode

A comprehensive Linear webhook integration that supports both Express and Netlify Functions deployments. This plugin provides real-time webhook processing for Linear issues, comments, and other events with full TypeScript support and security features.

## Features

- **Dual Deployment Options**: Express server or Netlify Functions
- **Type-Safe**: Full TypeScript support with Linear's official types
- **Secure**: HMAC-SHA256 signature verification
- **Flexible**: Full access to Linear webhook payloads
- **Developer-Friendly**: Comprehensive tooling and documentation

## Quick Start

### 1. Installation

```bash
# Clone or copy this directory
cd LinearPlugin-dev

# Install dependencies
npm install

# Set up environment
npm run dev:setup
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required: Get from https://linear.app/settings/account/security
LINEAR_API_KEY=lin_api_your_actual_api_key_here

# Required: Generate with: openssl rand -hex 32
LINEAR_WEBHOOK_SECRET=your_secure_webhook_secret_here

# Optional: Express server configuration
WEBHOOK_PORT=3000
WEBHOOK_PATH=/webhooks/linear
ENABLE_CORS=false
```

### 3. Development

#### Express Server (Traditional Node.js)
```bash
npm run dev:express
# Server runs on http://localhost:3000
```

#### Netlify Functions (Serverless)
```bash
npm run dev:netlify
# Functions run on http://localhost:8888
```

### 4. Testing

```bash
# Test webhook endpoints with sample payloads
npm run test:webhook

# Check server health
npm run health:express  # or health:netlify
```

## Deployment Options

### Option 1: Express Server

Best for:
- Full control over server environment
- Custom middleware and processing
- Self-hosting on your infrastructure

**Production Deployment:**
```bash
# Start server
npm start

# Or use PM2 for process management
pm2 start server/webhook-server-express.js --name linear-webhook
```

**Webhook URL:** `http://your-server.com:3000/webhooks/linear`

### Option 2: Netlify Functions

Best for:
- Serverless deployment
- Auto-scaling and pay-per-use
- Quick production setup

**Production Deployment:**
1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on git push

**Webhook URL:** `https://your-site.netlify.app/webhooks/linear`

## Linear Webhook Configuration

1. Go to Linear Settings → Developers → Webhooks
2. Create new webhook with:
   - **URL**: Your chosen webhook URL
   - **Secret**: Same value as `LINEAR_WEBHOOK_SECRET`
   - **Events**: Select "Issue" and "Comment" for Phase 1
   - **Active**: Enable the webhook

## Architecture

### Shared Components

- **`server/types/linear-webhook-types.ts`**: Linear's official webhook types
- **`server/middleware/signature-verification.ts`**: Security middleware
- **`server/webhook-handlers.ts`**: Event processing logic

### Platform-Specific

- **`server/webhook-server-express.ts`**: Express server implementation
- **`server/webhook-server-netlify.ts`**: Netlify Functions implementation
- **`netlify.toml`**: Netlify configuration and routing

## Custom Event Handling

Developers have full access to Linear webhook payloads and can create custom handlers:

```typescript
import type { LinearWebhookPayload } from './types/linear-webhook-types'

// Example: Custom issue handler
async function handleCustomIssue(payload: LinearWebhookPayload) {
  if (payload.type === 'Issue' && payload.action === 'create') {
    const issue = payload.data
    
    // Access any property from the full payload
    if (issue.priority === 'urgent') {
      await sendUrgentNotification(issue)
    }
    
    // Check previous values for update events
    if (payload.updatedFrom?.state?.name !== issue.state?.name) {
      await handleStateChange(issue, payload.updatedFrom.state)
    }
  }
}
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:setup` | Environment setup and validation |
| `npm run dev:express` | Start Express server locally |
| `npm run dev:netlify` | Start Netlify functions locally |
| `npm run test:webhook` | Test webhook endpoints |
| `npm run health:express` | Check Express server health |
| `npm run health:netlify` | Check Netlify functions health |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LINEAR_API_KEY` | Yes | - | Linear API key for authentication |
| `LINEAR_WEBHOOK_SECRET` | Yes | - | Secret for webhook signature verification |
| `WEBHOOK_PORT` | No | 3000 | Port for Express server |
| `WEBHOOK_PATH` | No | /webhooks/linear | Webhook endpoint path |
| `ENABLE_CORS` | No | false | Enable CORS for development |
| `NETLIFY_DEBUG` | No | false | Enable debug logging for Netlify |

## Security Considerations

- Always use HTTPS in production
- Keep webhook secrets secure and rotate regularly
- Validate all webhook signatures
- Monitor webhook processing logs
- Implement rate limiting if needed

## Troubleshooting

### Common Issues

**Webhook signature verification fails:**
- Ensure `LINEAR_WEBHOOK_SECRET` matches Linear webhook configuration
- Check that the payload is not modified before verification

**Server not receiving webhooks:**
- Verify firewall settings allow incoming connections
- Check that webhook URL is accessible from Linear's servers
- Ensure server is running and listening on correct port

**Environment variables not loading:**
- Run `npm run dev:setup` to validate configuration
- Check that `.env` file exists in project root
- Verify variable names match exactly

### Debug Mode

Enable detailed logging:

```bash
# Express server
ENABLE_CORS=true npm run dev:express

# Netlify functions
NETLIFY_DEBUG=true npm run dev:netlify
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check this README first
- Review the server logs for error details
- Open an issue in the repository