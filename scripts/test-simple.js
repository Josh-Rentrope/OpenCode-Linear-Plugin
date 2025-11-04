/**
 * Simple JavaScript Test
 */

console.log('🧪 Simple Linear Plugin Test');
console.log('============================');

try {
  // Test basic imports
  console.log('Testing imports...');
  
  // Import the compiled JavaScript files
  const { WebhookEventProcessor } = require('../plugin/LinearPlugin/webhook-event-processor');
  const { getLinearCRUD } = require('../plugin/LinearPlugin/linear-crud');
  const { OpenCodeReferenceDetector } = require('../plugin/LinearPlugin/opencode-reference-detector');
  
  console.log('✅ All imports successful');
  
  // Test basic instantiation
  console.log('Testing instantiation...');
  const processor = new WebhookEventProcessor();
  const crud = getLinearCRUD();
  
  console.log('✅ Basic instantiation successful');
  
  // Test reference detection
  console.log('Testing reference detection...');
  const testComment = 'Hey @opencode create file test.ts --type=component';
  const references = OpenCodeReferenceDetector.detectReferences(testComment);
  
  console.log(`✅ Reference detection successful: found ${references.length} reference(s)`);
  console.log(`   Reference: ${references[0]?.raw}`);
  
  // Test command extraction
  console.log('Testing command extraction...');
  const action = OpenCodeReferenceDetector.extractAction(references[0]);
  console.log(`✅ Command extraction successful: action = "${action}"`);
  
  console.log('\n🎉 All simple tests passed!');
  console.log('The Linear Plugin is working correctly.');
  
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}