#!/usr/bin/env node

/**
 * Linear Webhook Test Script
 * 
 * This script sends test webhook payloads to your local server
 * to verify that everything is working correctly.
 */

const http = require('http')
const crypto = require('crypto')

// Load environment variables
require('dotenv').config()

const config = {
  host: 'localhost',
  port: process.env.WEBHOOK_PORT || 3000,
  path: process.env.WEBHOOK_PATH || '/webhooks/linear',
  secret: process.env.LINEAR_WEBHOOK_SECRET
}

// Test webhook payloads
const testPayloads = [
  {
    name: 'Issue Created',
    type: 'Issue',
    action: 'create',
    data: {
      id: 'test-issue-123',
      identifier: 'TEST-123',
      title: 'Test Issue Created',
      description: 'This is a test issue created by the test script',
      state: { name: 'Backlog', type: 'backlog' },
      assignee: { name: 'Test User', email: 'test@example.com' },
      priority: 'medium',
      url: 'https://linear.app/test/issue/TEST-123'
    },
    createdAt: new Date().toISOString()
  },
  {
    name: 'Comment Created',
    type: 'Comment',
    action: 'create',
    data: {
      id: 'test-comment-456',
      body: 'This is a test comment created by the test script',
      user: { name: 'Test User', email: 'test@example.com' },
      issueId: 'test-issue-123',
      issue: {
        id: 'test-issue-123',
        identifier: 'TEST-123',
        title: 'Test Issue Created'
      },
      createdAt: new Date().toISOString()
    },
    createdAt: new Date().toISOString()
  }
]

/**
 * Generate Linear webhook signature
 */
function generateSignature(payload, secret) {
  if (!secret) {
    console.warn('⚠️  No webhook secret configured - signature will be invalid')
    return 'sha256=test'
  }
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return `sha256=${signature}`
}

/**
 * Send test webhook to server
 */
function sendTestWebhook(payload) {
  return new Promise((resolve, reject) => {
    const payloadString = JSON.stringify(payload)
    const signature = generateSignature(payloadString, config.secret)
    
    const options = {
      hostname: config.host,
      port: config.port,
      path: config.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'linear-signature': signature
      }
    }

    console.log(`\n📤 Sending ${payload.name} webhook...`)
    console.log(`   URL: http://${config.host}:${config.port}${config.path}`)
    console.log(`   Type: ${payload.type} ${payload.action}`)

    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`)
        console.log(`   Response: ${data}`)
        
        if (res.statusCode === 200) {
          console.log(`   ✅ ${payload.name} test passed`)
        } else {
          console.log(`   ❌ ${payload.name} test failed`)
        }
        
        resolve({ statusCode: res.statusCode, data })
      })
    })

    req.on('error', (error) => {
      console.error(`   ❌ Request failed: ${error.message}`)
      reject(error)
    })

    req.write(payloadString)
    req.end()
  })
}

/**
 * Check if server is running
 */
function checkServer() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: config.host,
      port: config.port,
      path: '/health',
      method: 'GET'
    }

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200)
    })

    req.on('error', () => {
      resolve(false)
    })

    req.end()
  })
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🧪 Linear Webhook Test Script')
  console.log('==============================\n')
  
  console.log(`🔧 Configuration:`)
  console.log(`   Server: http://${config.host}:${config.port}`)
  console.log(`   Webhook Path: ${config.path}`)
  console.log(`   Secret: ${config.secret ? '✅ Configured' : '❌ Missing'}`)

  // Check if server is running
  console.log('\n🔍 Checking server status...')
  const serverRunning = await checkServer()
  
  if (!serverRunning) {
    console.log('❌ Server is not running')
    console.log('   Start the server with: npm run dev:express')
    process.exit(1)
  }
  
  console.log('✅ Server is running')

  // Run tests
  console.log('\n🚀 Running webhook tests...')
  
  for (const payload of testPayloads) {
    try {
      await sendTestWebhook(payload)
    } catch (error) {
      console.error(`❌ ${payload.name} test failed: ${error.message}`)
    }
  }

  console.log('\n✅ All tests completed!')
  console.log('\n💡 Tips:')
  console.log('   - Check server logs for detailed webhook processing')
  console.log('   - Verify webhook signature is configured correctly')
  console.log('   - Test with different payload types as needed')
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error.message)
    process.exit(1)
  })
}

module.exports = { sendTestWebhook, checkServer }