import { linearCRUD } from '../plugin/linear-crud'

async function testCRUD() {
  console.log('🧪 Testing Linear CRUD...\n')

  try {
    // Create issue
    console.log('Creating issue...')
    const issue = await linearCRUD.createIssue({
      title: 'Test CRUD Issue',
      description: 'Testing minimal CRUD operations'
    })
    console.log(`✅ Created: ${issue?.id} - ${issue?.title}`)

    // Get issue
    if(!issue){
     console.error(`Issue with Id not created`)
      return;
    }
    const retrieved = await linearCRUD.getIssue(issue.id)
    console.log(`✅ Retrieved: ${retrieved?.title}`)

    // Update issue
    const updated = await linearCRUD.updateIssue(issue?.id, {
      title: 'Updated Test CRUD Issue'
    })



    if(!updated){
     console.error(`Updated not created properly`)
      return;
    }

    console.log(`✅ Updated: ${updated.title}`)

    // Create comment
    const comment = await linearCRUD.createComment(issue?.id, 'Test comment')

    

    if(!comment){
     console.error(`Comment not created properly`)
      return;
    }

    console.log(`✅ Comment: ${comment.id}`)

    // List comments
    const comments = await linearCRUD.listComments(issue?.id)
    console.log(`✅ Comments: ${comments.length}`)

    // Cleanup
    await linearCRUD.deleteComment(comment.id)
    await linearCRUD.deleteIssue(issue?.id)
    console.log('✅ Cleanup complete')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testCRUD()