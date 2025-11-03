#!/usr/bin/env node

/**
 * Linear Webhook Plugin Setup Script
 * 
 * This script helps developers set up their environment for the Linear webhook plugin.
 * It validates environment variables and provides helpful setup instructions.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

console.log('🔧 Linear Webhook Plugin Setup')
console.log('================================\n')

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env')
const envExamplePath = path.join(process.cwd(), '.env.example')

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...')
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath)
    console.log('✅ .env file created from .env.example')
  } else {
    console.log('❌ .env.example file not found')
    process.exit(1)
  }
}

// Load environment variables
require('dotenv').config()

// Validate required environment variables
const requiredVars = ['LINEAR_API_KEY', 'LINEAR_WEBHOOK_SECRET']
const missingVars = []

console.log('🔍 Checking environment variables...\n')

requiredVars.forEach(varName => {
  const value = process.env[varName]
  if (!value) {
    missingVars.push(varName)
    console.log(`❌ ${varName}: Not set`)
  } else {
    // Mask sensitive values for display
    const maskedValue = varName.includes('SECRET') || varName.includes('KEY') 
      ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
      : value
    console.log(`✅ ${varName}: ${maskedValue}`)
  }
})

// Generate webhook secret if missing
if (!process.env.LINEAR_WEBHOOK_SECRET) {
  console.log('\n🔐 Generating webhook secret...')
  const secret = crypto.randomBytes(32).toString('hex')
  
  // Update .env file
  let envContent = fs.readFileSync(envPath, 'utf8')
  envContent = envContent.replace(
    'LINEAR_WEBHOOK_SECRET=your_secure_webhook_secret_here',
    `LINEAR_WEBHOOK_SECRET=${secret}`
  )
  fs.writeFileSync(envPath, envContent)
  
  console.log(`✅ Generated webhook secret: ${secret.substring(0, 8)}...`)
  console.log('📝 Added to .env file')
}

// Check optional variables
console.log('\n🔧 Optional configuration:')
const optionalVars = [
  { name: 'WEBHOOK_PORT', default: '3000' },
  { name: 'WEBHOOK_PATH', default: '/webhooks/linear' },
  { name: 'ENABLE_CORS', default: 'false' },
  { name: 'NETLIFY_DEBUG', default: 'false' }
]

optionalVars.forEach(({ name, default: defaultValue }) => {
  const value = process.env[name] || defaultValue
  console.log(`✅ ${name}: ${value}`)
})

// Setup instructions
if (missingVars.length > 0) {
  console.log('\n❌ Setup incomplete. Please set the following environment variables:')
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`)
  })
  console.log('\n📝 Edit your .env file and try again.')
  process.exit(1)
}

console.log('\n✅ Environment setup complete!')
console.log('\n🚀 Next steps:')
console.log('1. Test Express server: npm run dev:express')
console.log('2. Test Netlify functions: npm run dev:netlify')
console.log('3. Configure Linear webhook with your server URL')
console.log('\n📚 For more information, see README.md')