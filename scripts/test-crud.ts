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

import { linearCRUD } from '../plugin/linear-crud'

async function testCRUD() {
  console.log('🧪 Testing Linear CRUD Operations...\n')

  try {
    // ==================== ISSUE CRUD TESTS ====================
    
    // Test 1: Create issue
    console.log('1. Creating issue...')
    const issue = await linearCRUD.createIssue({
      title: 'Test CRUD Issue',
      description: 'Testing minimal CRUD operations'
    })
    
    if (!issue) {
      console.error('❌ Issue creation failed')
      return
    }
    console.log(`✅ Created: ${issue.id} - ${issue.title}`)

    // Test 2: Get issue
    console.log('2. Retrieving issue...')
    const retrieved = await linearCRUD.getIssue(issue.id)
    console.log(`✅ Retrieved: ${retrieved?.title}`)

    // Test 3: Update issue
    console.log('3. Updating issue...')
    const updated = await linearCRUD.updateIssue(issue.id, {
      title: 'Updated Test CRUD Issue'
    })

    if (!updated) {
      console.error('❌ Issue update failed')
      return
    }
    console.log(`✅ Updated: ${updated.title}`)

    // ==================== COMMENT CRUD TESTS ====================
    
    // Test 4: Create comment
    console.log('4. Creating comment...')
    const comment = await linearCRUD.createComment(issue.id, 'Test comment')

    if (!comment) {
      console.error('❌ Comment creation failed')
      return
    }
    console.log(`✅ Comment: ${comment.id}`)

    // Test 5: List comments
    console.log('5. Listing comments...')
    const comments = await linearCRUD.listComments(issue.id)
    console.log(`✅ Comments: ${comments.length}`)

    // ==================== CLEANUP ====================
    
    // Test 6: Delete comment
    console.log('6. Cleaning up comment...')
    await linearCRUD.deleteComment(comment.id)
    
    // Test 7: Delete issue
    console.log('7. Cleaning up issue...')
    await linearCRUD.deleteIssue(issue.id)
    console.log('✅ Cleanup complete')

  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test suite
testCRUD()