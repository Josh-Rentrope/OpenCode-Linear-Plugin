/**
 * Core functionality test for the webhook event processor
 * 
 * Tests the essential functionality without complex webhook payload structures.
 * This validates that the core OpenCode detection and processing logic works.
 */

import { webhookEventProcessor } from '../plugin/webhook-event-processor'

/**
 * Create a minimal mock payload for testing
 */
function createMinimalPayload(type: string, body?: string) {
  return {
    type,
    action: 'create',
    createdAt: new Date().toISOString(),
    actor: {
      name: 'Test User',
      type: 'user'
    },
    data: {
      id: 'test-id',
      ...(body && { body }),
      userId: 'user-123',
      ...(type === 'Comment' && { issueId: 'issue-123' }),
      createdAt: new Date().toISOString()
    },
    url: 'https://test.com'
  }
}

/**
 * Test the event processor with a comment containing OpenCode reference
 */
async function testEventProcessorWithOpenCode() {
  console.log('\n🧪 Testing event processor with @opencode comment...')
  
  try {
    // Create a minimal payload that the processor can handle
    const payload = createMinimalPayload('Comment', 'Hey @opencode can you help me?')
    
    // Test the comment event processing directly
    const result = await webhookEventProcessor.processCommentEvent(payload as any)
    
    console.log('✅ Event processor result:', {
      success: result.success,
      processed: result.processed,
      message: result.message
    })

    if (result.context?.references) {
      console.log('🔍 Detected references:', result.context.references.length)
      result.context.references.forEach((ref, index) => {
        console.log(`  ${index + 1}. "${ref.raw}" at position ${ref.position.start}-${ref.position.end}`)
      })
    }

    return result.success && result.processed && (result.context?.references.length || 0) > 0
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Test the event processor with a comment without OpenCode reference
 */
async function testEventProcessorWithoutOpenCode() {
  console.log('\n🧪 Testing event processor with regular comment...')
  
  try {
    const payload = createMinimalPayload('Comment', 'This is a regular comment.')
    
    const result = await webhookEventProcessor.processCommentEvent(payload as any)
    
    console.log('✅ Event processor result:', {
      success: result.success,
      processed: result.processed,
      message: result.message
    })

    return result.success && !result.processed && (result.context?.references.length || 0) === 0
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Test the event processor with an issue event
 */
async function testEventProcessorWithIssue() {
  console.log('\n🧪 Testing event processor with issue event...')
  
  try {
    const payload = createMinimalPayload('Issue')
    
    const result = await webhookEventProcessor.processIssueEvent(payload as any)
    
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
 * Test the generic event processor
 */
async function testGenericEventProcessor() {
  console.log('\n🧪 Testing generic event processor...')
  
  try {
    const commentPayload = createMinimalPayload('Comment', '@opencode test')
    const issuePayload = createMinimalPayload('Issue')
    
    const commentResult = await webhookEventProcessor.processEvent(commentPayload as any)
    const issueResult = await webhookEventProcessor.processEvent(issuePayload as any)
    
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
 * Run all core functionality tests
 */
async function runCoreTests() {
  console.log('🚀 Starting Core Functionality Tests')
  console.log('====================================')
  
  const results = {
    eventProcessorWithOpenCode: await testEventProcessorWithOpenCode(),
    eventProcessorWithoutOpenCode: await testEventProcessorWithoutOpenCode(),
    eventProcessorWithIssue: await testEventProcessorWithIssue(),
    genericEventProcessor: await testGenericEventProcessor()
  }

  console.log('\n📊 Core Test Results:')
  console.log('======================')
  
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([testName, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${testName}`)
  })
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 All core functionality tests passed!')
    console.log('📝 The webhook event processor is working correctly:')
    console.log('   - Detects @opencode references in comments')
    console.log('   - Processes comment events appropriately')
    console.log('   - Handles issue events')
    console.log('   - Routes events through the generic processor')
  } else {
    console.log('⚠️  Some core tests failed. Please check the implementation.')
  }
  
  return passed === total
}

// Run tests if this script is executed directly
if (require.main === module) {
  runCoreTests().catch(console.error)
}

export { runCoreTests }