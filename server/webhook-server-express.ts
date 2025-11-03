/**
 * Linear Webhook Server - Express Implementation
 * 
 * This is the traditional Node.js Express server for handling Linear webhooks.
 * It provides full control over the environment and is great for:
 * - Local development with hot reload
 * - Self-hosting on your own infrastructure
 * - Custom middleware and request processing
 * - Debugging and testing
 * 
 * Architecture:
 * - Uses shared webhook handlers and middleware
 * - Configurable port and webhook endpoint
 * - Comprehensive error handling and logging
 * - Health check endpoint for monitoring
 */

import express, { Request, Response, NextFunction } from 'express'
import { verifyWebhookSignature, extractSignature } from './middleware/signature-verification'
import { handleWebhook, handleHealthCheck } from './webhook-handlers'
import type { LinearWebhookPayload } from './types/linear-webhook-types'

/**
 * Express server configuration
 * These can be overridden by environment variables
 */
const config = {
  port: parseInt(process.env.WEBHOOK_PORT || '3000', 10),
  webhookPath: process.env.WEBHOOK_PATH || '/webhooks/linear',
  webhookSecret: process.env.LINEAR_WEBHOOK_SECRET || '',
  enableCors: process.env.ENABLE_CORS === 'true'
}

/**
 * Initialize Express application
 * Sets up middleware and routes for webhook handling
 */
function createApp(): express.Application {
  const app = express()

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`)
    next()
  })

  // CORS middleware (optional, for development)
  if (config.enableCors) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      res.header('Access-Control-Allow-Headers', 'Content-Type, linear-signature, linear-timestamp')
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200)
        return
      }
      next()
    })
  }

  // Raw body parser for webhook signature verification
  // We need raw body to verify Linear's signature
  app.use(config.webhookPath, express.raw({ type: 'application/json' }), async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify webhook signature before processing
      const signature = extractSignature(req.headers as Record<string, string>)
      const payload = req.body.toString() // Convert Buffer to string
      
      if (!signature) {
        console.error('❌ Missing Linear signature header')
        res.status(401).json({ error: 'Missing signature' })
        return
      }

      if (!verifyWebhookSignature(payload, signature, config.webhookSecret)) {
        console.error('❌ Invalid webhook signature')
        res.status(401).json({ error: 'Invalid signature' })
        return
      }

      // Parse JSON payload after signature verification
      const webhookPayload: LinearWebhookPayload = JSON.parse(payload)
      req.body = webhookPayload // Replace raw body with parsed payload
      next()
    } catch (error) {
      console.error('❌ Webhook processing error:', error)
      res.status(400).json({ error: 'Invalid webhook payload' })
    }
  })

  // JSON parser for other routes
  app.use(express.json())

  return app
}

/**
 * Setup webhook routes
 * Defines the main webhook endpoint and health check
 */
function setupRoutes(app: express.Application): void {
  /**
   * Main webhook endpoint
   * POST /webhooks/linear (or configured path)
   * 
   * Linear will send webhook events to this endpoint
   * The signature verification middleware runs before this handler
   */
  app.post(config.webhookPath, async (req: Request, res: Response) => {
    try {
      const payload = req.body as LinearWebhookPayload
      const result = await handleWebhook(payload)

      if (result.success) {
        res.status(200).json({
          message: result.message,
          data: result.data
        })
      } else {
        // Processing error but still return 200 to Linear
        // Linear expects 200 for successful delivery, even if processing fails
        res.status(200).json({
          message: result.message,
          error: result.error
        })
      }
    } catch (error) {
      console.error('❌ Webhook handler error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * Health check endpoint
   * GET /health
   * 
   * Useful for monitoring, load balancers, and development testing
   */
  app.get('/health', (req: Request, res: Response) => {
    const health = handleHealthCheck()
    res.status(health.success ? 200 : 500).json(health)
  })

  /**
   * Server info endpoint
   * GET /info
   * 
   * Shows server configuration and status
   */
  app.get('/info', (req: Request, res: Response) => {
    res.json({
      server: 'Linear Webhook Server (Express)',
      version: '1.0.0',
      config: {
        port: config.port,
        webhookPath: config.webhookPath,
        hasWebhookSecret: !!config.webhookSecret,
        corsEnabled: config.enableCors
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    })
  })

  /**
   * Root endpoint
   * GET /
   * 
   * Basic server information
   */
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Linear Webhook Server (Express)',
      endpoints: {
        webhook: `POST ${config.webhookPath}`,
        health: 'GET /health',
        info: 'GET /info'
      },
      docs: 'See README.md for setup instructions'
    })
  })

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found' })
  })
}

/**
 * Start the Express server
 * Creates app, sets up routes, and starts listening
 */
function startServer(): express.Application {
  // Validate configuration
  if (!config.webhookSecret) {
    console.warn('⚠️  WARNING: LINEAR_WEBHOOK_SECRET not set - signature verification disabled')
    console.warn('   Set this environment variable for production use')
  }

  // Create and configure app
  const app = createApp()
  setupRoutes(app)

  // Start server
  app.listen(config.port, () => {
    console.log('🚀 Linear Webhook Server (Express) started successfully!')
    console.log(`📍 Server: http://localhost:${config.port}`)
    console.log(`🔗 Webhook: POST http://localhost:${config.port}${config.webhookPath}`)
    console.log(`💚 Health: GET http://localhost:${config.port}/health`)
    console.log(`ℹ️  Info: GET http://localhost:${config.port}/info`)
    console.log('')
    console.log('📋 Setup Instructions:')
    console.log(`1. Configure Linear webhook URL: http://localhost:${config.port}${config.webhookPath}`)
    console.log('2. Set webhook secret to match your LINEAR_WEBHOOK_SECRET')
    console.log('3. Test with: curl http://localhost:' + config.port + '/health')
    console.log('')
  })

  return app
}

// Start server if this file is run directly
if (require.main === module) {
  startServer()
}

// Export for testing or programmatic use
export { createApp, setupRoutes, startServer, config }