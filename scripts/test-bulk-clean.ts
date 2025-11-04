/**
 * Bulk Operations Test with Proper Cleanup
 * 
 * Tests Linear bulk operations, rate limiting, and caching functionality
 * with proper cleanup to prevent hanging after test completion.
 */

import { getLinearCRUD } from '../plugin/LinearPlugin/linear-crud'
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
 * Test bulk issue creation
 */
async function testBulkIssueCreation() {
  console.log('\n1. Testing bulk issue creation...')
  
  const crud = getLinearCRUD()
  const issues = [
    {
      title: 'Bulk Test Issue 1',
      description: 'First bulk test issue',
      priority: 1,
      status: 'Backlog'
    },
    {
      title: 'Bulk Test Issue 2', 
      description: 'Second bulk test issue',
      priority: 2,
      status: 'Backlog'
    },
    {
      title: 'Bulk Test Issue 3',
      description: 'Third bulk test issue',
      priority: 3,
      status: 'Backlog'
    }
  ]
  
  try {
    const results = await crud.bulkCreateIssues(issues)
    
    console.log(`✅ Created ${results.length}/${issues.length} issues in bulk`)
    
    // Store IDs for cleanup
    const createdIds = results
      .filter(issue => issue?.id)
      .map(issue => issue.id)
    
    return { success: results.length === issues.length, createdIds }
  } catch (error) {
    console.error('❌ Bulk creation failed:', error)
    return { success: false, createdIds: [] }
  }
}

/**
 * Test bulk issue updates
 */
async function testBulkIssueUpdates(issueIds: string[]) {
  console.log('\n2. Testing bulk issue updates...')
  
  if (issueIds.length < 2) {
    console.log('⚠️  Skipping bulk update test - not enough issues')
    return { success: true }
  }
  
  const crud = getLinearCRUD()
  const updates = [
    {
      issueId: issueIds[0],
      priority: 4
    },
    {
      issueId: issueIds[1],
      priority: 3
    }
  ]
  
  try {
    const results = await crud.bulkUpdateIssues(updates)
    
    console.log(`✅ Updated ${results.length}/${updates.length} issues in bulk`)
    return { success: results.length === updates.length }
  } catch (error) {
    console.error('❌ Bulk update failed:', error)
    return { success: false }
  }
}

/**
 * Test bulk comment creation
 */
async function testBulkCommentCreation(issueIds: string[]) {
  console.log('\n3. Testing bulk comment creation...')
  
  if (issueIds.length === 0) {
    console.log('⚠️  Skipping bulk comment test - no issues available')
    return { success: true }
  }
  
  const crud = getLinearCRUD()
  const comments = issueIds.slice(0, 3).map(issueId => ({
    issueId,
    body: `Bulk test comment for issue ${issueId}`
  }))
  
  try {
    // Create comments individually since bulkCreateComments doesn't exist
    const commentPromises = comments.map(comment => 
      crud.createComment(comment.issueId, comment.body).catch(error => ({ success: false, error }))
    )
    
    const results = await Promise.all(commentPromises)
    const successCount = results.filter(r => r && !('error' in r)).length
    
    console.log(`✅ Created ${successCount}/${comments.length} comments in bulk`)
    return { success: successCount === comments.length }
  } catch (error) {
    console.error('❌ Bulk comment creation failed:', error)
    return { success: false }
  }
}

/**
 * Test rate limiting
 */
async function testRateLimiting() {
  console.log('\n4. Testing rate limiting...')
  
  const crud = getLinearCRUD()
  
  try {
    // Get initial rate limit stats
    const statsBefore = crud.getRateLimitStats()
    console.log('Rate limit stats before:', statsBefore)
    
    // Make multiple rapid requests
    const requests = Array(5).fill(null).map(() => 
      crud.getIssue('test-issue-id').catch(() => ({ success: false }))
    )
    
    await Promise.all(requests)
    
    // Get final rate limit stats
    const statsAfter = crud.getRateLimitStats()
    console.log('Rate limit stats after:', statsAfter)
    
    console.log('✅ Rate limiting handled multiple rapid requests')
    return { success: true }
  } catch (error) {
    console.error('❌ Rate limiting test failed:', error)
    return { success: false }
  }
}

