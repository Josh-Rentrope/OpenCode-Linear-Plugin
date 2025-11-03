/**
 * Test script for Webhook Event Processor
 * 
 * Tests the OpenCode reference detection and event processing functionality.
 * This script validates that the processor correctly identifies @opencode mentions
 * in comment events and processes them appropriately.
 */

import { webhookEventProcessor } from '../plugin/webhook-event-processor'

// Mock webhook payloads for testing
const mockCommentPayloadWithOpenCode = {
  type: 'Comment' as const,
  action: 'create' as const,
  createdAt: '2025-01-15T10:30:00Z',
  actor: {
    name: 'Test User',
    type: 'user'
  },
  data: {
    id: 'comment-123',
    body: 'Hey @opencode can you help me with this issue? I need to create a new component.',
    userId: 'user-456',
    issueId: 'issue-789',
    createdAt: '2025-01-15T10:30:00Z',
    issue: {
      id: 'issue-789',
      identifier: 'ENG-123',
      title: 'Create new component'
    },
    user: {
      id: 'user-456',
      name: 'Test User',
      email: 'test@example.com'
    }
  },
  url: 'https://linear.app/test/comment/comment-123'
}

const mockCommentPayloadWithoutOpenCode = {
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
      title: 'Create new component'
    },
    user: {
      id: 'user-456',
      name: 'Test User',
      email: 'test@example.com'
    }
  },
  url: 'https://linear.app/test/comment/comment-124'
}

const mockIssuePayload = {
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
    title: 'New feature request',
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

/**
 * Test comment event with OpenCode references
 */
async function testCommentWithOpenCode() {
  console.log('\n🧪 Testing comment event WITH @opencode reference...')
  
  try {
    const result = await webhookEventProcessor.processCommentEvent(mockCommentPayloadWithOpenCode)
    
    console.log('✅ Result:', {
      success: result.success,
      processed: result.processed,
      message: result.message,
      referenceCount: result.context?.references.length || 0
    })

    if (result.context && result.context.references.length > 0) {
      console.log('🔍 Detected references:')
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
 * Test comment event without OpenCode references
 */
async function testCommentWithoutOpenCode() {
  console.log('\n🧪 Testing comment event WITHOUT @opencode reference...')
  
  try {
    const result = await webhookEventProcessor.processCommentEvent(mockCommentPayloadWithoutOpenCode)
    
    console.log('✅ Result:', {
      success: result.success,
      processed: result.processed,
      message: result.message,
      referenceCount: result.context?.references.length || 0
    })

    return result.success && !result.processed && (result.context?.references.length || 0) === 0
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Test issue event processing
 */
async function testIssueEvent() {
  console.log('\n🧪 Testing issue event processing...')
  
  try {
    const result = await webhookEventProcessor.processIssueEvent(mockIssuePayload)
    
    console.log('✅ Result:', {
      success: result.success,
      processed: result.processed,
      message: result.message,
      entityType: result.context?.metadata.eventType
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
async function testGenericProcessor() {
  console.log('\n🧪 Testing generic event processor...')
  
  try {
    const commentResult = await webhookEventProcessor.processEvent(mockCommentPayloadWithOpenCode)
    const issueResult = await webhookEventProcessor.processEvent(mockIssuePayload)
    
    console.log('✅ Comment processing:', {
      success: commentResult.success,
      processed: commentResult.processed
    })
    
    console.log('✅ Issue processing:', {
      success: issueResult.success,
      processed: issueResult.processed
    })

    return commentResult.success && issueResult.success
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Webhook Event Processor Tests')
  console.log('==========================================')

  const results = {
    commentWithOpenCode: await testCommentWithOpenCode(),
    commentWithoutOpenCode: await testCommentWithoutOpenCode(),
    issueEvent: await testIssueEvent(),
    genericProcessor: await testGenericProcessor()
  }

  console.log('\n📊 Test Results Summary:')
  console.log('=========================')
  
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([testName, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${testName}`)
  })
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 All tests passed! Webhook Event Processor is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.')
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error)
}

export { runTests }