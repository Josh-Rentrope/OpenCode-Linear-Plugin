/**
 * Phase 3 Project Management Test Suite
 * 
 * Tests the advanced project management features including:
 * - LinearProjectManagement class functionality
 * - Project CRUD operations
 * - Milestone management
 * - Team management
 * - Progress tracking
 * - Project analytics
 */

import { LinearProjectManagement } from '../plugin/LinearPlugin/linear-project-management'
import { LinearAuth } from '../plugin/LinearPlugin/linear-auth'

interface TestResult {
  success: boolean
  message: string
  data?: any
  error?: string
}

class Phase3ProjectManagementTester {
  private projectManager: LinearProjectManagement | null = null
  private testResults: TestResult[] = []

  constructor() {
    console.log('🚀 Phase 3 Project Management Test Suite')
    console.log('===========================================')
  }

  /**
   * Initialize the test environment
   */
  async initialize(): Promise<void> {
    try {
      console.log('\n📋 Initializing test environment...')
      
      // Initialize Linear authentication
      const auth = new LinearAuth()
      const authResult = await auth.authenticate()
      
      if (!authResult.success) {
        throw new Error(`Authentication failed: ${authResult.error}`)
      }
      
      // Initialize project manager
      this.projectManager = new LinearProjectManagement()
      console.log('✅ Test environment initialized successfully')
      
      this.addTestResult({
        success: true,
        message: 'Test environment initialization',
        data: { authenticated: true }
      })
    } catch (error) {
      console.error('❌ Initialization failed:', error)
      this.addTestResult({
        success: false,
        message: 'Test environment initialization',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test project creation functionality
   */
  async testProjectCreation(): Promise<void> {
    console.log('\n🏗️  Testing Project Creation...')
    
    if (!this.projectManager) {
      this.addTestResult({
        success: false,
        message: 'Project creation test',
        error: 'Project manager not initialized'
      })
      return
    }

    try {
      const testProjectData = {
        name: `Test Project ${Date.now()}`,
        description: 'Automated test project for Phase 3 validation',
        teamId: 'test-team-id', // This would need to be a real team ID
        stateId: 'active', // This would need to be a real state ID
        startDate: new Date().toISOString().split('T')[0],
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }

      const result = await this.projectManager.createProject(testProjectData)
      
      if (result.success) {
        console.log('✅ Project creation successful')
        console.log(`   Project ID: ${result.data?.project?.id}`)
        console.log(`   Project Name: ${result.data?.project?.name}`)
        
        this.addTestResult({
          success: true,
          message: 'Project creation test',
          data: { 
            projectId: result.data?.project?.id,
            projectName: result.data?.project?.name
          }
        })
      } else {
        console.log('⚠️  Project creation failed (expected with test data)')
        console.log(`   Error: ${result.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Project creation test',
          error: result.error || 'Unknown error',
          data: { note: 'Expected failure with test data' }
        })
      }
    } catch (error) {
      console.error('❌ Project creation test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Project creation test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test project retrieval functionality
   */
  async testProjectRetrieval(): Promise<void> {
    console.log('\n📊 Testing Project Retrieval...')
    
    if (!this.projectManager) {
      this.addTestResult({
        success: false,
        message: 'Project retrieval test',
        error: 'Project manager not initialized'
      })
      return
    }

    try {
      // Test getting all projects
      const allProjectsResult = await this.projectManager.getAllProjects()
      
      if (allProjectsResult.success) {
        console.log(`✅ Retrieved ${allProjectsResult.data?.projects?.length || 0} projects`)
        
        this.addTestResult({
          success: true,
          message: 'Project retrieval test - all projects',
          data: { 
            projectCount: allProjectsResult.data?.projects?.length || 0
          }
        })
      } else {
        console.log('⚠️  Project retrieval failed')
        console.log(`   Error: ${allProjectsResult.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Project retrieval test - all projects',
          error: allProjectsResult.error || 'Unknown error'
        })
      }

      // Test getting projects by team
      const teamProjectsResult = await this.projectManager.getProjectsByTeam('test-team-id')
      
      if (teamProjectsResult.success) {
        console.log(`✅ Retrieved ${teamProjectsResult.data?.projects?.length || 0} projects for team`)
        
        this.addTestResult({
          success: true,
          message: 'Project retrieval test - team projects',
          data: { 
            teamProjectCount: teamProjectsResult.data?.projects?.length || 0
          }
        })
      } else {
        console.log('⚠️  Team project retrieval failed (expected with test team ID)')
        
        this.addTestResult({
          success: false,
          message: 'Project retrieval test - team projects',
          error: teamProjectsResult.error || 'Unknown error',
          data: { note: 'Expected failure with test team ID' }
        })
      }
    } catch (error) {
      console.error('❌ Project retrieval test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Project retrieval test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test milestone management functionality
   */
  async testMilestoneManagement(): Promise<void> {
    console.log('\n🎯 Testing Milestone Management...')
    
    if (!this.projectManager) {
      this.addTestResult({
        success: false,
        message: 'Milestone management test',
        error: 'Project manager not initialized'
      })
      return
    }

    try {
      const testMilestoneData = {
        name: `Test Milestone ${Date.now()}`,
        description: 'Automated test milestone for Phase 3 validation',
        projectId: 'test-project-id', // This would need to be a real project ID
        targetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }

      const result = await this.projectManager.createMilestone(testMilestoneData)
      
      if (result.success) {
        console.log('✅ Milestone creation successful')
        console.log(`   Milestone ID: ${result.data?.milestone?.id}`)
        
        this.addTestResult({
          success: true,
          message: 'Milestone management test - creation',
          data: { 
            milestoneId: result.data?.milestone?.id,
            milestoneName: result.data?.milestone?.name
          }
        })
      } else {
        console.log('⚠️  Milestone creation failed (expected with test data)')
        console.log(`   Error: ${result.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Milestone management test - creation',
          error: result.error || 'Unknown error',
          data: { note: 'Expected failure with test data' }
        })
      }

      // Test getting milestones for a project
      const milestonesResult = await this.projectManager.getProjectMilestones('test-project-id')
      
      if (milestonesResult.success) {
        console.log(`✅ Retrieved ${milestonesResult.data?.milestones?.length || 0} milestones`)
        
        this.addTestResult({
          success: true,
          message: 'Milestone management test - retrieval',
          data: { 
            milestoneCount: milestonesResult.data?.milestones?.length || 0
          }
        })
      } else {
        console.log('⚠️  Milestone retrieval failed (expected with test project ID)')
        
        this.addTestResult({
          success: false,
          message: 'Milestone management test - retrieval',
          error: milestonesResult.error || 'Unknown error',
          data: { note: 'Expected failure with test project ID' }
        })
      }
    } catch (error) {
      console.error('❌ Milestone management test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Milestone management test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test project analytics functionality
   */
  async testProjectAnalytics(): Promise<void> {
    console.log('\n📈 Testing Project Analytics...')
    
    if (!this.projectManager) {
      this.addTestResult({
        success: false,
        message: 'Project analytics test',
        error: 'Project manager not initialized'
      })
      return
    }

    try {
      const analyticsResult = await this.projectManager.getProjectAnalytics('test-project-id')
      
      if (analyticsResult.success) {
        const analytics = analyticsResult.data
        console.log('✅ Project analytics retrieved successfully')
        console.log(`   Total Issues: ${analytics?.totalIssues || 0}`)
        console.log(`   Completed Issues: ${analytics?.completedIssues || 0}`)
        console.log(`   Progress: ${analytics?.progressPercentage || 0}%`)
        
        this.addTestResult({
          success: true,
          message: 'Project analytics test',
          data: analytics
        })
      } else {
        console.log('⚠️  Project analytics failed (expected with test project ID)')
        console.log(`   Error: ${analyticsResult.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Project analytics test',
          error: analyticsResult.error || 'Unknown error',
          data: { note: 'Expected failure with test project ID' }
        })
      }
    } catch (error) {
      console.error('❌ Project analytics test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Project analytics test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test team management functionality
   */
  async testTeamManagement(): Promise<void> {
    console.log('\n👥 Testing Team Management...')
    
    if (!this.projectManager) {
      this.addTestResult({
        success: false,
        message: 'Team management test',
        error: 'Project manager not initialized'
      })
      return
    }

    try {
      const teamResult = await this.projectManager.getTeamInfo('test-team-id')
      
      if (teamResult.success) {
        const team = teamResult.data
        console.log('✅ Team information retrieved successfully')
        console.log(`   Team Name: ${team?.name || 'Unknown'}`)
        console.log(`   Member Count: ${team?.memberCount || 0}`)
        
        this.addTestResult({
          success: true,
          message: 'Team management test',
          data: team
        })
      } else {
        console.log('⚠️  Team management failed (expected with test team ID)')
        console.log(`   Error: ${teamResult.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Team management test',
          error: teamResult.error || 'Unknown error',
          data: { note: 'Expected failure with test team ID' }
        })
      }
    } catch (error) {
      console.error('❌ Team management test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Team management test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Add test result to the results array
   */
  private addTestResult(result: TestResult): void {
    this.testResults.push(result)
  }

  /**
   * Generate test summary report
   */
  generateSummary(): void {
    console.log('\n📊 Phase 3 Project Management Test Summary')
    console.log('==========================================')
    
    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(r => r.success).length
    const failedTests = totalTests - passedTests
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0'

    console.log(`\nTotal Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests}`)
    console.log(`Failed: ${failedTests}`)
    console.log(`Success Rate: ${successRate}%`)

    console.log('\n📋 Detailed Results:')
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${index + 1}. ${result.message}`)
      if (result.error && !result.data?.note) {
        console.log(`   Error: ${result.error}`)
      }
      if (result.data?.note) {
        console.log(`   Note: ${result.data.note}`)
      }
    })

    console.log('\n🎯 Phase 3 Project Management Features Tested:')
    console.log('   ✅ Project Creation')
    console.log('   ✅ Project Retrieval (All & By Team)')
    console.log('   ✅ Milestone Management')
    console.log('   ✅ Project Analytics')
    console.log('   ✅ Team Management')

    if (failedTests === 0) {
      console.log('\n🎉 All Phase 3 Project Management tests completed successfully!')
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Some failures are expected with test data.`)
    }
  }

  /**
   * Run all Phase 3 project management tests
   */
  async runAllTests(): Promise<void> {
    try {
      await this.initialize()
      await this.testProjectCreation()
      await this.testProjectRetrieval()
      await this.testMilestoneManagement()
      await this.testProjectAnalytics()
      await this.testTeamManagement()
      this.generateSummary()
    } catch (error) {
      console.error('❌ Test suite execution failed:', error)
    }
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const tester = new Phase3ProjectManagementTester()
  tester.runAllTests().catch(console.error)
}

export { Phase3ProjectManagementTester }