/**
 * Linear CRUD Test Suite
 * 
 * Comprehensive test of all CRUD operations for Issues and Comments.
 * This test creates, reads, updates, and deletes entities to verify
 * the Linear SDK wrapper is functioning correctly.
 * 
 * The test follows a create -> read -> update -> delete pattern
 * for both issues and comments, with proper cleanup at the end.
 */

import { getLinearCRUD } from '../plugin/LinearPlugin/linear-crud'

async function testCRUD() {
  console.log('🧪 Testing Enhanced Linear CRUD Operations...\n')

  try {
    const crud = getLinearCRUD()
    
    // ==================== BASIC CRUD TESTS ====================
    
    // Test 1: Create issue
    console.log('1. Creating issue...')
    const issue = await crud.createIssue({
      title: 'Test CRUD Issue',
      description: 'Testing enhanced CRUD operations'
    })
    
    if (!issue) {
      console.error('❌ Issue creation failed')
      return
    }
    console.log(`✅ Created: ${issue.id} - ${issue.title}`)

    // Test 2: Get issue (with caching)
    console.log('2. Retrieving issue (first time - from API)...')
    const retrieved1 = await crud.getIssue(issue.id)
    console.log(`✅ Retrieved: ${retrieved1?.title}`)
    
    console.log('3. Retrieving issue (second time - from cache)...')
    const retrieved2 = await crud.getIssue(issue.id)
    console.log(`✅ Retrieved: ${retrieved2?.title}`)

    // Test 3: Update issue
    console.log('4. Updating issue...')
    const updated = await crud.updateIssue(issue.id, {
      title: 'Updated Test CRUD Issue'
    })

    if (!updated) {
      console.error('❌ Issue update failed')
      return
    }
    console.log(`✅ Updated: ${updated.title}`)

    // ==================== COMMENT CRUD TESTS ====================
    
    // Test 5: Create comment
    console.log('5. Creating comment...')
    const comment = await crud.createComment(issue.id, 'Test comment')

    if (!comment) {
      console.error('❌ Comment creation failed')
      return
    }
    console.log(`✅ Comment: ${comment.id}`)

    // Test 6: List comments (with caching)
    console.log('6. Listing comments...')
    const comments = await crud.listComments(issue.id)
    console.log(`✅ Comments: ${comments.length}`)

    // ==================== ENHANCED FEATURES TESTS ====================
    
    // Test 7: Rate limiting stats
    console.log('7. Checking rate limiting stats...')
    const rateStats = crud.getRateLimitStats()
    console.log(`✅ Rate limits: ${rateStats.activeLimits} active, ${rateStats.totalRequests} requests`)
    
    // Test 8: Cache stats
    console.log('8. Checking cache stats...')
    const cacheStats = crud.getCacheStats()
    console.log(`✅ Cache: ${cacheStats.size} entries, max size: ${cacheStats.maxSize}`)
    
    // Test 9: Workflow states (with caching)
    console.log('9. Getting workflow states...')
    const workflowStates = await crud.getWorkflowStates()
    console.log(`✅ Workflow states: ${workflowStates.length} available`)

    // ==================== CLEANUP ====================
    
    // Test 10: Delete comment
    console.log('10. Cleaning up comment...')
    await crud.deleteComment(comment.id)
    
    // Test 11: Delete issue
    console.log('11. Cleaning up issue...')
    await crud.deleteIssue(issue.id)
    console.log('✅ Cleanup complete')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test suite
testCRUD()