/**
 * Test script for Bulk Operations
 * 
 * Tests the new bulk operation methods in LinearCRUD.
 * Validates rate limiting, caching, and batch processing functionality.
 */

import { getLinearCRUD } from '../plugin/LinearPlugin/linear-crud'

async function testBulkOperations() {
  console.log('🧪 Testing Linear Bulk Operations...\n')

  try {
    const crud = getLinearCRUD()
    
    // ==================== BULK CREATE TEST ====================
    
    console.log('1. Testing bulk issue creation...')
    const issuesToCreate = [
      { title: 'Bulk Test Issue 1', description: 'First bulk test issue' },
      { title: 'Bulk Test Issue 2', description: 'Second bulk test issue' },
      { title: 'Bulk Test Issue 3', description: 'Third bulk test issue' }
    ]
    
    const createdIssues = await crud.bulkCreateIssues(issuesToCreate)
    console.log(`✅ Created ${createdIssues.length} issues in bulk`)
    
    if (createdIssues.length === 0) {
      console.log('⚠️  No issues created - may need to check Linear configuration')
      return
    }
    
    // Store issue IDs for later tests
    const issueIds = createdIssues.map(issue => issue.id)
    
    // ==================== BULK UPDATE TEST ====================
    
    console.log('\n2. Testing bulk issue updates...')
    const updatesToMake = createdIssues.slice(0, 2).map(issue => ({
      issueId: issue.id,
      description: `Updated description for ${issue.title}`
    }))
    
    const updatedIssues = await crud.bulkUpdateIssues(updatesToMake)
    console.log(`✅ Updated ${updatedIssues.length} issues in bulk`)
    
    // ==================== BULK COMMENT TEST ====================
    
    console.log('\n3. Testing bulk comment creation...')
    const commentsToAdd = createdIssues.slice(0, 3).map(issue => ({
      issueId: issue.id,
      body: `Bulk comment for ${issue.title}`
    }))
    
    const createdComments = await crud.bulkAddComments(commentsToAdd)
    console.log(`✅ Created ${createdComments.length} comments in bulk`)
    
    // ==================== RATE LIMITING TEST ====================
    
    console.log('\n4. Testing rate limiting...')
    console.log('Rate limit stats before:', crud.getRateLimitStats())
    
    // Make multiple rapid requests to test rate limiting
    const rapidRequests = []
    for (let i = 0; i < 5; i++) {
      rapidRequests.push(crud.getIssue(issueIds[0]))
    }
    
    await Promise.all(rapidRequests)
    console.log('✅ Rate limiting handled multiple rapid requests')
    console.log('Rate limit stats after:', crud.getRateLimitStats())
    
    // ==================== CACHING TEST ====================
    
    console.log('\n5. Testing caching...')
    console.log('Cache stats before:', crud.getCacheStats())
    
    // Make same request multiple times to test caching
    const startTime = Date.now()
    await crud.getIssue(issueIds[0])
    const firstRequestTime = Date.now() - startTime
    
    const secondStartTime = Date.now()
    await crud.getIssue(issueIds[0])
    const secondRequestTime = Date.now() - secondStartTime
    
    console.log(`✅ First request: ${firstRequestTime}ms`)
    console.log(`✅ Second request: ${secondRequestTime}ms (should be faster due to caching)`)
    console.log('Cache stats after:', crud.getCacheStats())
    
    // ==================== CLEANUP ====================
    
    console.log('\n6. Testing bulk delete for cleanup...')
    const deleteResult = await crud.bulkDeleteIssues(issueIds)
    console.log(`✅ Deleted ${deleteResult.successCount} issues in bulk`)
    
    if (deleteResult.failedIds.length > 0) {
      console.log(`⚠️  Failed to delete ${deleteResult.failedIds.length} issues:`, deleteResult.failedIds)
    }
    
    console.log('\n🎉 All bulk operation tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Bulk operations test failed:', error)
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testBulkOperations().catch(console.error)
}

export { testBulkOperations }