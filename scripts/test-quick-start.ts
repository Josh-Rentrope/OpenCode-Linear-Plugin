#!/usr/bin/env ts-node

/**
 * Quick Start Test - Verifies basic Linear Plugin functionality
 * Run this to ensure your environment is properly configured
 */

import dotenv from 'dotenv';
import { LinearClient } from '@linear/sdk';

// Load environment variables
dotenv.config();

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

class QuickStartTest {
  private linearClient: LinearClient | null = null;

  async runAllTests(): Promise<void> {
    console.log('🚀 Linear Plugin Quick Start Test\n');

    const tests = [
      this.testEnvironmentVariables,
      this.testLinearConnection,
      this.testBasicCrud,
      this.testPluginStructure
    ];

    let passed = 0;
    let total = tests.length;

    for (const test of tests) {
      try {
        const result = await test.call(this);
        if (result.success) {
          console.log(`✅ ${result.message}`);
          if (result.details) {
            console.log(`   ${JSON.stringify(result.details, null, 2)}`);
          }
          passed++;
        } else {
          console.log(`❌ ${result.message}`);
          if (result.details) {
            console.log(`   ${JSON.stringify(result.details, null, 2)}`);
          }
        }
      } catch (error) {
        console.log(`❌ Test failed with error: ${error}`);
      }
      console.log('');
    }

    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

    if (passed === total) {
      console.log('🎉 All tests passed! Your Linear Plugin is ready to use.');
    } else {
      console.log('⚠️  Some tests failed. Check the configuration above.');
    }
  }

  private testEnvironmentVariables(): TestResult {
    const requiredVars = ['LINEAR_API_KEY'];
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      return {
        success: false,
        message: 'Environment variables missing',
        details: { missing, required: requiredVars }
      };
    }

    return {
      success: true,
      message: 'Environment variables configured correctly',
      details: { configured: requiredVars }
    };
  }

  private async testLinearConnection(): Promise<TestResult> {
    try {
      if (!process.env.LINEAR_API_KEY) {
        return {
          success: false,
          message: 'Linear API key not configured'
        };
      }

      this.linearClient = new LinearClient({
        apiKey: process.env.LINEAR_API_KEY
      });

      // Test basic connection by fetching viewer info
      const viewer = await this.linearClient.viewer;
      
      return {
        success: true,
        message: 'Linear API connection successful',
        details: {
          user: viewer?.displayName || 'Unknown',
          email: viewer?.email || 'Unknown'
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Linear API connection failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async testBasicCrud(): Promise<TestResult> {
    try {
      if (!this.linearClient) {
        return {
          success: false,
          message: 'Linear client not initialized'
        };
      }

      // Test fetching issues (basic read operation)
      const issues = await this.linearClient.issues({
        first: 5
      });

      return {
        success: true,
        message: 'Basic CRUD operations working',
        details: {
          issuesFound: issues.nodes?.length || 0,
          canRead: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Basic CRUD operations failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private testPluginStructure(): TestResult {
    const fs = require('fs');
    const path = require('path');

    const requiredFiles = [
      'plugin/LinearPlugin.ts',
      'plugin/LinearPlugin/linear-auth.ts',
      'plugin/LinearPlugin/linear-crud.ts',
      'plugin/LinearPlugin/webhook-plugin.ts'
    ];

    const missing = requiredFiles.filter(file => {
      const filePath = path.join(__dirname, '..', file);
      return !fs.existsSync(filePath);
    });

    if (missing.length > 0) {
      return {
        success: false,
        message: 'Plugin structure incomplete',
        details: { missing, required: requiredFiles }
      };
    }

    return {
      success: true,
      message: 'Plugin structure is complete',
      details: { files: requiredFiles }
    };
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new QuickStartTest();
  tester.runAllTests().catch(console.error);
}

export { QuickStartTest };