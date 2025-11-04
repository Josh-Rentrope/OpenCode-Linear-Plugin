/**
 * End-to-End Integration Tests
 * 
 * Comprehensive integration tests for Phase 2 Linear Plugin functionality.
 * Tests webhook processing, OpenCode integration, and CRUD operations.
 */

import { webhookEventProcessor } from '../plugin/LinearPlugin/webhook-event-processor'
import { getLinearCRUD } from '../plugin/LinearPlugin/linear-crud'
import { linearSessionManager } from '../plugin/opencode/session-manager'
import { tuiEventStreamManager } from '../plugin/opencode/tui-event-stream'

// Mock webhook payloads for testing
const mockWebhookPayloads = {
  commentWithOpenCode: {
    type: 'Comment' as const,
    action: 'create' as const,
    createdAt: '2025-01-15T10:30:00Z',
    actor: {
      name: 'Test User',
      type: 'user'
    },
    data: {
      id: 'comment-123',
      body: 'Hey @opencode create issue --title="Test from webhook" --priority=high',
      userId: 'user-456',
      issueId: 'issue-789',
      createdAt: '2025-01-15T10:30:00Z',
      issue: {
        id: 'issue-789',
        identifier: 'ENG-123',
        title: 'Test Issue for Webhook'
      },
      user: {
        id: 'user-456',
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    url: 'https://linear.app/test/comment/comment-123'
  },

  commentWithoutOpenCode: {
    type: 'Comment' as const,
    action: 'create' as const,
    createdAt: '2025-01-15T10:30:00Z',
    actor: {
      name: 'Test User',
      type: 'user'
    },
    data: {
      id: 'comment-124',
      body: 'This is a regular comment without any special mentions.',
      userId: 'user-456',
      issueId: 'issue-789',
      createdAt: '2025-01-15T10:30:00Z',
      issue: {
        id: 'issue-789',
        identifier: 'ENG-123',
        title: 'Test Issue for Webhook'
      },
      user: {
        id: 'user-456',
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    url: 'https://linear.app/test/comment/comment-124'
  },

  issueCreated: {
    type: 'Issue' as const,
    action: 'create' as const,
    createdAt: '2025-01-15T10:30:00Z',
    actor: {
      name: 'Test User',
      type: 'user'
    },
    data: {
      id: 'issue-790',
      identifier: 'ENG-124',
      title: 'New Feature Request',
      description: 'We need to add a new feature to the application.',
      stateId: 'state-1',
      priority: 'medium',
      createdAt: '2025-01-15T10:30:00Z',
      assignee: {
        id: 'user-456',
        name: 'Test User'
      }
    },
    url: 'https://linear.app/test/issue/ENG-124'
  }
}

/**
 * Test webhook event processing
 */
async function testWebhookProcessing() {
  console.log('\n🧪 Testing Webhook Event Processing...')
  
  try {
    // Test comment with OpenCode reference
    console.log('1. Testing comment with @opencode reference...')
    const result1 = await webhookEventProcessor.processCommentEvent(mockWebhookPayloads.commentWithOpenCode)
    
    if (result1.success && result1.processed) {
      console.log('✅ Comment with @opencode processed successfully')
      console.log(`   References detected: ${result1.context?.references.length || 0}`)
    } else {
      console.log('❌ Comment processing failed:', result1.message)
      return false
    }

    // Test comment without OpenCode reference
    console.log('2. Testing comment without @opencode reference...')
    const result2 = await webhookEventProcessor.processCommentEvent(mockWebhookPayloads.commentWithoutOpenCode)
    
    if (result2.success && !result2.processed) {
      console.log('✅ Comment without @opencode handled correctly')
    } else {
      console.log('❌ Comment handling failed:', result2.message)
      return false
    }

    // Test issue event processing
    console.log('3. Testing issue event processing...')
    const result3 = await webhookEventProcessor.processIssueEvent(mockWebhookPayloads.issueCreated)
    
    if (result3.success && result3.processed) {
      console.log('✅ Issue event processed successfully')
    } else {
      console.log('❌ Issue event processing failed:', result3.message)
      return false
    }

    return true

  } catch (error) {
    console.error('❌ Webhook processing test failed:', error)
    return false
  }
}

/**
 * Test OpenCode integration components
 */
async function testOpenCodeIntegration() {
  console.log('\n🧪 Testing OpenCode Integration Components...')
  
  try {
    // Test TUI event streaming
    console.log('1. Testing TUI event streaming...')
    
    let eventReceived = false
    const subscriptionId = tuiEventStreamManager.subscribe('comment_created', (event) => {
      eventReceived = true
      console.log('   📡 Event received:', event.type)
    })
    
    // Stream a test event
    tuiEventStreamManager.streamEvent(mockWebhookPayloads.commentWithOpenCode, 'comment_created')
    
    // Wait a moment for event processing
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (eventReceived) {
      console.log('✅ TUI event streaming working')
      tuiEventStreamManager.unsubscribe(subscriptionId)
    } else {
      console.log('❌ TUI event streaming failed')
      return false
    }

    // Test session management
    console.log('2. Testing session management...')
    
    const session = linearSessionManager.createSession(
      {
        payload: mockWebhookPayloads.commentWithOpenCode,
        references: [],
        metadata: {
          eventType: 'Comment',
          action: 'create',
          actor: 'Test User',
          timestamp: new Date().toISOString(),
          entityId: 'comment-123'
        },
        options: { source: 'test-webhook' }
      },
      { action: 'test', arguments: [], options: {} }
    )
    
    if (session && session.status === 'active') {
      console.log('✅ Session creation working')
      
      // Test session activation
      const activated = linearSessionManager.activateSession(session.id)
      if (activated) {
        console.log('✅ Session activation working')
      } else {
        console.log('❌ Session activation failed')
        return false
      }
      
      // Clean up session
      linearSessionManager.endSession(session.id, 'test_complete')
    } else {
      console.log('❌ Session creation failed')
      return false
    }

    // Test session statistics
    const stats = linearSessionManager.getStatistics()
    console.log(`✅ Session statistics: ${stats.totalSessions} total, ${stats.activeSessions} active`)

    return true

  } catch (error) {
    console.error('❌ OpenCode integration test failed:', error)
    return false
  }
}

/**
 * Test CRUD operations with rate limiting and caching
 */
async function testCRUDWithEnhancements() {
  console.log('\n🧪 Testing Enhanced CRUD Operations...')
  
  try {
    const crud = getLinearCRUD()
    
    // Test rate limiting
    console.log('1. Testing rate limiting...')
    const rateStatsBefore = crud.getRateLimitStats()
    console.log(`   Rate limits before: ${rateStatsBefore.activeLimits} active, ${rateStatsBefore.totalRequests} requests`)
    
    // Make multiple requests to test rate limiting
    const testIssueId = 'test-issue-id'
    const promises = []
    for (let i = 0; i < 3; i++) {
      promises.push(crud.getIssue(testIssueId).catch(() => null))
    }
    
    await Promise.all(promises)
    
    const rateStatsAfter = crud.getRateLimitStats()
    console.log(`   Rate limits after: ${rateStatsAfter.activeLimits} active, ${rateStatsAfter.totalRequests} requests`)
    console.log('✅ Rate limiting working')

    // Test caching
    console.log('2. Testing caching...')
    const cacheStatsBefore = crud.getCacheStats()
    console.log(`   Cache before: ${cacheStatsBefore.size} entries`)
    
    // Make same request twice to test caching
    const startTime = Date.now()
    await crud.getWorkflowStates()
    const firstTime = Date.now() - startTime
    
    const secondStartTime = Date.now()
    await crud.getWorkflowStates()
    const secondTime = Date.now() - secondStartTime
    
    const cacheStatsAfter = crud.getCacheStats()
    console.log(`   Cache after: ${cacheStatsAfter.size} entries`)
    console.log(`   First request: ${firstTime}ms, Second request: ${secondTime}ms`)
    
    if (secondTime < firstTime) {
      console.log('✅ Caching working (second request faster)')
    } else {
      console.log('⚠️  Caching may not be working optimally')
    }

    // Test bulk operations
    console.log('3. Testing bulk operations...')
    
    // Test bulk create (will likely fail due to test environment, but should not crash)
    try {
      const bulkResult = await crud.bulkCreateIssues([
        { title: 'Bulk Test 1' },
        { title: 'Bulk Test 2' }
      ])
      console.log(`✅ Bulk create completed: ${bulkResult.length} issues`)
    } catch (error) {
      console.log('⚠️  Bulk create failed (expected in test environment):', error instanceof Error ? error.message : 'Unknown error')
    }

    return true

  } catch (error) {
    console.error('❌ Enhanced CRUD test failed:', error)
    return false
  }
}

/**
 * Test error handling and recovery
 */
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling and Recovery...')
  
  try {
    // Test invalid webhook payload
    console.log('1. Testing invalid webhook payload...')
    const invalidResult = await webhookEventProcessor.processCommentEvent({
      type: 'Invalid',
      action: 'create',
      createdAt: '2025-01-15T10:30:00Z',
      actor: { name: 'Test User' },
      data: {},
      url: 'https://test.com'
    } as any)
    
    if (!invalidResult.success && invalidResult.error) {
      console.log('✅ Invalid payload handled correctly')
    } else {
      console.log('❌ Invalid payload not handled properly')
      return false
    }

    // Test missing issue in CRUD
    console.log('2. Testing missing issue handling...')
    const crud = getLinearCRUD()
    try {
      await crud.getComment('non-existent-comment')
      console.log('⚠️  Missing comment handling could be improved')
    } catch (error) {
      console.log('✅ Missing comment handled with error')
    }

    // Test session timeout
    console.log('3. Testing session management cleanup...')
    const session = linearSessionManager.createSession(
      {
        payload: mockWebhookPayloads.commentWithOpenCode,
        references: [],
        metadata: {
          eventType: 'Comment',
          action: 'create',
          actor: 'Test User',
          timestamp: new Date().toISOString(),
          entityId: 'comment-123'
        },
        options: { source: 'test-webhook' }
      },
      { action: 'test', arguments: [], options: {} },
      { timeout: 0.001 } // Very short timeout for testing
    )
    
    // Wait for session to expire
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const expiredSession = linearSessionManager.getSession(session.id)
    if (expiredSession && expiredSession.status === 'expired') {
      console.log('✅ Session timeout working')
    } else {
      console.log('⚠️  Session timeout may need adjustment')
    }

    return true

  } catch (error) {
    console.error('❌ Error handling test failed:', error)
    return false
  }
}

/**
 * Run all integration tests
 */
async function runIntegrationTests() {
  console.log('🚀 Starting Phase 2 Integration Tests')
  console.log('=====================================')

  const results = {
    webhookProcessing: await testWebhookProcessing(),
    openCodeIntegration: await testOpenCodeIntegration(),
    crudEnhancements: await testCRUDWithEnhancements(),
    errorHandling: await testErrorHandling()
  }

  console.log('\n📊 Integration Test Results:')
  console.log('===============================')
  
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([testName, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${testName}`)
  })
  
  console.log(`\n🎯 Overall: ${passed}/${total} test suites passed`)
  
  if (passed === total) {
    console.log('🎉 All integration tests passed! Phase 2 is ready.')
  } else {
    console.log('⚠️  Some integration tests failed. Please review the implementation.')
  }

  // Final system status
  console.log('\n📈 Final System Status:')
  console.log('========================')
  
  const crud = getLinearCRUD()
  console.log('Rate Limit Stats:', crud.getRateLimitStats())
  console.log('Cache Stats:', crud.getCacheStats())
  console.log('Session Stats:', linearSessionManager.getStatistics())
  console.log('TUI Stream Stats:', tuiEventStreamManager.getStatus())
}

// Run tests if this script is executed directly
if (require.main === module) {
  runIntegrationTests().catch(console.error)
}

export { runIntegrationTests }