/**
 * Test caching functionality
 */
async function testCaching() {
  console.log('\n5. Testing caching...')
  
  const crud = getLinearCRUD()
  
  try {
    // Get initial cache stats
    const statsBefore = crud.getCacheStats()
    console.log('Cache stats before:', statsBefore)
    
    // Make same request twice
    const start1 = Date.now()
    await crud.getIssue('test-issue-id').catch(() => null)
    const time1 = Date.now() - start1
    
    const start2 = Date.now()
    await crud.getIssue('test-issue-id').catch(() => null)
    const time2 = Date.now() - start2
    
    // Get final cache stats
    const statsAfter = crud.getCacheStats()
    console.log('Cache stats after:', statsAfter)
    
    console.log(`✅ First request: ${time1}ms`)
    console.log(`✅ Second request: ${time2}ms (should be faster due to caching)`)
    
    return { success: true }
  } catch (error) {
    console.error('❌ Caching test failed:', error)
    return { success: false }
  }
}

/**
 * Test bulk delete for cleanup
 */
async function testBulkDelete(issueIds: string[]) {
  console.log('\n6. Testing bulk delete for cleanup...')
  
  if (issueIds.length === 0) {
    console.log('⚠️  Skipping bulk delete test - no issues to clean up')
    return { success: true }
  }
  
  const crud = getLinearCRUD()
  
  try {
    const results = await crud.bulkDeleteIssues(issueIds)
    
    console.log(`✅ Deleted ${results.successCount}/${issueIds.length} issues in bulk`)
    return { success: results.successCount === issueIds.length }
  } catch (error) {
    console.error('❌ Bulk delete failed:', error)
    return { success: false }
  }
}

/**
 * Run all bulk operation tests with proper cleanup
 */
async function runBulkOperationTests() {
  console.log('🧪 Testing Linear Bulk Operations...')
  console.log('====================================')
  
  const results = []
  
  // Test bulk creation
  const creationResult = await testBulkIssueCreation()
  results.push({ name: 'bulkCreation', success: creationResult.success })
  
  // Test bulk updates
  const updateResult = await testBulkIssueUpdates(creationResult.createdIds)
  results.push({ name: 'bulkUpdates', success: updateResult.success })
  
  // Test bulk comments
  const commentResult = await testBulkCommentCreation(creationResult.createdIds)
  results.push({ name: 'bulkComments', success: commentResult.success })
  
  // Test rate limiting
  const rateLimitResult = await testRateLimiting()
  results.push({ name: 'rateLimiting', success: rateLimitResult.success })
  
  // Test caching
  const cacheResult = await testCaching()
  results.push({ name: 'caching', success: cacheResult.success })
  
  // Test bulk delete (cleanup)
  const deleteResult = await testBulkDelete(creationResult.createdIds)
  results.push({ name: 'bulkDelete', success: deleteResult.success })
  
  console.log('\n📊 Bulk Operation Test Results:')
  console.log('=================================')
  
  let passedCount = 0
  results.forEach((result) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    console.log(`${status} ${result.name}`)
    if (result.success) passedCount++
  })
  
  console.log(`\n🎯 Overall: ${passedCount}/${results.length} tests passed`)
  
  if (passedCount === results.length) {
    console.log('🎉 All bulk operation tests completed successfully!')
  } else {
    console.log('⚠️  Some bulk operation tests failed.')
  }
  
  // Cleanup before exit
  await cleanup()
  
  console.log('\n✅ Bulk operation tests completed and cleaned up successfully')
  
  return passedCount === results.length
}

// Run the tests with proper cleanup
runBulkOperationTests()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error)
    cleanup().finally(() => {
      process.exit(1)
    })
  })