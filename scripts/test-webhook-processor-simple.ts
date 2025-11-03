/**
 * Simple test script for Webhook Event Processor
 * 
 * Tests the core OpenCode reference detection functionality
 * without complex webhook payload structures.
 */

import { OpenCodeReferenceDetector } from '../plugin/opencode-reference-detector'

/**
 * Test OpenCode reference detection directly
 */
function testOpenCodeDetection() {
  console.log('🧪 Testing OpenCode reference detection...')
  
  const testCases = [
    {
      input: 'Hey @opencode can you help me?',
      expected: 1,
      description: 'Single @opencode mention'
    },
    {
      input: 'Hey @Opencode can you help me? @opencode please',
      expected: 2,
      description: 'Multiple @opencode mentions with different cases'
    },
    {
      input: 'This is a regular comment without mentions',
      expected: 0,
      description: 'No @opencode mentions'
    },
    {
      input: 'The email is opencode@example.com not @opencode',
      expected: 1,
      description: 'Email vs mention distinction'
    }
  ]
  
  let passed = 0
  
  testCases.forEach((testCase, index) => {
    const references = OpenCodeReferenceDetector.detectReferences(testCase.input)
    const success = references.length === testCase.expected
    
    console.log(`  Test ${index + 1}: ${testCase.description}`)
    console.log(`    Input: "${testCase.input}"`)
    console.log(`    Expected: ${testCase.expected}, Got: ${references.length}`)
    console.log(`    Result: ${success ? '✅ PASS' : '❌ FAIL'}`)
    
    if (success) {
      passed++
    }
    
    if (references.length > 0) {
      references.forEach((ref, i) => {
        console.log(`      Reference ${i + 1}: "${ref.raw}" at ${ref.position.start}-${ref.position.end}`)
      })
    }
  })
  
  console.log(`\n📊 Detection tests: ${passed}/${testCases.length} passed`)
  return passed === testCases.length
}

/**
 * Test the quick check functionality
 */
function testQuickCheck() {
  console.log('\n🧪 Testing quick check functionality...')
  
  const testCases = [
    { input: 'Hey @opencode help', expected: true },
    { input: 'No mentions here', expected: false },
    { input: '@Opencode please help', expected: true },
    { input: 'opencode without @', expected: false }
  ]
  
  let passed = 0
  
  testCases.forEach((testCase, index) => {
    const hasReference = OpenCodeReferenceDetector.hasOpenCodeReference(testCase.input)
    const success = hasReference === testCase.expected
    
    console.log(`  Test ${index + 1}: "${testCase.input}"`)
    console.log(`    Expected: ${testCase.expected}, Got: ${hasReference}`)
    console.log(`    Result: ${success ? '✅ PASS' : '❌ FAIL'}`)
    
    if (success) {
      passed++
    }
  })
  
  console.log(`\n📊 Quick check tests: ${passed}/${testCases.length} passed`)
  return passed === testCases.length
}

/**
 * Run all tests
 */
function runTests() {
  console.log('🚀 Starting Simple Webhook Event Processor Tests')
  console.log('================================================')
  
  const detectionPassed = testOpenCodeDetection()
  const quickCheckPassed = testQuickCheck()
  
  console.log('\n📊 Final Results:')
  console.log('==================')
  console.log(`OpenCode Detection: ${detectionPassed ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Quick Check: ${quickCheckPassed ? '✅ PASS' : '❌ FAIL'}`)
  
  const allPassed = detectionPassed && quickCheckPassed
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! OpenCode reference detection is working correctly.')
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.')
  }
  
  return allPassed
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
}

export { runTests }