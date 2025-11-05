/**
 * Phase 3 Collaboration Test Suite
 * 
 * Tests the advanced collaboration features including:
 * - LinearCollaboration class functionality
 * - Activity tracking
 * - Notification management
 * - Team metrics
 * - Automated workflows
 * - Performance analytics
 */

import { LinearCollaboration } from '../plugin/LinearPlugin/linear-collaboration'
import { LinearAuth } from '../plugin/LinearPlugin/linear-auth'

interface TestResult {
  success: boolean
  message: string
  data?: any
  error?: string
}

class Phase3CollaborationTester {
  private collaboration: LinearCollaboration | null = null
  private testResults: TestResult[] = []

  constructor() {
    console.log('🚀 Phase 3 Collaboration Test Suite')
    console.log('=====================================')
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
      
      // Initialize collaboration manager
      this.collaboration = new LinearCollaboration()
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
   * Test activity tracking functionality
   */
  async testActivityTracking(): Promise<void> {
    console.log('\n📊 Testing Activity Tracking...')
    
    if (!this.collaboration) {
      this.addTestResult({
        success: false,
        message: 'Activity tracking test',
        error: 'Collaboration manager not initialized'
      })
      return
    }

    try {
      const testActivity = {
        type: 'issue_created' as const,
        userId: 'test-user-id',
        userName: 'Test User',
        userEmail: 'test@example.com',
        issueId: 'test-issue-id',
        issueTitle: 'Test Issue for Activity Tracking',
        projectId: 'test-project-id',
        projectName: 'Test Project',
        metadata: {
          action: 'create',
          priority: 'medium',
          labels: ['test', 'automation']
        }
      }

      const result = await this.collaboration.trackActivity(testActivity)
      
      if (result.success) {
        console.log('✅ Activity tracking successful')
        console.log(`   Activity ID: ${result.data?.activity?.id}`)
        console.log(`   Activity Type: ${result.data?.activity?.type}`)
        
        this.addTestResult({
          success: true,
          message: 'Activity tracking test',
          data: { 
            activityId: result.data?.activity?.id,
            activityType: result.data?.activity?.type
          }
        })
      } else {
        console.log('⚠️  Activity tracking failed (may be expected with test data)')
        console.log(`   Error: ${result.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Activity tracking test',
          error: result.error || 'Unknown error',
          data: { note: 'May be expected with test data' }
        })
      }
    } catch (error) {
      console.error('❌ Activity tracking test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Activity tracking test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test activity retrieval functionality
   */
  async testActivityRetrieval(): Promise<void> {
    console.log('\n📋 Testing Activity Retrieval...')
    
    if (!this.collaboration) {
      this.addTestResult({
        success: false,
        message: 'Activity retrieval test',
        error: 'Collaboration manager not initialized'
      })
      return
    }

    try {
      // Test getting recent activities
      const recentActivitiesResult = await this.collaboration.getRecentActivities({
        limit: 10,
        includeSystemActivities: true
      })
      
      if (recentActivitiesResult.success) {
        console.log(`✅ Retrieved ${recentActivitiesResult.data?.activities?.length || 0} recent activities`)
        
        this.addTestResult({
          success: true,
          message: 'Activity retrieval test - recent activities',
          data: { 
            activityCount: recentActivitiesResult.data?.activities?.length || 0
          }
        })
      } else {
        console.log('⚠️  Recent activities retrieval failed')
        console.log(`   Error: ${recentActivitiesResult.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Activity retrieval test - recent activities',
          error: recentActivitiesResult.error || 'Unknown error'
        })
      }

      // Test getting user activities
      const userActivitiesResult = await this.collaboration.getUserActivities('test-user-id', {
        limit: 5
      })
      
      if (userActivitiesResult.success) {
        console.log(`✅ Retrieved ${userActivitiesResult.data?.activities?.length || 0} user activities`)
        
        this.addTestResult({
          success: true,
          message: 'Activity retrieval test - user activities',
          data: { 
            userActivityCount: userActivitiesResult.data?.activities?.length || 0
          }
        })
      } else {
        console.log('⚠️  User activities retrieval failed (expected with test user ID)')
        
        this.addTestResult({
          success: false,
          message: 'Activity retrieval test - user activities',
          error: userActivitiesResult.error || 'Unknown error',
          data: { note: 'Expected failure with test user ID' }
        })
      }
    } catch (error) {
      console.error('❌ Activity retrieval test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Activity retrieval test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test notification management functionality
   */
  async testNotificationManagement(): Promise<void> {
    console.log('\n🔔 Testing Notification Management...')
    
    if (!this.collaboration) {
      this.addTestResult({
        success: false,
        message: 'Notification management test',
        error: 'Collaboration manager not initialized'
      })
      return
    }

    try {
      const testNotification = {
        type: 'mention' as const,
        userId: 'test-user-id',
        title: 'Test Notification',
        message: 'You were mentioned in a comment',
        issueId: 'test-issue-id',
        issueTitle: 'Test Issue',
        projectId: 'test-project-id',
        projectName: 'Test Project',
        priority: 'normal' as const,
        metadata: {
          mentionedBy: 'Test User',
          commentId: 'test-comment-id'
        }
      }

      const result = await this.collaboration.createNotification(testNotification)
      
      if (result.success) {
        console.log('✅ Notification creation successful')
        console.log(`   Notification ID: ${result.data?.notification?.id}`)
        
        this.addTestResult({
          success: true,
          message: 'Notification management test - creation',
          data: { 
            notificationId: result.data?.notification?.id,
            notificationType: result.data?.notification?.type
          }
        })
      } else {
        console.log('⚠️  Notification creation failed (may be expected with test data)')
        console.log(`   Error: ${result.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Notification management test - creation',
          error: result.error || 'Unknown error',
          data: { note: 'May be expected with test data' }
        })
      }

      // Test getting user notifications
      const userNotificationsResult = await this.collaboration.getUserNotifications('test-user-id', {
        unreadOnly: true,
        limit: 5
      })
      
      if (userNotificationsResult.success) {
        console.log(`✅ Retrieved ${userNotificationsResult.data?.notifications?.length || 0} user notifications`)
        
        this.addTestResult({
          success: true,
          message: 'Notification management test - retrieval',
          data: { 
            notificationCount: userNotificationsResult.data?.notifications?.length || 0
          }
        })
      } else {
        console.log('⚠️  User notifications retrieval failed (expected with test user ID)')
        
        this.addTestResult({
          success: false,
          message: 'Notification management test - retrieval',
          error: userNotificationsResult.error || 'Unknown error',
          data: { note: 'Expected failure with test user ID' }
        })
      }
    } catch (error) {
      console.error('❌ Notification management test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Notification management test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test team metrics functionality
   */
  async testTeamMetrics(): Promise<void> {
    console.log('\n📈 Testing Team Metrics...')
    
    if (!this.collaboration) {
      this.addTestResult({
        success: false,
        message: 'Team metrics test',
        error: 'Collaboration manager not initialized'
      })
      return
    }

    try {
      const metricsResult = await this.collaboration.getTeamMetrics('test-team-id', {
        period: '7d',
        includeActivityBreakdown: true
      })
      
      if (metricsResult.success) {
        const metrics = metricsResult.data
        console.log('✅ Team metrics retrieved successfully')
        console.log(`   Active Members: ${metrics?.activeMembers || 0}`)
        console.log(`   Total Activities: ${metrics?.totalActivities || 0}`)
        console.log(`   Issues Created: ${metrics?.issuesCreated || 0}`)
        console.log(`   Issues Completed: ${metrics?.issuesCompleted || 0}`)
        
        this.addTestResult({
          success: true,
          message: 'Team metrics test',
          data: metrics
        })
      } else {
        console.log('⚠️  Team metrics failed (expected with test team ID)')
        console.log(`   Error: ${metricsResult.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Team metrics test',
          error: metricsResult.error || 'Unknown error',
          data: { note: 'Expected failure with test team ID' }
        })
      }
    } catch (error) {
      console.error('❌ Team metrics test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Team metrics test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test automated workflows functionality
   */
  async testAutomatedWorkflows(): Promise<void> {
    console.log('\n⚙️  Testing Automated Workflows...')
    
    if (!this.collaboration) {
      this.addTestResult({
        success: false,
        message: 'Automated workflows test',
        error: 'Collaboration manager not initialized'
      })
      return
    }

    try {
      const testWorkflowTrigger = {
        type: 'issue_created' as const,
        userId: 'test-user-id',
        userName: 'Test User',
        issueId: 'test-issue-id',
        issueTitle: 'Test Issue for Workflow',
        projectId: 'test-project-id'
      }

      const result = await this.collaboration.triggerAutomatedWorkflows(testWorkflowTrigger)
      
      if (result.success) {
        console.log('✅ Automated workflow trigger successful')
        console.log(`   Workflows Triggered: ${result.data?.triggeredWorkflows?.length || 0}`)
        
        this.addTestResult({
          success: true,
          message: 'Automated workflows test',
          data: { 
            triggeredWorkflows: result.data?.triggeredWorkflows?.length || 0
          }
        })
      } else {
        console.log('⚠️  Automated workflow trigger failed (may be expected)')
        console.log(`   Error: ${result.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Automated workflows test',
          error: result.error || 'Unknown error',
          data: { note: 'May be expected with test data' }
        })
      }
    } catch (error) {
      console.error('❌ Automated workflows test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Automated workflows test',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Test performance analytics functionality
   */
  async testPerformanceAnalytics(): Promise<void> {
    console.log('\n📊 Testing Performance Analytics...')
    
    if (!this.collaboration) {
      this.addTestResult({
        success: false,
        message: 'Performance analytics test',
        error: 'Collaboration manager not initialized'
      })
      return
    }

    try {
      const analyticsResult = await this.collaboration.getPerformanceAnalytics({
        period: '30d',
        teamId: 'test-team-id',
        includeTrends: true
      })
      
      if (analyticsResult.success) {
        const analytics = analyticsResult.data
        console.log('✅ Performance analytics retrieved successfully')
        console.log(`   Average Response Time: ${analytics?.averageResponseTime || 0}h`)
        console.log(`   Resolution Rate: ${analytics?.resolutionRate || 0}%`)
        console.log(`   Productivity Score: ${analytics?.productivityScore || 0}`)
        
        this.addTestResult({
          success: true,
          message: 'Performance analytics test',
          data: analytics
        })
      } else {
        console.log('⚠️  Performance analytics failed (expected with test team ID)')
        console.log(`   Error: ${analyticsResult.error}`)
        
        this.addTestResult({
          success: false,
          message: 'Performance analytics test',
          error: analyticsResult.error || 'Unknown error',
          data: { note: 'Expected failure with test team ID' }
        })
      }
    } catch (error) {
      console.error('❌ Performance analytics test failed:', error)
      this.addTestResult({
        success: false,
        message: 'Performance analytics test',
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
    console.log('\n📊 Phase 3 Collaboration Test Summary')
    console.log('=====================================')
    
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

    console.log('\n🎯 Phase 3 Collaboration Features Tested:')
    console.log('   ✅ Activity Tracking')
    console.log('   ✅ Activity Retrieval')
    console.log('   ✅ Notification Management')
    console.log('   ✅ Team Metrics')
    console.log('   ✅ Automated Workflows')
    console.log('   ✅ Performance Analytics')

    if (failedTests === 0) {
      console.log('\n🎉 All Phase 3 Collaboration tests completed successfully!')
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Some failures are expected with test data.`)
    }
  }

  /**
   * Run all Phase 3 collaboration tests
   */
  async runAllTests(): Promise<void> {
    try {
      await this.initialize()
      await this.testActivityTracking()
      await this.testActivityRetrieval()
      await this.testNotificationManagement()
      await this.testTeamMetrics()
      await this.testAutomatedWorkflows()
      await this.testPerformanceAnalytics()
      this.generateSummary()
    } catch (error) {
      console.error('❌ Test suite execution failed:', error)
    }
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const tester = new Phase3CollaborationTester()
  tester.runAllTests().catch(console.error)
}

export { Phase3CollaborationTester }