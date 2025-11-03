/**
 * Test script for OpenCode Reference Detector
 * 
 * Tests the basic @opencode mention detection functionality
 */

import { opencodeReferenceDetector } from '../plugin/opencode-reference-detector'

async function testReferenceDetector() {
  console.log('🧪 Testing OpenCode Reference Detector...\n')

  // Test 1: Simple mention
  console.log('1. Testing simple @opencode mention...')
  const comment1 = 'Hey @opencode can you help with this?'
  const hasRef1 = opencodeReferenceDetector.hasOpenCodeReference(comment1)
  const refs1 = opencodeReferenceDetector.detectReferences(comment1)
  console.log(`   Has reference: ${hasRef1}`)
  console.log(`   Found ${refs1.length} references:`, refs1.map(r => ({ raw: r.raw, position: r.position })))

  // Test 2: No mention
  console.log('\n2. Testing comment without @opencode...')
  const comment2 = 'This is a regular comment without any mentions'
  const hasRef2 = opencodeReferenceDetector.hasOpenCodeReference(comment2)
  const refs2 = opencodeReferenceDetector.detectReferences(comment2)
  console.log(`   Has reference: ${hasRef2}`)
  console.log(`   Found ${refs2.length} references`)

  // Test 3: Multiple mentions
  console.log('\n3. Testing multiple @opencode mentions...')
  const comment3 = '@opencode please help and @opencode also check this'
  const hasRef3 = opencodeReferenceDetector.hasOpenCodeReference(comment3)
  const refs3 = opencodeReferenceDetector.detectReferences(comment3)
  console.log(`   Has reference: ${hasRef3}`)
  console.log(`   Found ${refs3.length} references:`, refs3.map(r => ({ raw: r.raw, position: r.position })))

  // Test 4: Case insensitive
  console.log('\n4. Testing case insensitive @OpenCode...')
  const comment4 = 'Hey @OpenCode can you help?'
  const hasRef4 = opencodeReferenceDetector.hasOpenCodeReference(comment4)
  const refs4 = opencodeReferenceDetector.detectReferences(comment4)
  console.log(`   Has reference: ${hasRef4}`)
  console.log(`   Found ${refs4.length} references:`, refs4.map(r => ({ raw: r.raw, position: r.position })))

  // Test 5: Partial word (should not match)
  console.log('\n5. Testing partial word match...')
  const comment5 = 'This is not@opencode a valid mention'
  const hasRef5 = opencodeReferenceDetector.hasOpenCodeReference(comment5)
  const refs5 = opencodeReferenceDetector.detectReferences(comment5)
  console.log(`   Has reference: ${hasRef5}`)
  console.log(`   Found ${refs5.length} references`)

  console.log('\n✅ Reference Detector Tests Complete!')
}

testReferenceDetector()