/**
 * Core Functionality Test with Proper Cleanup
 * 
 * Tests the core webhook event processor functionality with proper cleanup
 * to prevent hanging after test completion.
 */

import { webhookEventProcessor } from '../plugin/LinearPlugin/webhook-event-processor'
import { linearSessionManager } from '../plugin/opencode/session-manager'
import { tuiEventStreamManager } from '../plugin/opencode/tui-event-stream'

/**
 * Cleanup background tasks to prevent hanging
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up background tasks...')
  
  try {
    // Stop TUI event stream
    if (tuiEventStreamManager && typeof (tuiEventStreamManager as any).stop === 'function') {
      (tuiEventStreamManager as any).stop()
      console.log('✅ TUI Event Stream stopped')
    }
    
    // Stop session manager cleanup task
    if (linearSessionManager && typeof (linearSessionManager as any).shutdown === 'function') {
      (linearSessionManager as any).shutdown()
      console.log('✅ Session Manager cleanup task stopped')
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
      console.log('✅ Garbage collection triggered')
    }
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error)
  }
}

/**
 * Test event processor with @opencode comment
 */
async function testEventProcessorWithOpenCode() {
  console.log('\n🧪 Testing event processor with @opencode comment...')
  
  const mockEvent = {
    type: 'Comment',
    action: 'create',
    createdAt: '2025-01-15T10:30:00Z',
    actor: { name: 'Test User', type: 'user' },
    data: {
      id: 'test-id',
      body: 'Hey @opencode can you help me with this?',
      userId: 'user-123',
      issueId: 'issue-123',
      issue: { id: 'issue-123', identifier: 'ENG-123', title: 'Test Issue' },
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
    },
    url: 'https://linear.app/test/comment/test-id'
  }
  
  try {
    const result = await webhookEventProcessor.processCommentEvent(mockEvent as any)
    
    console.log('✅ Event processor result:', {
      success: result.success,
      processed: result.processed,
      message: result.message
    })

    if (result.context && result.context.references.length > 0) {
      console.log('🔍 Detected references:', result.context.references.length)
      result.context.references.forEach((ref, index) => {
        console.log(`  ${index + 1}. "${ref.raw}" at position ${ref.position.start}-${ref.position.end}`)
      })
    }

    return result.success && result.processed
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Test event processor with regular comment (no @opencode)
 */
async function testEventProcessorWithoutOpenCode() {
  console.log('\n🧪 Testing event processor with regular comment...')
  
  const mockEvent = {
    type: 'Comment',
    action: 'create',
    createdAt: '2025-01-15T10:30:00Z',
    actor: { name: 'Test User', type: 'user' },
    data: {
      id: 'test-id-2',
      body: 'This is a regular comment without mentions.',
      userId: 'user-123',
      issueId: 'issue-456',
      issue: { id: 'issue-456', identifier: 'ENG-456', title: 'Another Issue' },
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
    },
    url: 'https://linear.app/test/comment/test-id-2'
  }
  
  try {
    const result = await webhookEventProcessor.processCommentEvent(mockEvent as any)
    
    console.log('✅ Event processor result:', {
      success: result.success,
      processed: result.processed,
      message: result.message
    })

    return result.success && !result.processed
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Test event processor with issue event
 */
async function testEventProcessorWithIssue() {
  console.log('\n🧪 Testing event processor with issue event...')
  
  const mockEvent = {
    type: 'Issue',
    action: 'create',
    createdAt: '2025-01-15T10:30:00Z',
    actor: { name: 'Test User', type: 'user' },
    data: {
      id: 'test-id',
      identifier: 'ENG-123',
      title: 'Test Issue',
      description: 'This is a test issue',
      priority: 2,
      status: 'Backlog'
    },
    url: 'https://linear.app/test/issue/test-id'
  }
  
  try {
    const result = await webhookEventProcessor.processIssueEvent(mockEvent as any)
    
    console.log('✅ Event processor result:', {
      success: result.success,
      processed: result.processed,
      message: result.message
    })

    return result.success && result.processed
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Test generic event processor
 */
async function testGenericEventProcessor() {
  console.log('\n🧪 Testing generic event processor...')
  
  const commentEvent = {
    type: 'Comment',
    action: 'create',
    createdAt: '2025-01-15T10:30:00Z',
    actor: { name: 'Test User', type: 'user' },
    data: {
      id: 'test-id',
      body: '@opencode test',
      userId: 'user-123',
      issueId: 'issue-123',
      issue: { id: 'issue-123', identifier: 'ENG-123', title: 'Test Issue' },
      user: { id: 'user-123', name: 'Test User', email: 'test@example.com' }
    },
    url: 'https://linear.app/test/comment/test-id'
  }
  
  const issueEvent = {
    type: 'Issue',
    action: 'create',
    createdAt: '2025-01-15T10:30:00Z',
    actor: { name: 'Test User', type: 'user' },
    data: {
      id: 'test-id',
      identifier: 'ENG-123',
      title: 'Test Issue',
      description: 'This is a test issue'
    },
    url: 'https://linear.app/test/issue/test-id'
  }
  
  try {
    const commentResult = await webhookEventProcessor.processEvent(commentEvent as any)
    const issueResult = await webhookEventProcessor.processEvent(issueEvent as any)
    
    console.log('✅ Generic processor results:', {
      comment: { success: commentResult.success, processed: commentResult.processed },
      issue: { success: issueResult.success, processed: issueResult.processed }
    })

    return commentResult.success && issueResult.success
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Run all core functionality tests with proper cleanup
 */
async function runCoreFunctionalityTests() {
  console.log('🚀 Starting Core Functionality Tests (with cleanup)')
  console.log('==================================================')
  
  const tests = [
    { name: 'eventProcessorWithOpenCode', fn: testEventProcessorWithOpenCode },
    { name: 'eventProcessorWithoutOpenCode', fn: testEventProcessorWithoutOpenCode },
    { name: 'eventProcessorWithIssue', fn: testEventProcessorWithIssue },
    { name: 'genericEventProcessor', fn: testGenericEventProcessor }
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
  
  console.log('\n📊 Core Test Results:')
  console.log('======================')
  
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
    console.log('🎉 All core functionality tests passed!')
    console.log('📝 The webhook event processor is working correctly:')
    console.log('   - Detects @opencode references in comments')
    console.log('   - Processes comment events appropriately')
    console.log('   - Handles issue events')
    console.log('   - Routes events through the generic processor')
  } else {
    console.log('⚠️  Some core functionality tests failed.')
    console.log('   Check the errors above for details.')
  }
  
  // Cleanup before exit
  await cleanup()
  
  console.log('\n✅ Tests completed and cleaned up successfully')
  
  return passedCount === tests.length
}

// Run the tests with proper cleanup
runCoreFunctionalityTests()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error)
    cleanup().finally(() => {
      process.exit(1)
    })
  })