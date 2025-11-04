/**
 * Simple Webhook Integration Test
 * 
 * Tests webhook processing without complex type dependencies
 * to verify the integration pipeline works correctly.
 */

import { webhookEventProcessor } from '../plugin/LinearPlugin/webhook-event-processor'

/**
 * Create a simple mock webhook event for testing
 */
function createMockWebhookEvent(type: string, action: string, data: any) {
  return {
    type,
    action,
    createdAt: new Date().toISOString(),
    actor: {
      name: 'Test User',
      type: 'user'
    },
    data,
    url: `https://linear.app/test/${type.toLowerCase()}/test-id`
  }
}

/**
 * Test comment webhook event processing
 */
async function testCommentWebhook() {
  console.log('\n🧪 Testing comment webhook event processing...')
  
  const mockEvent = createMockWebhookEvent('Comment', 'create', {
    id: 'comment-123',
    body: 'Hey @opencode can you help me implement a new feature?',
    userId: 'user-456',
    issueId: 'issue-789',
    createdAt: new Date().toISOString(),
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
  })
  
  try {
    const result = await webhookEventProcessor.processCommentEvent(mockEvent as any)
    
    console.log('✅ Comment webhook result:', {
      success: result.success,
      processed: result.processed,
      message: result.message,
      hasContext: !!result.context
    })

    if (result.context) {
      console.log('📊 Processing details:', {
        hasReferences: result.context.references.length > 0,
        referenceCount: result.context.references.length,
        eventType: result.context.metadata.eventType,
        entityId: result.context.metadata.entityId
      })
    }

    return result.success && result.processed
  } catch (error) {
    console.error('❌ Comment webhook test failed:', error)
    return false
  }
}

/**
 * Test issue webhook event processing
 */
async function testIssueWebhook() {
  console.log('\n🧪 Testing issue webhook event processing...')
  
  const mockEvent = createMockWebhookEvent('Issue', 'create', {
    id: 'issue-789',
    identifier: 'ENG-123',
    title: 'New Feature Request',
    description: 'We need to implement a new feature for the application',
    priority: 2,
    status: 'Backlog',
    createdAt: new Date().toISOString(),
    assignee: {
      id: 'user-456',
      name: 'Test User',
      email: 'test@example.com'
    }
  })
  
  try {
    const result = await webhookEventProcessor.processIssueEvent(mockEvent as any)
    
    console.log('✅ Issue webhook result:', {
      success: result.success,
      processed: result.processed,
      message: result.message,
      hasContext: !!result.context
    })

    return result.success && result.processed
  } catch (error) {
    console.error('❌ Issue webhook test failed:', error)
    return false
  }
}

/**
 * Test webhook event without OpenCode reference
 */
async function testWebhookWithoutOpenCode() {
  console.log('\n🧪 Testing webhook without @opencode reference...')
  
  const mockEvent = createMockWebhookEvent('Comment', 'create', {
    id: 'comment-456',
    body: 'This is a regular comment without any special mentions.',
    userId: 'user-789',
    issueId: 'issue-123',
    createdAt: new Date().toISOString(),
    issue: {
      id: 'issue-123',
      identifier: 'ENG-456',
      title: 'Regular Issue'
    },
    user: {
      id: 'user-789',
      name: 'Another User',
      email: 'another@example.com'
    }
  })
  
  try {
    const result = await webhookEventProcessor.processCommentEvent(mockEvent as any)
    
    console.log('✅ Regular webhook result:', {
      success: result.success,
      processed: result.processed,
      message: result.message
    })

    // Should succeed but not be processed for OpenCode
    return result.success && !result.processed
  } catch (error) {
    console.error('❌ Regular webhook test failed:', error)
    return false
  }
}

/**
 * Run all webhook integration tests
 */
async function runWebhookIntegrationTests() {
  console.log('🚀 Starting Webhook Integration Tests')
  console.log('=====================================')
  
  const tests = [
    { name: 'commentWebhook', fn: testCommentWebhook },
    { name: 'issueWebhook', fn: testIssueWebhook },
    { name: 'webhookWithoutOpenCode', fn: testWebhookWithoutOpenCode }
  ]
  
  const results = await Promise.allSettled(
    tests.map(async (test) => {
      try {
        const passed = await test.fn()
        return { name: test.name, passed, error: null }
      } catch (error) {
        return { name: test.name, passed: false, error }
      }
    })
  )
  
  console.log('\n📊 Webhook Integration Test Results:')
  console.log('=====================================')
  
  let passedCount = 0
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { name, passed, error } = result.value
      const status = passed ? '✅ PASS' : '❌ FAIL'
      console.log(`${status} ${name}`)
      if (error) {
        console.log(`   Error: ${error}`)
      }
      if (passed) passedCount++
    } else {
      console.log(`❌ FAIL ${tests[index].name}`)
      console.log(`   Error: ${result.reason}`)
    }
  })
  
  console.log(`\n🎯 Overall: ${passedCount}/${tests.length} tests passed`)
  
  if (passedCount === tests.length) {
    console.log('🎉 All webhook integration tests passed!')
    console.log('📝 The webhook integration pipeline is working correctly:')
    console.log('   - Processes comment events with @opencode references')
    console.log('   - Handles issue events appropriately')
    console.log('   - Correctly ignores events without @opencode references')
    console.log('   - Maintains proper error handling and logging')
  } else {
    console.log('⚠️  Some webhook integration tests failed.')
    console.log('   Check the errors above for details.')
  }
  
  return passedCount === tests.length
}

// Run the tests
runWebhookIntegrationTests()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  })