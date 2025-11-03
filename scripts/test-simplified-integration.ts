/**
 * Simplified Integration Test
 * 
 * Tests the simplified approach where we just detect @opencode references
 * and pass them to OpenCode for processing, letting OpenCode handle parsing.
 */

import { webhookEventProcessor } from '../plugin/webhook-event-processor'

/**
 * Create a mock webhook payload with various @opencode references
 */
function createMockComment(body: string) {
  return {
    type: 'Comment',
    action: 'create',
    createdAt: new Date().toISOString(),
    actor: {
      name: 'Test User',
      type: 'user'
    },
    data: {
      id: 'comment-123',
      body: body,
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
    },
    url: 'https://linear.app/test/comment/comment-123'
  }
}

/**
 * Test various @opencode reference formats
 */
async function testVariousReferences() {
  console.log('\n🧪 Testing various @opencode reference formats...')
  
  const testCases = [
    '@opencode help',
    '@opencode create-file component.ts --typescript',
    '@opencode run tests --verbose',
    '@opencode deploy staging --force',
    '@Opencode STATUS',
    '@opencode can you help me with this issue?',
    '@opencode help and @opencode status please'
  ]
  
  let passed = 0
  
  for (const testCase of testCases) {
    try {
      const payload = createMockComment(testCase)
      const result = await webhookEventProcessor.processCommentEvent(payload)
      
      console.log(`\n  Test: "${testCase}"`)
      console.log(`    Success: ${result.success}`)
      console.log(`    Processed: ${result.processed}`)
      const referenceCount = result.context?.references.length || 0
      console.log(`    References: ${referenceCount}`)
      
      if (result.context && referenceCount > 0) {
        result.context.references.forEach((ref, index) => {
          console.log(`      ${index + 1}. "${ref.raw}"`)
        })
      }
      
      const success = result.success && result.processed
      console.log(`    Result: ${success ? '✅ PASS' : '❌ FAIL'}`)
      
      if (success) passed++
      
    } catch (error) {
      console.error(`  ❌ Test failed for "${testCase}":`, error)
    }
  }
  
  console.log(`\n📊 Reference format tests: ${passed}/${testCases.length} passed`)
  return passed === testCases.length
}

/**
 * Test comment without @opencode references
 */
async function testNoReferences() {
  console.log('\n🧪 Testing comment without @opencode references...')
  
  try {
    const payload = createMockComment('This is a regular comment without any mentions.')
    const result = await webhookEventProcessor.processCommentEvent(payload)
    
    console.log(`  Success: ${result.success}`)
    console.log(`  Processed: ${result.processed}`)
    console.log(`  References: ${result.context?.references.length || 0}`)
    
    const success = result.success && !result.processed && (result.context?.references.length || 0) === 0
    console.log(`  Result: ${success ? '✅ PASS' : '❌ FAIL'}`)
    
    return success
    
  } catch (error) {
    console.error(`  ❌ Test failed:`, error)
    return false
  }
}

/**
 * Test issue event processing
 */
async function testIssueEvent() {
  console.log('\n🧪 Testing issue event processing...')
  
  try {
    const payload = {
      type: 'Issue',
      action: 'create',
      createdAt: new Date().toISOString(),
      actor: {
        name: 'Test User',
        type: 'user'
      },
      data: {
        id: 'issue-456',
        identifier: 'ENG-124',
        title: 'New Issue',
        description: 'This is a new issue',
        createdAt: new Date().toISOString()
      },
      url: 'https://linear.app/test/issue/ENG-124'
    }
    
    const result = await webhookEventProcessor.processIssueEvent(payload)
    
    console.log(`  Success: ${result.success}`)
    console.log(`  Processed: ${result.processed}`)
    console.log(`  Message: ${result.message}`)
    
    const success = result.success && result.processed
    console.log(`  Result: ${success ? '✅ PASS' : '❌ FAIL'}`)
    
    return success
    
  } catch (error) {
    console.error(`  ❌ Test failed:`, error)
    return false
  }
}

/**
 * Run simplified integration tests
 */
async function runSimplifiedTests() {
  console.log('🚀 Starting Simplified Integration Tests')
  console.log('======================================')
  console.log('📝 Testing approach: Detect @opencode references and pass to OpenCode')
  console.log('🎯 Let OpenCode handle parsing and execution with its robust parser')
  
  const results = {
    variousReferences: await testVariousReferences(),
    noReferences: await testNoReferences(),
    issueEvent: await testIssueEvent()
  }

  console.log('\n📊 Simplified Integration Test Results:')
  console.log('=======================================')
  
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length
  
  Object.entries(results).forEach(([testName, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${testName}`)
  })
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log('🎉 All simplified integration tests passed!')
    console.log('📝 The simplified approach is working correctly:')
    console.log('   - Detects @opencode references in various formats')
    console.log('   - Passes raw references to OpenCode for processing')
    console.log('   - Handles comments without references')
    console.log('   - Processes issue events')
    console.log('   - Ready for OpenCode integration')
  } else {
    console.log('⚠️  Some simplified integration tests failed.')
  }
  
  return passed === total
}

// Run tests if this script is executed directly
if (require.main === module) {
  runSimplifiedTests().catch(console.error)
}

export { runSimplifiedTests }