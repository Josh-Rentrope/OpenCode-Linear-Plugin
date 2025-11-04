/**
 * Integration test for webhook handlers with OpenCode detection
 * 
 * Tests that the webhook handlers properly integrate with the OpenCode reference detector
 * and that the processing pipeline works end-to-end.
 */

import { handleWebhook, handleHealthCheck } from '../server/webhook-handlers'

/**
 * Create a minimal webhook payload that matches the expected structure
 */
function createMockCommentPayload(body: string) {
  return {
    webhookId: 'webhook-123',
    lastSyncId: 0,
    success: true,
    _request: {
      id: 'req-123',
      headers: {},
      method: 'POST'
    },
    paginate: {},
    webhook: {
      id: 'webhook-123',
      url: 'https://example.com/webhook',
      createdAt: '2025-01-15T10:30:00Z',
      updatedAt: '2025-01-15T10:30:00Z'
    },
    type: 'Comment' as const,
    action: 'create' as const,
    createdAt: '2025-01-15T10:30:00Z',
    actor: {
      name: 'Test User',
      type: 'user' as const
    },
    data: {
      id: 'comment-123',
      body: body,
      userId: 'user-456',
      issueId: 'issue-789',
      createdAt: '2025-01-15T10:30:00Z',
      issue: {
        id: 'issue-789',
        identifier: 'ENG-123',
        title: 'Test Issue'
      },
      user: {
        id: 'user-456',
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    url: 'https://linear.app/test/comment/comment-123'
  }
}

/**
 * Test comment with OpenCode reference
 */
async function testCommentWithOpenCode() {
  console.log('\n🧪 Testing webhook handler with @opencode comment...')
  
  const payload = createMockCommentPayload('Hey @opencode can you help me with this?')
  
  try {
    const result = await handleWebhook(payload as any)
    
    console.log('✅ Handler result:', {
      success: result.success,
      message: result.message,
      hasData: !!result.data
    })

    if (result.data) {
      console.log('📊 Data details:', {
        openCodeProcessed: result.data.openCodeProcessed,
        openCodeReferences: result.data.openCodeReferences
      })
    }

    return result.success && result.data?.openCodeProcessed && result.data?.openCodeReferences > 0
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Test comment without OpenCode reference
 */
async function testCommentWithoutOpenCode() {
  console.log('\n🧪 Testing webhook handler with regular comment...')
  
  const payload = createMockCommentPayload('This is a regular comment without mentions.')
  
  try {
    const result = await handleWebhook(payload as any)
    
    console.log('✅ Handler result:', {
      success: result.success,
      message: result.message,
      hasData: !!result.data
    })

    if (result.data) {
      console.log('📊 Data details:', {
        openCodeProcessed: result.data.openCodeProcessed,
        openCodeReferences: result.data.openCodeReferences
      })
    }

    return result.success && !result.data?.openCodeProcessed && result.data?.openCodeReferences === 0
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Test health check
 */
async function testHealthCheck() {
  console.log('\n🧪 Testing health check...')
  
  try {
    const result = handleHealthCheck()
    
    console.log('✅ Health check result:', {
      success: result.success,
      message: result.message,
      hasData: !!result.data
    })

    return result.success
  } catch (error) {
    console.error('❌ Health check failed:', error)
    return false
  }
}

/**
 * Run all integration tests
 */
async function runIntegrationTests() {
  console.log('🚀 Starting Integration Tests')
  console.log('===============================')
  
  const results = {
    commentWithOpenCode: await testCommentWithOpenCode(),
    commentWithoutOpenCode: await testCommentWithoutOpenCode(),
    healthCheck: await testHealthCheck()
  }

  console.log('\n📊 Integration Test Results:')
  console.log('=============================')
  
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([testName, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${testName}`)
  })
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 All integration tests passed! Webhook handlers are working correctly with OpenCode detection.')
  } else {
    console.log('⚠️  Some integration tests failed. Please check the implementation.')
  }
  
  return passed === total
}

// Run tests if this script is executed directly
if (require.main === module) {
  runIntegrationTests().catch(console.error)
}

export { runIntegrationTests }